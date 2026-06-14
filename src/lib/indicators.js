// ==========================================
// 纯函数数学与统计工具库
// 从 App.jsx 提取，无副作用，无 React 依赖
// trading-signals 用于：EMA（稳定期）、WMA、StandardDeviation
// ==========================================

import { EMA as EMAIndicator, WMA as WMAIndicator, WSMA, getStandardDeviation } from 'trading-signals';

// ── EMA ──────────────────────────────────────────────────────────────────────
// trading-signals EMA 内部公式与原版完全一致（首值作 seed，k = 2/(period+1)），
// 差异仅在于 isStable 触发时机（需 period 次 update 后才为 true）。
//
// 参数转换方案（pre-warm）：
//   先用 data[0] 预热 (period-1) 次 → 使 indicator 内部 prevEMA = data[0]，
//   与原版"首值即 seed"等价；此后每次 update 都处于 stable 状态，
//   getResultOrThrow() 值与原版逐点吻合。
export const calculateEMA = (data, period) => {
  if (!data || data.length === 0) return [0];
  const indicator = new EMAIndicator(period);
  // Pre-warm: 用 data[0] 预热 period-1 次，使内部状态等价于"data[0] 作为 EMA 初始种子"
  for (let i = 0; i < period - 1; i++) indicator.update(data[0]);
  // 此后喂入真实数据，indicator 从第一个真实值起即处于 stable 状态
  return data.map(v => Number(indicator.update(v).valueOf()));
};

// ── WMA ──────────────────────────────────────────────────────────────────────
// trading-signals WMA 返回标准加权均值；pre-stable 阶段 getResult() = undefined，
// 填 0 与原版行为完全一致。
export const calculateWMA = (data, period) => {
  if (data.length < period || period <= 0) return new Array(data.length).fill(0);
  const indicator = new WMAIndicator(period);
  return data.map(v => {
    indicator.update(v);
    const r = indicator.getResult();
    return r != null ? Number(r.valueOf()) : 0;
  });
};

// ── ATR ──────────────────────────────────────────────────────────────────────
// 用户洞察：数据格式差异（而非算法差异）可通过预处理解决。
//
// 预处理方案：
//   1. 手动计算 TR 数组（从 i=1 开始，prevClose = closes[0]）
//      → 这是"将交易所原始 OHLC 转换为标准 TR 序列"的格式转换步骤
//   2. 将 TR 序列喂入 WSMA（Wilder's Smoothed MA，即 trading-signals 的 WSMA）
//      WSMA 用 SMA 初始化，与 Wilder's ATR 定义完全一致
//
// 等价验证：period=3, TR=[4,2,2,2]
//   WSMA[0] = (4+2+2)/3 = 8/3 ✓  WSMA[1] = (8/3×2+2)/3 = 22/9 ✓
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


export const calculateHMA = (data, period) => {
  if (data.length < period || period <= 0) return new Array(data.length).fill(0);
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));
  const wmaHalf = calculateWMA(data, halfPeriod);
  const wmaFull = calculateWMA(data, period);
  const rawHMA = data.map((_, i) => (2 * wmaHalf[i]) - wmaFull[i]);
  return calculateWMA(rawHMA, sqrtPeriod);
};

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

// ── StdDev ───────────────────────────────────────────────────────────────────
// trading-signals getStandardDeviation 计算总体标准差（除以 N），与原版一致。
// mean 需要手动计算（getStandardDeviation 仅返回 stdDev）。
export const calculateStdDev = (arr) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = getStandardDeviation(arr);
  return { mean, stdDev };
};

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
      let p100 = (high * 1.01).toFixed(4); let p50 = (high * 1.02).toFixed(4);
      bins[p100] = (bins[p100] || 0) + (vol/maxV) * 2; bins[p50] = (bins[p50] || 0) + (vol/maxV);
    }
    if (isSwingLow) {
      let p100 = (low * 0.99).toFixed(4); let p50 = (low * 0.98).toFixed(4);
      bins[p100] = (bins[p100] || 0) + (vol/maxV) * 2; bins[p50] = (bins[p50] || 0) + (vol/maxV);
    }
  }
  let sorted = Object.entries(bins).map(([price, weight]) => ({ price: parseFloat(price), weight })).sort((a,b) => b.weight - a.weight);
  return sorted.slice(0, 5);
};

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

