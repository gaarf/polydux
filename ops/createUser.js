/* global Set */

var Q = require('q'),
    inquirer = require('inquirer'),
    mongo = require('../server/mongo.js'),
    models = mongo.models;

var User = models.User;

var promptSchema = [
  {
    name: 'email',
    message: 'Email for this user?',
    validate: function (inp) {
      return !!inp.match(/^\S+@\S+\.\w+$/) || 'That doesn\'t look like a valid email';
    }
  },
  {
    name: 'firstName',
    message: 'First name?',
    validate: function (inp) { return !!inp; },
    default: "Bob"
  },
  {
    name: 'lastName',
    message: 'Last name?',
    validate: function (inp) { return !!inp; },
    default: "Smith"
  },
  {
    name: 'password',
    message: 'Password?',
    validate: function (inp) { return !!inp; },
    type: 'password'
  },
  {
    name: 'superuser',
    message: "Should this user be given almighty powers?",
    type: 'confirm',
    default: false
  },
  {
    name: 'permissions',
    validate: function (inp) {
      return !!inp.match(/^[\w:,]+$/);
    },
    filter: function(s){
      return s ? s.split(',') : [];
    },
    when: function (out) {
      return !out.superuser;
    },
    message: "User's permissions: comma separated, no extra spaces"
  },
  {
    name: 'group',
    default: '',
    when: function (out) {
      return !out.superuser;
    },
    message: "Group to be created and assigned to this user"
  },
  {
    name: 'groupPermissions',
    filter: function(s){
      return s ? s.split(',') : [];
    },
    when: function (out) {
      return !!out.group;
    },
    message: "Group's permissions: comma separated, no extra spaces"
  }
];

function createUser(userToCreate, password) {
  User.register(userToCreate, password, function(err, user) {
    if (err) {
        console.log("Error creating user\n", err);
    } else {
        console.log('User successfully created ', user);
    }

    process.exit();
  });
}


function handleInput() {

    inquirer.prompt(promptSchema).then(function (results) {

        var userToCreate = new User({
          email: results.email,
          name: {
            first: results.firstName,
            last: results.lastName
          },
          superuser: results.superuser,
          _permissions: [],
          _groups: []
        });

        var permissions = new Set(results.permissions || []);

        (results.groupPermissions||[]).forEach(function(p){
          permissions.add(p);
        });

        var permissionsPromises = Array.from(permissions).map(function(p) {
          return models.Permission.findOneAndUpdate(
            {name: p}, {name: p}, {upsert: true, new: true}
          ).exec()
        });

        var groupPerms = [],
            value;
        // permissions ready
        Q.allSettled(permissionsPromises).then(function(qResults) {
          qResults.forEach(function(r){
            value = r.value;
            if ((results.permissions||'').indexOf(value.name) !== -1) {
              userToCreate._permissions.push(value._id);
            } else if (results.group && results.groupPermissions.indexOf(value.name) !== -1) {
              groupPerms.push(value._id);
            }
          });

          if (results.group){
            models.Group.findOneAndUpdate(
              {name: results.group},
              {name: results.group, $addToSet: {
                _permissions: { $each: groupPerms }
              }},
              {upsert: true, new: true},
              function(err, group) {
                if (err) {
                  console.log("Error creating/finding group: ", err);
                } else {
                  userToCreate._groups.push(group._id);
                  createUser(userToCreate, results.password);
                }
              });
          } else {
            createUser(userToCreate, results.password);
          }

        });

    });
}

if(mongo.connection.readyState === 1) {
    handleInput();
} else {
    Q.ninvoke(mongo.connection, 'once', 'connected').then(handleInput);
}
