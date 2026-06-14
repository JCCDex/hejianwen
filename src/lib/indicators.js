/**
 * @file indicators.js
 * @description 量化指标与算法库
 *
 * 从 App.jsx 提取的纯函数集合，无副作用，无 React 依赖，可独立测试。
 *
 * 依赖 trading-signals 的函数：
 *   - calculateEMA  → EMAIndicator（pre-warm 预热方案）
 *   - calculateWMA  → WMAIndicator（直接替换）
 *   - calculateATR  → WSMA（TR 预处理 + Wilder's 平滑）
 *   - calculateStdDev → getStandardDeviation（总体标准差）
 *
 * 自定义实现（trading-signals 中无等价算法）：
 *   - calculateHMA, calculateALMA, calculateCorrelation, calculateHurst
 *   - runMonteCarlo, calculateLiquidationClusters
 *   - buildCompositeIndex, calculateQuantTD
 *
 * 数据格式约定（Binance K线数组）：
 *   kline[0]  = timestamp
 *   kline[1]  = open
 *   kline[2]  = high
 *   kline[3]  = low
 *   kline[4]  = close
 *   kline[5]  = volume（base asset）
 *   kline[9]  = takerBuyBaseVolume（主动买入量）
 */

import { EMA as EMAIndicator, WMA as WMAIndicator, WSMA, getStandardDeviation } from 'trading-signals';

// ─────────────────────────────────────────────────────────────────────────────
// 移动平均线
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 指数移动平均线（Exponential Moving Average）
 *
 * 公式：EMA[i] = price[i] × k + EMA[i-1] × (1-k)，k = 2 / (period + 1)
 * 初始种子：EMA[0] = data[0]（首值直接作为种子，无 SMA 预热）
 *
 * 实现策略（trading-signals pre-warm）：
 *   trading-signals EMAIndicator 内部公式与上述完全相同，但 isStable 需要
 *   喂入 period 次数据后才变为 true。
 *   解决方案：预先用 data[0] 喂入 (period-1) 次，使内部 prevEMA = data[0]，
 *   等价于"首值即种子"，此后每次 update 均处于 stable 状态。
 *
 * @param {number[]} data   收盘价数组
 * @param {number}   period EMA 周期
 * @returns {number[]}      与 data 等长的 EMA 数组
 */
export const calculateEMA = (data, period) => {
  if (!data || data.length === 0) return [0];
  const indicator = new EMAIndicator(period);
  for (let i = 0; i < period - 1; i++) indicator.update(data[0]);
  return data.map(v => Number(indicator.update(v).valueOf()));
};

/**
 * 加权移动平均线（Weighted Moving Average）
 *
 * 公式：WMA[i] = Σ(price[i-j] × (period-j)) / Σ(1..period)
 * 权重从最新到最旧线性递减（最新权重最高）。
 *
 * 实现：直接使用 trading-signals WMAIndicator；
 * pre-stable 阶段（数据不足 period 根）返回 null，此处填充为 0，
 * 与原版行为完全一致。
 *
 * @param {number[]} data   价格数组
 * @param {number}   period WMA 周期
 * @returns {number[]}      与 data 等长的 WMA 数组（前 period-1 个为 0）
 */
export const calculateWMA = (data, period) => {
  if (data.length < period || period <= 0) return new Array(data.length).fill(0);
  const indicator = new WMAIndicator(period);
  return data.map(v => {
    indicator.update(v);
    const r = indicator.getResult();
    return r != null ? Number(r.valueOf()) : 0;
  });
};

/**
 * 真实波动幅度均值（Average True Range，Wilder's ATR）
 *
 * TR（真实波幅）定义：
 *   TR[i] = max(High[i]-Low[i], |High[i]-Close[i-1]|, |Low[i]-Close[i-1]|)
 *
 * ATR 算法：
 *   ATR[0]  = 前 period 根 TR 的简单平均（SMA 初始化）
 *   ATR[i]  = (ATR[i-1] × (period-1) + TR[i]) / period   （Wilder's 平滑）
 *
 * 预处理方案（解决 trading-signals ATR 的首根 TR 差异）：
 *   trading-signals ATR 类直接喂 OHLC 时，首根蜡烛用 H-L（无 prevClose），
 *   导致 TR 序列偏移。解决方案：手动计算 TR 数组（从 i=1 开始，以 closes[0]
 *   作为 prevClose），再将 TR 序列喂入 WSMA（Wilder's Smoothed MA），
 *   WSMA 同样以 SMA 初始化，与 Wilder's ATR 定义完全等价。
 *
 * @param {number[]} highs   最高价数组
 * @param {number[]} lows    最低价数组
 * @param {number[]} closes  收盘价数组
 * @param {number}   period  ATR 周期（默认 14）
 * @returns {number[]}       ATR 数组，长度 = closes.length - period
 */
