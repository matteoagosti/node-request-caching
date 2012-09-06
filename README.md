node-request-caching
====================

## HTTP and HTTPS requests with caching for node.js

### Features

- Zero configuration
- Convenience methods for GET / POST requests with parameters (querystring / request body)
- Automatic key generation based on request signature
- Memory and Redis adapters for cache storage

### Installation

As the module is not yet on npm registry, install with:

```
npm install https://github.com/matteoagosti/node-request-caching/tarball/master
```

If you want to run tests you first have to install `mocha` and the from the module directory run:

```
npm test
```

### Usage

You can find a simple example into `examples/simple.js`

```javascript
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
```

### API

#### RequestCaching(options)

Every instance has its own shared cache storage adapter.

This is the structure for the `options` parameter (with defaults values included):

```javascript
{
  store: {                    // STORE config, shared among requests from the same instance
    adapter: 'method',        // can be either memory or redis
    options: {                // any additional options for the adapter (e.g. redis config)
      ...
    }
  },
  request: {                  // any defaults for node HTTP.request method
    method: 'GET',
    ...
  },
  caching: {                  // CACHING config
    ttl: 60*60,               // default TTL in seconds, used when not specified in request
    prefix: 'requestCaching'  // prefix to append before each key, if set keys will be prefix:key
  }
}
```
#### get(uri, params, ttl, callback)

Issues a `GET` request to the given `uri`, adding `params` to the query string, storing into cache for `ttl` seconds, invoking `callback` once done (both when error or success). If `uri` already includes a query string, its value get added to `params`, but without overriding what's already defined in `params`.

#### post(uri, params, ttl, callback)

The same as previously mentioned `get(uri, params, ttl, callback)`, but issuing a `POST` request, adding `params` to the request body and including the following request headers:

```
'Content-Type': 'application/x-www-form-urlencoded',
'Content-Length': querystring.stringify(params)
```

### Additional notes

Right now the TTL is specified in seconds, despite the `Memory` adapter can work with milliseconds resolution. I went for it as until `Redis 2.6` will be out, the current `Redis` adapter can't go below second precision. In addition, `Redis` key expire precision is in the order of half a second, so pay attention when storing keys with a TTL of 1, as it may happen that when reading them after 1.5seconds you'll still get the cached entry.