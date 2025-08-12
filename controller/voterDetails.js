// const voterModel = require("../models/voterModel");

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
