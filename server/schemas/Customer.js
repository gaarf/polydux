var mongoose = require('mongoose'),
    Schema = mongoose.Schema;


/*
  Customer schema
 */


var customerSchema = new Schema({

    name: {
      type: String,
      required: true,
      unique: true
    },

    enabled: {
      type: Boolean,
      default: true,
      required: true
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

customerSchema
  .pre('findOne', autoPopulate)
  .pre('find', autoPopulate);


module.exports = customerSchema;
