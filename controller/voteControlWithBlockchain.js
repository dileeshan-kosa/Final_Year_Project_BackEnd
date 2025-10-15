const router = require("../routes");
const Web3 = require("web3");
const { contractABI } = require("../contract/contractABI");
const { toBytes32, toString } = require("../utils/stringConverters");
const { encrypt, hmacSha256, decrypt } = require("../utils/encryption");
const { checkValidity } = require("../utils/checkValidity");
const { decryptVote } = require("../utils/rsaDecrypt");
const redisClient = require("../config/redis");
const candidateTable = require("../models/candidatesModel");

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

// Processing lock to avoid concurrent processing races
let processingLock = false;

// Election ID used across keys; can be parameterized later
const ELECTION_ID = "2025_president";

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

  //       const combinedKey = decrypt(encryptedData, Decodekey, secretKey);
  //       console.log("decryptedcombined key : ", combinedKey);

  //       const validation = checkValidity(combinedKey, cryptographicKey);
  //       if (!validation) {
  //         throw new Error("Data tampered");
  //       }

  //       // split using colon (safe because base64 does NOT contain ':')
  //       const parts = combinedKey.split(":");
  //       const encryptedVote = parts[0]; // the frontend vote
  //       let remaining = parts.slice(1).join(":"); // the rest (may contain base64 and hashes)

  //       // --- Robust removal of trailing "/hash1/hash2" ---
  //       // Find last two slashes and check if the two trailing pieces are hex hashes (adjust length if needed)
  //       let cleanedRemaining = remaining;

  //       const lastSlash = remaining.lastIndexOf("/");
  //       const secondLastSlash = remaining.lastIndexOf("/", lastSlash - 1);

  //       if (lastSlash !== -1 && secondLastSlash !== -1) {
  //         const maybeHash1 = remaining.slice(secondLastSlash + 1, lastSlash);
  //         const maybeHash2 = remaining.slice(lastSlash + 1);

  //         // Validate they look like hex hashes (here we expect 64 hex chars; change {64} if different)
  //         const isHex64 = (s) => /^[0-9a-fA-F]{64}$/.test(s);

  //         if (isHex64(maybeHash1) && isHex64(maybeHash2)) {
  //           cleanedRemaining = remaining.slice(0, secondLastSlash);
  //         }
  //       }
  //       // const encryptedVotes = `${encryptedVote}:${cleanedRemaining}`;

  //       // ⬇️ NEW: decrypt it using your private key
  //       const decryptedVote = decryptVote(encryptedVote);
  //       const decryptedVotes = decryptVote(cleanedRemaining);
  //       const decryptedVoteCount = `${decryptedVote}:${decryptedVotes}`;

  //       // ✅ Single console output in required format
  //       // console.log("....................................................");
  //       // console.log("Only Vote:", encryptedVotes);
  //       // console.log("....................................................");
  //       // console.log("Decrypted Vote_1:", decryptedVote);
  //       // console.log("Decrypted Vote_2:", decryptedVotes);
  //       console.log("Decrypted Vote_3:", decryptedVoteCount);

  //       // ✅ Initial format check
  //       if (!decryptedVoteCount.includes(":")) {
  //         await redisClient.incr(
  //           "RejectedVotes:2025_president:missing_separator"
  //         );
  //         return res
  //           .status(400)
  //           .json({ message: "🚫 Missing ':' separator — vote rejected" });
  //       }
  //       const part = decryptedVoteCount.split(":");
  //       const voterRandomBits = part[0]; // Unique 16-bit random code per vote
  //       const candidateName = part[1]; // Candidate's name (ex: Kasun_Sabasignha)

  //       // ✅ Basic validation: must have all parts
  //       if (!voterRandomBits || !candidateName) {
  //         await redisClient.incr("RejectedVotes:2025_president:missing_fields");
  //         console.log("🚫 Invalid Vote Format — missing fields");
  //         return res.status(400).json({ message: "🚫 Invalid Vote Format" });
  //       }

  //       // push full object so you can inspect or return hashes too
  //       encryptedVoteArray.push({
  //         // encryptedVotes,
  //         decryptedVoteCount,
  //       });
  //     }

  //     return res.status(200).json({ votes: encryptedVoteArray });
  //   } catch (err) {
  //     return res.status(500).json({ error: err.message });
  //   }
  // },

  // get votes from blockchain in a loop
  getVotesDetails: async (req, res) => {
    try {
      // console.log("🔥 getVotesDetails called at:", new Date().toISOString());

      const voteCount = await voteContract.methods.getVoteCount().call();
      console.log("🧾 Total votes in blockchain:", voteCount);

      let results = [];
      let decrypted_Vote = [];

      // Use a Set to prevent duplicate entries
      const uniqueVotes = new Set();

      for (let i = 0; i < voteCount; i++) {
        const vote = await voteContract.methods.votes(i).call();
        const combined = JSON.stringify(vote); // combine as unique key

        if (uniqueVotes.has(combined)) continue; // skip duplicates
        uniqueVotes.add(combined);

        const { cryptographicKey, encryptedData, Decodekey } = vote;

        const combinedKey = decrypt(encryptedData, Decodekey, secretKey);
        console.log("\n🔓 decryptedcombined key:", combinedKey);

        const validation = checkValidity(combinedKey, cryptographicKey);
        if (!validation) throw new Error("Data tampered");

        const [encryptedVote, ...rest] = combinedKey.split(":");
        let remaining = rest.join(":");

        // Remove hashes from end
        const lastSlash = remaining.lastIndexOf("/");
        const secondLastSlash = remaining.lastIndexOf("/", lastSlash - 1);
        if (lastSlash !== -1 && secondLastSlash !== -1) {
          const hash1 = remaining.slice(secondLastSlash + 1, lastSlash);
          const hash2 = remaining.slice(lastSlash + 1);
          const isHex = (s) => /^[0-9a-fA-F]{64}$/.test(s);
          if (isHex(hash1) && isHex(hash2)) {
            remaining = remaining.slice(0, secondLastSlash);
          }
        }

        // Decrypt votes
        const decryptedVote1 = decryptVote(encryptedVote);
        const decryptedVote2 = decryptVote(remaining);
        const decryptedVoteCount = `${decryptedVote1}:${decryptedVote2}`;

        console.log("✅ Final Decrypted Vote:", decryptedVoteCount);

        results.push({
          decryptedVoteCount,
        });
      }

      console.log(`✅ Successfully processed ${results.length} unique votes`);

      // STEP 2️⃣: Process decrypted votes using Redis logic

      if (processingLock) {
        console.log(
          "⏳ Processing already in progress — returning current counts."
        );
      } else {
        processingLock = true;
        console.log(
          "\n🔎 Processing queued votes... (count before processing)",
          results.length
        );

        while (results.length > 0) {
          const voteObj = results.shift();
          const vote = voteObj.decryptedVoteCount; // extract string
          console.log("➡️ Processing vote:", vote);

          // 1) Basic separator check
          if (!vote || typeof vote !== "string" || !vote.includes(":")) {
            await redisClient.incr(
              `RejectedVotes:${ELECTION_ID}:missing_separator`
            );
            console.log("🚫 Rejected: missing ':' separator");
            continue;
          }

          const [voterRandomBitsRaw, ...rest] = vote.split(":");
          const candidateName = rest.join(":").trim();
          const voterRandomBits = voterRandomBitsRaw.trim();

          // 2) Check that both parts exist
          if (!voterRandomBits || !candidateName) {
            await redisClient.incr(
              `RejectedVotes:${ELECTION_ID}:missing_fields`
            );
            console.log("🚫 Rejected: missing fields");
            continue;
          }

          // 3) Validate 16-bit binary string
          if (!/^[01]{16}$/.test(voterRandomBits)) {
            await redisClient.incr(
              `RejectedVotes:${ELECTION_ID}:invalid_binary`
            );
            console.log("🚫 Rejected: invalid 16-bit binary");
            continue;
          }

          // 4) Duplicate code check
          const codeKey = `voterRandomBits:${voterRandomBits}`;
          try {
            const setResult = await redisClient.set(codeKey, "1", {
              NX: true,
              EX: 86400, // 24h
            });
            if (setResult === null) {
              await redisClient.incr(
                `RejectedVotes:${ELECTION_ID}:duplicate_code`
              );
              console.log(`🚫 Rejected: duplicate code ${voterRandomBits}`);
              continue;
            }
          } catch (err) {
            console.error("⚠️ Redis error during duplicate check:", err);
            await redisClient.incr(`RejectedVotes:${ELECTION_ID}:redis_error`);
            continue;
          }

          // 5) Verify candidate
          const candidate = await candidateTable.findOne({
            name: candidateName,
          });
          if (!candidate) {
            await redisClient.incr(
              `RejectedVotes:${ELECTION_ID}:invalid_candidate`
            );
            console.log(`🚫 Rejected: invalid candidate ${candidateName}`);
            continue;
          }

          // 6) Accept vote -> increment candidate count
          const safeCandidateName = candidateName.replace(/\s+/g, "_");
          const redisKey = `Votes:${ELECTION_ID}:${safeCandidateName}`;

          try {
            await redisClient.incr(redisKey);
            console.log(`✅ Accepted vote for ${candidateName}`);
          } catch (err) {
            console.error("⚠️ Redis error incrementing vote key:", err);
            // If increment fails, roll back the voterRandomBits key? (optional)
            // For now increment a redis_error reason counter
            await redisClient.incr(`RejectedVotes:${ELECTION_ID}:redis_error`);
          }
        } // end while queue

        processingLock = false;
        console.log("🔎 Queue processing finished.");
      }

      return res.status(200).json({ votes: results });

      // return res.status(200).json({ votes: encryptedVoteArray });
    } catch (err) {
      // return res.status(500).json({ error: err.message });
      console.error("❌ Error in getVotesDetails:", err.message);
      return res.status(500).json({ error: err.message });
    }
  },
};
module.exports = voteControlWithBlockchain;
