import { streamAdviceToTrade as streamAdviceToTradeBacktest } from "advice-to-trade";
import { getTicker } from "exchange-service";
import { streamCandle } from "get-candles";
import {
  ICandle,
  streamBufferToAdvice,
  streamCandleToBuffer
} from "get-indicators";
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

export function streamBuffer({
  exchange,
  currency,
  asset,
  period,
  start,
  end,
  indicators
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
  rs.pipe(ts0);
  ts0.pipe(ts1);
  return ts1;
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
