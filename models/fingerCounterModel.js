const mongoose = require("mongoose");

const fingerCounterSchema = new mongoose.Schema({
  _id: { type: String, default: "fingerCounter" },
  lastId: { type: Number, default: 0 }
});

module.exports = mongoose.model("FingerCounter", fingerCounterSchema);
