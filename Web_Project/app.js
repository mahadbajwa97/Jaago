var createError = require('http-errors');
//Node JS framework
var express = require('express');
//To manipulate Mongodb
var mongo= require('Mongoose');
//Authentication
var passport = require("passport");
var LocalStrategy=require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
//for mailing service
var nodemailer = require('nodemailer');
//Uploading Profile pictures
const multer = require('multer');
//Youtube API
const YouTube = require('simple-youtube-api');
const youtube = new YouTube('  Y  o  u  r     A  p  i     K  e  y  ');


var app = express();
var methodOverride=require("method-override");
mongo.connect('mongodb://localhost/yelp_camp');
//To use html form data
var bodyParser= require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
//Access to stylesheets
app.use(express.static('Views/Css'));
app.use(express.static('Views/Css/image-storage'));
app.use(methodOverride("_method"));
app.set('view engine', 'ejs');


//////////////////////////////////////////
//////// USER Model //////////////////////
//////////////////////////////////////////
var User_Schema=new mongo.Schema({
    FullName: String,
    username: String,
    ContactNumber: parseInt(String),
    Password: String,
    Email: String,
    Dob: String,
    Image: String,
    notification:{
        type: Number,
        default: 0
    }
});



  /////////////////////////////////
 //////////Article Schema/////////
/////////////////////////////////
var blogSchema=new mongo.Schema({
    title : String,
    intro: String,
    image: {
        type: String,
        default: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/1765/bg-blog-card.jpg"
        },
    Body: String,
    Created: {type: Date, default: Date.now()},
    Comments:[
                 {
                    type: mongo.Schema.Types.ObjectId,
                     ref: "Comment"
                  }
                  ],
    Author: {
        id:{
            type: mongo.Schema.Types.ObjectId,
            ref: "User"
        },
        Username: String
    }
});
  /////////////////////////////
 //////Comment Schema/////////
/////////////////////////////
var CommentSchema= new mongo.Schema({
    text: String,
    Author: {
        id:{
            type: mongo.Schema.Types.ObjectId,
            ref: "User"
        },
        Username: String
    }
});

var VideoSchema= new mongo.Schema({
    Link: String,
    Title: String
});

User_Schema.plugin(passportLocalMongoose);

//////////////////////////////
//////Email Authentication////
///////////////////////////////
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'mahadbajwa97@gmail.com',
        pass: 'qwertyuiop46'
    }
});

//Model Declaration
var Blogs=mongo.model("Blogs", blogSchema);
var UserDatabase = mongo.model("UserDatabase", User_Schema);
var Comment = mongo.model("Comment", CommentSchema);
var Video = mongo.model("Video", VideoSchema);
//end

//Check Authenticate User Function
app.use(function(req, res, next)
{
    req.app.locals.currentUse=req.user;
    next();
});


//MULTER CONFIG: to get file photos to temp server storage
const multerConfig = {

    //specify diskStorage (another option is memory)
    storage: multer.diskStorage({

        //specify destination
        destination: function(req, file, next){
            next(null, './Views/Css/image-storage/');
        },

        //specify the filename to be unique
        filename: function(req, file, next){
            console.log(file);
            //get the file mimetype ie 'image/jpeg' split and prefer the second value ie'jpeg'
            const ext = file.mimetype.split('/')[1];
            //set the file fieldname to a unique name containing the original name, current datetime and the extension.
            next(null, file.fieldname + '-' + Date.now() + '.'+ext);
        }
    }),

    // filter out and prevent non-image files.
    fileFilter: function(req, file, next){
        if(!file){
            next();
        }
        // only permit image mimetypes
        const image = file.mimetype.startsWith('image/');
        if(image){
            console.log('photo uploaded');
            next(null, true);
        }else{
            console.log("file not supported");
            //TODO:  A better message response to user on failure.
            return next();
        }
    }
};



