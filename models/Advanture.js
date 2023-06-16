const mongoose =require("mongoose");

const advantureSchema=new  mongoose.Schema({
    AdvantureType:String,
    companyname:String,
    address:String,
    city:String,
    state:String,
    price:Number,
    availableseats:Number,

    // photos:[String],
})

const AdvantureModel=mongoose.model('advanture',advantureSchema);
module.exports=AdvantureModel;