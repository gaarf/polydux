
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

permissionSchema.statics.seeds = () => Promise.all([
  { name: 'whatever:test2' },
  { name: 'placehold:view' }
]);

module.exports = permissionSchema;
