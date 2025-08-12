const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema({
  name: String,
  nic: {
    type: String,
    unique: true,
    required: true,
  },
  dob: String,
  district: String,
  politicalparty: String,
  symbol: String,
  number: String,
  image: String,
});

const candidateTable = mongoose.model("candidate", candidateSchema);

module.exports = candidateTable;
