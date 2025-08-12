const mongoose = require("mongoose");

const voterSchema = new mongoose.Schema({
  name: String,
  nic: {
    type: String,
    unique: true,
    required: true,
  },
  dob: String,
  gender: String,
  district: String,
  fingerprint: String,
});

const voterModel = mongoose.model("voter", voterSchema);

module.exports = voterModel;
