// Voter login
const voterModel = require("../models/voterModel");
const jwt = require("jsonwebtoken");

async function voterSignInController(req, res) {
  try {
    const { nic, fingerprint } = req.body;

    if (!nic) {
      throw new Error("Please Provide NIC");
    }
    if (!fingerprint) {
      throw new Error("Please Provide Fingerprint");
    }

    const voter = await voterModel.findOne({ nic });

    if (!voter) {
      throw new Error("Voter not found");
    }
  } catch (err) {
    res.json({
      message: err.message || err,
      error: true,
      success: false,
    });
  }
}

module.exports = voterSignInController;