export const calculateATR = (highs, lows, closes, period = 14) => {
  const wsma = new WSMA(period);
  const results = [];
  for (let i = 1; i < closes.length; i++) {
    const h = highs[i], l = lows[i], pc = closes[i - 1];
    wsma.update(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    if (wsma.isStable) results.push(Number(wsma.getResultOrThrow().valueOf()));
  }
  return results;
};

/**
 * Hull 移动平均线（Hull Moving Average）
 *
 * 公式：HMA(n) = WMA(sqrt(n),  2×WMA(n/2) − WMA(n))
 * 特点：减少 WMA 的滞后性，同时保持平滑，对价格变化响应更快。
 *
 * 计算步骤：
 *   1. wmaHalf = WMA(data, floor(n/2))
 *   2. wmaFull = WMA(data, n)
 *   3. raw     = 2×wmaHalf − wmaFull        （去除滞后）
 *   4. HMA     = WMA(raw, floor(sqrt(n)))   （再次平滑）
 *
 * @param {number[]} data   价格数组
 * @param {number}   period HMA 周期
 * @returns {number[]}      与 data 等长的 HMA 数组
 */
export const calculateHMA = (data, period) => {
  if (data.length < period || period <= 0) return new Array(data.length).fill(0);
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));
  const wmaHalf = calculateWMA(data, halfPeriod);
  const wmaFull = calculateWMA(data, period);
  const rawHMA = data.map((_, i) => (2 * wmaHalf[i]) - wmaFull[i]);
  return calculateWMA(rawHMA, sqrtPeriod);
};

/**
 * Arnaud Legoux 移动平均线（ALMA）
 *
 * 公式：ALMA[i] = Σ(price[i-period+1+j] × w[j]) / Σw，j = 0..period-1
 *       w[j] = exp(-(j - m)² / (2s²))   （Gaussian 核）
 *       m = offset × (period - 1)
 *       s = period / sigma
 *
 * 特点：用高斯权重代替线性权重，通过 offset 和 sigma 控制平滑中心和带宽，
 * 可在低滞后和低噪声之间灵活权衡。
 *
 * 参数说明：
 *   offset = 0.85（默认）→ 权重中心偏向末尾（最近数据），响应快
 *   offset = 0.5          → 权重中心居中，类似 SMA
 *   sigma  = 6（默认）   → 高斯曲线较窄，权重集中
 *   sigma  越大           → 高斯曲线越宽，越接近等权重
 *
 * @param {number[]} data    价格数组
 * @param {number}   period  ALMA 周期
 * @param {number}   offset  权重中心偏移量（0~1，默认 0.85）
 * @param {number}   sigma   高斯曲线宽度参数（默认 6）
 * @returns {number[]}       与 data 等长的 ALMA 数组（前 period-1 个为 0）
 */
export const calculateALMA = (data, period, offset = 0.85, sigma = 6) => {
  let almaArray = new Array(data.length).fill(0);
  if (data.length < period || period <= 0) return almaArray;
  const m = offset * (period - 1);
  const s = period / sigma;
  let weights = [];
  let weightSum = 0;
  for (let i = 0; i < period; i++) {
    const w = Math.exp(-Math.pow(i - m, 2) / (2 * s * s));
    weights.push(w);
    weightSum += w;
  }
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - period + 1 + j] * weights[j];
    almaArray[i] = sum / weightSum;
  }
  return almaArray;
};

// ─────────────────────────────────────────────────────────────────────────────
// 统计指标
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 总体标准差与均值（Population Standard Deviation）
 *
 * 公式：
 *   mean = Σx / n
 *   σ    = sqrt(Σ(x - mean)² / n)    （除以 N，非样本标准差 N-1）
 *
 * 实现：stdDev 由 trading-signals getStandardDeviation() 计算（总体标准差），
 * mean 手动计算（该函数仅返回 stdDev）。
 *
 * @param {number[]} arr 数值数组
 * @returns {{ mean: number, stdDev: number }}
 */
export const calculateStdDev = (arr) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = getStandardDeviation(arr);
  return { mean, stdDev };
};

