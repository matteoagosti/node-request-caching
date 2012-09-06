var RequestCaching = require('../lib/request-caching');

// Cache into Memory
var rc = new RequestCaching();

for (var i = 0; i < 10; i++) {
  setTimeout(function() {
    rc.get(
      'https://graph.facebook.com/facebook',  // URI
      {fields: 'id,name'},                    // query string params
      1,                                      // TTL in seconds
      function(err, res, body, cache) {
        console.log('Response', res);         // response params object (headers, statusCode, ...)
        console.log('Body', body);            // response body as string
        console.log('Cache', cache);          // cache info object (hit, key)
      }
    );
  }, i * 1000);
}
