var assert = require('assert'),
    RequestCaching = require('../lib/request-caching'),
    url = require('url'),
    querystring = require('querystring'),
    http = require('http'),
    server = http.createServer(function(req, res) {
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
    }).listen(8080),
    uri = 'http://localhost:8080';

describe('request-caching', function() {
  describe('get(uri, querystring, ttl, callback)', function() {
    it('should issue a get request adding params to query string and cache its result', function(done) {
      var rc = new RequestCaching({store: 'redis'});
      var fields = {param1: 'value1', param2: 'value2'};
      rc.get(uri, fields, 1, function(err, res, body, cache) {
        var data = JSON.parse(body);
        assert.deepEqual(data.queryString, fields, 'body is equal to ' + fields);
        assert.equal(cache.hit, false, 'hit is false');

        rc.get(uri, fields, 1, function(err, res, body, cache) {
          var data = JSON.parse(body);
          assert.deepEqual(data.queryString, fields, 'body is equal to ' + fields);
          assert.equal(cache.hit, true, 'hit is true');

          done();
        });
      });
    });
  });

  describe('post(uri, postData, ttl, callback)', function() {
    it('should issue a post request adding params to the body without caching', function(done) {
      var rc = new RequestCaching();
      var fields = {param1: 'value1', param2: 'value2'};
      rc.post(uri, fields, 0, function(err, res, body, cache) {
        var data = JSON.parse(body),
            postData = querystring.stringify(fields);
        assert.equal(data.postData, postData, 'body is equal to ' + postData);
        assert.equal(cache.hit, false, 'hit is false');

        rc.post(uri, fields, 0, function(err, res, body, cache) {
          assert.equal(cache.hit, false, 'hit is false');
          done();
        });
      });
    });
  });

});