app.use(require("express-session")({
    secret: "Mental health illness",
    resave:false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({ usernameField: 'username', passwordField: 'Password'},UserDatabase.authenticate()));
passport.serializeUser(UserDatabase.serializeUser());
passport.deserializeUser(UserDatabase.deserializeUser());


app.get("/", function (req, res){

    res.send("This will be the landing page");
});
app.get("/Contact_us", function (req, res)
{
    res.render("Contact_us",{ currentUser: req.user });
});
app.post("/contact_us/send", function (req, res) {



    var mailOptions = {
        from: req.body.user,
        to: 'mahadbajwa97@gmail.com, mshahryar.bese16seecs@seecs.edu.pk',
        subject: req.body.Subject,
        html: ' <div style="background-image:url(\'https://cdn.hipwallpaper.com/i/54/23/tA1GSE.jpg\') ;background-position: center;\n' +
            '  background-repeat: no-repeat;\n' +
            '  background-size: cover;width: 100%;height: 100%; align-content: center;">\n' +
            '        <div style="color:midnightblue ; text-align: center; -webkit-text-stroke: 0.7px darkslategrey;padding-left: 25%;padding-right: 25%;">\n' +
            '            <br><br>\n' +
            '            <h2>\n' +
            '                Dear '+ req.body.user+'!<br>\n' +
            '                Thank you for the querry. We will get back to you asap. \n' +
            '\n' +
            '                We are so very that you chose our platform to engage yourself\n' +
            '                in this experience.You have a lot of options. By joining\n' +
            '            </h2>\n' +
            '        </div>\n' +
            '\n' +
            '\n' +
            '    </div>\n' +
            '\n'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
            res.redirect("/Home");
        }
    });
});
app.get("/Home",function(req, res)
{

            //get to home
            res.render("Home", {currentUser: req.user });
});
///////////////////////////
//////Blog/////////////////
////////////////////////
app.get("/article/:id/edit",CheckBlogOwnership ,function (req, res)
{
    Blogs.findById(req.params.id, function (err, foundBlog) {
       if(err)
       {
           console.log("Error");
       }
       else {
           console.log(foundBlog);
          res.render("Edit",{Blog: foundBlog, currentUser: req.user });
       }
    });

});
app.put("/article/:id", function (req, res)
{
   Blogs.findByIdAndUpdate(req.params.id, req.body.blog, function(err, body)
   {
      if(err)
      {
          console.log("Error finding");
      }
      else
      {
          res.redirect("/article/"+req.params.id);
      }
   });
});
app.get("/addBlog", function (req, res)
{
    res.render("addBlog",{ currentUser: req.user });
});
app.post("/addBlog",IsLoggedIn,multer(multerConfig).single('Blog') ,function(req, res)
{
    var img=req.file;
    Blogs.create(req.body.blog, function (err, addedBlog) {
       if(err)
       {
          console.log("Not Added");
       }
       else
       {
           console.log(img);
           addedBlog.Image=img;
           addedBlog.Author.Username=req.user.username;
           addedBlog.Author.id=req.user._id;
           addedBlog.save();
           res.redirect("Index");
       }
    });
});
app.get("/Index", function (req, res)
{
    console.log(req.user);
    Blogs.find({}, function (err, Blog) {
        if(err)
        {
            console.log(err);
        }
        else
        {
            res.render("index",{ Blogs: Blog, currentUser: req.user });
        }
    });
});

 ////////////////////////
 ////Video Upload///////
//////////////////////
app.get("/VideoUpload", function (req, res)
{
       res.render("VideoUpload", {currentUser: req.user });
});
app.post("/UploadVideo", function(req, res)
{
    var videoLink= req.body.Link;

    videoLink = videoLink.replace("watch?v=", "embed/")
    console.log(videoLink);
    Video.create({
        Title: req.body.Title,
        Link: videoLink
    }, function (err, created) {
        if(err)
        {
            console.log(err);
        }
        else
        {
            res.redirect("/Home");
        }
    });
});


  /////////////////////////////////
 ////////Blog Display////////////
///////////////////////////////

app.get("/article/:id", function (req, res)
{
    var blog_id = req.params.id;
    Blogs.findById(blog_id).populate("Comments").exec( function (err, SelectedBlog) {
        if(err)
        {
            res.redirect("Index");
        }
        else
        {
            console.log("Hi There" + SelectedBlog);
            res.render("Article", {blog: SelectedBlog, currentUser: req.user });
        }
    });


});
app.get("/User_Dashboard/:id",  function (req, res)
{
    var user_id = req.params.id;
    UserDatabase.find({_id: user_id}, function (err, loggedInUser) {
        if(err)
        {
            console.log("Error logging in");
        }
        else
        {

            console.log("Hi There" + loggedInUser);
            res.render("User_Dashboard", {User: loggedInUser , currentUser: req.user });
        }
    });


});
app.get("/User_Dashboard/:id/profile", function (req, res) {
    var user_id = req.params.id;
    UserDatabase.find({_id: user_id}, function (err, loggedInUser) {
        if(err)
        {
            console.log("Error logging in");
        }
        else
        {
            console.log("Hi There" + loggedInUser);
            res.render("profile", {User: loggedInUser , currentUser: req.user });
        }
    });
});
app.get("/Video_catalog", function (req, res)
{
    Video.find({}, function (err, foundVideos) {
       if(err)
       {
           console.log(err);
       }
       else
       {
           console.log(foundVideos);
           res.render("Video_catalog",{ currentUser: req.user , Videos: foundVideos});
       }
    });

});
app.get("/Video_catalog/:id", function (req, res)
{
    res.render("Video_interface",{ currentUser: req.user });
});

