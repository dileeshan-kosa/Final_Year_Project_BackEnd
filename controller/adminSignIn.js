// admin login

const bcrypt = require("bcryptjs");
const adminModel = require("../models/adminModels");
const jwt = require("jsonwebtoken");

async function adminSignInController(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email) {
      throw new Error("Please Provide Email");
    }

    if (!password) {
      throw new Error("Please Provide Password");
    }

    const admin = await adminModel.findOne({ email });

    if (!admin) {
      throw new Error("Admin not found");
    }
    const checkPassword = await bcrypt.compare(password, admin.password);
    console.log("Cheack Password", checkPassword);

    if (checkPassword) {
      const tokenData = {
        _id: admin._id,
      };
      const token = await jwt.sign(tokenData, process.env.TOKEN_SECRET_KEY, {
        expiresIn: 60 * 60 * 100,
        // expiresIn: 1 * 1,
      });

      const tokenOption = {
        httpOnly: true,
        secure: true,
      };

      res.cookie("token", token, tokenOption).status(200).json({
        message: "Login Successfully",
        data: token,
        details: admin,
        //   role: "admin",
        success: true,
        error: false,
      });
    } else {
      throw new Error("Pleace check Password");
    }
  } catch (err) {
    res.json({
      message: err.message || err,
      error: true,
      success: false,
    });
  }
}

module.exports = adminSignInController;
