
const express = require("express");
const jwt = require("jsonwebtoken")
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const app = express()
const port = process.env.PORT || 3000; 




//middlewares 
app.use(cors({
  origin:["http://localhost:5173"],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());








// const { MongoClient, ServerApiVersion } = require('mongodb');


// Create a MongoClient with a MongoClientOptions object to set the Stable API version



const { MongoClient, ServerApiVersion, ObjectId, CommandSucceededEvent } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t89ec.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {


  //try with the tasks in backend
  try {
    // Connect the client to the server	(optional starting in v4.7)

     await client.connect();
    // Send a ping to confirm a successful connection
    

    const reviewCollection = client.db("treePlanet").collection("reviews");
   
  const userCollection = client.db("treePlanet").collection("users");

   const plantsCollection = client.db("treePlanet").collection("plants");

   const cartCollection = client.db("treePlanet").collection("carts");





   //jwt related api


   app.post("/jwt",(req,res)=>{
     const user = req.body;
     const token = jwt.sign(user,process.env.JWT_TOKEN,{expiresIn:"2h"})
     res.cookie("token",token,{
      httpOnly:true,
      secure:false,
      sameSite:"lax"
     })
     .send({success:true});
   })

   app.post("/logOutJwt",async(req,res)=>{
      res.clearCookie("token",{
        httpOnly:true,
        secure:false,
        sameSite:"lax"

      })
      .send({success:true})
   })

   const verifyToken =(req,res,next)=>{

       const token = req?.cookies?.token;
       console.log("to check the cookies if it exists or not",req.cookies)
      if(!token){
        res.status(401).send({message:"Unauthorized Access"})
      }
      jwt.verify(token,process.env.JWT_TOKEN,(error,decoded)=>

      {
         if(error){
          return res.status(401).send({message:"Unauthorized Access"})
         }
          next();
      }
    )}




   //get plants

   app.get("/plants",async(req,res)=>{

    const result = await plantsCollection.find().toArray();
    res.send(result);
   })



    app.get("/plants/:id",async(req,res)=>{
     
    const id = req.params.id;
    const query = {_id : new ObjectId (id)}
    result = await plantsCollection.findOne(query);
    res.send(result);
  })


   

  //get reviews
  app.get("/reviews",async(req,res)=>{
    const result = await reviewCollection.find().toArray();
    res.send(result);
  })



  //post users
  app.post("/users",async(req,res)=>{
    const user = req.body;
    const query = {email:user.email};
    const existingUser = await user.collection.findOne(query)
    if(existingUser){
      return res.send({message:"User already exists"})
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
  })


  //get users api
  app.get("/users",async(req,res)=>{
    const result = await userCollection.find().toArray();
    res.send(result);
  })


  //cart related apis

  app.post("/carts",async(req,res)=>{
    const cartItem = req.body;
    const result = await cartCollection.insertOne(cartItem);
    res.send(result);
  })

 
  app.get("/carts",verifyToken,async(req,res)=>{
    const email = req.query.email;

    const query = {email:email};

    const result = await cartCollection.find(query).toArray();
    res.send(result);
  })

  app.delete("/carts/:id",async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)};
    const result = await cartCollection.deleteOne(query);
    res.send(result);
  })





await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");



   
  }

  //catch if any error occurs
  // catch{

  // }
   finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/",(req,res)=>{
  res.send("Hello From Plant Net");
})

app.listen(port,()=>{
  console.log(`Plant Net is running on ${port}`)
})