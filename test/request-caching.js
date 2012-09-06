var assert = require('assert'),
    RequestCaching = require('../lib/request-caching'),
    url = require('url'),
    querystring = require('querystring'),
    fs = require('fs'),
    http = require('http'),
    https = require('https'),
    serverCallback = function(req, res) {
      res.writeHead(200);
      var postData = '';
      req.on('data', function(chunk) {
        postData += chunk;
      });
      req.on('end', function() {
        res.end(JSON.stringify({
          url: req.url,
          queryString: url.parse(req.url, true).query,
          postData: postData
        }));
      });
    },
    httpServer = http.createServer(serverCallback).listen(8080),
    httpsServer = https.createServer({
      key: fs.readFileSync('test/fixtures/privatekey.pem'),
      cert: fs.readFileSync('test/fixtures/certificate.pem')
    }, serverCallback).listen(8081),
    uri = 'http://localhost:8080',
    suri = 'https://localhost:8081';

describe('request-caching', function() {
  describe('get(uri, querystring, ttl, callback)', function() {
    it('should issue a get request adding params to query string and cache its result', function(done) {
      var rc = new RequestCaching();
      var params = {param1: 'value1', param2: 'value2'};
      rc.get(uri, params, 1, function(err, res, body, cache) {
        var data = JSON.parse(body);
        var key = cache.key;
        assert.equal(err, null, '[err] is null');
        assert.deepEqual(data.queryString, params, '[body] is equal to ' + params);
        assert.equal(cache.hit, false, '[hit] is false');

        rc.get(uri, params, 1, function(err, res, body, cache) {
          var data = JSON.parse(body);
          assert.equal(err, null, '[err] is null');
          assert.deepEqual(data.queryString, params, 'body is equal to ' + params);
          assert.equal(cache.key, key, '[key] is the same as the original request');
          assert.equal(cache.hit, true, '[hit] is true');

          done();
        });
      });
    });
  });

  describe('post(uri, postData, ttl, callback)', function() {
    it('should issue a post request adding params to the body without caching', function(done) {
      var rc = new RequestCaching();
      var params = {param1: 'value1', param2: 'value2'};
      rc.post(uri, params, 0, function(err, res, body, cache) {
        var data = JSON.parse(body),
            postData = querystring.stringify(params);
        assert.equal(err, null, '[err] is null');
        assert.equal(data.postData, postData, '[body] is equal to ' + postData);
        assert.equal(cache.hit, false, '[hit] is false');

        rc.post(uri, params, 0, function(err, res, body, cache) {
          assert.equal(err, null, '[err] is null');
          assert.equal(cache.hit, false, '[hit] is false');
          done();
        });
      });
    });
  });

  describe('request(options, callback)', function() {
    it('should fail when callback is specified and not a function', function() {
      var rc = new RequestCaching();
      assert.doesNotThrow(function() {
        rc.request({uri: uri});
      });
      assert.throws(function() {
        rc.request({uri: uri}, {});
      });
    });

    it('should perform http & https request and store result in different keys', function(done) {
      var rc = new RequestCaching();
      var params = {param1: 'value1', param2: 'value2'};
      rc.request({uri: uri, params: params}, function(err, res, body, cache) {
        var data = JSON.parse(body);
        var key = cache.key;
        assert.equal(err, null, '[err] is null');
        assert.deepEqual(data.queryString, params, '[body] is equal to ' + params);
        assert.equal(cache.hit, false, '[hit] is false');

        params = {param3: 'value3'};
        rc.request({uri: suri, params: params}, function(err, res, body, cache) {
          var data = JSON.parse(body);
          assert.equal(err, null, '[err] is null' + err);
          assert.notEqual(cache.key, key, '[key] is different from one of the original request');
          assert.deepEqual(data.queryString, params, '[body] is equal to ' + params);
          assert.equal(cache.hit, false, '[hit] is false');
          done();
        });
      });
    });
  });
});