/**
 * Pearson 线性相关系数（Pearson Correlation Coefficient）
 *
 * 公式：r = (n·ΣXY − ΣX·ΣY) / sqrt((n·ΣX²−(ΣX)²) × (n·ΣY²−(ΣY)²))
 *
 * 返回值范围：[-1, 1]
 *   r ≈  1 → 完全正相关
 *   r ≈ -1 → 完全负相关
 *   r ≈  0 → 无线性相关
 *
 * 用途：衡量两个价格序列（如 BTC vs ETH）的同步性；
 * 也可用于衡量价格与时间序列的趋势线性度。
 *
 * @param {number[]} x 序列一
 * @param {number[]} y 序列二（长度须与 x 相同）
 * @returns {number}  相关系数，长度不等或空数组返回 0
 */
export const calculateCorrelation = (x, y) => {
  if (x.length !== y.length || x.length === 0) return 0;
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;
  return numerator / denominator;
};

/**
 * Hurst 指数（Hurst Exponent，R/S 分析法）
 *
 * 公式：H = log(R/S) / log(period)
 *   R = 累积偏差序列的极差（max - min）
 *   S = 序列的标准差（总体）
 *
 * 解读：
 *   H > 0.5 → 趋势持续性（动量市场，趋势更可能延续）
 *   H < 0.5 → 均值回复性（振荡市场，价格倾向于回归均值）
 *   H ≈ 0.5 → 随机游走（价格无记忆）
 *
 * 注意：仅使用末尾 period 根收盘价进行计算；
 * 数据不足 period 时返回默认值 0.5（随机游走假设）。
 *
 * @param {number[]} closes 收盘价数组
 * @param {number}   period 计算窗口（默认 50）
 * @returns {number}        Hurst 指数（0~1）
 */
export const calculateHurst = (closes, period = 50) => {
  if (closes.length < period) return 0.5;
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  let maxDev = -Infinity, minDev = Infinity, devSum = 0, devSqSum = 0;
  for (let i = 0; i < period; i++) {
    devSum += (slice[i] - mean);
    if (devSum > maxDev) maxDev = devSum;
    if (devSum < minDev) minDev = devSum;
    devSqSum += Math.pow(slice[i] - mean, 2);
  }
  const R = Math.max(maxDev - minDev, 0.0001);
  const S = Math.max(Math.sqrt(devSqSum / period), 0.0001);
  return Math.log(R / S) / Math.log(period);
};

// ─────────────────────────────────────────────────────────────────────────────
// 交易系统专用算法
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 历史 Bootstrap 蒙特卡洛模拟（Monte Carlo Price Simulation）
 *
 * 通过随机重采样历史日收益率，模拟价格未来路径，
 * 计算触及目标价、止损价、时间耗尽三种结局的概率。
 *
 * 算法：
 *   重复 sims 次独立模拟路径：
 *     每一步随机从 historicalReturns 中抽取一个收益率（有放回）
 *     price = price × (1 + return × volScale + drift)
 *     判断是否触及 target 或 stopLoss
 *
 * 相比正态分布假设的优势：
 *   使用真实历史收益率分布，天然保留市场的肥尾、跳空、非对称性。
 *
 * @param {number}   startPrice        当前价格
 * @param {number}   target            目标价（多头：高于当前；空头：低于当前）
 * @param {number}   stopLoss          止损价（多头：低于当前；空头：高于当前）
 * @param {number[]} historicalReturns 历史日收益率数组（小数，如 0.02 表示 +2%）
 * @param {number}   dailyVol          日波动率（用于 stepVol 展示，不参与模拟计算）
 * @param {number}   sims              模拟路径数量（默认 2000）
 * @param {number}   days              最大模拟天数（默认 50）
 * @param {string}   direction         方向：'long'（多）或 'short'（空）
 * @param {number}   drift             方向漂移修正（默认 0，正值偏多，负值偏空）
 * @param {number}   volScale          波动率缩放因子（默认 1）
 * @returns {{
 *   targetProb:    string,  // 触及目标价的概率（%，保留 1 位小数）
 *   stopProb:      string,  // 触及止损价的概率
 *   exhaustProb:   string,  // 时间耗尽（两头都未触及）的概率
 *   stepVol:       string,  // 日波动率百分比（用于展示）
 *   steps:         number,  // 最大模拟步数
 *   avgTargetSteps:number,  // 触及目标价的平均所需天数
 * }}
 */
