var router = require('express').Router(),
    finalhandler = require('finalhandler'),
    env = require('../env.js'),
    mongo = require('../mongo.js'),
    session = require('express-session'),
    MongoStore = require('connect-mongo')(session),
    restify = require('express-restify-mongoose'),
    passport = require('passport'),

    ActivityLog = mongo.models.ActivityLog,
    User = mongo.models.User;


router.use([
  session({
    name: require('../../package.json').name + '.sid',
    secret: env('sessionSecret'),
    saveUninitialized: false,
    resave: true,
    store: new MongoStore({
      mongooseConnection: mongo.connection
    }),
    cookie: {
      path: '/api', // == router mount point
      maxAge: null // session cookie

    }
  }),

  passport.initialize(),
  passport.session(),

  require('body-parser').json()
]);



// passport config
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



function errorHandler (err, req, res) {
  var code = err.statusCode || 500;
  if(code > 499) { console.error(err); }
  res.status(code).json({
    statusCode: code,
    message: err.message || err.name
  });
}


function mustHavePermission (perm, code) {
  return function (req, res, next) {
    var err = new Error('Access denied!');
    if(!req.user) {
      err.statusCode = 401;
      return next(err);
    }
    if((req.user.get('_customer.enabled') === false) && !req.user.get('superuser')) {
      err.statusCode = 403;
      return next(err);
    }
    if(!perm || req.user.hasPermission(perm)) {
      return next();
    }
    err.statusCode = code || 400;
    next(err);
  };
}


// "admin" API
restify.defaults({
  prefix: '/_',
  version: '/v0',
  onError: errorHandler,
  preMiddleware: function (req) {
    ( (req.method === "GET")
    ? mustHavePermission('admin:view', 403)
    : mustHavePermission('admin:edit', 405)
    ).apply(null, arguments);
  },
  access: function (req) {
    return req.user.hasPermission('admin:view') ? 'protected' : 'public';
  },
  postCreate: function(req, res, next) {
    var doc = req.erm.result;
    ActivityLog.log(req, doc.constructor.modelName + ' created', doc);
    next();
  },
  findOneAndUpdate: false,
  postUpdate: function(req, res, next) {
    var doc = req.erm.result;
    ActivityLog.log(req, doc.constructor.modelName + ' updated', doc);
    next();
  },
  findOneAndRemove: false,
  preDelete: function(req, res, next) {
    var doc = req.erm.document;
    ActivityLog.log(req, doc.constructor.modelName +' deleted', doc);
    next();
  }
});

/*
  /api/_/v0/users ...
*/
restify.serve(router, User, {
  name: 'users',
  private: ['superuser', 'hash', 'salt'],
  protected: ['updatedAt', 'email', 'name']
});
/*
  /api/_/v0/permissions ...
*/
restify.serve(router, mongo.models.Permission, {
  name: 'permissions'
});
/*
  /api/_/v0/customers ...
*/
restify.serve(router, mongo.models.Customer, {
  name: 'customers'
});
/*
  /api/_/v0/groups ...
*/
restify.serve(router, mongo.models.Group, {
  name: 'groups'
});


/*
  /api/storage ...
*/
router.use('/storage/:namespace', [
  function (req) {
    ( (req.method === "GET")
    ? mustHavePermission('storage:view', 403)
    : mustHavePermission('storage:edit', 405)
    ).apply(null, arguments);
  },
  require('./storage.js')
]);


/*
  backend proxies
*/

router.use('/placehold', [
  mustHavePermission('placehold:view'),
  require('./placehold.js')
]);




/*
  get meta information details
*/
const PKG = require('../../package.json');
router.get('/meta', function (req, res) {
  let { version, name, description} = PKG;
  res.json({
    name,
    version,
    title: `${description} v${version}`
  });
});



/*
  get current user details
*/
router.get('/whoami', function (req, res) {
  if(!req.user) {
    return res.json({ loggedIn: false });
  }
  if(!req.user.get('superuser') && (req.user.get('_customer.enabled') === false)) {
    return res.json({ loggedIn: false, customerDisabled: true });
  }
  req.user.whoami().then(res.json.bind(res));
});




/*
  login user
*/
router.post('/login', passport.authenticate('local'), function(req, res) {
  req.user.whoami().then(res.json.bind(res));
});



/*
  logout user
*/
router.delete('/login', function (req, res) {
  req.logout();
  res.json({loggedIn: false});
});


/*
  error handler
*/
router.use(function (req, res) {
  finalhandler(req, res)(false);
});
router.use(errorHandler);


module.exports = router;
