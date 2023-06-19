const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const User = require("./models/User.js");
const Place = require("./models/places");
const Tample = require("./models/Tample.js");
const Advanture = require("./models/Advanture.js");
const Owner = require("./models/Owner.js");
require("dotenv").config(); //setting configuration for accing env files
const cookieParser = require("cookie-parser");
const download = require("image-downloader");
const app = express();
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = "iworirjwkngkeajngoiut";
const braintree = require("braintree");
const cloudinary = require('cloudinary').v2;
const requireLogin = require("./middleware/auth.js");

app.use(express.json()); //setting middleware for json
app.use(cookieParser()); //setting middleware for cookies
app.use("/uploads", express.static(__dirname + "/uploads")); //setting up middileware to access images downloaded by "image-downloader"

// const corsOptions = {
//   origin: "http://localhost:3000",
//   credentials: true, //access-control-allow-credentials:tru
//   optionSuccessStatus: 200,
// };

// app.use(cors(corsOptions)); //setting middleware for cors error

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://spiritusadventura.netlify.app');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true'); // Set 'Access-Control-Allow-Credentials' to 'true'
  next();
});

const { ObjectId } = require("mongodb");
mongoose.connect(process.env.MONGO_URL); //mongo connection
const PORT = process.env.PORT || 5000;


app.get("/test", (req, res) => {
  res.send(process.env.MONGO_URL);
});

const BRAINTREE_MERCHANT_ID = process.env.BRAINTREE_MERCHANT_ID;
const BRAINTREE_PUBLIC_KEY = process.env.BRAINTREE_PUBLIC_KEY;
const BRAINTREE_PRIVATE_KEY = process.env.BRAINTREE_PRIVATE_KEY;

var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: BRAINTREE_MERCHANT_ID,
  publicKey: BRAINTREE_PUBLIC_KEY,
  privateKey: BRAINTREE_PRIVATE_KEY,
});

//payment tokens
app.post("/client_token", async (req, res) => {
    let token ;
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err);
      } else {
        // console.log(response.clientToken);
        token = response.clientToken;
        console.log("token is ", token);
       res.json(token);
      }
    });
  console.log("token is ", token);
  // res.json(token);
});

//payment gateway api
app.post("/checkout",(req, res) => {
  try {
    let nonceFromTheClient = req.body.nonce;
    let amountFromTheClient = req.body.amount;
    gateway.transaction.sale(
      //setting amount and nonce
      {
        amount: amountFromTheClient,
        paymentMethodNonce: nonceFromTheClient,
        options: {
          submitForSettlement: true,
        },
      },
      function (err, result) {
        if (err) {
          res.status(500).json(err);
        } else {
          console.log("order is placed",result)
          res.json(result);
        }
      }
    );
  } catch (err) {
    console.log(err);
  }
});

app.post("/register", async (req, res) => {
  const { position, name, email, password, confpassword } = req.body;
  // console.log("position is ", position, "name is ", name, "email is ", email,"password is ", password, "confpassword is ", confpassword);
  try {
    if (position === "User") {
      if (password === confpassword) {
        const userDoc = await User.create({
          name,
          email,
          password: bcrypt.hashSync(password, bcryptSalt), //encrepting passward using hashsync
        });
        console.log("user is ", userDoc);
        res.json(userDoc);
      } else {
        res.json("unfortunitely notfound");
      }
    } else if (position === "Property owner") {
      if (password === confpassword) {
        const userDoc = await Owner.create({
          name,
          email,
          password: bcrypt.hashSync(password, bcryptSalt), //encrepting passward using hashsync
        });
        console.log(userDoc);
        res.json(userDoc);
      } else {
        res.json("unfortunitely notfound");
      }
    }
  } catch (e) {
    res.status(422).json(e);
  }
});

//here we are delcaring a variable that will tell us about login status
let isLogin = false;

app.post("/login", async (req, res) => {
  const { position, lname, lpass } = req.body;
  let resultDoc;
  if (position === "User") {
    resultDoc = await User.findOne({ email: lname });
  } else if (position === "Property owner") {
    resultDoc = await Owner.findOne({ email: lname });
  }
  if (resultDoc) {
    const passok = bcrypt.compareSync(lpass, resultDoc.password); //comparing the passward by decrepting previously stored passward
    if (passok) {
      //initalizing jwt tokens with the data
      console.log("position is ", position);
      isLogin = true;
      jwt.sign(
        {
          email: resultDoc.email,
          id: resultDoc._id,
          name: resultDoc.name,
          pos: position,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json(resultDoc);
        }
      );
    } else {
      res.json("unfortunitely notfound");
    }
  } else {
    res.json("not found");
  }
});

