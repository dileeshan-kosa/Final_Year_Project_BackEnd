const express = require("express");
const voteConfirmFingerprintData = require("../controller/voterConfirmWithFingerprint");
const router = express.Router();

router.get("/:nic", voteConfirmFingerprintData);

module.exports = router;
