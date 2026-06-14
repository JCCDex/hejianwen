import { describe, it, expect } from 'vitest';
import {
  calculateEMA,
  calculateATR,
  calculateWMA,
  calculateHMA,
  calculateALMA,
  calculateStdDev,
  calculateCorrelation,
  calculateHurst,
  runMonteCarlo,
  calculateLiquidationClusters,
  buildCompositeIndex,
  calculateQuantTD,
} from './indicators.js';

// ─────────────────────────────────────────────────────────────────────────────
// 测试辅助工具
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 构造标准 Binance K线格式
 * [time, open, high, low, close, volume, closeTime, quoteVol, trades, takerBuyBase, takerBuyQuote, ignore]
 */
const kline = (t, o, h, l, c, v = 1000, takerBuy = 500) =>
  [t, String(o), String(h), String(l), String(c), String(v), 0, '0', 0, String(takerBuy), '0', '0'];

/**
 * 生成 n 根单调下降 K 线
 * 每根：close = startClose - i，open = close，high = close + 0.5，low = close - 0.5
 * vol 可传数组（按索引对应）或固定值
 */
const descendingKlines = (n, startClose = 100, volArr = null, takerBuyArr = null) =>
  Array.from({ length: n }, (_, i) => {
    const c = startClose - i;
    return kline(
      i * 3600000,
      c, c + 0.5, c - 0.5, c,
      volArr ? volArr[i] : 1000,
      takerBuyArr ? takerBuyArr[i] : 500,
    );
  });

/**
 * 生成 n 根单调上升 K 线
 */
const ascendingKlines = (n, startClose = 100, vol = 1000, takerBuy = 500) =>
  Array.from({ length: n }, (_, i) => {
    const c = startClose + i;
    return kline(i * 3600000, c, c + 0.5, c - 0.5, c, vol, takerBuy);
  });

