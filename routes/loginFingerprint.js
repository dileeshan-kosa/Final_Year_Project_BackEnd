const express = require("express");
const loginFingerPrintData = require("../controller/loginFingerprint");
const router = express.Router();

router.get("/:nic", loginFingerPrintData);

module.exports = router;
