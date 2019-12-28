import { streamAdviceToTrade as streamAdviceToTradeBacktest } from "advice-to-trade";
import { getTicker } from "exchange-service";
import { streamCandle } from "get-candles";
import {
  getStart,
  IBuffer,
  ICandle,
  IIndicator,
  streamBufferToAdvice,
  streamCandleToBuffer
} from "get-indicators";
import moment from "moment";
import { Readable, Transform } from "stream";
export { IBuffer } from "get-indicators";

export interface IAdvice {
  time: string;
  sign: number;
  price: number;
}

export interface ITrade {
  time: string;
  quantity: number;
  amount: number;
}

export function streamCandlesToItem(): Transform {
  const ts = new Transform({
    transform: async (chunk, encoding, callback) => {
      const candles: ICandle[] = JSON.parse(chunk);
      while (candles.length) {
        const candle = candles.shift();
        ts.push(JSON.stringify(candle));
      }
      callback();
    }
  });
  return ts;
}

function skipWarmup(begin: string): Transform {
  const beginMoment = moment(begin);
  const ts = new Transform({
    transform: async (chunk, encoding, callback) => {
      const bufferItem: IBuffer = JSON.parse(chunk);
      if (moment(bufferItem.candle.time).isSameOrAfter(beginMoment)) {
        ts.push(chunk);
      }
      callback();
    }
  });
  return ts;
}

export function streamBuffer({
  exchange,
  currency,
  asset,
  period,
  start,
  end,
  indicators
}: any): Readable {
  // добавлять к свечам время для прогрева
  const indicatorStart: number = (indicators as IIndicator[])
    .map(value => getStart(value))
    .reduce(
      (previousValue, currentValue) => Math.max(previousValue, currentValue),
      0
    );

  const beginWarmup = moment
    .utc(start)
    .add(-indicatorStart * period, "m")
    .toISOString();

  const rs = streamCandle({
    exchange,
    currency,
    asset,
    period,
    start: beginWarmup,
    end
  }); // здесь свечи как массив
  const ts0 = streamCandlesToItem();
  const ts1 = streamCandleToBuffer(indicators);
  const ts2 = skipWarmup(start); // пропустить прогрев начать с момент старта
  rs.pipe(ts0);
  ts0.pipe(ts1);
  ts1.pipe(ts2);
  return ts2;
}

export function streamAdvice({
  exchange,
  currency,
  asset,
  period,
  start,
  end,
  indicators,
  code
}: any): Readable {
  const rs = streamCandle({
    exchange,
    currency,
    asset,
    period,
    start,
    end
  }); // здесь свечи как массив
  const ts0 = streamCandlesToItem();
  const ts1 = streamCandleToBuffer(indicators);
  const ts2 = streamBufferToAdvice({ code });
  rs.pipe(ts0);
  ts0.pipe(ts1);
  ts1.pipe(ts2);
  return ts2;
}

export function streamAdviceToTradePaper({
  exchange,
  currency,
  asset,
  initialBalance
}: {
  exchange: string;
  currency: string;
  asset: string;
  initialBalance: number;
}): Transform {
  let currencyAmount = initialBalance;
  let assetAmount = 0;

  const ts = new Transform({
    transform: async (chunk, encoding, callback) => {
      const { time, sign } = JSON.parse(chunk) as IAdvice;
      const { bid, ask } = await getTicker({ exchange, currency, asset });
      const price = (bid + ask) / 2; // пока без учета спреда

      const quantity = sign === 1 ? currencyAmount / price : -assetAmount;

      if (quantity) {
        const amount = sign === 1 ? currencyAmount : -assetAmount * price;

        assetAmount += quantity;
        currencyAmount -= amount;

        const trade: ITrade = {
          time,
          quantity,
          amount
        };

        ts.push(JSON.stringify(trade));
      }
      callback();
    }
  });

  return ts;
}

export function streamTradesPaper({
  exchange,
  currency,
  asset,
  period,
  start,
  indicators,
  code,
  initialBalance
}: {
  exchange: string;
  currency: string;
  asset: string;
  period: string;
  start: string;
  indicators: string;
  code: string;
  initialBalance: number;
}): Readable {
  const rs = streamAdvice({
    exchange,
    currency,
    asset,
    period,
    start,
    indicators,
    code
  });

  const ts = streamAdviceToTradePaper({
    exchange,
    currency,
    asset,
    initialBalance
  });
  rs.pipe(ts);
  return ts;
}

export function streamTradesBacktest({
  exchange,
  currency,
  asset,
  period,
  start,
  end,
  indicators,
  code,
  initialBalance
}: any): Readable {
  const rs = streamAdvice({
    exchange,
    currency,
    asset,
    period,
    start,
    end,
    indicators,
    code
  });

  const ts = streamAdviceToTradeBacktest(initialBalance);
  rs.pipe(ts);
  return ts;
}
