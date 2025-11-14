const express = require("express");
const router = express.Router();
const { listElectionFolders } = require("../utils/aws");

router.get("/get-election-folders", async (req, res) => {
  try {
    const folders = await listElectionFolders();
    res.status(200).json({ folders });
  } catch (err) {
    console.error("❌ Folder fetch API error:", err);
    res.status(500).json({ error: "Failed to fetch election folders" });
  }
});

module.exports = router;
