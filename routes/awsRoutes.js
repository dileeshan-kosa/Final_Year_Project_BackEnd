// const express = require("express");
// const router = express.Router();
// const { listElectionFolders } = require("../utils/aws");

// router.get("/get-election-folders", async (req, res) => {
//   try {
//     const folders = await listElectionFolders();
//     res.status(200).json({ folders });
//   } catch (err) {
//     console.error("❌ Folder fetch API error:", err);
//     res.status(500).json({ error: "Failed to fetch election folders" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { listElectionFolders } = require("../utils/aws");
const electionModel = require("../models/createElectionModel");

// Return only completed elections' folder names
router.get("/get-election-folders", async (req, res) => {
  try {
    // 1️⃣ Get all S3 election folders
    const folders = await listElectionFolders();

    // 2️⃣ Get all completed elections from MongoDB
    const completedElections = await electionModel
      .find({ status: "completed" })
      .lean();

    // 3️⃣ Convert electionType → folder format
    const completedFolderNames = completedElections.map((e) =>
      e.electionType.replace(/\s+/g, "-").toLowerCase()
    );

    // 4️⃣ Return only folders that belong to completed elections
    const filteredFolders = folders.filter((folder) =>
      completedFolderNames.includes(folder)
    );

    res.status(200).json({ folders: filteredFolders });

  } catch (err) {
    console.error("❌ Folder fetch API error:", err);
    res.status(500).json({ error: "Failed to fetch election folders" });
  }
});

module.exports = router;
