
var Placeholder = require('.')('placeholdBackend');


Placeholder.prototype.getPosts = function () {
  return  this._request('GET', '/posts', {});
};


Placeholder.prototype.getPost = function (id) {
  return  this._request('GET', '/posts/'+id, {});
};

module.exports = Placeholder;
