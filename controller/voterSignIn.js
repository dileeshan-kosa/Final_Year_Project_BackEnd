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

    if (voter.hasVoted) throw new Error("You have already voted");

    // ✅ Generate temporary token
    // const token = jwt.sign({ voterId: voter._id }, process.env.SECRET_KEY, {
    //   expiresIn: "15m",
    // });
    // const token = jwt.sign(
    //   {
    //     voterId: voter._id,
    //     hasVoted: voter.hasVoted, // 👈 include this
    //   },
    //   process.env.SECRET_KEY,
    //   { expiresIn: "15m" }
    // );
    // res.json({ token, message: "Login successful" });
  } catch (err) {
    res.json({
      message: err.message || err,
      error: true,
      success: false,
    });
  }
}

module.exports = voterSignInController;
