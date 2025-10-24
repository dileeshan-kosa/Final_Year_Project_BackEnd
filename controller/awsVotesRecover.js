const { getAllVotesFromBackup } = require("../utils/aws");
const { checkValidity } = require("../utils/checkValidity");
const { decrypt } = require("../utils/encryption");

const secretKey = process.env.SECRET_KEY.padEnd(32, "0"); // Ensure 32-byte key

const ReAwsVotes = {
  recoverAwsVotes: async (req, res) => {
    try {
      const electionName = "presidential-2025"; // or dynamically from req.body
      const votes = await getAllVotesFromBackup(electionName);

      if (!votes || votes.length === 0) {
        console.log("No votes found in S3");
        return res.status(404).json({ message: "No votes found" });
      }

      const encryptedVoteArray = [];
      const voteCount = {}; // For counting votes per candidate

      for (const vote of votes) {
        const encryptedData = vote.data.encryptedData;
        const cryptographicKey = vote.data.cryptographicKey;
        const Decodekey = vote.data.Decodekey;

        console.log("original_hash:", cryptographicKey);
        console.log("encrypted_combined:", encryptedData);

        // decrypt and validate
        const combinedKey = decrypt(encryptedData, Decodekey, secretKey);
        const validation = checkValidity(combinedKey, cryptographicKey);

        if (!validation) {
          console.warn("⚠️ Tampered vote detected:", vote.key);
          continue;
        }

        console.log("decrypted_combined:", combinedKey);
        console.log("verified_hash:", cryptographicKey);
        console.log("-----------------------");

        // Extract candidateID (before first slash)
        const candidateID = combinedKey.split("/")[0].trim();
        if (candidateID) {
          encryptedVoteArray.push(candidateID);
          voteCount[candidateID] = (voteCount[candidateID] || 0) + 1;
        }
      }

      // Final summary output
      console.log("✅ Vote Recovery Summary:");
      Object.entries(voteCount).forEach(([candidate, count]) => {
        console.log(`${candidate} -> ${count}`);
      });

      res.status(200).json({
        message: "Vote recovery successful",
        results: voteCount,
      });
    } catch (err) {
      console.error("❌ Recovery error:", err);
      res.status(500).json({ error: err.message });
    }
  },
};
module.exports = ReAwsVotes;