export const calculateQuantTD = (rawData, interval = '1d', macroStatus = null) => {
  if (!rawData || rawData.length === 0) return [];
  let config = { adxThreshold: 30, toleranceFactor: 0.15, requireCVD: false, modeName: '宏观趋势档' };
  if (['15m'].includes(interval)) config = { adxThreshold: 40, toleranceFactor: 0.30, requireCVD: true, modeName: '微观肉搏档' };
  else if (['1h', '4h'].includes(interval)) config = { adxThreshold: 35, toleranceFactor: 0.25, requireCVD: false, modeName: '战术震荡档' };

  let data = rawData.map(d => {
    let vol = parseFloat(d[5]); let takerBuy = parseFloat(d[9]); let takerSell = vol - takerBuy;
    return { time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]), volume: vol, takerBuy, takerSell, delta: takerBuy - takerSell };
  });

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

  for (let i = 1; i < data.length; i++) {
    let upMove = data[i].high - data[i - 1].high; let downMove = data[i - 1].low - data[i].low;
    data[i].pDM = (upMove > downMove && upMove > 0) ? upMove : 0;
    data[i].mDM = (downMove > upMove && downMove > 0) ? downMove : 0;
  }
  let smoothTR = 0, smoothPDM = 0, smoothMDM = 0;
  for (let i = 1; i < data.length; i++) {
    if (i <= 14) {
      smoothTR += tr[i]; smoothPDM += data[i].pDM; smoothMDM += data[i].mDM;
      if (i === 14) {
        data[i].pDI = smoothTR === 0 ? 0 : 100 * smoothPDM / smoothTR;
        data[i].mDI = smoothTR === 0 ? 0 : 100 * smoothMDM / smoothTR;
        data[i].dx = (data[i].pDI + data[i].mDI === 0) ? 0 : 100 * Math.abs(data[i].pDI - data[i].mDI) / (data[i].pDI + data[i].mDI);
        data[i].adx = data[i].dx;
      } else { data[i].adx = 0; data[i].pDI = 0; data[i].mDI = 0; }
    } else {
      smoothTR = smoothTR - (smoothTR / 14) + tr[i];
      smoothPDM = smoothPDM - (smoothPDM / 14) + data[i].pDM;
      smoothMDM = smoothMDM - (smoothMDM / 14) + data[i].mDM;
      data[i].pDI = smoothTR === 0 ? 0 : 100 * smoothPDM / smoothTR;
      data[i].mDI = smoothTR === 0 ? 0 : 100 * smoothMDM / smoothTR;
      data[i].dx = (data[i].pDI + data[i].mDI === 0) ? 0 : 100 * Math.abs(data[i].pDI - data[i].mDI) / (data[i].pDI + data[i].mDI);
      data[i].adx = (data[i - 1].adx * 13 + data[i].dx) / 14;
    }
  }

  for (let i = 0; i < data.length; i++) {
    if (i >= 13) {
      let sumTR = 0, maxH = -Infinity, minL = Infinity;
      for (let j = 0; j < 14; j++) {
        sumTR += tr[i - j];
        if (data[i - j].high > maxH) maxH = data[i - j].high;
        if (data[i - j].low < minL) minL = data[i - j].low;
      }
      data[i].chop = (maxH - minL === 0) ? 50 : 100 * Math.log10(sumTR / (maxH - minL)) / Math.log10(14);
    } else { data[i].chop = 50; }
  }

  let buySetup = 0, sellSetup = 0;
  for (let i = 0; i < data.length; i++) {
    data[i].tdCount = 0; data[i].tdType = null; data[i].signalLevel = 0; data[i].signalReason = [];
    data[i].isTolerated = false; data[i].isBlocked = false; data[i].isAbsorption = false; data[i].aiScore = 0;

    if (i >= 4) {
      let tolerance = config.toleranceFactor * (data[i].atr || 0);
      let strictBuy = data[i].close < data[i - 4].close;
      let fuzzyBuy = data[i].close < (data[i - 4].close + tolerance);
      let strictSell = data[i].close > data[i - 4].close;
      let fuzzySell = data[i].close > (data[i - 4].close - tolerance);

      if (strictBuy) { buySetup++; sellSetup = 0; data[i].tdCount = buySetup; data[i].tdType = 'buy'; }
      else if (fuzzyBuy && buySetup > 0) { buySetup++; sellSetup = 0; data[i].tdCount = buySetup; data[i].tdType = 'buy'; data[i].isTolerated = true; }
      else if (strictSell) { sellSetup++; buySetup = 0; data[i].tdCount = sellSetup; data[i].tdType = 'sell'; }
      else if (fuzzySell && sellSetup > 0) { sellSetup++; buySetup = 0; data[i].tdCount = sellSetup; data[i].tdType = 'sell'; data[i].isTolerated = true; }
      else { buySetup = 0; sellSetup = 0; }
      if (buySetup === 9) buySetup = 0;
      if (sellSetup === 9) sellSetup = 0;
    }

    if (data[i].tdCount === 9) {
      let isSmart = Math.abs(data[i].close - data[i - 4].close) > (0.5 * data[i].atr);
      let isBlocked = false; let isBoosted = false;

      if (data[i].adx > config.adxThreshold && data[i].chop < 38) {
        if (data[i].tdType === 'buy' && data[i].mDI > data[i].pDI) isBlocked = true;
        else if (data[i].tdType === 'sell' && data[i].pDI > data[i].mDI) isBlocked = true;
      } else if (data[i].chop > 61) {
        isBoosted = true;
      }
      data[i].isBlocked = isBlocked;

      let body = Math.abs(data[i].close - data[i].open);
      let upWick = data[i].high - Math.max(data[i].open, data[i].close);
      let dnWick = Math.min(data[i].open, data[i].close) - data[i].low;
      let isAbsorbed = false;
      if (data[i].tdType === 'sell' && upWick > body * 1.5 && data[i].takerBuy > data[i].takerSell * 1.5) isAbsorbed = true;
      else if (data[i].tdType === 'buy' && dnWick > body * 1.5 && data[i].takerSell > data[i].takerBuy * 1.5) isAbsorbed = true;
      data[i].isAbsorption = isAbsorbed;

      let isSweep = false;
      for (let k = i - 1; k >= Math.max(0, i - 50); k--) {
        let isSwingHigh = data[k].high > data[k-1]?.high && data[k].high > data[k+1]?.high;
        let isSwingLow = data[k].low < data[k-1]?.low && data[k].low < data[k+1]?.low;
        if (data[i].tdType === 'sell' && isSwingHigh && data[i].high > data[k].high && data[i].close < data[k].high) { isSweep = true; break; }
        if (data[i].tdType === 'buy' && isSwingLow && data[i].low < data[k].low && data[i].close > data[k].low) { isSweep = true; break; }
      }

      let baseProb = 48.5;
      if (isSmart) baseProb += 8.2;
      if (isBoosted) baseProb += 12.5;
      if (isSweep) baseProb += 14.3;
      if (isAbsorbed) baseProb += 18.7;
      if (data[i].isTolerated) baseProb -= 5.1;

      let noise = ((data[i].volume % 100) / 100) * 4.5 - 2.25;
      let finalProb = Math.min(Math.max(baseProb + noise, 12.5), 96.8);
      if (isBlocked) finalProb = Math.max(finalProb - 45.5, 5.2);

      data[i].aiScore = finalProb.toFixed(1);
      data[i].signalLevel = isAbsorbed ? 4 : (isSweep || isBoosted) ? 3 : (isSmart ? 2 : 1);
    }
  }
  return data;
};
