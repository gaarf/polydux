var mongoose = require('mongoose'),
    Schema = mongoose.Schema;


/*
  Blob = for storage api
 */


var BlobSchema = new Schema({

  namespace: {
    type: String,
    index: true,
    required: true
  },

  type: {
    type: String,
    index: true,
    required: true
  },

  content: {
    type: Schema.Types.Mixed
  },

  _author: {
    type: Schema.ObjectId,
    ref: 'User'
  }

}, {

    timestamps: true

});



module.exports = BlobSchema;
