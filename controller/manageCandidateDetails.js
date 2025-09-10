const candidateTable = require("../models/candidatesModel");

const router = require("../routes");

const manageCandidateDetails = {
  //post candidates details
  createCandidateDetaila: async (req, res) => {
    try {
      const {
        name,
        nic,
        dob,
        district,
        politicalparty,
        symbol,
        number,
        image,
      } = req.body;

      const newCandidateDetails = new candidateTable({
        name,
        nic,
        dob,
        district,
        politicalparty,
        symbol,
        number,
        image,
      });
      const saveCandidates = await newCandidateDetails.save();
    } catch (error) {
      console.log("error", error);
      return res.status(500).json({
        message: "Voter not added.",
      });
    }
  },

  //get candidates details
  getCandidates: async (req, res) => {
    try {
        let candidatetable = await candidateTable.find()
        console.log("All Candidate Data Fetched")
        
        res.send(candidatetable)
        console.log("Module Dataa", candidatetable)
    } catch (err) {
      console.log(err);
      res.status(400).json({
        message: err.message || err,
        error: true,
        success: false,
      });
    }
  },

  //Get Module Data
  //   getModules: async (req, res) => {
  //     try {
  //       let moduletables = await moduleTable.find();
  //       console.log("All ModuleData Fetched");
  //       res.send(moduletables);
  //       console.log("Module Dataaaa", moduletables);

  //     } catch (err) {
  //       console.log(err);
  //       res.status(400).json({
  //         message: err.message || err,
  //         error: true,
  //         success: false,
  //       });
  //     }
  //   },
};

module.exports = manageCandidateDetails;
