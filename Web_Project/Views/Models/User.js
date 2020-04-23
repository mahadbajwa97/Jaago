var mongo= require("mongoose");
var passpostLocalMongoose=require("passport-local-mongoose");

var User_Schema=new mongo.Schema({
    FullName: String,
    username: String,
    ContactNumber: parseInt(String),
    Password: String,
    Email: String,
    Dob: String
});
User_Schema.plugin(passpostLocalMongoose());

module.exports= mongo.model("User_Schema",User_Schema)