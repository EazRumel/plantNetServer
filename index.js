
const express = require("express");
const jwt = require("jsonwebtoken")
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const morgan = require('morgan')

const app = express()
const port = process.env.PORT || 3000; 




//middlewares 
app.use(cors({
  origin:["http://localhost:5173"],
  credentials:true
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"))








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

    const orderCollection = client.db("treePlanet").collection("orders");
   
  const userCollection = client.db("treePlanet").collection("users");

   const plantsCollection = client.db("treePlanet").collection("plants");

   const cartCollection = client.db("treePlanet").collection("carts");

 





   //jwt related api


   app.post("/jwt",(req,res)=>{
     const user = req.body;
     const token = jwt.sign(user,process.env.JWT_TOKEN,{expiresIn:"1h"})
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
      //  console.log("to check the cookies if it exists or not",req.cookies)
      if(!token){
        res.status(401).send({message:"Unauthorized Access"})
      }
      jwt.verify(token,process.env.JWT_TOKEN,(error,decoded)=>

      {
         if(error){
          return res.status(401).send({message:"Unauthorized Access"})
         }
          req.user = decoded;
          next();
      }
    )}


    //verify admin middleware

    const verifyAdmin =async(req,res,next)=>{
      // console.log("verify from verify token",req.user.email);
      const email = req?.user?.email;
      const query = {email:email};
      const data = await userCollection.findOne(query);
      if(!data || data?.role !=="admin"){
        return res.status(403).send({message:"Forbidden Access"})
      }
      next();
    }

    //  const verifySeller = async(req,res,next)=>{
    //   const email = req?.user?.email;
    //   const query = {email: email}
    //   const data = await userCollection.findOne(query);
    //   if(!data && data.role !== "seller"){
    //      return res.status(403).send({message:"Forbidden Access"})
    //   }
    //   next();
    //  }

    const verifySeller = async(req,res,next)=>{
     const email = req?.user?.email;
     const query = {email:email};
     const result = await userCollection.findOne(query);
     if(!result || result.role !== "seller"){
      return res.status(403).send({message:"Forbidden Access"})
     }
     next();
    }



   //get plants


  app.post("/plants",async(req,res)=>{
    const plant = req.body;
    const result = await plantsCollection.insertOne(plant);
    res.send(result); 
  })

   app.get("/plants",async(req,res)=>{

    const result = await plantsCollection.find().toArray();
    res.send(result);
   })

   app.get("/plants/seller",verifyToken,verifySeller,async(req,res)=>{
      const email = req.user.email;
      // console.log("EmAIL: ",email)
      const query = {"seller.email":email}
      // console.log("From Seller",query);
      const result = await plantsCollection.find(query).toArray();
      res.send(result);
   })

   app.delete("/plants/:id",async(req,res)=>{
    const id = req.params.id;
    const query = {_id:new ObjectId(id)}
    const result = await plantsCollection.deleteOne(query);
    res.send(result);
   })



    app.get("/plants/:id",async(req,res)=>{
     
    const id = req.params.id;
    const query = {_id : new ObjectId (id)}
    result = await plantsCollection.findOne(query);
    res.send(result);
  })

    //patch the increment decrement of quantity

  app.patch("/plants/quantity/:id",verifyToken,async(req,res)=>{
    const { updateQuantity,status } = req.body;
    const quantity = Number(updateQuantity)
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)}
    let updatedDoc
    if (status === "decrease"){
      updatedDoc = {
        $inc: {
          quantity:-quantity
        }
    }
    }

    if(status === "increase"){
         updatedDoc = {
        $inc: {
          quantity:quantity
        }
    }
    }
    const result = await plantsCollection.updateOne(filter,updatedDoc)
    res.send(result)
    // console.log("Id is: ",id)
  })


  //orders api

  app.post("/order",verifyToken,async(req,res)=>{
    const orderInfo = req.body;
    const result = await orderCollection.insertOne(orderInfo);
    res.send(result);
  })

  app.delete("/order/:id",async(req,res)=>{
    const id = req.params.id;
    const query = {_id : new ObjectId(id)}
    const order = await orderCollection.findOne(query);
    if(order.status === "Delivered"){
      return res.status(409).send("Cannot be deleted once delivered");
    }
    const result = await orderCollection.deleteOne(query);

    res.send(result);
  })


  app.get("/customer/order/:email",async(req,res)=>{
    const email = req.params.email;
    const query = {"customer.email":email}
    // const result = await orderCollection.find(query).toArray();

    const result = await orderCollection.aggregate([
      {
        $match:query
      },
      {
         $addFields: {
         plantId:{$toObjectId:"$plantId"}
       }
      },
      {
        $lookup:{
          from:"plants",
          localField:"plantId",
          foreignField:"_id",
          as:"plants"
        },
        
      }
      ,
      {
        $unwind:"$plants"
      }, 
      {
        $addFields:{
          name:"$plants.name",
          category:"$plants.category",
          image:"$plants.image"
        },
        
      },
      {
        $project:{
          plants:0
        }
      }
    ]).toArray();

  
    res.send(result);
  })


  

   

  //get reviews
  app.get("/reviews",async(req,res)=>{
    const result = await reviewCollection.find().toArray();
    res.send(result);
  })

  //post reviews
  app.post("/review",async(req,res)=>{
    const user = req.body;
    const result = await reviewCollection.insertOne(user);
  })



 

  app.post("/users", async(req,res)=>{
  const user = req.body;

  const query = { email: user.email };

  const existingUser = await userCollection.findOne(query);

  if(existingUser){
    return res.send({
      message:"User already exists",
      insertedId:null
    });
  }

  const result = await userCollection.insertOne({
    ...user,
    role:"customer",
    // status:"customer"
  });

  res.send(result);
});

app.get("/all-users/:email",verifyToken,verifyAdmin,async(req,res)=>{
  const email = req.params.email
  const query = {email : {$ne:email}} //$ne = not equal to
 const result = await userCollection.find(query).toArray();
 res.send(result);
//  console.log(result)
})


app.patch("/users/role/:email",verifyToken,verifyAdmin,async(req,res)=>{
  const email = req.params.email;
  const {role} = req.body;
  const query = {email:email};
  const updateDoc = {
    $set:{
      role,
      status:"Verified"
    }
  }
  const result = await userCollection.updateOne(query,updateDoc);
  res.send(result);
})




  app.patch("/users/:email",async(req,res)=>{
    const email = req.params.email;
    const query = {email}
    const user = await userCollection.findOne(query);

    if(!user){
      res.status(404).send("User not found")
    }
    if( user.status === "Requested"){
      res.status(400).send("You have already requested,please wait")
    }


    const updateDoc = {
      $set:{
        status:"Requested",
      },
    }
    const result = await userCollection.updateOne(query,updateDoc)
    console.log(result);
    res.send(result);
  })


  //get users api
  app.get("/users",async(req,res)=>{
    const result = await userCollection.find().toArray();
    res.send(result);
  })


  //user role related api

  app.get("/users/role/:email",async(req,res)=>{
    const email = req.params.email;
    const query = {email}
    const result = await userCollection.findOne(query)
    res.send({role:result?.role})
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