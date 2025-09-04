const voterModel = require("../models/voterModel");
const bcrypt = require("bcryptjs");

const router = require("../routes");

const manageVoterDetails = {
  createVoterDetails: async (req, res) => {
    try {
      const { name, nic, dob, gender, district, fingerprint } = req.body;

      // Hash the fingerprint value using bcrypt
      // const hashedFingerprint = await bcrypt.hash(fingerprint, 10);

      const newVoterDetails = new voterModel({
        name,
        nic,
        dob,
        gender,
        district,
        fingerprint: fingerprint, // Store the hashed fingerprint
      });
      const savedUser = await newVoterDetails.save();

      if (savedUser) {
        return res.status(200).json({
          message: "Voter add SuccessFull.",
        });
      } else {
        return res.status(500).json({
          message: "Voter not added.",
        });
      }
    } catch (error) {
      console.log("error", error);
      return res.status(500).json({
        message: "Voter not added.",
      });
    }
  },

  //get voter details
  getVotersID: async (req, res) => {
    try {
      let votertable = await voterModel.find();
      console.log("All voters Fetched");
      res.send(votertable);
      console.log("Voter Dataa", votertable);
    } catch (err) {
      console.log(err);
      res.status(400).json({
        message: err.message || err,
        error: true,
        success: false,
      });
    }
  },

  //get Voterdetails
  getVoders: async (req, res) => {
    try {
      // let voterModel = await voterModel.find();
      const voterModel = await voterModel.find();
      console.log("All VoterData Fetched");
      res.send(voterModel);
      console.log("Voter Data", voterModel);
    } catch (err) {
      console.log(err);
      res.status(400).json({
        message: err.message || err,
        error: true,
        success: false,
      });
    }
  },

  // get all voter details.
  getallVoterdetails: async (req, res) => {
    try {
      const voterTables = await voterModel.find();
      console.log("All VoterData Fetched");

      res.status(200).json({
        message: "All voter details fetched successfully",
        data: voterTables,
        success: true,
        error: false,
      });
    } catch (err) {
      console.log(err);
      res.status(400).json({
        message: err.message || err,
        error: true,
        success: false,
      });
    }
  },
};
module.exports = manageVoterDetails;
