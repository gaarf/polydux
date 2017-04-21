var mongoose = require('mongoose'),
    env = require('./env.js'),
    pkg = require('../package.json'),
    TEST = env('test'),
    DEBUG = !TEST && env('debug');

var mongoUrl = env('mongoUrl') || ('mongodb://localhost/'+pkg.name);

if (TEST) {
  if (Array.isArray(mongoUrl)) {
    mongoUrl = mongoUrl.map(function(url) {
      return url + '-test';
    });
  } else {
    mongoUrl += '-test';
  }
}


/**
 * supress a logged warning from mongoose npm pkg saying that their mpromise is deprecated.
 * cf http://mongoosejs.com/docs/promises.html Plugging in your own Promises Library
 */
mongoose.Promise = require('q').Promise;




if(!mongoose.connection.readyState) {

  mongoose.connect(mongoUrl, { db: { safe: true }});


  mongoose.connection.on('error', function (err) {
    throw err;
  });


  if (DEBUG) {
    mongoose.set('debug', true);

    'connected disconnected connecting disconnecting'.split(' ').forEach(function (n) {
      mongoose.connection.on(n, console.log.bind(console.log, '[mongo]', n));
    });

  }

  mongoose.connection.on('disconnected', function () {
    process.exit(1);
  });

  require('fs').readdirSync(__dirname + '/schemas').forEach(function (file) {
    if (file.match(/\.js$/)) {
      var name = file.slice(0, -3);
      // if (DEBUG) { console.info('[mongo] model:', name); }
      mongoose.model(name, require('./schemas/' + file));
    }
  });

}

module.exports = mongoose;
