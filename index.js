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
const { toBytes32 } = require("./utils/stringConverters");
const { contractABI } = require("./contract/contractABI");
const Web3 = require("web3");
const redisClient = require("./config/redis");
const { uploadToS3 } = require("./utils/aws");

const app = express();

// --- Secret Key Setup ---
const secretKey = process.env.SECRET_KEY?.padEnd(32, "0"); // Pad the key to 32 bytes
if (!secretKey) {
  throw new Error("SECRET_KEY environment variable is not set");
}

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

  web3.eth.net
    .isListening()
    .then(() => console.log("✅ Connected to Ganache via WebSocket"))
    .catch((err) => {
      console.error("❌ Failed to connect to Ganache:", err);
      return;
    });

  // Contract address from env
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS environment variable is not set");
  }

  const voteContract = new web3.eth.Contract(contractABI, contractAddress);

  // Quick contract read to confirm interaction works
  voteContract.methods
    .getVoteCount()
    .call()
    .then((count) => console.log(`📊 Current vote count: ${count}`))
    .catch((err) => console.error("❌ Error calling getVoteCount:", err));

  //Event listener for VoteAdded event
  voteContract.events
    .VoteAdded()
    .on("connected", (subscriptionId) => {
      console.log(
        "Subscribed to VoteAdded events. Subscription ID:",
        subscriptionId
      );
    })
    .on("data", async (event) => {
      try {
        const { cryptographicKey, encryptedData, Decodekey } =
          event.returnValues;

        // 🗳️ Define election folder name (can make this dynamic later)
        const electionName = "presidential-2025"; // <--- Change this as needed

        // ✅ Create backup payload
        const backupData = {
          cryptographicKey,
          encryptedData,
          Decodekey,
          timestamp: Date.now(),
          txHash: event.transactionHash,
        };

        // ✅ Generate unique filename
        const fileName = `vote_${event.transactionHash}.json`;

        // ✅ Upload to AWS S3 under specific election folder
        await uploadToS3(backupData, fileName, electionName);

        console.log(
          `✅ Backup completed for TX: ${event.transactionHash} (Election: ${electionName})`
        );

        // const backupData = {
        //   cryptographicKey,
        //   encryptedData,
        //   Decodekey,
        //   timestamp: Date.now(),
        //   txHash: event.transactionHash,
        // };
      } catch (err) {
        console.error("Backup failed:", err);
      }
    });
});