export const runMonteCarlo = (
  startPrice, target, stopLoss, historicalReturns, dailyVol,
  sims = 2000, days = 50, direction = 'long', drift = 0, volScale = 1
) => {
  let hitsTarget = 0, hitsStop = 0, totalTargetSteps = 0;
  const retLen = historicalReturns.length;
  if (retLen === 0) return { targetProb: '0.0', stopProb: '0.0', exhaustProb: '100.0', stepVol: '0.00', steps: days, avgTargetSteps: days };

  for (let i = 0; i < sims; i++) {
    let p = startPrice;
    for (let d = 0; d < days; d++) {
      const randIdx = Math.floor(Math.random() * retLen);
      const simulatedReturn = historicalReturns[randIdx] * volScale + drift;
      p = p * (1 + simulatedReturn);
      if (direction === 'long') {
        if (p >= target) { hitsTarget++; totalTargetSteps += (d + 1); break; }
        if (p <= stopLoss) { hitsStop++; break; }
      } else {
        if (p <= target) { hitsTarget++; totalTargetSteps += (d + 1); break; }
        if (p >= stopLoss) { hitsStop++; break; }
      }
    }
  }
  return {
    targetProb: ((hitsTarget / sims) * 100).toFixed(1),
    stopProb: ((hitsStop / sims) * 100).toFixed(1),
    exhaustProb: (((sims - hitsTarget - hitsStop) / sims) * 100).toFixed(1),
    stepVol: (dailyVol * 100).toFixed(2),
    steps: days,
    avgTargetSteps: hitsTarget > 0 ? (totalTargetSteps / hitsTarget) : days,
  };
};

/**
 * 爆仓聚集区估算（Liquidation Cluster Detection）
 *
 * 基于"杠杆止损单集中在重要摆高/摆低外侧"的市场微结构假设，
 * 估算最近行情中最可能触发连锁爆仓的价格区域。
 *
 * 算法：
 *   1. 取最近 150 根 K 线（滚动窗口）
 *   2. 识别摆高（Swing High）：当前 High > 前后各 2 根的 High
 *      识别摆低（Swing Low）：当前 Low  < 前后各 2 根的 Low
 *   3. 在摆高处标记两个爆仓价位（空单密集区）：
 *        +1%（紧密区）→ 权重 = (vol/maxVol) × 2
 *        +2%（宽松区）→ 权重 = (vol/maxVol) × 1
 *   4. 在摆低处标记两个爆仓价位（多单密集区）：
 *        -1%（紧密区）→ 权重 = (vol/maxVol) × 2
 *        -2%（宽松区）→ 权重 = (vol/maxVol) × 1
 *   5. 按权重降序排列，返回 Top 5 聚集区
 *
 * 权重逻辑：摆高/摆低处成交量越大，说明在此价位布仓的人越多，
 * 对应外侧聚集的止损/爆仓单也越多。
 *
 * 输入格式兼容：Binance K线数组（d[2]=high, d[3]=low, d[5]=vol）
 * 或对象格式（d.high, d.low, d.volume）
 *
 * @param {Array} data K线数据数组（长度 < 50 时返回空数组）
 * @returns {{ price: number, weight: number }[]} 最多 5 个爆仓聚集区，按权重降序
 */
export const calculateLiquidationClusters = (data) => {
  if (!data || data.length < 50) return [];
  let bins = {};
  let recent = data.slice(-150);
  let maxV = Math.max(...recent.map(d => parseFloat(d[5] || d.volume)), 0.0001);

  for (let i = 2; i < recent.length - 2; i++) {
    let d = recent[i];
    let high = parseFloat(d.high || d[2]); let low = parseFloat(d.low || d[3]); let vol = parseFloat(d.volume || d[5]);
    let prev1High = parseFloat(recent[i-1].high || recent[i-1][2]); let prev2High = parseFloat(recent[i-2].high || recent[i-2][2]);
    let next1High = parseFloat(recent[i+1].high || recent[i+1][2]); let next2High = parseFloat(recent[i+2].high || recent[i+2][2]);
    let prev1Low = parseFloat(recent[i-1].low || recent[i-1][3]); let prev2Low = parseFloat(recent[i-2].low || recent[i-2][3]);
    let next1Low = parseFloat(recent[i+1].low || recent[i+1][3]); let next2Low = parseFloat(recent[i+2].low || recent[i+2][3]);

    let isSwingHigh = high > prev1High && high > prev2High && high > next1High && high > next2High;
    let isSwingLow = low < prev1Low && low < prev2Low && low < next1Low && low < next2Low;

    if (isSwingHigh) {
      // 空单止损/爆仓聚集在摆高上方
      let p100 = (high * 1.01).toFixed(4); let p50 = (high * 1.02).toFixed(4);
      bins[p100] = (bins[p100] || 0) + (vol/maxV) * 2; bins[p50] = (bins[p50] || 0) + (vol/maxV);
    }
    if (isSwingLow) {
      // 多单止损/爆仓聚集在摆低下方
      let p100 = (low * 0.99).toFixed(4); let p50 = (low * 0.98).toFixed(4);
      bins[p100] = (bins[p100] || 0) + (vol/maxV) * 2; bins[p50] = (bins[p50] || 0) + (vol/maxV);
    }
  }
  let sorted = Object.entries(bins).map(([price, weight]) => ({ price: parseFloat(price), weight })).sort((a,b) => b.weight - a.weight);
  return sorted.slice(0, 5);
};

