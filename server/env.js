var envar = require('envar'),
    hostname = require('os').hostname();

// values in here can be overriden
// by ENV variables, NPM config, CLI arguments, etc...
envar.defaults({

  sessionSecret: 'something something',
  debug: process.env.NODE_ENV!=='production',
  test: process.env.NODE_ENV==='test',
  backendOpenTimeout: 300e3, // in ms (300 seconds = 5 minutes = way too much)
  expressPort: 8989,

  placeholdBackend: 'https://jsonplaceholder.typicode.com'

});


var envObj;

switch(hostname) {

  case 'prod0.whatever.example.com':
  case 'prod1.whatever.example.com':
    envObj = {
      sessionSecret: 'whatever whatever I do what I want',
      mongoUrl: ['01', '02', '03'].map(function(hostNumber){
        return 'mongodb://mongo-' + hostNumber + '.whatever.example.com/dbname';
      })
    };
  break;
}

if (envObj){
  envar.import(envObj);
}

module.exports = envar;
