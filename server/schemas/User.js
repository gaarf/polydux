var _ = require('lodash'),
    Q = require('q'),
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose'),
    crypto = require('crypto'),
    pbkdf2 = Q.denodeify(crypto.pbkdf2);

/*
  User schema
 */

var userSchema = new Schema({

    email: {
      type: String,
      required: true,
      unique: true
    },

    name: {
      first: {
        type: String,
        required: true
      },
      last: {
        type: String,
        required: true
      }
    },


    superuser: { // always passes any permission check
      type: Boolean,
      default: false
    },

    _customer: {
      type: Schema.ObjectId,
      ref: 'Customer'
    },

    _permissions: [{
      type: Schema.ObjectId,
      ref: 'Permission'
    }],

    _groups: [{
      type: Schema.ObjectId,
      ref: 'Group'
    }],

    activationStartAt: {
      type: Date
    }

}, {

    timestamps: true

});

userSchema.methods.generateActivationToken = function () {
  this.activationStartAt = new Date();
  return this.save().then(function(user) {
    return user.getActivationToken();
  });
};

userSchema.methods.getActivationToken = function() {
  return pbkdf2(
      this.activationStartAt.toString(),
      this.salt,
      50000,
      512,
      'sha256'
    )
    .then(function(buffer) {
      return buffer.toString('hex').slice(0,59);
    });
};

userSchema.methods.checkActivationToken = function(compareToken) {
  return this.getActivationToken().then(function(token) {
    return token === compareToken;
  });
};

userSchema.methods.whoami = function () {
  var out = _.chain(this)
    .pick('_id', 'superuser', 'email', 'name', 'displayName', 'createdAt')
    .extend({
      loggedIn: true,
      configs: this.get('_customer.configIds'),
      permissions: Array.from(this.get('permissionSet'))
    })
    .value();

  if(!out.superuser) {
    return Q.when(out);
  }

  // superuser gets ALL the perms!
  return mongoose.models.Permission.find().then(function (r){
    out.permissions = _.map(r, 'name');
    return out;
  });

};

userSchema.methods.hasPermission = function (what) {
  return this.get('superuser') || this.get('permissionSet').has(what);
};

userSchema.virtual('permissionSet').get(function () {
  var m = function (o) { return o.name; },
      out = new Set((this.get('_permissions')||[]).map(m)),
      add = function (p) { out.add(p); };

  (this.get('_groups')||[]).forEach(function (g){
    (g._permissions||[]).map(m).forEach(add);
  });

  (this.get('_customer._permissions')||[])
    .map(m).forEach(add);

  return out;
});

userSchema.virtual('displayName').get(function () {
  var l = this.get('name.last'),
    out = (this.get('name.first') || 'Anonymous')
    + (l ? ' '+l.substr(0, 1).toUpperCase()+'.' : '');
  if(this.get('superuser')) {
    out += ' [SuperUser]';
  }
  else if(this.get('_customer')) {
    out += ' ('+this.get('_customer.name')+')';
  }
  return out;
});




userSchema.plugin(passportLocalMongoose, {
  usernameField: 'email',
  usernameUnique: true,
  usernameLowerCase: true,
  passwordValidator: function(password, cb) {
    var validators = [
      /\d/,         // at least one digit
      /[a-z]/,      // at least one lowercase
      /[A-Z]/,      // at least one uppercase
      /^[\S]{8,}$/  // no whitepscae, at least 8 characters
    ];

    var valid =  validators.every(function(re) {
      return re.test(password);
    });

    if (valid) {
      cb(null);
    } else {
      cb(new Error('Password must contain at least one digit, ' +
         'one lowercase letter, one uppercase letter ' +
         'and have no whitespace'));
    }
  }
});


userSchema.statics.serializeUser = function() {
  return function(user, cb) {
    cb(null, { _id: user._id, salt: user.salt } );
  };
};

userSchema.statics.deserializeUser = function() {
  var self = this;
  return function(idAndSalt, cb) {
    if (idAndSalt._id && idAndSalt.salt) {
      self.findOne(idAndSalt, cb);
    } else {
      cb(null, null);
    }
  };
};

var autoPopulate = function(next) {
  var permPop = {
    path: '_permissions',
    model: 'Permission',
    select: 'name'
  };
  this.populate([
    permPop,
    {
      path: '_groups',
      select: 'name _permissions',
      populate: permPop
    },
    {
      path: '_customer',
      populate: permPop
    }
  ]);
  next();
};

userSchema
  .pre('findOne', autoPopulate)
  .pre('find', autoPopulate)
  .pre('save', function(next) {
    if (this.isNew && !this.salt) {
      var user = this;
      crypto.randomBytes(32, function(randomBytesErr, buf) {
        if (randomBytesErr) {
          return next(randomBytesErr);
        }
        user.set('salt', buf.toString('hex'));
        next();
      });
    } else {
      next();
    }
  });

userSchema.statics.seeds = function() {
  const USERS = [
    [ 'foo bar', 'foo11@polydux.example', 'Fooo1234']
  ];

  let User = this;

  return new Promise((resolve, reject) => {
    let done = 0;

    function maybeResolve() {
      if(++done === USERS.length) {
        resolve([]);
      }
    }

    USERS.forEach(([name, email, pass]) => {
      User.findOne({email}).then(u => {
        if(u) {
          maybeResolve();
        } else {
          let [first, last] = name.split(' ');
          u = new User({
            email,
            name: { first, last }
          });
          u.setPassword(pass, () => u.save().then(
            maybeResolve,
            reject
          ));
        }
      });
    });

  });
};



module.exports = userSchema;
