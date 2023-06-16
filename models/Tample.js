const mongoose =require("mongoose");

const tampleSchema=new  mongoose.Schema({
    title:String,
    subtitle:String,
    desc:String,
    img:String,
    god:String,
    state:String,
    air:String,
    train:String,
    bus:String,
    // photos:[String],
})

const TampleModel=mongoose.model('tample',tampleSchema);
module.exports=TampleModel;