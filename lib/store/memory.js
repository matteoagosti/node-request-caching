var util = require('util'),
    Store = require('./store');

var Memory = function() {
  Store.call(this);
  this._entries = {};
};

util.inherits(Memory, Store);

Memory.prototype.get = function(key, callback) {
  if (!(key && typeof key === 'string'))
    throw new Error('[key] argument is required and must be a string');
  if (!(callback && typeof callback === 'function'))
    throw new Error('[callback] argument is required and must be a function');

  var entry = this._entries[key] ||  {};
  entry.data ? this.hits++ : this.misses++;

  callback.apply(this, [
    null,
    entry.data ||  null
  ]);
};

Memory.prototype.set = function(key, data, ttl, callback) {
  if (!(key && typeof key === 'string'))
    throw new Error('[key] argument is required and must be a string');
  if (!data)
    throw new Error('[data] argument is required');
  if (!(ttl && typeof ttl === 'number' && ttl > 0))
    throw new Error('[ttl] argument is required and must be a number > 0');
  if (callback && typeof callback !== 'function')
    throw new Error('[callback] must be a function');

  var self = this;

  if (self._entries[key])
    clearTimeout(self._entries[key].timer);

  self._entries[key] = {
    data: data,
    timer: setTimeout(function() {
      delete self._entries[key];
    }, ttl * 1000)
  };

  if (callback)
    callback.apply(this, [null, data]);
};

Memory.prototype.remove = function(key, callback) {
  if (!(key && typeof key === 'string'))
    throw new Error('[key] argument is required and must be a string');
  if (callback && typeof callback !== 'function')
    throw new Error('[callback] must be a function');

  if (this._entries[key]) {
    clearTimeout(this._entries[key].timer);
    delete this._entries[key];
  }

  if (callback)
    callback.apply(this, [null]);
};

module.exports = Memory;
