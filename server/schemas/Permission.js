
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;


/*
  Permission schema
 */


var permissionSchema = new Schema({

    name: {
      type: String,
      required: true,
      unique: true
    }

});

module.exports = permissionSchema;