/**
 * 多币种等权合成指数（Composite Index Builder）
 *
 * 将多个币种的 K 线序列归一化后等权平均，合成一条代表"综合市场"的指数 K 线，
 * 消除各币种价格量级差异（如 BTC≈30000 vs SOL≈30），类似等权指数基金。
 *
 * 算法：
 *   1. 时间对齐：取各币种末尾最短公共长度（min K线数）
 *   2. 归一化：price_norm = (price / basePrice) × 1000
 *              basePrice = 每个币种序列第一根 K 线的 open 价
 *   3. 按时间步求均值：
 *        avgOpen, avgClose = 各币种归一化值的算术平均
 *        avgHigh = max(均值, avgOpen, avgClose)   保证 H ≥ max(O,C)
 *        avgLow  = min(均值, avgOpen, avgClose)   保证 L ≤ min(O,C)
 *   4. CVD 买卖比：avg(各币种 takerBuy/volume 比例)
 *      → 合成指数保留主动买入力度信息，供 CVD 分析使用
 *   5. 输出标准 Binance K线格式，可直接喂入 calculateQuantTD
 *
 * @param {{ rawData: Array[] }[]} results 各币种数据对象数组
 * @returns {Array[]} 合成指数的标准 K 线数组
 */
export const buildCompositeIndex = (results) => {
  const validResults = results.filter(r => r.rawData && r.rawData.length > 0);
  if (validResults.length === 0) return [];
  const minLen = Math.min(...validResults.map(r => r.rawData.length));
  const alignedResults = validResults.map(r => r.rawData.slice(-minLen));
  const basePrices = alignedResults.map(r => parseFloat(r[0][1]) || 1);

  const indexRawData = [];
  for (let i = 0; i < minLen; i++) {
    let sumOpen = 0, sumHigh = 0, sumLow = 0, sumClose = 0, sumBuyRatio = 0;
    let timestamp = alignedResults[0][i][0];
    for (let j = 0; j < alignedResults.length; j++) {
      const kline = alignedResults[j][i]; const base = basePrices[j];
      sumOpen += (parseFloat(kline[1]) / base) * 1000; sumHigh += (parseFloat(kline[2]) / base) * 1000;
      sumLow += (parseFloat(kline[3]) / base) * 1000; sumClose += (parseFloat(kline[4]) / base) * 1000;
      const vol = parseFloat(kline[5]); const takerBuy = parseFloat(kline[9]);
      sumBuyRatio += vol > 0 ? (takerBuy / vol) : 0.5;
    }
    const count = alignedResults.length;
    const avgOpen = sumOpen / count; const avgClose = sumClose / count;
    const avgHigh = Math.max(sumHigh / count, avgOpen, avgClose);
    const avgLow = Math.min(sumLow / count, avgOpen, avgClose);
    const avgBuyRatio = sumBuyRatio / count;
    const dummyVol = 1000; const dummyTakerBuy = dummyVol * avgBuyRatio;
    indexRawData.push([timestamp, avgOpen.toString(), avgHigh.toString(), avgLow.toString(), avgClose.toString(), dummyVol.toString(), 0, 0, 0, dummyTakerBuy.toString(), 0, 0]);
  }
  return indexRawData;
};

