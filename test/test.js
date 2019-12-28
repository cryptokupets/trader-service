require("mocha");
const { assert } = require("chai");
const { streamTradesPaper, streamTradesBacktest, streamBuffer } = require("../lib/index");

describe.skip("streamTradesPaper", function() {
  it("streamTradesPaper", function(done) {
    this.timeout(130000);
    assert.isFunction(streamTradesPaper);

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

    const rs = streamTradesPaper(options);
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

describe("streamTradesBacktest", function() {
  it("streamTradesBacktest", function(done) {
    this.timeout(5000);
    assert.isFunction(streamTradesBacktest);

    const options = {
      exchange: "hitbtc",
      currency: "USD",
      asset: "BTC",
      period: 60,
      start: "2019-10-01",
      end: "2019-10-02",
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

    const rs = streamTradesBacktest(options);
    rs.on("data", chunk => {
      const trade = JSON.parse(chunk);
      // проверить advice.price!!
      console.log("trade:", trade);
      assert.isObject(trade);
      i++;
    });

    rs.on("end", () => {
      // assert.equal(i, 24);
      done();
    });
  });
});


describe("warmup", function() {
  it("streamBuffer", function(done) {
    this.timeout(5000);

    const options = {
      exchange: "hitbtc",
      currency: "USD",
      asset: "BTC",
      period: 240,
      start: "2019-10-01",
      end: "2019-10-02",
      indicators: [
        {
          name: "max",
          options: [5]
        }
      ]
    };

    // console.log(options);

    const rs = streamBuffer(options);
    rs.on("data", chunk => {
      const buffer = JSON.parse(chunk);
      // console.log("buffer item:", buffer);
      assert.isNotEmpty(buffer.indicators[0]);
    });

    rs.on("end", () => {
      done();
    });
  });
});
