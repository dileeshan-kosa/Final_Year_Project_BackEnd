const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: String,
    role: {
      type: String,
      default: "admin",
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: String,
  },
  {
    timestamps: true,
  }
);

const adminModel = mongoose.model("admin", adminSchema);

module.exports = adminModel;
