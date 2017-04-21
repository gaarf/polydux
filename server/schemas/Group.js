
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/*
  Group schema
 */


var groupSchema = new Schema({

    name: {
      type: String,
      required: true,
      unique: true
    },

    _permissions: [{
      type: Schema.ObjectId,
      ref: 'Permission'
    }]

}, {

    timestamps: true

});

var autoPopulate = function(next) {
  this.populate('_permissions');
  next();
};

groupSchema
  .pre('findOne', autoPopulate)
  .pre('find', autoPopulate);

module.exports = groupSchema;
