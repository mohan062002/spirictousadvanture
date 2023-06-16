


const mongoose = require('mongoose');
const {Schema} = mongoose;

const UserSchema = new Schema({
  name: String,
  email: {type:String, unique:true},
  cart: [{
    place: {
      type: mongoose.Schema.Types.Mixed,//by defining type in this way we can store any type of data in place
       },
     price:Number,
     checkin:Date,
     checkout:Date
  }],
  password: String,
});

const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;