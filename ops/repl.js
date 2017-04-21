var read  = require('fs').readdirSync,
    backendDir = __dirname + '/../server/backend',
    context = { it: undefined, backend: {}};

read(backendDir).forEach(function (file) {
  if (file.match(/\.js$/)) {
    var name = file.slice(0, -3);
    if(name==='index') { return; }
    name = name.slice(0, 1).toUpperCase() + name.slice(1);
    context.backend[name] = require(backendDir+'/'+file);
  }
});

context.log = console.log;

context.mongo = require('../server/mongo.js');
context.db = context.mongo.models;

context.mongo.connection.once('connected', function() {
  var repl = require('repl').start({
    prompt: require('../package.json').name + "> "
  });

  for (var name in context) {
    repl.context[name] = context[name];
  }

  repl.context.wat = function (it) {
    console.log('*** it ***', it);
    repl.context.it = it;
  };

});
