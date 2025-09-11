const router = require("../routes");
const Web3 = require("web3");
const { contractABI } = require("../contract/contractABI");
const { toBytes32, toString } = require("../utils/stringConverters");
const { encrypt, hmacSha256, decrypt } = require("../utils/encryption");
const { checkValidity } = require("../utils/checkValidity");
const { decryptVote } = require("../utils/rsaDecrypt");

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

//add votes to blockchain
const voteControlWithBlockchain = {
  createBlockchainDetails: async (req, res) => {
    try {
      // console.log("📥 Incoming vote:", req.body);
      const { hashNIC, hashFingerPrint, encryptedVote } = req.body;

      if (!hashNIC || !hashFingerPrint || !encryptedVote) {
        // console.error("Missing data");
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
          gas: 5000000,
        });
      res.status(200).json({ message: "Vote added to blockchain" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  //get votes from blockchain
  // getVotesDetails: async (req, res) => {
  //   try {
  //     const voteCount = await voteContract.methods.getVoteCount().call();

  //     let votes = [];
  //     let encryptedVoteArray = [];

  //     for (let i = 0; i < voteCount; i++) {
  //       const vote = await voteContract.methods.votes(i).call();
  //       votes.push({
  //         cryptographicKey: vote.cryptographicKey,
  //         encryptedData: vote.encryptedData,
  //         Decodekey: vote.Decodekey,
  //       });
  //     }
  //     for (let index = 0; index < votes.length; index++) {
  //       const { cryptographicKey, encryptedData, Decodekey } = votes[index];

  //       // console.log("cryptographicKey:", cryptographicKey);
  //       // console.log("encryptedData:", encryptedData);
  //       // console.log("Decodekey: ", Decodekey);

  //       const combinedKey = decrypt(encryptedData, Decodekey, secretKey);
  //       // const decryptedvote = decrypt(encryptedData);
  //       console.log("decryptedcombined key : ", combinedKey);

  //       const validation = checkValidity(combinedKey, cryptographicKey);
  //       if (!validation) {
  //         throw new Error("Data tampered");
  //       }

  //       // ✅ Use colon-based split instead of "/"
  //       const parts = combinedKey.split(":");

  //       // The vote is always before the first colon
  //       const encryptedVote = parts[0];

  //       // If you need the rest (NIC hash + fingerprint hash, etc.)
  //       const remaining = parts.slice(1).join(":");

  //       // 🚨 Remove the trailing "/hash1/hash2" part if it exists
  //       if (remaining.includes("/")) {
  //         remaining = remaining.split("/")[0]; // keep only before the first "/"
  //       }

  //       console.log("🗳️ Encrypted Vote:", encryptedVote);
  //       console.log("📦 Clean Remaining Data:", remaining);

  //       encryptedVoteArray.push(encryptedVote);

  //       // const encryptedVote = combinedKey.split("/")[0];
  //       // encryptedVoteArray.push(encryptedVote);
  //     }

  //     res.status(200).json({ encryptedVoteArray });
  //     return votes;
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // },

  // get votes from blockchain
  getVotesDetails: async (req, res) => {
    try {
      const voteCount = await voteContract.methods.getVoteCount().call();

      let votes = [];
      let encryptedVoteArray = [];

      for (let i = 0; i < voteCount; i++) {
        const vote = await voteContract.methods.votes(i).call();
        votes.push({
          cryptographicKey: vote.cryptographicKey,
          encryptedData: vote.encryptedData,
          Decodekey: vote.Decodekey,
        });
      }

      for (let index = 0; index < votes.length; index++) {
        const { cryptographicKey, encryptedData, Decodekey } = votes[index];

        const combinedKey = decrypt(encryptedData, Decodekey, secretKey);
        console.log("decryptedcombined key : ", combinedKey);

        const validation = checkValidity(combinedKey, cryptographicKey);
        if (!validation) {
          throw new Error("Data tampered");
        }

        // split using colon (safe because base64 does NOT contain ':')
        const parts = combinedKey.split(":");
        const encryptedVote = parts[0]; // the frontend vote
        let remaining = parts.slice(1).join(":"); // the rest (may contain base64 and hashes)

        // --- Robust removal of trailing "/hash1/hash2" ---
        // Find last two slashes and check if the two trailing pieces are hex hashes (adjust length if needed)
        let cleanedRemaining = remaining;
        // let extractedHash1 = null;
        // let extractedHash2 = null;

        const lastSlash = remaining.lastIndexOf("/");
        const secondLastSlash = remaining.lastIndexOf("/", lastSlash - 1);

        if (lastSlash !== -1 && secondLastSlash !== -1) {
          const maybeHash1 = remaining.slice(secondLastSlash + 1, lastSlash);
          const maybeHash2 = remaining.slice(lastSlash + 1);

          // Validate they look like hex hashes (here we expect 64 hex chars; change {64} if different)
          const isHex64 = (s) => /^[0-9a-fA-F]{64}$/.test(s);

          if (isHex64(maybeHash1) && isHex64(maybeHash2)) {
            // remove "/hash1/hash2" from remaining
            cleanedRemaining = remaining.slice(0, secondLastSlash);
            // extractedHash1 = maybeHash1;
            // extractedHash2 = maybeHash2;
          }
        }
        const encryptedVotes = `${encryptedVote}:${cleanedRemaining}`;

        // ⬇️ NEW: decrypt it using your private key
        const decryptedVote = decryptVote(encryptedVote);

        // ✅ Single console output in required format
        console.log("....................................................")
        // console.log("Only Vote:", encryptedVotes);
        console.log("....................................................")
        console.log("Decrypted Vote:", decryptedVote);

        // push full object so you can inspect or return hashes too
        encryptedVoteArray.push({
          encryptedVotes,
          // cleanedRemaining,
        });
      }

      return res.status(200).json({ votes: encryptedVoteArray });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },
};
module.exports = voteControlWithBlockchain;
