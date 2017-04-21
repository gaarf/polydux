/*
  Storage API

  mounted on /api/storage/:namespace ...
*/

var _ = require('lodash'),
    router = require('express').Router({mergeParams: true}),
    Blob = require('../mongo.js').models.Blob,
    restify = require('express-restify-mongoose');


// restify.defaults() was called in api/index.js
//  ... we benefit because we inherit the ActivityLog stuff
//  ... but we'll still need to override some of the options
var baseOptions = {
  version: '', prefix: '',
  access: function () {
    return 'public';
  },
  preMiddleware: function (req, res, next) {
    if(req.method.match(/^(PUT|POST|PATCH)$/)) {
      var newBody = _.pick(req.body, 'content');
      if(!req.params.id) { // creating
        _.assign(newBody, {
          _author: req.user._id.toString(),
          namespace: req.params.namespace,
          type: req.body.type
        });
      }
      req.body = newBody;
    }
    next();
  }
};


/*
  /api/storage/:namespace/all ...
*/
restify.serve(router, Blob, _.defaults({
  name: 'all',
  preCreate: function (req, res, next) {
    var err = new Error("Use the /mine endpoint.");
    err.statusCode = 406;
    next(err);
  },
  contextFilter: function (model, req, done) {
    done(model.find({
      namespace: req.params.namespace
    }));
  },
  outputFn: function (req, res) {
    var out = req.erm.result, isArray = _.isArray(out);
    out = _.map(isArray ? out : [out], function (one) {
      return _.omit(one, '_author'); // prevent leaking other users' info
    });
    res.status(req.erm.statusCode).json(isArray ? out : out[0]);
  }
}, baseOptions));


/*
  /api/storage/:namespace/mine ...
*/
restify.serve(router, Blob, _.defaults({
  name: 'mine',
  contextFilter: function (model, req, done) {
    done(model.find({
      namespace: req.params.namespace,
      _author: req.user._id
    }));
  }
}, baseOptions));



module.exports = router;