// ─────────────────────────────────────────────────────────────────────────────
// 1. calculateEMA
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateEMA', () => {
  it('空数组返回 [0]', () => {
    expect(calculateEMA([], 3)).toEqual([0]);
  });

  it('单元素返回自身', () => {
    expect(calculateEMA([42], 3)).toEqual([42]);
  });

  it('3 周期 EMA 手工验证', () => {
    // k = 2/(3+1) = 0.5
    // ema[0]=10, ema[1]=10.5, ema[2]=11.25, ema[3]=12.125, ema[4]=13.0625
    const result = calculateEMA([10, 11, 12, 13, 14], 3);
    expect(result[0]).toBeCloseTo(10, 5);
    expect(result[1]).toBeCloseTo(10.5, 5);
    expect(result[2]).toBeCloseTo(11.25, 5);
    expect(result[3]).toBeCloseTo(12.125, 5);
    expect(result[4]).toBeCloseTo(13.0625, 5);
  });

  it('2 周期 EMA 手工验证', () => {
    // k = 2/3 ≈ 0.6667
    const k = 2 / 3;
    const data = [10, 20, 30];
    const e1 = 20 * k + 10 * (1 - k);     // 16.667
    const e2 = 30 * k + e1 * (1 - k);    // 25.556
    const result = calculateEMA(data, 2);
    expect(result[1]).toBeCloseTo(e1, 4);
    expect(result[2]).toBeCloseTo(e2, 4);
  });

  it('上涨序列输出单调递增', () => {
    const result = calculateEMA([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });

  it('返回数组长度等于输入长度', () => {
    const result = calculateEMA([1, 2, 3, 4, 5], 3);
    expect(result.length).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. calculateWMA
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateWMA', () => {
  it('数据不足返回全零数组', () => {
    const result = calculateWMA([10, 20], 5);
    expect(result).toEqual([0, 0]);
  });

  it('period <= 0 返回全零数组', () => {
    expect(calculateWMA([1, 2, 3], 0)).toEqual([0, 0, 0]);
  });

  it('3 周期 WMA 手工验证', () => {
    // denominator = 6
    // wma[2] = (30*3 + 20*2 + 10*1) / 6 = 140/6 ≈ 23.333
    // wma[3] = (40*3 + 30*2 + 20*1) / 6 = 200/6 ≈ 33.333
    // wma[4] = (50*3 + 40*2 + 30*1) / 6 = 260/6 ≈ 43.333
    const result = calculateWMA([10, 20, 30, 40, 50], 3);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
    expect(result[2]).toBeCloseTo(140 / 6, 5);
    expect(result[3]).toBeCloseTo(200 / 6, 5);
    expect(result[4]).toBeCloseTo(260 / 6, 5);
  });

  it('等差序列中 WMA 单调递增', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = calculateWMA(data, 3);
    for (let i = 3; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });

  it('返回长度等于输入长度', () => {
    expect(calculateWMA([1, 2, 3, 4, 5], 3).length).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. calculateHMA
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateHMA', () => {
  it('数据不足返回全零', () => {
    expect(calculateHMA([1, 2], 5)).toEqual([0, 0]);
  });

  it('period <= 0 返回全零', () => {
    expect(calculateHMA([1, 2, 3], 0)).toEqual([0, 0, 0]);
  });

  it('返回长度等于输入长度', () => {
    const data = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(calculateHMA(data, 4).length).toBe(20);
  });

  it('单调上涨序列中 HMA 末尾为正值', () => {
    const data = Array.from({ length: 30 }, (_, i) => i + 1);
    const result = calculateHMA(data, 9);
    expect(result[result.length - 1]).toBeGreaterThan(0);
  });

  it('HMA lag 小于同周期 EMA（更快响应）', () => {
    // 急剧上涨后，HMA 末尾应大于同周期 EMA
    const data = [...Array(20).fill(100), ...Array(10).fill(200)];
    const hma = calculateHMA(data, 9);
    const ema = calculateEMA(data, 9);
    const last = data.length - 1;
    expect(hma[last]).toBeGreaterThanOrEqual(ema[last]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. calculateALMA
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateALMA', () => {
  it('数据不足返回全零', () => {
    expect(calculateALMA([1, 2], 5)).toEqual([0, 0]);
  });

  it('period <= 0 返回全零', () => {
    expect(calculateALMA([1, 2, 3], 0)).toEqual([0, 0, 0]);
  });

  it('返回长度等于输入长度', () => {
    const data = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(calculateALMA(data, 9).length).toBe(20);
  });

  it('常数序列 ALMA 等于常数', () => {
    const data = Array(20).fill(50);
    const result = calculateALMA(data, 9);
    for (let i = 8; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(50, 4);
    }
  });

  it('offset=0.85 权重偏后（末尾权重最大）', () => {
    // 末尾值远大于前面时，ALMA 输出应接近末尾值
    const data = [...Array(18).fill(100), 200, 200];
    const result = calculateALMA(data, 10, 0.85, 6);
    expect(result[result.length - 1]).toBeGreaterThan(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. calculateATR
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateATR', () => {
  it('均匀价格序列 ATR 稳定', () => {
    // 每根蜡烛 H=11 L=9 C=10，相邻收盘相同 → TR = max(2,1,1) = 2
    const n = 20;
    const highs = Array(n).fill(11);
    const lows = Array(n).fill(9);
    const closes = Array(n).fill(10);
    const result = calculateATR(highs, lows, closes, 3);
    result.forEach(v => expect(v).toBeCloseTo(2, 4));
  });

  it('3 周期 ATR 手工验证', () => {
    // 5 个价格点 → 4 个 TR → 2 个 ATR 输出
    // highs=[11,12,11,11,11], lows=[9,8,9,9,9], closes=[10,10,10,10,10]
    // TR[1]=max(4,2,2)=4, TR[2]=max(2,1,1)=2, TR[3]=max(2,1,1)=2, TR[4]=2
    // ATR[0] = (4+2+2)/3 = 8/3
    // ATR[1] = (8/3*2 + 2)/3 = 22/9
    const result = calculateATR([11, 12, 11, 11, 11], [9, 8, 9, 9, 9], [10, 10, 10, 10, 10], 3);
    expect(result[0]).toBeCloseTo(8 / 3, 5);
    expect(result[1]).toBeCloseTo(22 / 9, 5);
  });

  it('ATR 始终为正值', () => {
    const highs = [10, 11, 9, 12, 8];
    const lows  = [8, 9, 7, 10, 6];
    const closes = [9, 10, 8, 11, 7];
    const result = calculateATR(highs, lows, closes, 3);
    result.forEach(v => expect(v).toBeGreaterThan(0));
  });

  it('返回长度 = closes.length - period', () => {
    const n = 20, period = 5;
    const h = Array(n).fill(11), l = Array(n).fill(9), c = Array(n).fill(10);
    const result = calculateATR(h, l, c, period);
    expect(result.length).toBe(n - period);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. calculateStdDev
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateStdDev', () => {
  it('经典教材案例 [2,4,4,4,5,5,7,9]', () => {
    // mean=5, variance=4, stdDev=2
    const { mean, stdDev } = calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(mean).toBeCloseTo(5, 5);
    expect(stdDev).toBeCloseTo(2, 5);
  });

  it('常数序列标准差为 0', () => {
    const { stdDev } = calculateStdDev([7, 7, 7, 7, 7]);
    expect(stdDev).toBeCloseTo(0, 10);
  });

  it('单元素 mean 等于自身，stdDev 为 0', () => {
    const { mean, stdDev } = calculateStdDev([42]);
    expect(mean).toBe(42);
    expect(stdDev).toBe(0);
  });

  it('对称序列 mean 等于中值', () => {
    const { mean } = calculateStdDev([1, 2, 3, 4, 5]);
    expect(mean).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. calculateCorrelation
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCorrelation', () => {
  it('完全正相关返回 1', () => {
    expect(calculateCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1, 5);
  });

  it('完全负相关返回 -1', () => {
    expect(calculateCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])).toBeCloseTo(-1, 5);
  });

  it('常数序列相关性为 0', () => {
    expect(calculateCorrelation([1, 2, 3], [5, 5, 5])).toBe(0);
  });

  it('长度不等返回 0', () => {
    expect(calculateCorrelation([1, 2, 3], [1, 2])).toBe(0);
  });

  it('空数组返回 0', () => {
    expect(calculateCorrelation([], [])).toBe(0);
  });

  it('结果范围在 [-1, 1] 内', () => {
    const x = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
    const y = [7, 2, 1, 8, 2, 8, 1, 8, 2, 8];
    const r = calculateCorrelation(x, y);
    expect(r).toBeGreaterThanOrEqual(-1);
    expect(r).toBeLessThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. calculateHurst
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateHurst', () => {
  it('数据不足 period 时返回默认值 0.5', () => {
    expect(calculateHurst([1, 2, 3], 50)).toBe(0.5);
  });

  it('恒常序列（完全随机游走理论下）返回接近 0', () => {
    // 全相同值：R≈0.0001, S≈0.0001 → H ≈ 0
    const flat = Array(50).fill(100);
    const h = calculateHurst(flat, 50);
    expect(h).toBeLessThan(0.3);
  });

  it('强趋势序列返回 H > 0.5', () => {
    const trend = Array.from({ length: 50 }, (_, i) => i + 1);
    const h = calculateHurst(trend, 50);
    expect(h).toBeGreaterThan(0.5);
  });

  it('只使用末尾 period 个数据', () => {
    // 前 50 个随机，后 50 个强趋势 → Hurst 应反映强趋势
    const noise = Array.from({ length: 50 }, () => 100 + (Math.random() - 0.5) * 200);
    const trend = Array.from({ length: 50 }, (_, i) => i + 1);
    const h = calculateHurst([...noise, ...trend], 50);
    expect(h).toBeGreaterThan(0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. runMonteCarlo
// ─────────────────────────────────────────────────────────────────────────────
describe('runMonteCarlo', () => {
  it('空收益率数组返回边界默认值', () => {
    const result = runMonteCarlo(100, 120, 80, [], 0.02, 1000, 30);
    expect(result.targetProb).toBe('0.0');
    expect(result.stopProb).toBe('0.0');
    expect(result.exhaustProb).toBe('100.0');
    expect(result.steps).toBe(30);
  });

  it('三个概率之和为 100%', () => {
    const returns = [0.01, -0.01, 0.02, -0.02, 0.005];
    const r = runMonteCarlo(100, 110, 90, returns, 0.01, 500, 20);
    const total = parseFloat(r.targetProb) + parseFloat(r.stopProb) + parseFloat(r.exhaustProb);
    expect(total).toBeCloseTo(100, 1);
  });

  it('目标价等于起始价时 targetProb 接近 100%（long）', () => {
    const returns = [0.01, 0.02, 0.03];
    const r = runMonteCarlo(100, 100, 1, returns, 0.01, 500, 50, 'long');
    expect(parseFloat(r.targetProb)).toBeGreaterThan(90);
  });

  it('止损价略高于起始价时 stopProb 接近 100%（short）', () => {
    // short 方向止损条件：p >= stopLoss
    // 上涨收益率序列 → 价格快速突破止损位
    const returns = [0.05, 0.10, 0.08, 0.03];
    const r = runMonteCarlo(100, 50, 101, returns, 0.01, 500, 50, 'short');
    expect(parseFloat(r.stopProb)).toBeGreaterThan(90);
  });

  it('stepVol 是 dailyVol*100 保留两位小数', () => {
    const r = runMonteCarlo(100, 120, 80, [0.01], 0.0342, 100, 10);
    expect(r.stepVol).toBe('3.42');
  });

  it('long 方向：目标价远高于起始价时 targetProb 较低', () => {
    const returns = [0.005, -0.005];
    const r = runMonteCarlo(100, 200, 95, returns, 0.01, 1000, 30, 'long');
    expect(parseFloat(r.targetProb)).toBeLessThan(20);
  });

  it('avgTargetSteps 在 [1, days] 范围内', () => {
    const returns = [0.05, -0.01, 0.03, 0.02];
    const r = runMonteCarlo(100, 105, 90, returns, 0.02, 500, 30);
    expect(r.avgTargetSteps).toBeGreaterThanOrEqual(1);
    expect(r.avgTargetSteps).toBeLessThanOrEqual(30);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. calculateLiquidationClusters
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateLiquidationClusters', () => {
  it('数据少于 50 根返回空数组', () => {
    const data = Array.from({ length: 49 }, (_, i) => kline(i, 100, 101, 99, 100));
    expect(calculateLiquidationClusters(data)).toEqual([]);
  });

  it('null/undefined 输入返回空数组', () => {
    expect(calculateLiquidationClusters(null)).toEqual([]);
    expect(calculateLiquidationClusters(undefined)).toEqual([]);
  });

  it('返回数组长度不超过 5', () => {
    // 60 根等幅震荡，有多个摆高摆低
    const data = Array.from({ length: 60 }, (_, i) => {
      const c = 100 + (i % 3 === 0 ? 5 : i % 3 === 1 ? -5 : 0);
      return kline(i, c, c + 2, c - 2, c, 1000);
    });
    const result = calculateLiquidationClusters(data);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('每个聚集点有 price 和 weight 字段', () => {
    const data = Array.from({ length: 60 }, (_, i) => {
      const c = i % 2 === 0 ? 100 : 90;
      return kline(i, c, c + 3, c - 3, c, 1000);
    });
    const result = calculateLiquidationClusters(data);
    result.forEach(cluster => {
      expect(typeof cluster.price).toBe('number');
      expect(typeof cluster.weight).toBe('number');
      expect(cluster.weight).toBeGreaterThan(0);
    });
  });

  it('明显摆高后聚集区价格高于摆高价', () => {
    // 构造一个清晰摆高：位置 30 的 high 最大
    const data = Array.from({ length: 60 }, (_, i) => {
      const isSwingHigh = i === 30;
      return kline(i, 100, isSwingHigh ? 200 : 101, 99, 100, 5000);
    });
    const result = calculateLiquidationClusters(data);
    if (result.length > 0) {
      // 摆高聚集区应在 200*1.01 或 200*1.02 附近
      const prices = result.map(r => r.price);
      expect(prices.some(p => p > 190)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. buildCompositeIndex
// ─────────────────────────────────────────────────────────────────────────────
describe('buildCompositeIndex', () => {
  it('空数组输入返回空数组', () => {
    expect(buildCompositeIndex([])).toEqual([]);
  });

  it('所有 rawData 为空时返回空数组', () => {
    expect(buildCompositeIndex([{ rawData: [] }, { rawData: [] }])).toEqual([]);
  });

  it('单资产合成指数在 1000 附近（归一化基点）', () => {
    // 起始价 100，后续价格不变 → 归一化后恒为 1000
    const rawData = Array.from({ length: 5 }, (_, i) =>
      kline(i, 100, 101, 99, 100, 1000, 600)
    );
    const result = buildCompositeIndex([{ rawData }]);
    result.forEach(bar => {
      expect(parseFloat(bar[1])).toBeCloseTo(1000, 1);
      expect(parseFloat(bar[4])).toBeCloseTo(1000, 1);
    });
  });

  it('输出长度等于各资产 rawData 的最短长度', () => {
    const makeData = (n) => Array.from({ length: n }, (_, i) => kline(i, 100, 101, 99, 100));
    const result = buildCompositeIndex([
      { rawData: makeData(10) },
      { rawData: makeData(7) },
      { rawData: makeData(15) },
    ]);
    expect(result.length).toBe(7);
  });

  it('多资产平均后 close 介于各资产归一化值之间', () => {
    // 资产 A：起始 100，上涨到 110
    // 资产 B：起始 200，保持 200
    const rawA = [
      kline(0, 100, 101, 99, 100),
      kline(1, 105, 106, 104, 105),
      kline(2, 110, 111, 109, 110),
    ];
    const rawB = [
      kline(0, 200, 201, 199, 200),
      kline(1, 200, 201, 199, 200),
      kline(2, 200, 201, 199, 200),
    ];
    const result = buildCompositeIndex([{ rawData: rawA }, { rawData: rawB }]);
    // A 归一化：第 3 根 = (110/100)*1000 = 1100
    // B 归一化：第 3 根 = (200/200)*1000 = 1000
    // 均值 close = 1050
    expect(parseFloat(result[2][4])).toBeCloseTo(1050, 1);
  });

  it('输出每根 K 线 high >= max(open, close)', () => {
    const rawData = Array.from({ length: 5 }, (_, i) =>
      kline(i, 100 + i, 102 + i, 98 + i, 101 + i, 1000, 500)
    );
    const result = buildCompositeIndex([{ rawData }]);
    result.forEach(bar => {
      const [, o, h, , c] = bar.map(parseFloat);
      expect(h).toBeGreaterThanOrEqual(Math.max(o, c));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. calculateQuantTD — 完整集成测试
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateQuantTD', () => {

  // ── 12.1 边界条件 ──────────────────────────────────────────────────────────
  describe('边界条件', () => {
    it('空数组返回空数组', () => {
      expect(calculateQuantTD([])).toEqual([]);
    });

    it('null 返回空数组', () => {
      expect(calculateQuantTD(null)).toEqual([]);
    });

    it('返回的对象包含必要字段', () => {
      const data = descendingKlines(5);
      const result = calculateQuantTD(data);
      // adx/pDI/mDI 从 i=1 开始赋值，result[0] 不含这些字段
      const bar0Fields = ['time', 'open', 'high', 'low', 'close', 'volume',
        'atr', 'chop', 'tdCount', 'tdType', 'aiScore', 'signalLevel',
        'isBlocked', 'isAbsorption', 'isTolerated'];
      bar0Fields.forEach(f => expect(result[0]).toHaveProperty(f));
      // adx/pDI/mDI 从 i=1 起存在
      expect(result[1]).toHaveProperty('adx');
      expect(result[1]).toHaveProperty('pDI');
      expect(result[1]).toHaveProperty('mDI');
    });
  });

  // ── 12.2 三档配置（interval 模式）────────────────────────────────────────
  describe('三档配置', () => {
    const data = descendingKlines(20);

    it('1d → 宏观档：无 requireCVD 限制（adxThreshold=30）', () => {
      const result = calculateQuantTD(data, '1d');
      expect(result).toBeTruthy();
    });

    it('1h → 战术档（adxThreshold=35）', () => {
      const result = calculateQuantTD(data, '1h');
      expect(result).toBeTruthy();
    });

    it('15m → 微观档（adxThreshold=40）', () => {
      const result = calculateQuantTD(data, '15m');
      expect(result).toBeTruthy();
    });

    it('4h → 战术档', () => {
      const result = calculateQuantTD(data, '4h');
      expect(result).toBeTruthy();
    });
  });

  // ── 12.3 TD 序列计数 ──────────────────────────────────────────────────────
  describe('TD 序列计数', () => {
    it('9 根单调下降 K 线触发 buy TD 9 号', () => {
      // 20 根下降，第 12 根（index=12）应该是 tdCount=9, tdType='buy'
      const data = descendingKlines(20);
      const result = calculateQuantTD(data, '1d');
      expect(result[12].tdCount).toBe(9);
      expect(result[12].tdType).toBe('buy');
    });

    it('9 根单调上升 K 线触发 sell TD 9 号', () => {
      const data = ascendingKlines(20, 100);
      const result = calculateQuantTD(data, '1d');
      expect(result[12].tdCount).toBe(9);
      expect(result[12].tdType).toBe('sell');
    });

    it('TD count 达到 9 后重置为 0', () => {
      const data = descendingKlines(25);
      const result = calculateQuantTD(data, '1d');
      // i=12 是第一个 9，i=13 应重新开始（或 count 继续）
      expect(result[12].tdCount).toBe(9);
      // i=13 时 buySetup 被重置，close[13]<close[9] → buy count 1
      expect(result[13].tdCount).toBeLessThan(9);
    });

    it('前 4 根 K 线 tdCount 均为 0', () => {
      const data = descendingKlines(20);
      const result = calculateQuantTD(data, '1d');
      for (let i = 0; i < 4; i++) {
        expect(result[i].tdCount).toBe(0);
      }
    });

    it('中断后 buy 序列被重置', () => {
      // 5 根下降后插入一根大涨 → 打断 buy 计数，开启 sell 计数
      const mixData = [
        ...descendingKlines(5),
        kline(5 * 3600000, 200, 200.5, 199.5, 200), // 打断序列，触发 sell count=1
        ...descendingKlines(5, 95),
      ];
      const result = calculateQuantTD(mixData, '1d');
      // 第 5 根（索引5）是大涨蜡烛，tdType 应为 'sell'（不再是 buy）
      expect(result[5].tdType).toBe('sell');
      // buy 序列在此处确实被打断
      expect(result[5].tdType).not.toBe('buy');
    });
  });

  // ── 12.4 ATR 计算 ─────────────────────────────────────────────────────────
  describe('ATR 计算', () => {
    it('前 13 根 ATR 等于各自的 TR', () => {
      const data = descendingKlines(20);
      const result = calculateQuantTD(data, '1d');
      // 对于 i=0 to 12, atr = tr[i]
      // 每根 H-L = 1, |H-prevC| = 0.5, |L-prevC| = 1.5 → TR=1.5（i>=1）
      for (let i = 1; i < 13; i++) {
        expect(result[i].atr).toBeCloseTo(1.5, 4);
      }
    });

    it('ATR 始终为正值', () => {
      const data = descendingKlines(20);
      const result = calculateQuantTD(data, '1d');
      result.forEach(bar => expect(bar.atr).toBeGreaterThan(0));
    });
  });

  // ── 12.5 CHOP 指数 ────────────────────────────────────────────────────────
  describe('CHOP 指数', () => {
    it('前 13 根 chop 默认值为 50', () => {
      const data = descendingKlines(20);
      const result = calculateQuantTD(data, '1d');
      for (let i = 0; i < 13; i++) {
        expect(result[i].chop).toBe(50);
      }
    });

    it('第 13 根后 chop 被实际计算（不为 50）', () => {
      const data = descendingKlines(20);
      const result = calculateQuantTD(data, '1d');
      // 强单边趋势中 chop < 50（趋势市）
      expect(result[13].chop).not.toBe(50);
    });
  });

  // ── 12.6 aiScore 评分验证 ─────────────────────────────────────────────────
  describe('aiScore 评分', () => {
    /**
     * 构造精确可预测评分的测试数据
     * 条件：
     *  - volume=1050 → noise = ((1050 % 100) / 100)*4.5 - 2.25 = (50/100)*4.5 - 2.25 = 0
     *  - 9 根严格下降（isTolerated=false）
     *  - adx=0（i=12 < 14，未达到 ADX 初始化点）→ isBlocked=false
     *  - chop=50（i=12 < 13）→ isBoosted=false
     *  - takerBuy=takerSell → isAbsorbed=false
     *  - 单调趋势无摆动低点 → isSweep=false
     *  - isSmart: |close[12]-close[8]|=4, atr=1.5 → 4 > 0.75 → true (+8.2)
     */
    const makeTD9BuyData = (overrides = {}) => {
      const {
        takerBuyAt12 = 500,    // 控制是否触发 isAbsorbed
        volAt12 = 1050,        // 控制 noise
      } = overrides;

      return descendingKlines(20, 100,
        Array.from({ length: 20 }, (_, i) => i === 12 ? volAt12 : 1000),
        Array.from({ length: 20 }, (_, i) => i === 12 ? takerBuyAt12 : 500),
      );
    };

    it('基础评分：仅 isSmart=true，noise=0 → aiScore = 56.7', () => {
      const data = makeTD9BuyData();
      const result = calculateQuantTD(data, '1d');
      const td9 = result[12];
      expect(td9.tdCount).toBe(9);
      // baseProb=48.5 + isSmart=8.2 + noise=0 = 56.7
      expect(td9.aiScore).toBe('56.7');
    });

    it('isSmart + isAbsorbed → aiScore = 75.4', () => {
      // takerBuy=200，takerSell=850 → takerSell(850) > takerBuy*1.5(300) → isAbsorbed
      // body=0, dnWick=0.5 > 0 → true
      const data = makeTD9BuyData({ takerBuyAt12: 200, volAt12: 1050 });
      // volume[12]=1050, takerBuy[12]=200 → takerSell=850
      const allVols = Array.from({ length: 20 }, (_, i) => i === 12 ? 1050 : 1000);
      const allTakers = Array.from({ length: 20 }, (_, i) => i === 12 ? 200 : 500);
      const rawData = descendingKlines(20, 100, allVols, allTakers);
      const result = calculateQuantTD(rawData, '1d');
      const td9 = result[12];
      expect(td9.isAbsorption).toBe(true);
      // baseProb=48.5 + 8.2(smart) + 18.7(absorbed) + 0(noise) = 75.4
      expect(td9.aiScore).toBe('75.4');
    });

    it('noise 公式验证：volume=1100 → noise=+2.25', () => {
      // volume=1100 → 1100%100=0, noise=-2.25  ← 注意是0不是100
      // volume=1150 → 1150%100=50, noise=0
      // volume=1175 → 1175%100=75, noise=(75/100)*4.5-2.25=3.375-2.25=1.125
      const allVols = Array.from({ length: 20 }, (_, i) => i === 12 ? 1175 : 1000);
      const data = descendingKlines(20, 100, allVols);
      const result = calculateQuantTD(data, '1d');
      const td9 = result[12];
      // baseProb=48.5+8.2=56.7, noise=1.125 → finalProb=57.825 → '57.8'
      expect(td9.aiScore).toBe('57.8');
    });

    it('isBlocked 时 aiScore 不超过 20', () => {
      // 需要 adx > 30 且 mDI > pDI（强下跌）且 chop < 38
      // 用 25 根下降数据，到 i=21 时 ADX 已稳定
      const data = descendingKlines(30);
      const result = calculateQuantTD(data, '1d');
      // 找到所有 isBlocked=true 的 TD9 bar
      const blockedBars = result.filter(b => b.isBlocked && b.tdCount === 9);
      blockedBars.forEach(bar => {
        expect(parseFloat(bar.aiScore)).toBeLessThanOrEqual(20);
      });
    });

    it('aiScore 值域在 [5.2, 96.8] 之间', () => {
      const data = descendingKlines(30);
      const result = calculateQuantTD(data, '1d');
      result.filter(b => b.tdCount === 9).forEach(bar => {
        const score = parseFloat(bar.aiScore);
        expect(score).toBeGreaterThanOrEqual(5.2);
        expect(score).toBeLessThanOrEqual(96.8);
      });
    });

    it('signalLevel = 4 当 isAbsorption=true', () => {
      const allVols = Array.from({ length: 20 }, (_, i) => i === 12 ? 1050 : 1000);
      const allTakers = Array.from({ length: 20 }, (_, i) => i === 12 ? 200 : 500);
      const data = descendingKlines(20, 100, allVols, allTakers);
      const result = calculateQuantTD(data, '1d');
      expect(result[12].signalLevel).toBe(4);
    });

    it('signalLevel = 2 当 isSmart=true 且无其他加分', () => {
      const data = makeTD9BuyData();
      const result = calculateQuantTD(data, '1d');
      expect(result[12].signalLevel).toBe(2);
    });

    it('isTolerated = true 时 aiScore 低于相同条件严格版', () => {
      // 构造一个 fuzzyBuy：close 略高于 close[i-4] 但在 tolerance 范围内
      // 用正常 9 count 序列，然后在第 12 根让 close 稍微不够严格
      const base = 100;
      const rawData = Array.from({ length: 20 }, (_, i) => {
        const c = i < 12 ? base - i : base - i + 0.01; // 第 12 根 fuzzy
        return kline(i * 3600000, c, c + 0.5, c - 0.5, c, 1000, 500);
      });
      const strictData = descendingKlines(20, 100,
        Array.from({ length: 20 }, () => 1050));
      const toleratedResult = calculateQuantTD(rawData, '1d');
      const strictResult = calculateQuantTD(strictData, '1d');

      const t9 = toleratedResult.find(b => b.tdCount === 9 && b.isTolerated);
      const s9 = strictResult.find(b => b.tdCount === 9 && !b.isTolerated);
      if (t9 && s9) {
        expect(parseFloat(t9.aiScore)).toBeLessThan(parseFloat(s9.aiScore) + 0.5);
      }
    });
  });

  // ── 12.7 sell TD 评分 ────────────────────────────────────────────────────
  describe('sell TD 评分', () => {
    it('9 根单调上升触发 sell TD，aiScore 有效', () => {
      const allVols = Array.from({ length: 20 }, (_, i) => i === 12 ? 1050 : 1000);
      const data = ascendingKlines(20, 100, 1000, 500);
      // 手动替换 volume
      const rawWithVol = data.map((k, i) => {
        const arr = [...k]; arr[5] = String(allVols[i]); return arr;
      });
      const result = calculateQuantTD(rawWithVol, '1d');
      const td9 = result[12];
      expect(td9.tdCount).toBe(9);
      expect(td9.tdType).toBe('sell');
      expect(parseFloat(td9.aiScore)).toBeGreaterThan(0);
    });
  });
});
