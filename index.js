var crypto = require('crypto');
var buffer = require('buffer');
const { Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const express = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const Web3 = require('web3');
const secretKey = process.env.SECRET_KEY;
const iv = Buffer.alloc(16, 0);
const algorithm = 'aes-256-cbc';
const salt = 'some-random-string';
const key = crypto.pbkdf2Sync(secretKey, salt, 10000, 32, 'sha512');
const web3 = require("@solana/web3.js");


async function sendtransaction(from, to_address, amount) {
  // Connect to cluster
  const connection = new web3.Connection(
    web3.clusterApiUrl('devnet'),
    'confirmed',
  );
  const transaction = new web3.Transaction().add(
    web3.SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to_address,
      lamports: amount,
    }),
  );
  const signature = await web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [from],
  );
  console.log('SIGNATURE', signature);
};








function decryptData(encryptedData) {
  // Use the decipher object to decrypt the encrypted data
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function encryptData(data) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

const createConnection = () => {
  return new web3.Connection(
    "https://sly-twilight-slug.solana-devnet.discover.quiknode.pro/80aeb7dca9b1482be01290257edd4974d1649f75/",
    "confirmed"
  );
};
const getBalance = async (publicKey) => {
  const connection = createConnection();
  const lamports = await connection.getBalance(publicKey).catch((err) => {
    console.error(`Error: ${err}`);
  });
  return lamports / LAMPORTS_PER_SOL;
};
const requestAirdrop = async (publicKey) => {
  const connection = createConnection();
  const airdropSignature = await connection.requestAirdrop(
    publicKey,
    100000000
  );
  console.log("airdrops connection", airdropSignature)
  const signature = await connection.confirmTransaction(airdropSignature);
  const newBalance = await getBalance(publicKey);
  console.log('new balance', newBalance)
};










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
  endTime: String,
  resultsTime: String,
  uid: String,
  TwitterAuthorised: Boolean,
  creatorAddress: String,
  options: [String],
  participants: [
    {
      TotalBetAmount: Number,
      maxPotentialReturn: Number,
      ParticipantWalletAddress: String,
      bet: {
        on: String,
        value: String,
      }
    }
  ],
  SolanaAccount: {
    type: Buffer,
    required: true
  },
  CryptoAccount: {
    AccountAddress: String,
    PrivateKey: String,
    Transactions: [
      {
        Transaction_id: String,
        Timestamp: { type: Date, default: Date.now },
        Status: String,
        // Add additional fields for each transaction as needed
      }
    ]
  },
  winners: [
    {
      TotalBetAmount: Number,
      amountWon: Number,
      ParticipantWalletAddress: String,
    }
  ],
  odds: [
    {
      name: String,
      value: Number,
    }
  ]
})


const Form = mongoose.model("Form", formSchema);

app.use(express.json());

// handle form submission
app.get("/", async (req, res) => {
  console.log("done")
})
app.post("/", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  const from = web3.Keypair.generate();
  const secretKeyString = btoa(String.fromCharCode(...from._keypair.secretKey));
  const uid = uuidv4()
  console.log(from)
  try {
    const requestBody = {
      ...req.body,
      uid: uid,
      SolanaAccount: Buffer.from(JSON.stringify(from)),
      CryptoAccount: {
        AccountAddress: from.publicKey,
        PrivateKey: secretKeyString
      }
    };
    console.log("request", requestBody);
    const form = new Form(requestBody);
    await form.save();
    const responseMessage = `Form submitted successfully. UID: ${uid}`;
    await requestAirdrop(from.publicKey)
    res.status(200).send(responseMessage);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});