/**
 * 量化 TD 多因子信号系统（Quantitative TD Sequential + Multi-Factor Scoring）
 *
 * 核心功能：对每根 K 线计算 TD 序列计数，并在 TD 9 号出现时输出多因子量化评分。
 * 这不是纯粹的 TD Sequential，而是融合了趋势、震荡、成交量结构的综合信号引擎。
 *
 * ── 三档时间周期配置 ───────────────────────────────────────────────────────
 *   '1d'（默认） → 宏观趋势档：adxThreshold=30, tol=15%ATR
 *   '1h'/'4h'   → 战术震荡档：adxThreshold=35, tol=25%ATR
 *   '15m'       → 微观肉搏档：adxThreshold=40, tol=30%ATR, requireCVD=true
 *
 * ── 五层计算流水线 ───────────────────────────────────────────────────────────
 *
 * 第一层：ATR（简化版，内部使用）
 *   i=0..12：atr = tr[i]（预热期，直接用原始 TR）
 *   i≥13    ：atr = 14 根 TR 的简单移动平均（SMA-14，非 Wilder's）
 *   注：此处有意简化以降低计算复杂度，与 calculateATR 函数略有差异
 *
 * 第二层：ADX / DMI（Wilder's 趋势方向强度）
 *   pDM  = 正向运动（+DM）：当天 high 净上涨量
 *   mDM  = 负向运动（-DM）：当天 low  净下跌量
 *   经 14 周期 Wilder's 平滑后：
 *     pDI = +DM平滑 / TR平滑 × 100  （多头力量百分比）
 *     mDI = -DM平滑 / TR平滑 × 100  （空头力量百分比）
 *     DX  = |pDI-mDI| / (pDI+mDI) × 100  （方向分歧指数）
 *     ADX = DX 的 14 周期 Wilder's 平滑    （趋势强度）
 *       ADX > 30 → 单边趋势市；ADX < 25 → 震荡盘整
 *
 * 第三层：CHOP 指数（Choppiness Index，震荡/趋势识别）
 *   CHOP = 100 × log₁₀(Σ14TR / (Max14High − Min14Low)) / log₁₀(14)
 *   CHOP > 61 → 震荡市（能量消耗，区间震荡）
 *   CHOP < 38 → 趋势市（方向明确，单边延伸）
 *   预热期（i<13）填充默认值 50
 *
 * 第四层：TD Sequential 计数（改版，加入容错机制）
 *   经典规则：close[i] < close[i-4] → buy 计数 +1；连续 9 根触发信号
 *   改版创新：
 *     • 容错模糊匹配（isTolerated）：
 *         close 未能严格达标，但偏差在 ATR × toleranceFactor 以内，
 *         允许继续计数但会在评分中扣分（-5.1）
 *     • 方向切换立即重置：买卖序列互斥，一旦反向则归零重新计数
 *     • 达到 9 后自动重置，等待下一轮信号
 *
 * 第五层：TD9 出现时的 AI 多因子评分（aiScore）
 *   基础胜率：baseProb = 48.5（历史统计的随机基准线）
 *
 *   加分项（信号质量增益）：
 *     +8.2   isSmart    │ 本根实体涨跌幅 > 0.5×ATR（有实质性价格动作）
 *     +12.5  isBoosted  │ CHOP > 61（震荡市中 TD 反转更可信）
 *     +14.3  isSweep    │ 本根刺穿近 50 根内的摆高/摆低（流动性猎取后反转）
 *     +18.7  isAbsorbed │ 吸筹/吸压形态：
 *                          买 TD：下影线 > 实体×1.5 且 takerSell > takerBuy×1.5
 *                                  → 大量主动抛盘被承接（机构吸筹）
 *                          卖 TD：上影线 > 实体×1.5 且 takerBuy  > takerSell×1.5
 *                                  → 大量主动买盘被压制（机构派发）
 *
 *   减分项：
 *     -5.1   isTolerated│ 本次 TD 计数靠容错匹配维持（信号质量偏低）
 *     -45.5  isBlocked  │ ADX>阈值 且 CHOP<38（单边强趋势）且 DI 方向与信号相反
 *                          → 逆势摸底/猜顶，严重惩罚，阻止逆势操作
 *
 *   噪声修正（确定性扰动，非真随机）：
 *     noise = ((volume % 100) / 100) × 4.5 − 2.25   范围约 [-2.25, +2.25]
 *     利用成交量的低位数字引入微扰，使相似市况下的得分有细微差异
 *
 *   最终公式：
 *     finalProb = clamp(baseProb + noise, 12.5, 96.8)
 *     if isBlocked: finalProb = max(finalProb − 45.5, 5.2)
 *     aiScore = finalProb.toFixed(1)   范围：[5.2, 96.8]
 *
 *   信号等级（signalLevel）：
 *     4 = isAbsorption（吸筹/吸压，最高质量）
 *     3 = isSweep 或 isBoosted（流动性猎取 或 震荡加持）
 *     2 = isSmart（有实质性价格动作）
 *     1 = 基础 TD9（无额外加成）
 *
 * @param {Array[]}     rawData     Binance K线数组
 * @param {string}      interval    时间周期（'1d'|'4h'|'1h'|'15m'，默认 '1d'）
 * @param {object|null} macroStatus 宏观市场状态（预留参数，当前未使用）
 * @returns {object[]} 每根 K 线对象，新增字段：
 *   atr, adx, pDI, mDI, chop, tdCount, tdType, isTolerated,
 *   isBlocked, isAbsorption, aiScore, signalLevel, signalReason
 */
