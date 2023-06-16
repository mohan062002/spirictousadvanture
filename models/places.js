const mongoose =require("mongoose");

const placeSchema=new  mongoose.Schema({
    owner:String,
    title:String,
    address:String,
    photos:[String],
    description:String,
    perks:[String],
    extraInfo:String,
    checkin:String,
    rating:Number,
    checkout:String,
    maxGuest:Number,
})

const PlaceModel=mongoose.model('place',placeSchema);
module.exports=PlaceModel;