var http = require('http'),
    https = require('https'),
    crypto = require('crypto'),
    querystring = require('querystring'),
    url = require('url'),
    requestDefaults = {
      request: {

      },
      caching: {
        ttl: 60 * 60,
        prefix: 'requestCaching'
      }
    };

function mergeOptions(obj1, obj2) {
  for (var prop in obj2) {
    try {
      if (typeof obj2[prop] === 'object') {
        obj1[prop] = mergeOptions(obj1[prop], obj2[prop]);
      } else if (typeof obj1[prop] === 'undefined') {
        obj1[prop] = obj2[prop];
      }
    } catch (err) {
      obj1[prop] = obj2[prop];
    }
  }

  return obj1;
}

function initRequestOptions(options) {
  if (!options)
    throw new Error('Missing [options] argument');
  if (typeof options !== 'object')
    throw new Error('[options] must be an object');

  mergeOptions(options, requestDefaults);

  if (!(typeof options.caching.ttl === 'number' && options.caching.ttl >= 0))
    throw new Error('[options.caching.ttl] must be a number >= 0');

  if (typeof options.caching.prefix !== 'string')
    throw new Error('[options.caching.prefix] must be a string');

  if (options.caching.key && typeof options.caching.key !== 'string')
    throw new Error('[options.caching.key] must be a string');

  if (typeof options.uri === 'string') {
    var parts = url.parse(options.uri);
    options.request.host = parts.hostname ||  '';
    options.request.port = parts.port;
    options.request.protocol = parts.protocol ||  'http:';
    options.request.path = parts.path ||  '';
  }

  if (options.params && typeof options.params === 'object') {
    if (options.request.method === 'GET' && typeof options.request.path === 'string') {
      var parts = url.parse(options.request.path, true);
      mergeOptions(options.params, parts.query);
      options.paramsStringified = querystring.stringify(options.params);
      options.request.path = parts.pathname + '?' + options.paramsStringified;
    }
    else if (options.request.method === 'POST') {
      options.paramsStringified = querystring.stringify(options.params);
      if (options.paramsStringified.length > 0) {
        if (!options.request.header)
          options.request.header = {};

        mergeOptions(options.request.header, {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': options.paramsStringified.length
        });
      }
    }
  }

  if (!options.caching.key) {
    options.caching.key = crypto.createHash('md5').update(JSON.stringify(options.request)).digest('hex');
  }

  return options;
}

var RequestCaching = function(options) {
  if (!options)
    options = {};
  if (typeof options !== 'object')
    throw new Error('[options] must be an object');
  if (!options.store)
    options.store = 'memory';
  if (typeof options.store !== 'string')
    throw new Error('[options.store] must be a string');

  try {
    var Store = require('./store/' + options.store);
    this._store = new Store();
  } catch (err) {
    throw new Error('Cannot find an implementation for [options.store] "' + options.store + '"');
  }
};

RequestCaching.prototype.request = function(options, callback) {
  if (callback && typeof callback !== 'function')
    throw new Error('[callback] must be a function');

  var options = initRequestOptions(options);

  (function(self, options, callback) {
    var key = (options.caching.prefix ? options.caching.prefix + ':' : '') + options.caching.key;
    self._store.get(key, function(err, data) {
      if(!err && data) {
        callback.apply(self, [null, data.res, data.body, {key: key, hit: true}]);
      }
      else {
        var client = options.request.protocol === 'https:' ? https : http;
        var req = client.request(options.request, function(res) {
          if (!callback) return;

          var body = '';

          res.on('data', function(chunk) {
            body += chunk;
          });

          res.on('end', function() {
            self._store.set(key, {res: res, body: body}, options.caching.ttl, function(err, data) {
              if(err) {
                callback.apply(self, [err, data.res, data.body, {key: key, hit: false}]);
              }
              else {
                callback.apply(self, [null, data.res, data.body, {key: key, hit: false}]);
              }
            });            
          });
        });

        req.on('error', function(err) {
          if (!callback) return;
          callback.apply(this, [err, null, null]);
        });

        if (typeof options.paramsStringified === 'string' &&
            options.paramsStringified.length > 0 &&
            options.request.method === 'POST') {
          req.write(options.paramsStringified);
        }

        req.end();
      }
    });
  })(this, options, callback);
};

RequestCaching.prototype.get = function(uri, queryString, ttl, callback) {
  return this.request({
    uri: uri,
    params: queryString,
    request: {
      method: 'GET'
    },
    caching: {
      ttl: ttl
    }
  }, callback);
};

RequestCaching.prototype.post = function(uri, postData, ttl, callback) {
  return this.request({
    uri: uri,
    params: postData,
    request: {
      method: 'POST'
    },
    caching: {
      ttl: ttl
    }
  }, callback);
};

module.exports = RequestCaching;
