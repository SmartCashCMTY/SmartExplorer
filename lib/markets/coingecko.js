var request = require('request');

var api_url = 'https://api.coingecko.com/api/v3';

function get_summary(coin, exchange, cb) {
  var req_url = api_url + '/coins/' + coin.toLowerCase() + '?localization=false&tickers=false&community_data=false&developer_data=false';
  request({uri: req_url, json: true, timeout: 10000}, function (error, response, body) {
    if (error || !body || !body.market_data) {
      return cb(error || 'No data', null);
    }
    var market = body.market_data;
    var result = {
      last: market.current_price ? market.current_price[exchange.toLowerCase()] || 0 : 0,
      high_24h: market.high_24h ? market.high_24h[exchange.toLowerCase()] || 0 : 0,
      low_24h: market.low_24h ? market.low_24h[exchange.toLowerCase()] || 0 : 0,
      volume: market.total_volume ? market.total_volume[exchange.toLowerCase()] || 0 : 0,
      change_24h: market.price_change_percentage_24h || 0,
      market_cap: market.market_cap ? market.market_cap[exchange.toLowerCase()] || 0 : 0
    };
    return cb(null, result);
  });
}

function get_chartdata(coin, exchange, cb) {
  var req_url = api_url + '/coins/' + coin.toLowerCase() + '/market_chart?vs_currency=' + exchange.toLowerCase() + '&days=1';
  request({uri: req_url, json: true, timeout: 10000}, function (error, response, body) {
    if (error || !body || !body.prices) {
      return cb(error || 'No chart data', []);
    }
    var processed = [];
    body.prices.forEach(function(point) {
      if (point.length >= 2) {
        processed.push([point[0], point[1], point[1], point[1], point[1]]);
      }
    });
    return cb(null, processed);
  });
}

module.exports = {
  get_data: function(settings, cb) {
    var error = null;
    get_chartdata(settings.coin, settings.exchange, function(err, chartdata) {
      if (err) { chartdata = []; error = err; }
      get_summary(settings.coin, settings.exchange, function(err, stats) {
        if (err) { error = err; stats = null; }
        return cb(error, {
          buys: [],
          sells: [],
          chartdata: chartdata,
          trades: [],
          stats: stats
        });
      });
    });
  }
};