app.post("/addtocart", async (req, res) => {
  const { userid, position, place, price, checkin, checkout, guest } = req.body;

  const objectId = new ObjectId(userid);
  const filter = { _id: objectId };
  const update = {
    $push: {
      cart: {
        price: price,
        place: place,
        checkin: checkin,
        checkout: checkout,
        guest: guest,
      },
    },
  };

  if (position === "User") {
    await User.findByIdAndUpdate(filter, update)
      .then((result) => {
        // Handle the search result
        console.log(result);
        res.json(result);
      })
      .catch((error) => {
        // Handle any errors
        console.error(error);
      });
  } else if (position === "Property owner") {
    result = await Owner.updateOne(filter, update)
      .then((result) => {
        // Handle the search result
        console.log(result);
        res.json(result);
      })
      .catch((error) => {
        // Handle any errors
        console.error(error);
      });
  }
});


app.post("/deletefromcart", async (req, res) => {
  const { place, position, email } = req.body;
  if (position === "User") {


    User.updateOne(
      { email: email },
      { $pull: { cart: {place:place} } }
    )
      .then(result => {
        // Handle the update result
        console.log(result);
      })
      .catch(error => {
        // Handle any errors
        console.error(error);
      });
  } else if (position === "Property owner") {
    Owner.updateOne(
      { email: email },
      { $pull: { cart: {place:place} } }
    )
      .then(result => {
        // Handle the update result
        console.log("result is ", result);
      })
      .catch(error => {
        // Handle any errors
        console.error(error);
      });
  }
  res.json("done");
});


app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  // should print cookies sent by the client
  console.log("token is ", token);

  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, user) => {
      if (err) throw err;
      console.log(user);
      let userDoc = null;
      if (user.pos === "User") {
        userDoc = await User.findById(user.id);
      } else if (user.pos === "Property owner") {
        userDoc = await Owner.findById(user.id);
      }
      console.log("user profile is ", userDoc);
      res.json({
        user: userDoc,
        pos: user.pos,
        result:isLogin
      });
    });
  } else {
    res.json(null);
  }

  // res.send(token);
});

app.post("/logout", (req, res) => {
  isLogin = false;
  res.cookie("type", "").json(true);
});

app.post("/registerPlace", (req, res) => {
  const {
    title,
    address,
    addedPhotos,
    description,
    einfo,
    checkin,
    checkout,
    guest,
    perks,
  } = req.body;
  try {
    const { token } = req.cookies;
    let owner_name = "";
    if (token) {
      jwt.verify(token, jwtSecret, {}, async (err, user) => {
        if (err) throw err;
        console.log("user value", user);
        owner_name = user.name;
        console.log("owner_name is", owner_name);
      });
    }
    const placeDoc = Place.create({
      owner: owner_name,
      title: title,
      address: address,
      photos: addedPhotos,
      description: description,
      perks: perks,
      extraInfo: einfo,
      checkin: checkin,
      checkout: checkout,
      maxGuest: guest,
    });
    res.json(placeDoc);
  } catch (e) {
    res.json(e);
  }
});


//creating a storage for multer
const storage = multer.diskStorage({
  //assigning the destination of a file
  destination: (req, file, cb) => {
    //cb stands for callback
    cb(null, "uploads");
  },
  //setting the name of a file
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});


const upload = multer({ storage: storage });


const CLOUD_NAME=process.env.CLOUD_NAME;
const API_KEY=process.env.API_KEY;
const API_SECRET=process.env.API_SECRET;


cloudinary.config({ 
  cloud_name:CLOUD_NAME, 
  api_key: API_KEY, 
  api_secret: API_SECRET 
});



