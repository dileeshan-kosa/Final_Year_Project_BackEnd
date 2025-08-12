// admin Registeration

const bcrypt = require("bcryptjs");
const adminModel = require("../models/adminModels");

async function adminSignUpController(req, res) {
  try {
    const { email, password, name, role } = req.body;

    const adminUser = await adminModel.findOne({ email });

    console.log("adminUser", adminUser);

    if (adminUser) {
      throw new Error("Already adminUser exits.");
    }

    if (!email) {
      throw new Error("Please Provide Email");
    }

    if (!password) {
      throw new Error("Please Provide password");
    }

    if (!name) {
      throw new Error("Please Provide name");
    }

    const salt = bcrypt.genSaltSync(10);
    const hashPassword = await bcrypt.hashSync(password, salt);

    if (!hashPassword) {
      throw new Error("Something is wrong");
    }

    const payload = {
      ...req.body,
      password: hashPassword,
    };

    const adminData = new adminModel(payload);
    const saveAdmin = await adminData.save();

    res.status(201).json({
      data: saveAdmin,
      success: true,
      error: false,
      message: "Admin created Successfully!",
    });
  } catch (err) {
    res.json({
      message: err.message || err,
      error: true,
      success: false,
    });
  }
}

module.exports = adminSignUpController;
// 2.15 (2025-02-21)