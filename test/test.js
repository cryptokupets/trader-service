require("mocha");
const { assert } = require("chai");
const { streamTrades } = require("../lib/index");

describe("streamTrades", function() {
  it("streamTrades", function(done) {
    this.timeout(500000);
    assert.isFunction(streamTrades);

    const options = {
      exchange: "hitbtc",
      currency: "USD",
      asset: "BTC",
      period: 1,
      start: "2019-11-08T17:20:00",
      indicators: [
        {
          name: "max",
          options: [2]
        }
      ],
      code:
        "return buffer[1].indicators[0][0] > buffer[0].indicators[0][0] ? 1 : -1;",
      initialBalance: 70
    };

    let i = 0;

    // console.log(options);

    const rs = streamTrades(options);
    rs.on("data", chunk => {
      const trade = JSON.parse(chunk);
      // проверить advice.price!!
      console.log("trade:", trade);
      assert.isObject(trade);
      i++;
    });

    rs.on("end", () => {
      console.log("end");
      done();
    });
  });
});
