const voterModel = require("../models/voterModel");

const voterMongodbClean = {
  getNicCleanMongodb: async (req, res) => {
    try {
      const { nic } = req.body;
      console.log("NIC from request:", nic);

      if (!nic) {
        return res.status(400).json({ message: "NIC is required" });
      }

      // Update MongoDB
      const updated = await voterModel.findOneAndUpdate(
        { nic: nic },
        { hasVoted: true },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ message: "Voter not found" });
      }

      res.json({
        message: "hasVoted updated successfully",
        voter: updated,
      });
    } catch (err) {
      console.log("error", err);
      return res.status(500).json({
        message: "HasVoted Not Updated.",
      });
    }
  },
};
module.exports = voterMongodbClean;

// async function voterDetailsController(req, res) {
//   try {
//     console.log("voter", req.voterId);

//     const voter = await voterModel.findById(req.voterId);
//     res.status(200).json({
//       data: admin,
//       error: false,
//       success: true,
//       message: "admin details",
//     });
//     console.log("voter", voter);
//   } catch (err) {
//     res.status(400).json({
//       message: err.message || err,
//       error: true,
//       success: false,
//     });
//   }
// }
// module.exports = voterDetailsController;