app.post("/userdetails", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  const { uid } = req.body;
  console.log("uid", uid)
  try {

    const user = await Form.findOne({ uid: uid });
    if (!user) {
      res.status(404).send("User not found");
    } else {
      user.CryptoAccount.PrivateKey = null;
      console.log(user)
      res.status(200).json(user);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});



app.post("/submit-form/:uid", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  try {
    const { uid } = req.params;
    const { betData } = req.body;
    console.log("bet data", betData)
    const form = await Form.findOne({ uid });
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    if (req.body == null) return res.status(404).json({ message: "Null data cannot be sent" });
    form.participants = [...form.participants, betData];
    let bets = form.participants
    let TotalSum = 0;
    let betOptns = []
    for (const bet of bets) {
      TotalSum += (Number(bet.TotalBetAmount));
      if (betOptns[bet.bet.on]) {
        betOptns[bet.bet.on] += Number(bet.bet.value)
      } else {
        betOptns[bet.bet.on] = Number(bet.bet.value)
      }
    }
    let odds = []
    for (const key in betOptns) {
      let demo = {}
      const value = betOptns[key];
      const dividedValue = parseFloat(TotalSum) / parseFloat(value);
      // betOptns[key] = Number(parseFloat(dividedValue).toFixed(2))
      demo.name = key;
      demo.value = Number(parseFloat(dividedValue).toFixed(2));
      odds.push(demo)
    }
    console.log("odds", odds);
    form.odds = odds;
    console.log('form', form)
    await form.save();
    return res.status(200).json({ message: "Form data updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/winner-form/:uid", async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  try {
    const { uid } = req.params;
    const { winnersData } = req.body;
    console.log("uid", uid)
    console.log("winners data", winnersData);

    const form = await Form.findOne({ uid });
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    // Update the winners data in the form
    form.winners = winnersData;
    console.log("form data", form);

    await form.save();
    return res.status(200).json({ message: "Winner data updated" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



app.post('/add-transaction/:uid', async (req, res) => {
  const transactionId = req.body.transactionId;
  console.log("transactoin received", transactionId)
  try {
    const form = await Form.findOne({ uid: req.params.uid });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Add new transaction to array
    form.CryptoAccount.Transactions.push({
      Transaction_id: transactionId,
      Timestamp: Date.now(),
      Status: 'Completed'
    });
    console.log("transactoin succeeded", form)
    // Save updated form
    const updatedForm = await form.save();

    res.json(updatedForm);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/winning-bet/:uid', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  try {
    const { uid } = req.params;
    const data = req.body;
    console.log("data", data)
    const web3 = require("@solana/web3.js");
    const betAccountDetails = data.beWalletDetails
    console.log("uid", uid)
    const form = await Form.findOne({ uid });
    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }
    let from = JSON.parse(form?.SolanaAccount.toString());
    const publicKey = new web3.PublicKey(form?.CryptoAccount?.AccountAddress)
    const secretKey = Uint8Array.from(atob(form?.CryptoAccount?.PrivateKey), c => c.charCodeAt(0));
    const from_address = {
      publicKey,
      secretKey
    }
    // send comission
    const to_address = new web3.PublicKey('2Ei35eb6oVfD7mVgX7rmuMSr5J3NVUPCPvCTBkrJfvMf')
    let amount = await getBalance(publicKey)
    amount = parseInt(amount * 0.05 * web3.LAMPORTS_PER_SOL)
    await sendtransaction(from_address, to_address, amount)
    res.status(200).json({ message: 'Comission send' });

    //send winners amount
    const oddsMap = {};
    form.odds.forEach(({ name, value }) => {
      oddsMap[name] = value;
    });
    let winners = data?.winners
    if (winners != null) {
      for (const winner of winners) {
        console.log("entered", winner?.ParticipantWalletAddress)
        const to_address = winner?.ParticipantWalletAddress ?
          new web3.PublicKey(winner?.ParticipantWalletAddress) : "";
        const betOn = winner.bet.on;
        let deduct = winner.TotalBetAmount * oddsMap[betOn] * 0.05
        const betAmount = parseInt(winner.TotalBetAmount * oddsMap[betOn] - deduct);
        console.log('bet amount', betAmount)
        if (winner?.ParticipantWalletAddress) {
          await sendtransaction(from_address, to_address, betAmount);
        }
      }
    }


  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



// start the server
app.listen(5000, () => {
  console.log("Server started on port 5000");
});
