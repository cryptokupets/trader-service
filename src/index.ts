import { streamAdviceToTrade as streamAdviceToTradeBacktest } from "advice-to-trade";
import { getTicker } from "exchange-service";
import { streamAdvice } from "get-advice";
import { Readable, Transform } from "stream";

export { streamBuffer } from "get-advice";

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