app.post("/newplaceinfo",upload.single("image"), async (req, res) => {
  const { sitetype } = req.body;
  if (sitetype === "spiritual") {
    const { title, subtitle, desc, god, state, air, train, bus } = req.body;
    const image= req.file;
    console.log("desc", desc);
    console.log("image is", image);
    console.log("image  address is ",image.filename);
    const temp=image.filename;


    cloudinary.config({ 
  cloud_name:CLOUD_NAME, 
  api_key: API_KEY, 
  api_secret: API_SECRET 
});

  const result = await cloudinary.uploader.upload(req.file.path);
  const imageUrl = result.secure_url;

    try {


      const userDoc = await Tample.create({
        title: title,
        subtitle: subtitle,
        desc: desc,
        img:imageUrl,
        god: god,
        state: state,
        air: air,
        train: train,
        bus: bus,
      });
      userDoc.save();
      res.json(userDoc);
    } catch (e) {
      res.status(422).json(e);
    }
  } else if (sitetype === "advanture") {
    const {
      advanturetype,
      companyname,
      address,
      city,
      astate,
      price,
      available,
    } = req.body;
    console.log(
      advanturetype,
      companyname,
      address,
      city,
      astate,
      price,
      available
    );
    try {
      const userDoc = await Advanture.create({
        AdvantureType: advanturetype,
        companyname: companyname,
        address: address,
        city: city,
        state: astate,
        price: price,
        availableseats: available,
      });
      userDoc.save();
      res.json(userDoc);
    } catch (e) {
      res.status(422).json(e);
    }
  }
});

app.post("/religiousplace", async (req, res) => {
  const val = res.json(await Tample.find());
});

app.post("/religiousbook", async (req, res) => {
  const { id } = req.body;
  const val = await Tample.findById(id);

  const userDoc = await Place.find();

  console.log(val);
  res.json({
    val: val,
    userDoc: userDoc,
  });
});

app.post("/religiousplacebysearch", async (req, res) => {
  let { searchplace, state, region } = req.body;

  if (state === "Religious Places") {
    state = null;
  }

  if (region === "States") {
    region = null;
  }
  console.log("values are", searchplace, state, region);

  try {
    const query = {};

    if (searchplace) {
      query.title = searchplace;
    }

    if (state) {
      query.region = state;
    }

    if (region) {
      query.state = region;
    }

    if (Object.keys(query).length > 0) {
      const data = await Tample.find(query);
      console.log("data is", data);
      res.json(data);
    } else {
      // No search arguments provided
      res.json([]);
    }
  } catch (e) {
    // Handle error
    res.status(500).json(e);
  }
});

app.post("/searchhotels", async (req, res) => {
  const { hname, address, rating, state } = req.body;
  console.log(hname, address, rating, state);
  const userDoc = await Place.find({
    address: address,
  });
  res.json(userDoc);
});

app.post("/tampleinfo", async (req, res) => {
  const { id } = req.body;
  const val = await Tample.findById(id);
  console.log(val);
  res.json(val);
});

app.post("/Advantureplace", async (req, res) => {
  const { subpage } = req.body;
  console.log(subpage);

  const val = await Advanture.find({ AdvantureType: subpage });
  console.log(val);
  res.json(val);
});

app.get("/addedplace", (req, res) => {
  const { token } = req.cookies; // should print cookies sent by the client
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, user) => {
      if (err) throw err;
      const userDoc = await Place.find({ owner: user.name });
      console.log("filtered places", userDoc);
      res.json(userDoc);
    });
  } else {
    res.json(null);
  }
});

app.post("/searchplace", async (req, res) => {
  const { search } = req.body;
  console.log(search);
  const userDoc = await Place.find({ address: search });
  console.log("filtered places", userDoc);
  res.json(userDoc);
});

app.get("/mainpage", async (req, res) => {
  res.json(await Place.find());
});

app.get("/places/:id", async (req, res) => {
  //id as a parameter send kela ahe  so req.param use kela ahe
  const { id } = req.params; //jeva pn front end pasun data send kela jayel too {} braces madhech fetch karava
  console.log(id);
  res.json(await Place.findById(id));
});

//in photos we are using image-downloader library which is used to download image with the help of their url and then they are saved into given directory
app.post("/photos", async (req, res) => {
  const { link } = req.body;
  const newName = "photos" + Date.now() + ".jpg";
  await download.image({
    url: link, //url of an image
    dest: __dirname + "/uploads/" + newName, //path of destinatiion folder
  });
  res.json(newName); //sending json response
});

app.listen(PORT, () => {
  console.log(`listening port from 8000 ${PORT}`);
});

//& notes

// *The useParams hook returns an object of key/value pairs of the dynamic params from the current URL that were matched by the <Route path>. Child routes inherit all params from their parent routes.