//Comment Route
app.post("/article/:id/comment",IsLoggedIn,function (req, res) {
    Blogs.findById(req.params.id, function(err, blog)
    {
        if(err)
        {
            console.log(err);
        }
        else
        {
            Comment.create({text: req.body.text},
                function (err, comment)
                {
                    if(err)
                    {
                        console.log(err);
                    }
                    else
                    {
                                comment.Author.id= req.user._id;
                                comment.Author.Username= req.user.username;
                                comment.save();
                                blog.Comments.push(comment);
                                blog.save();
                                UserDatabase.update({_id : blog.Author.id},
                                    {$inc: {'notification': 1}}, function(err, res) {
                                      if (err) throw err;
                                      console.log("1 document updated");
                                });

                                console.log(blog);
                                res.redirect("/article/"+blog._id);



                    }
                });
        }

    });

});





    app.get("/Sign_up", function (req, res)
    {
        res.render("Sign_up", {currentUser: req.user });
    });

app.post("/sign_up", multer(multerConfig).single('photo'), function (req, res) {
    var unauthentic;
    var name= req.body.FullName;
    var username= req.body.username;
    var Email=req.body.Email;
    var ContactNumber = req.body.ContactNumber;
    var Password = req.body.Password;
    var Dob = req.body.Dob;
    var img=req.file.filename;

    UserDatabase.register( { FullName: name,
        username: username,
        ContactNumber: parseInt(ContactNumber),
        Email: Email,
        Dob: Dob,
        Image:img}, Password,function (err, UserDatabase)
    {
        if(err)
        {
            console.log(err);
        }
        else
        {
             console.log(req.file);
             passport.authenticate("local")(req, res, function () {
                 var mailOptions = {
                     from: 'mahadbajwa97@gmail.com',
                     to: 'mahadbajwa97@gmail.com, mshahryar.bese16seecs@seecs.edu.pk',
                     subject: req.body.Subject,
                     html: ' <div style="background-image:url(\'https://www.brainforestcenters.com/wp-content/uploads/2018/05/Mental-Health-in-children-and-teens.jpg\') ;background-position: center;\n' +
                         '  background-repeat: no-repeat;\n' +
                         '  background-size: cover;width: 100%;height: 100%; align-content: center; z-index: -1; filter: blur(5px)">\n' +
                         '        <div style="  text-align: center; -webkit-text-stroke: 0.7px darkslategrey;padding-left: 25%;padding-right: 25%;">\n' +
                         '            <br><br>\n' +
                         '            <h2>\n' +
                         '                Welcome '+ UserDatabase.FullName + '<br>\n' +
                         '                Thank you for joining Jaago . A community of many people\n' +
                         '                who struggle against Mental Health Issues and try to solve\n' +
                         '                them. We provide motivational blogs , videos for the users\n' +
                         '                to make them comfortable about their issues.\n' +
                         '\n' +
                         '                We are so very that you chose our platform to engage yourself\n' +
                         '                in this experience.You have a lot of options. By joining\n' +
                         '            </h2>\n' +
                         '        </div>\n' +
                         '\n' +
                         '\n' +
                         '    </div>\n' +
                         '\n'
                 };

                 transporter.sendMail(mailOptions, function(error, info){
                     if (error) {
                         console.log(error);
                     } else {
                         console.log('Email sent: ' + info.response);
                         res.redirect("/Home");
                     }
                 });
             res.redirect("/User_Dashboard/"+UserDatabase._id);
        });
        }});
    console.log("Hi I am here");

});




//Login Form
app.get("/Sign_in", function (req, res)
{
    res.render("Sign_in", { currentUser: req.user });
});



app.post("/sign_in_authentication", passport.authenticate("local"),

            function (req, res) {
                    UserDatabase.find({username: req.body.username}, function (err, user) {
                        if(err)
                        {
                            console.log(err);
                        }
                        else
                       {
                            console.log(user);
                            res.redirect("/User_Dashboard/"+user[0]._id);
                        }

                    });

    });




function IsLoggedIn(req, res, next)
{
    if(req.isAuthenticated())
    {
        return next();
    }
    res.redirect("/Sign_up");
};
function CheckBlogOwnership(req, res, next)
{
    if(req.isAuthenticated()) {
        Blogs.findById(req.params.id, function (err, blog) {
            if (err) {
                console.log(err);
            }
            else {

                if (blog.Author.id.equals(req.user._id))
                {
                    next();
                }
                else {
                    res.send("Wrong Try");
                }
            }
        });
    }
        else
        {
          res.send('Wrong Try');
        }

}


//LOG OUT
app.get("/Log_out",function (req, res) {
   req.logOut();
   res.redirect("/Home");
});



app.listen(3000, function () {
    console.log("Server has started");
});