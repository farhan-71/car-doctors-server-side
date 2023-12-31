const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const prot = process.env.PORT || 5000;

// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://car-doctor-52249.web.app",
      "https://car-doctor-52249.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
// mycreatedmiddleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorezid access" });
    }
    req.user = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("car doctor server is running...");
});

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { JsonWebTokenError } = require("jsonwebtoken");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ekax5iq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// collections
const usersCollection = client.db("usersDB").collection("users");
const servicesCollection = client.db("carDoctorsDB").collection("services");
const bookingsCollection = client.db("bookingsDB").collection("bookings");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      // res
      //   .cookie("token", token, {
      //     httpOnly: true,
      //     secure: true,
      //     // secure: false,
      //   })
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // auth logout
    app.post("/logout", async (req, res) => {
      const user = req.body;
      res.clearCookie("token", { maxAge: 0 }).send({ message: true });
    });

    //POST :: a user
    app.use("/users", async (req, res) => {
      try {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });

    // GET :: services
    app.get("/services", async (req, res) => {
      try {
        const result = await servicesCollection.find().toArray();
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });
    // GET :: particular service
    app.get("/services/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const options = {
          projection: { title: 1, img: 1, price: 1, service_id: 1 },
        };
        const result = await servicesCollection.findOne(query, options);
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });

    // GET :: particuler user data filtered by req.query
    app.get("/bookings", verifyToken, async (req, res) => {
      try {
        // const user = req.query.email
        if (req?.user?.email !== req?.query?.email) {
          return res.status(403).send({ message: "forbidden access" });
        }
        let query = {};
        if (req?.query?.email) {
          query = { email: req.query?.email };
        }
        const result = await bookingsCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });

    // POST :: particular booking
    app.post("/bookings", async (req, res) => {
      try {
        const data = req.body;
        const result = await bookingsCollection.insertOne(data);
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });
    // DELETE :: particular booking
    app.delete("/bookings/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingsCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        return res.send({ error: true, message: err.message });
      }
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(prot, () => {
  console.log(`car doctor server is running from ${prot}`);
});
