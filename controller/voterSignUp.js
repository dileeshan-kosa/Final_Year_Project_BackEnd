// Registeration
const voterModel = require("../models/voterModel");
const bcrypt = require('bcryptjs');

const router = require("../routes");

// const manageVoterDetails = {
//   createVoterDetails: async (req, res) => {
//     try {
//       const { name, nic, dob, gender, district, fingerprint } = req.body;

//       // Hash the fingerprint value using bcrypt
//       const hashedFingerprint = await bcrypt.hash(fingerprint, 10);

//       const newVoterDetails = new voterModel({
//         name,
//         nic,
//         dob,
//         gender,
//         district,
//         fingerprint: hashedFingerprint, // Store the hashed fingerprint
//       });
//       const savedUser = await newVoterDetails.save();

//       if (savedUser) {
//         return res.status(200).json({
//           message: "Voter add SuccessFull.",
//         });
//       } else {
//         return res.status(500).json({
//           message: "Voter not added.",
//         });
//       }
//     } catch (error) {
//       console.log("error", error);
//       return res.status(500).json({
//         message: "Voter not added.",
//       });
//     }
//   },
// };

module.exports = manageVoterDetails;