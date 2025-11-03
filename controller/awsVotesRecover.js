const { getAllVotesFromBackup } = require("../utils/aws");
const { checkValidity } = require("../utils/checkValidity");
const { decrypt } = require("../utils/encryption");
const { decryptVote } = require("../utils/rsaDecrypt");

const secretKey = process.env.SECRET_KEY.padEnd(32, "0"); // Ensure 32-byte key

const ReAwsVotes = {
  recoverAwsVotes: async (req, res) => {
    try {
      // console.log("request :", req.query);

      // Handle dynamic query key (sometimes appears as 'electionName/selectedYear')
      const queryKeys = Object.keys(req.query);
      const electionName =
        req.query.electionName ||
        req.query.selectedYear ||
        req.query["electionName/selectedYear"] ||
        req.query[queryKeys[0]]; // fallback in case key name is unexpected

      if (!electionName) {
        return res
          .status(400)
          .json({ error: "Election name is missing in request query" });
      }

      console.log("🗳️ Election Selected:", electionName);

      // const electionName = "presidential-2025";

      // Extract year dynamically from electionName (e.g., "presidential-2025" → "2025")
      const yearMatch = electionName.match(/(\d{4})$/);
      const year = yearMatch ? yearMatch[1] : "Unknown";

      // const votes = await getAllVotesFromBackup(electionName);

      // const year = "2025";
      const votes = await getAllVotesFromBackup(electionName);

      if (!votes || votes.length === 0) {
        console.log("⚠️ No votes found in AWS S3 backup");
        return res.status(404).json({ message: "No votes found" });
      }

      console.log(`🧾 Total votes retrieved from AWS: ${votes.length}`);

      let results = [];
      const uniqueVotes = new Set();
      const voteCount = {}; // ✅ to count votes per candidate

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

        //Step 5: Count votes by candidate name instead of binary
        const candidateName = decryptedVote2?.trim();
        if (candidateName) {
          voteCount[candidateName] = (voteCount[candidateName] || 0) + 1;
        }

        results.push({
          key: vote.key,
          decryptedVote: decryptedVoteCount,
        });
      }

      // Step 6 : Final summary output
      console.log("\n📊 Vote Recovery Summary:");
      console.log("[");
      Object.entries(voteCount).forEach(([candidate, count]) => {
        console.log(`${candidate} -> ${count}`);
      });
      console.log("]");

      // Step 7 : Compute total
      const totalVotes = Object.values(voteCount).reduce((a, b) => a + b, 0);

      // Step 8 : Convert mapt to structured array
      const candidates = Object.entries(voteCount).map(([name, votes]) => ({
        name,
        votes,
        percentage: ((votes / totalVotes) * 100).toFixed(1),
      }));

      // Step 9: Sort and find winner
      const sortedCandidates = candidates.sort((a, b) => b.votes - a.votes);
      const winner =
        sortedCandidates.length > 0 ? sortedCandidates[0].name : null;

      // ✅ Send final response
      return res.status(200).json({
        electionName,
        year: parseInt(year),
        totalVotes,
        winner,
        candidates: sortedCandidates,
      });
    } catch (err) {
      console.error("❌ AWS Recovery Error:", err);
      return res.status(500).json({ error: err.message });
    }
  },
};
module.exports = ReAwsVotes;
