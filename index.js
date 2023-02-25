const crypto = require('crypto');
const express = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const Web3 = require('web3');
const web3 = new Web3();


const app = express();
app.use(cors());


// connect to MongoDB
mongoose.connect("mongodb+srv://Reha:ePaeN2RL6kcljfrY@cluster0.tzwrkyn.mongodb.net/?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}, (err) => {
  if (err) {
    console.log("Failed to connect to MongoDB:", err);
  } else {
    console.log("Successfully connected to MongoDB");
  }
});

// create schema for the form data
const formSchema = new mongoose.Schema({
  name: String,
  statement: String,
  odds: Number,
  amoubt: Number,
  datetime: String,
  uid: String,
  odds: [
    {
      odds: String,
      value: String
    }
  ],
  participants: [
    {
      name: String,
      TotalBetAmount: Number,
      maxPotentialReturn: Number,
      CryptoAccount: {
        AccountAddress: String,
      }
    }
  ],
  CryptoAccount: {
    AccountAddress: String,
    PrivateKey: String
  }

});


const Form = mongoose.model("Form", formSchema);

app.use(express.json());

// handle form submission
app.get("/", async (req, res) => {
  console.log("reached")
})
app.post("/", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://main--deluxe-raindrop-c2ce14.netlify.app');
  const newAccount = web3.eth.accounts.create();
  const privateKey = newAccount.privateKey;
  const hashedPrivateKey = crypto.createHash('sha256').update(privateKey).digest('hex');

  const uid = uuidv4()
  try {
    const requestBody = {
      ...req.body,
      uid: uid,
      CryptoAccount: {
        AccountAddress: newAccount.address,
        PrivateKey: hashedPrivateKey
      }
    };
    console.log("request", requestBody);
    const form = new Form(requestBody);
    // save the document to the database
    await form.save();
    const responseMessage = `Form submitted successfully. UID: ${uid}`;
    res.status(200).send(responseMessage);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});




app.post("/userdetails", async (req, res) => {

  const { uid } = req.body;
  console.log("uid", uid)
  try {

    const user = await Form.findOne({ uid: uid });
    console.log(user)
    if (!user) {
      res.status(404).send("User not found");
    } else {
      res.status(200).json(user);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});



app.post("/submit-form/:uid", async (req, res) => {
  console.log("form submitted")
  try {
    const { uid } = req.params;
    const { betData } = req.body;
    const form = await Form.findOne({ uid });
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    form.participants = [...form.participants, betData];
    console.log(form.participants)
    await form.save();
    return res.status(200).json({ message: "Form data updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


// start the server
app.listen(5000, () => {
  console.log("Server started on port 5000");
});
