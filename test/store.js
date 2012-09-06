var assert = require('assert'),
    stores = ['memory', 'redis'];

for (var i in stores) {
  (function(store) {
    var Store = require('../lib/store/' + store);
    describe(store, function() {
      describe('get(key, callback)', function() {
        it('should fail if key is missing or not a string', function() {
          var store = new Store();
          assert.throws(function() {
            store.get(undefined, function(err, data) {});
          });
          assert.throws(function() {
            store.get({}, function(err, data) {});
          });
        });

        it('should fail if callback is missing or not a function', function() {
          var store = new Store();
          assert.throws(function() {
            store.get('key');
          });
          assert.throws(function() {
            store.get('key', {});
          });
        });

        it('should callback with err=null, data=null for expired or invalid key', function(done) {
          var store = new Store();
          store.get('key', function(err, data) {
            assert.equal(err, null, '[err] is null');
            assert.equal(data, null, '[data] is null');
            done();
          });
        });

        it('should callback with err=null, data=data if everything is ok', function(done) {
          var store = new Store();
          store.set('key', 'data', 1, function(err, data) {
            assert.equal(err, null, '[err] is null' + err);
            assert.equal(data, 'data', '[data] is equal to the argument of [set] call');

            setTimeout(function() {
              store.get('key', function(err, data) {
                assert.equal(err, null, '[err] is null');
                assert.equal(data, 'data', 'data is equal to the data argument of set call');
                done();
              });
            }, 100);
          });
        });
      });

      describe('set(key, data, ttl, callback)', function() {
        it('should fail if key is missing or not a string', function() {
          var store = new Store();
          assert.throws(function() {
            store.set(undefined, 'data', 1, function(err, data) {});
          });
          assert.throws(function() {
            store.set({}, 'data', 1, function(err, data) {});
          });
        });

        it('should fail when callback is specified and not a function', function() {
          var store = new Store();
          assert.doesNotThrow(function() {
            store.set('key', 'data', 1);
          });
          assert.throws(function() {
            store.set('key', 'data', 1, {});
          });
        });

        it('should fail if data is missing or null', function() {
          var store = new Store();
          assert.throws(function() {
            store.set('key', undefined, 1, function(err, data) {});
          });
          assert.throws(function() {
            store.set('key', null, 1, function(err, data) {});
          });
        });

        it('should fail if ttl is not a number > 0', function() {
          var store = new Store();
          assert.throws(function() {
            store.set('key', 'data', undefined, function(err, data) {});
          });
          assert.throws(function() {
            store.set('key', 'data', 0, function(err, data) {});
          });
        });

        it('should callback with err=null, data=data if everything is ok', function(done) {
          var store = new Store();
          store.set('key', 'data', 1, function(err, data) {
            assert.equal(err, null, '[err] is null');
            assert.equal(data, 'data', '[data] is equal to the argument of [set] call');
            done();
          });
        });

        it('should make the key to expire after the given ttl time', function(done) {
          this.timeout(3000);
          var store = new Store();
          store.set('key', 'data', 1, function(err, data) {
            assert.equal(err, null, '[err] is null');
            assert.equal(data, 'data', '[data] is equal to the argument of [set] call');

            setTimeout(function() {
              store.get('key', function(err, data) {
                assert.equal(err, null, '[err] is null');
                assert.equal(data, null, '[data] is null');
                done();
              });
            }, 2000);
          });
        });

        it('should increase key expiration if called twice', function(done) {
          var store = new Store();
          store.set('key', 'data', 1, function(err, data) {
            assert.equal(err, null, '[err] is null');
            assert.equal(data, 'data', '[data] is equal to the argument of [set] call');

            setTimeout(function() {
              store.get('key', function(err, data) {
                assert.equal(err, null, '[err] is null');
                assert.equal(data, 'data', '[data] is equal to the argument of [set] call');

                store.set('key', 'data', 2, function(err, data) {
                  assert.equal(err, null, '[err] is null');
                  assert.equal(data, 'data', '[data] is equal to the argument of [set] call');

                  setTimeout(function() {
                    store.get('key', function(err, data) {
                      assert.equal(err, null, '[err] is null');
                      assert.equal(data, 'data', '[data] is equal to the data argument of set call');
                      done();
                    });
                  }, 1000);
                });
              });
            }, 500);
          });
        });
      });

      describe('remove(key, callback)', function() {
        it('should fail if key is missing or not a string', function() {
          var store = new Store();
          assert.throws(function() {
            store.remove();
          });
          assert.throws(function() {
            store.remove({});
          });
        });

        it('should fail when callback is specified and not a function', function() {
          var store = new Store();
          assert.doesNotThrow(function() {
            store.remove('key');
          });
          assert.throws(function() {
            store.remove('key', {});
          });
        });

        it('should callback with err=null if everything is ok', function(done) {
          var store = new Store();
          store.remove('key', function(err) {
            assert.equal(err, null, '[err] is null');
            done();
          });
        });

        it('should remove key', function(done) {
          var store = new Store();
          store.set('key', 'data', 1, function(err, data) {
            assert.equal(err, null, '[err] is null');
            assert.equal(data, 'data', '[data] is equal to the argument of [set] call');

            store.remove('key', function(err) {
              assert.equal(err, null, '[err] is null');

              store.get('key', function(err, data) {
                assert.equal(err, null, '[err] is null');
                assert.equal(data, null, '[data] is null');
                done();
              });
            });
          });
        });
      });
    });
  })(stores[i]);
}
