var util = require('util'),
    redis = require('redis'),
    Store = require('./store');

var Redis = function(options) {
  Store.call(this);
  options = options ||  {};
  this._client = redis.createClient(options.port, options.host, options.options);
};

util.inherits(Redis, Store);

Redis.prototype.get = function(key, callback) {
  if (!(key && typeof key === 'string'))
    throw new Error('[key] argument is required and must be a string');
  if (!(callback && typeof callback === 'function'))
    throw new Error('[callback] argument is required and must be a function');

  var self = this;

  this._client.get(key, function(err, reply) {
    reply ? self.hits++ : self.misses++;
    var data = JSON.parse(reply);
    callback.apply(this, [
      err,
      data || null
    ]);
  });
};

Redis.prototype.set = function(key, data, ttl, callback) {
  if (!(key && typeof key === 'string'))
    throw new Error('[key] argument is required and must be a string');
  if (!data)
    throw new Error('[data] argument is required');
  if (!(ttl && typeof ttl === 'number' && ttl > 0))
    throw new Error('[ttl] argument is required and must be a number > 0');
  if (callback && typeof callback !== 'function')
    throw new Error('[callback] must be a function');

  this._client.setex(key, ttl, JSON.stringify(data), function(err, reply) {
    if (callback)
      callback.apply(this, [err, data]);
  });
};

Redis.prototype.remove = function(key, callback) {
  if (!(key && typeof key === 'string'))
    throw new Error('[key] argument is required and must be a string');
  if (callback && typeof callback !== 'function')
    throw new Error('[callback] must be a function');

  this._client.del(key, function(err, reply) {
    if (callback)
      callback.apply(this, [null]);
  });
};

module.exports = Redis;
