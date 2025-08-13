// const express = require("express");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");
// require("dotenv").config();
// const connectDB = require("./config/db");
// const router = require("./routes");
// const fingerPrintRoutes = require("./routes/fingerprint");
// const loginFingerPrintRoutes = require("./routes/loginFingerprint");
// const voteFingerpritRoutes = require("./routes/voteFingerprint");
// const { SerialPort } = require("serialport");
// const { ReadlineParser } = require("@serialport/parser-readline");
// // const voteConfirmFingerprintData = require("./controller/voterConfirmWithFingerprint");

// const app = express();
// // app.use(express.json());
// app.use(
//   cors({
//     origin: "http://localhost:5173", // Replace with your frontend URL
//     credentials: true, // Allow credentials
//   })
// );

// app.use(express.json({ limit: "100mb" }));
// app.use(express.urlencoded({ extended: true, limit: "100mb" }));
// app.use(cookieParser());

// app.use("/api", router);
// app.use("/capture-fingerprint", fingerPrintRoutes);
// app.use("/logincapture-fingerprint", loginFingerPrintRoutes);
// app.use("/captured-vote", voteFingerpritRoutes);

// const PORT = 8000 || process.env.PORT;

// connectDB().then(() => {
//   app.listen(PORT, () => {
//     console.log("Connect to DB");
//     console.log("Server is running");
//   });
// });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./config/db");
const router = require("./routes");
const fingerPrintRoutes = require("./routes/fingerprint");
const loginFingerPrintRoutes = require("./routes/loginFingerprint");
const voteFingerpritRoutes = require("./routes/voteFingerprint");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const { contractABI } = require("./contract/contractABI");
const Web3 = require("web3");

const app = express();
// app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend URL
    credentials: true, // Allow credentials
  })
);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cookieParser());

app.use("/api", router);
app.use("/capture-fingerprint", fingerPrintRoutes);
app.use("/logincapture-fingerprint", loginFingerPrintRoutes);
app.use("/captured-vote", voteFingerpritRoutes);

const PORT = 8000 || process.env.PORT;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("Connect to DB");
    console.log("Server is running");
  });
  const web3 = new Web3(
    new Web3.providers.WebsocketProvider("ws://127.0.0.1:7545")
  );

  // Contract address from env
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable is not set");
  }

  const voteContract = new web3.eth.Contract(contractABI, contractAddress);

  //Event listener for VoteAdded event
  voteContract.events
    .VoteAdded()
    .on("connected", (subscriptionId) => {
      console.log(
        "Subscribed to VoteAdded events. Subscription ID:",
        subscriptionId
      );
    })
    // .on("data", async (event) => {
    //   try {
    //     const { cryptographicKey, encryptedData, Decodekey } =
    //       event.returnValues;

    //     // const backupData = {
    //     //   cryptographicKey,
    //     //   encryptedData,
    //     //   Decodekey,
    //     //   timestamp: Date.now(),
    //     //   txHash: event.transactionHash,
    //     // };
    //   } catch (err) {
    //     console.error("Backup failed:", err);
    //   }
    // });
});
