const mongoose = require('mongoose');
const {Schema} = mongoose;

const OwnerSchema = new Schema({
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

const OwnerModel = mongoose.model('Owner',OwnerSchema);

module.exports = OwnerModel;