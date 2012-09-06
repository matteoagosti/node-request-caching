var http = require('http'),
    https = require('https'),
    crypto = require('crypto'),
    querystring = require('querystring'),
    url = require('url');

function mergeOptions(obj1, obj2) {
  obj2 = JSON.parse(JSON.stringify(obj2));
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

function initRequestOptions(options, defaults) {
  if (!options)
    throw new Error('Missing [options] argument');
  if (typeof options !== 'object')
    throw new Error('[options] must be an object');

  mergeOptions(options, defaults);

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
    if (!options.request)
      throw new Error('Cannot generate an auto key based on [options.request] signature as it is empty');
    else
      options.caching.key = crypto.createHash('md5').update(JSON.stringify([options.paramsStringified, options.request])).digest('hex');
  }

  return options;
}

var RequestCaching = function(options) {
  if (!options)
    options = {};
  if (typeof options !== 'object')
    throw new Error('[options] must be an object');

  var storeDefaults = {
    adapter: 'memory'
  };

  if (!options.store) {
    options.store = storeDefaults;
  }
  else {
    if (typeof options.store === 'string')
      options.store = {adapter: options.store};
    else if (typeof options.store === 'object')
      options.store = mergeOptions(options.store, storeDefaults);
    else
      throw new Error('[options.store] must be string or an object');
  }

  try {
    var Store = require('./store/' + options.store.adapter);
    this._store = new Store(options.store.options);
  } catch (err) {
    throw new Error('Cannot find an implementation for [options.store] "' + options.store + '"');
  }

  var requestDefaults = {
    request: {
      method: 'GET'
    },
    caching: {
      ttl: 60 * 60,
      prefix: 'requestCaching'
    }
  };

  if (!options.request)
    options.request = requestDefaults.request;
  else
    options.request = mergeOptions(options.request, requestDefaults.request);

  if (!options.caching)
    options.caching = requestDefaults.caching;
  else
    options.caching = mergeOptions(options.caching, requestDefaults.caching);

  this._defaults = options;
};

RequestCaching.prototype.request = function(options, callback) {
  if (callback && typeof callback !== 'function')
    throw new Error('[callback] must be a function');

  var options = initRequestOptions(options, this._defaults),
      self = this,
      key = (options.caching.prefix ? options.caching.prefix + ':' : '') + options.caching.key;

  var request = function() {
    var client = options.request.protocol === 'https:' ? https : http;
    var req = client.request(options.request, function(res) {
      if (!callback) return;

      var resSubset = {
        headers: res.headers,
        statusCode: res.statusCode
      };

      var body = '';

      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', function() {
        if (options.caching.ttl > 0)
          self._store.set(key, {res: resSubset, body: body}, options.caching.ttl, function(err, data) {
            callback.apply(self, [err, data.res, data.body, {key: key, hit: false}]);
          });
        else
          callback.apply(self, [null, resSubset, body, {key: key, hit: false}]);
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
  };

  if (options.caching.ttl > 0) {
    this._store.get(key, function(err, data) {
      if (!err &&  data) {
        callback.apply(this, [null, data.res, data.body, {key: key, hit: true}]);
      }
      else {
        request();
      }
    });
  }
  else {
    request();
  }
};

RequestCaching.prototype.get = function(uri, params, ttl, callback) {
  return this.request({
    uri: uri,
    params: params,
    request: {
      method: 'GET'
    },
    caching: {
      ttl: ttl
    }
  }, callback);
};

RequestCaching.prototype.post = function(uri, params, ttl, callback) {
  return this.request({
    uri: uri,
    params: params,
    request: {
      method: 'POST'
    },
    caching: {
      ttl: ttl
    }
  }, callback);
};

module.exports = RequestCaching;
