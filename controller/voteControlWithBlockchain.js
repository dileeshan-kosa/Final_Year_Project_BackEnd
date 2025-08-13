const router = require("../routes");
const Web3 = require("web3");
const { contractABI } = require("../contract/contractABI");
const { toBytes32, toString } = require("../utils/stringConverters");
const { encrypt, hmacSha256 } = require("../utils/encryption");

// --- Secret Key Setup ---
const secretKey = process.env.SECRET_KEY?.padEnd(32, "0");
if (!secretKey) throw new Error("SECRET_KEY is not set");

const web3 = new Web3(
  new Web3.providers.WebsocketProvider("ws://127.0.0.1:7545")
);

// Contract address from env
const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
  throw new Error("CONTRACT_ADDRESS environment variable is not set");
}

const voteContract = new web3.eth.Contract(contractABI, contractAddress);

const voteControlWithBlockchain = {
  createBlockchainDetails: async (req, res) => {
    try {
      console.log("📥 Incoming vote:", req.body);
      const { hashNIC, hashFingerPrint, encryptedVote } = req.body;

      if (!hashNIC || !hashFingerPrint || !encryptedVote) {
        console.error("Missing data");
        throw new Error("Missing Data");
      }

      const combinedKey = encryptedVote + "/" + hashFingerPrint + "/" + hashNIC;
      console.log("combinedKey : ", combinedKey);

      const cryptographicKey = hmacSha256(secretKey, combinedKey);
      console.log("cryptographicKey:", cryptographicKey);

      const encryptedKey = encrypt(combinedKey, secretKey);
      console.log("encryptedKey:", encryptedKey);

      // const encryptedData = toBytes32(encryptedKey.encryptedData);
      const encryptedData = encryptedKey.encryptedData;
      // console.log("encryptedData:", encryptedData);

      // const Decodekey = toBytes32(encryptedKey.iv);
      const Decodekey = encryptedKey.iv;
      // console.log("Decodekey: ", Decodekey);

      const accounts = await web3.eth.getAccounts();

      await voteContract.methods
        .addVote(cryptographicKey, encryptedData, Decodekey)
        .send({
          from: accounts[0],
          gas: 500000,
        });

      res.status(200).json({ message: "Vote added to blockchain" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = voteControlWithBlockchain;
