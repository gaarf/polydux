var Q = require('q'),
    pkg = require('../package.json'),

    express = require('express'),
    consolidate = require('consolidate'),
    morgan = require('morgan'),
    compression = require('compression'),
    finalhandler = require('finalhandler'),
    colors = require('colors/safe'),
    http = require('http'),
    env = require('./env.js');


// ----------------------------------------------------------------------------


console.log(colors.underline(pkg.name) + ' v' + pkg.version + ' starting up...');

Q.when(makeApp()).then(function(app) {

  var server = http.createServer(app),
      port = env('expressPort');

  server.listen(port, '0.0.0.0', function () {
    console.info(colors.blue('listening on port %s'), port);
  });

});


// ----------------------------------------------------------------------------


morgan.token('ms', function (req, res){
  if (!res._header || !req._startAt) { return ''; }
  var diff = process.hrtime(req._startAt);
  var ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return Math.ceil(ms)+'ms';
});

function render404 (req, res) {
  finalhandler(req, res)(false);
}


function makeApp () {

  var app = express(),
      log = morgan( ':method :url :ms :status' );

  app.engine('html', consolidate.lodash);
  app.set('view engine', 'html');
  app.set('views', __dirname);


  // middleware stack starts here
  app.use(compression());


  app.get('/robots.txt', [
    log,
    function (req, res) {
      res.type('text/plain');
      res.send('User-agent: *\nDisallow: /');
    }
  ]);

  // serve the api
  app.use('/api', [
    log,
    require('./api/index.js'),
    render404
  ]);

  // any other path, serve 404
  app.all('*', [
    log,
    render404
  ]);

  var mongo = require('./mongo.js');

  if(mongo.connection.readyState === 1) {
    return app;
  }
  else {
    return Q.ninvoke(mongo.connection, 'once', 'connected').then(function() {
      return app;
    });
  }

}
