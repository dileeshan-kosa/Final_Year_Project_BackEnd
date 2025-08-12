const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.log("MongoDB connection error:", err);
    // console.log(err);
  }
}

module.exports = connectDB;
