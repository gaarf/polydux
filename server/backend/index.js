var Q = require('q'),
    _ = require('lodash'),
    env = require('../env.js'),
    cached = require('cached'),
    needle = require('needle'),
    openTimeout = env('backendOpenTimeout');

module.exports = function backendFactory (hostenv) {

  function Backend (opts) {
    this.options = _.defaults( _.cloneDeep(opts || {}), {
      baseUrl: env(hostenv),
      expire: 60 // 1 minute
    });

    this.cache = cached(hostenv, {
      backend: "memory",
      defaults: {
        expire: this.options.expire
      }
    });

    return this;
  }


  Backend.prototype._request = function (method, path, data, options) {
    var url = this.options.baseUrl + path,
        start = process.hrtime(),
        needleOpts = { 'open_timeout': openTimeout },
        request = function () {
          return Q.nfcall(needle.request, method, url, data, needleOpts)
            .spread(function (resp, body) {
              console.log('['+hostenv+']', method, path,
                resp.statusCode, resp.bytes, process.hrtime(start));
              if(resp.statusCode>399) {
                var err = new Error([ hostenv, path, resp.statusMessage ].join(' '));
                err.statusCode = resp.statusCode;
                throw err;
              } else {
                return body;
              }
            });
        };

    options = options || {};
    // console.log('['+hostenv+']', method, url, data);
    if(method.toUpperCase() !== 'GET'){
      needleOpts.json = true;
    }
    if(method.toUpperCase() === 'GET' && !options.noCache) {
      return this.cache.getOrElse(
        (new Buffer(path+JSON.stringify(data))).toString('base64'), // cache key
        request
      );
    } else {
      return request();
    }
  };


  return Backend;
};
