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
var Promise = require('q').Promise
mongoose.Promise = Promise;




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


  let modelsWithSeeds = [];

  require('fs').readdirSync(__dirname + '/schemas').forEach(function (file) {
    if (file.match(/\.js$/)) {
      var name = file.slice(0, -3),
          Model = mongoose.model(name, require('./schemas/' + file));

      if('function' === typeof Model.seeds) {
        modelsWithSeeds.push( Model );
        name += ' (seeded)';
      }

      if (DEBUG) {
        console.info('[mongo] model:', name);
      }
    }
  });


  mongoose.connection.once('connected', function () {

    modelsWithSeeds.forEach( Model => {
      Model.seeds()
        .then( seeds => Promise.all( seeds.map( seed => Model.findOne(seed) ) ))
        .then( models => models.forEach( doc => doc || Model.create(doc) ) );
    });
  });

}

module.exports = mongoose;
