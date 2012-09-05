var RequestCaching = require('../lib/request-caching');
var rc = new RequestCaching();

for(var i=0; i<10; i++) {
  setTimeout(function() {
    rc.get('https://graph.facebook.com/facebook', {fields: 'id,name'}, 5, function(err, res, body, cache) {
      console.log(body);
      console.log(cache);
    });
  }, i*1000);
}