export const calculateQuantTD = (rawData, interval = '1d', macroStatus = null) => {
  if (!rawData || rawData.length === 0) return [];
  let config = { adxThreshold: 30, toleranceFactor: 0.15, requireCVD: false, modeName: '宏观趋势档' };
  if (['15m'].includes(interval)) config = { adxThreshold: 40, toleranceFactor: 0.30, requireCVD: true, modeName: '微观肉搏档' };
  else if (['1h', '4h'].includes(interval)) config = { adxThreshold: 35, toleranceFactor: 0.25, requireCVD: false, modeName: '战术震荡档' };

  // 解析原始 K 线，计算 CVD delta
  let data = rawData.map(d => {
    let vol = parseFloat(d[5]); let takerBuy = parseFloat(d[9]); let takerSell = vol - takerBuy;
    return { time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]), volume: vol, takerBuy, takerSell, delta: takerBuy - takerSell };
  });

  // ── 第一层：ATR（简化 SMA-14，预热期直接用 TR）─────────────────────────────
  let tr = [], atr = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) tr.push(data[i].high - data[i].low);
    else tr.push(Math.max(data[i].high - data[i].low, Math.abs(data[i].high - data[i - 1].close), Math.abs(data[i].low - data[i - 1].close)));
  }
  for (let i = 0; i < data.length; i++) {
    if (i < 13) atr.push(tr[i]);
    else { let sum = 0; for (let j = 0; j < 14; j++) sum += tr[i - j]; atr.push(sum / 14); }
    data[i].atr = atr[i];
  }

  // ── 第二层：ADX / DMI（Wilder's 趋势方向强度）────────────────────────────
  for (let i = 1; i < data.length; i++) {
    let upMove = data[i].high - data[i - 1].high; let downMove = data[i - 1].low - data[i].low;
    data[i].pDM = (upMove > downMove && upMove > 0) ? upMove : 0;
    data[i].mDM = (downMove > upMove && downMove > 0) ? downMove : 0;
  }
  let smoothTR = 0, smoothPDM = 0, smoothMDM = 0;
  for (let i = 1; i < data.length; i++) {
    if (i <= 14) {
      // 前 14 根：累加用于 SMA 初始化
      smoothTR += tr[i]; smoothPDM += data[i].pDM; smoothMDM += data[i].mDM;
      if (i === 14) {
        data[i].pDI = smoothTR === 0 ? 0 : 100 * smoothPDM / smoothTR;
        data[i].mDI = smoothTR === 0 ? 0 : 100 * smoothMDM / smoothTR;
        data[i].dx = (data[i].pDI + data[i].mDI === 0) ? 0 : 100 * Math.abs(data[i].pDI - data[i].mDI) / (data[i].pDI + data[i].mDI);
        data[i].adx = data[i].dx;  // 初始 ADX = 初始 DX
      } else { data[i].adx = 0; data[i].pDI = 0; data[i].mDI = 0; }
    } else {
      // 第 15 根起：Wilder's 指数平滑（等价于 EMA(k=1/14)）
      smoothTR = smoothTR - (smoothTR / 14) + tr[i];
      smoothPDM = smoothPDM - (smoothPDM / 14) + data[i].pDM;
      smoothMDM = smoothMDM - (smoothMDM / 14) + data[i].mDM;
      data[i].pDI = smoothTR === 0 ? 0 : 100 * smoothPDM / smoothTR;
      data[i].mDI = smoothTR === 0 ? 0 : 100 * smoothMDM / smoothTR;
      data[i].dx = (data[i].pDI + data[i].mDI === 0) ? 0 : 100 * Math.abs(data[i].pDI - data[i].mDI) / (data[i].pDI + data[i].mDI);
      data[i].adx = (data[i - 1].adx * 13 + data[i].dx) / 14;
    }
  }

  // ── 第三层：CHOP 指数（震荡/趋势识别）───────────────────────────────────
  for (let i = 0; i < data.length; i++) {
    if (i >= 13) {
      let sumTR = 0, maxH = -Infinity, minL = Infinity;
      for (let j = 0; j < 14; j++) {
        sumTR += tr[i - j];
        if (data[i - j].high > maxH) maxH = data[i - j].high;
        if (data[i - j].low < minL) minL = data[i - j].low;
      }
      data[i].chop = (maxH - minL === 0) ? 50 : 100 * Math.log10(sumTR / (maxH - minL)) / Math.log10(14);
    } else { data[i].chop = 50; }  // 预热期默认中性值
  }

  // ── 第四层 & 第五层：TD 计数 + TD9 评分 ──────────────────────────────────
  let buySetup = 0, sellSetup = 0;
  for (let i = 0; i < data.length; i++) {
    data[i].tdCount = 0; data[i].tdType = null; data[i].signalLevel = 0; data[i].signalReason = [];
    data[i].isTolerated = false; data[i].isBlocked = false; data[i].isAbsorption = false; data[i].aiScore = 0;

    if (i >= 4) {
      let tolerance = config.toleranceFactor * (data[i].atr || 0);
      let strictBuy = data[i].close < data[i - 4].close;
      let fuzzyBuy = data[i].close < (data[i - 4].close + tolerance);   // 容错买入条件
      let strictSell = data[i].close > data[i - 4].close;
      let fuzzySell = data[i].close > (data[i - 4].close - tolerance);  // 容错卖出条件

      if (strictBuy) { buySetup++; sellSetup = 0; data[i].tdCount = buySetup; data[i].tdType = 'buy'; }
      else if (fuzzyBuy && buySetup > 0) { buySetup++; sellSetup = 0; data[i].tdCount = buySetup; data[i].tdType = 'buy'; data[i].isTolerated = true; }
      else if (strictSell) { sellSetup++; buySetup = 0; data[i].tdCount = sellSetup; data[i].tdType = 'sell'; }
      else if (fuzzySell && sellSetup > 0) { sellSetup++; buySetup = 0; data[i].tdCount = sellSetup; data[i].tdType = 'sell'; data[i].isTolerated = true; }
      else { buySetup = 0; sellSetup = 0; }
      if (buySetup === 9) buySetup = 0;   // 到 9 后重置，等待下一轮
      if (sellSetup === 9) sellSetup = 0;
    }

    // TD 9 出现 → 触发多因子评分
    if (data[i].tdCount === 9) {
      // 力度判断：实体涨跌 > 0.5×ATR 才算"有效力度"
      let isSmart = Math.abs(data[i].close - data[i - 4].close) > (0.5 * data[i].atr);
      let isBlocked = false; let isBoosted = false;

      // 市场状态过滤
      if (data[i].adx > config.adxThreshold && data[i].chop < 38) {
        // 单边强趋势中，逆势 TD 直接被封锁
        if (data[i].tdType === 'buy' && data[i].mDI > data[i].pDI) isBlocked = true;
        else if (data[i].tdType === 'sell' && data[i].pDI > data[i].mDI) isBlocked = true;
      } else if (data[i].chop > 61) {
        isBoosted = true;  // 震荡市中 TD 反转更可信，给予加成
      }
      data[i].isBlocked = isBlocked;

      // 吸筹/吸压形态检测（K 线形态 + 主动成交量结构）
      let body = Math.abs(data[i].close - data[i].open);
      let upWick = data[i].high - Math.max(data[i].open, data[i].close);
      let dnWick = Math.min(data[i].open, data[i].close) - data[i].low;
      let isAbsorbed = false;
      if (data[i].tdType === 'sell' && upWick > body * 1.5 && data[i].takerBuy > data[i].takerSell * 1.5) isAbsorbed = true;
      else if (data[i].tdType === 'buy' && dnWick > body * 1.5 && data[i].takerSell > data[i].takerBuy * 1.5) isAbsorbed = true;
      data[i].isAbsorption = isAbsorbed;

      // 流动性猎取检测（Liquidity Sweep）：是否刺穿了近 50 根内的摆高/摆低
      let isSweep = false;
      for (let k = i - 1; k >= Math.max(0, i - 50); k--) {
        let isSwingHigh = data[k].high > data[k-1]?.high && data[k].high > data[k+1]?.high;
        let isSwingLow = data[k].low < data[k-1]?.low && data[k].low < data[k+1]?.low;
        if (data[i].tdType === 'sell' && isSwingHigh && data[i].high > data[k].high && data[i].close < data[k].high) { isSweep = true; break; }
        if (data[i].tdType === 'buy' && isSwingLow && data[i].low < data[k].low && data[i].close > data[k].low) { isSweep = true; break; }
      }

      // ── 多因子评分计算 ──
      let baseProb = 48.5;
      if (isSmart)           baseProb += 8.2;
      if (isBoosted)         baseProb += 12.5;
      if (isSweep)           baseProb += 14.3;
      if (isAbsorbed)        baseProb += 18.7;
      if (data[i].isTolerated) baseProb -= 5.1;

      // 确定性噪声：利用成交量低位数字引入微扰，范围约 [-2.25, +2.25]
      let noise = ((data[i].volume % 100) / 100) * 4.5 - 2.25;
      let finalProb = Math.min(Math.max(baseProb + noise, 12.5), 96.8);
      if (isBlocked) finalProb = Math.max(finalProb - 45.5, 5.2);  // 封锁惩罚

      data[i].aiScore = finalProb.toFixed(1);
      data[i].signalLevel = isAbsorbed ? 4 : (isSweep || isBoosted) ? 3 : (isSmart ? 2 : 1);
    }
  }
  return data;
};
