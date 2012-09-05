var Store = function() {
  this.hits = 0;
  this.misses = 0;
};

Store.prototype.get = function(key, callback) {
  throw new Error('[Store.prototype.get] method not implemented');
};

Store.prototype.set = function(key, data, ttl, callback) {
  throw new Error('[Store.prototype.set] method not implemented');
};

Store.prototype.remove = function(key, callback) {
  throw new Error('[Store.prototype.remove] method not implemented');
};

module.exports = Store;
