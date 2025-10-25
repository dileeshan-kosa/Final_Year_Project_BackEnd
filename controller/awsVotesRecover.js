const { getAllVotesFromBackup } = require("../utils/aws");
const { checkValidity } = require("../utils/checkValidity");
const { decrypt } = require("../utils/encryption");
const { decryptVote } = require("../utils/rsaDecrypt");

const secretKey = process.env.SECRET_KEY.padEnd(32, "0"); // Ensure 32-byte key

const ReAwsVotes = {
  // recoverAwsVotes: async (req, res) => {
  //   try {
  //     const electionName = "presidential-2025"; // or dynamically from req.body
  //     const votes = await getAllVotesFromBackup(electionName);

  //     if (!votes || votes.length === 0) {
  //       console.log("No votes found in S3");
  //       return res.status(404).json({ message: "No votes found" });
  //     }

  //     const encryptedVoteArray = [];
  //     const voteCount = {}; // For counting votes per candidate

  //     for (const vote of votes) {
  //       const encryptedData = vote.data.encryptedData;
  //       const cryptographicKey = vote.data.cryptographicKey;
  //       const Decodekey = vote.data.Decodekey;

  //       // console.log("original_hash:", cryptographicKey);
  //       // console.log("encrypted_combined:", encryptedData);

  //       // decrypt and validate
  //       const combinedKey = decrypt(encryptedData, Decodekey, secretKey);
  //       const validation = checkValidity(combinedKey, cryptographicKey);

  //       if (!validation) {
  //         console.warn("⚠️ Tampered vote detected:", vote.key);
  //         continue;
  //       }

  //       console.log("decrypted_combined:", combinedKey);
  //       // console.log("verified_hash:", cryptographicKey);
  //       console.log("-----------------------");

  //       // Extract candidateID (before first slash)
  //       const candidateID = combinedKey.split("/")[0].trim();
  //       if (candidateID) {
  //         encryptedVoteArray.push(candidateID);
  //         voteCount[candidateID] = (voteCount[candidateID] || 0) + 1;
  //       }
  //     }

  //     // Final summary output
  //     console.log("✅ Vote Recovery Summary:");
  //     Object.entries(voteCount).forEach(([candidate, count]) => {
  //       console.log(`${candidate} -> ${count}`);
  //     });

  //     res.status(200).json({
  //       message: "Vote recovery successful",
  //       results: voteCount,
  //     });
  //   } catch (err) {
  //     console.error("❌ Recovery error:", err);
  //     res.status(500).json({ error: err.message });
  //   }
  // },

  recoverAwsVotes: async (req, res) => {
    try {
      const electionName = "presidential-2025";
      const votes = await getAllVotesFromBackup(electionName);

      if (!votes || votes.length === 0) {
        console.log("⚠️ No votes found in AWS S3 backup");
        return res.status(404).json({ message: "No votes found" });
      }

      console.log(`🧾 Total votes retrieved from AWS: ${votes.length}`);

      let results = [];
      const uniqueVotes = new Set();

      for (const vote of votes) {
        const { cryptographicKey, encryptedData, Decodekey } = vote.data;
        // Avoid duplicate entries
        const combinedKeyRaw = JSON.stringify(vote.data);
        if (uniqueVotes.has(combinedKeyRaw)) continue;
        uniqueVotes.add(combinedKeyRaw);

        // Step 1: Decrypt combined key
        const combinedKey = decrypt(encryptedData, Decodekey, secretKey);
        if (!combinedKey) {
          console.warn("⚠️ Decryption failed for vote:", vote.key);
          continue;
        }

        // console.log("\n🔓 Decrypted Combined Key:", combinedKey);

        // Step 2: Validate integrity
        const validation = checkValidity(combinedKey, cryptographicKey);
        if (!validation) {
          console.warn("⚠️ Tampered vote detected:", vote.key);
          continue;
        }

        // Step 3: Split parts
        const [encryptedVote, ...rest] = combinedKey.split(":");
        let remaining = rest.join(":");

        // Remove trailing hashes (two SHA256-like strings separated by /)
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
        // Step 4: Decrypt actual votes
        const decryptedVote1 = decryptVote(encryptedVote);
        const decryptedVote2 = decryptVote(remaining);
        const decryptedVoteCount = `${decryptedVote1}:${decryptedVote2}`;

        console.log("✅ Final Decrypted Vote:", decryptedVoteCount);

        results.push({
          key: vote.key,
          decryptedVote: decryptedVoteCount,
        });
      }
    } catch (err) {
      console.error("❌ AWS Recovery Error:", err);
      return res.status(500).json({ error: err.message });
    }
  },
};
module.exports = ReAwsVotes;
