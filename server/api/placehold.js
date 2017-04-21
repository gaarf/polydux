
/*
  placehold API

  mounted on /api/placehold
*/


var router = require('express').Router(),
    Backend = require('../backend/placehold.js'),
    placehold = new Backend();


router.get('/posts', function(req, res, next) {
  placehold.getPosts().done(res.json.bind(res), next);
});

router.get('/posts/:id', function(req, res, next) {
  placehold.getPost(req.params.id).done(res.json.bind(res), next);
});

module.exports = router;
