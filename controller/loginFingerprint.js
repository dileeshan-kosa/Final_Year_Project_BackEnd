// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9", // Change to your device port
//   baudRate: 57600,
//   autoOpen: false,
// });

// // Helper function to calculate checksum
// function calculateChecksum(buffer) {
//   let checksum = 0;
//   for (let i = 0; i < buffer.length; i++) {
//     checksum ^= buffer[i];
//   }
//   return checksum;
// }

// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let responseData = Buffer.alloc(0);

//     const handleData = (data) => {
//       responseData = Buffer.concat([responseData, data]);
//       // console.log(`📥 Response:`, responseData);

//       if (responseData.length >= 12) {
//         // You may need to adjust the length depending on your expected response size
//         port.off("data", handleData);
//         resolve(responseData);
//       }
//     };

//     port.on("data", handleData);

//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;
//   try {
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) {
//           console.error("❌ Error opening port:", err.message);
//           reject(err);
//         } else {
//           //   console.log(`✅ Serial port COM9 open.`);
//           resolve();
//         }
//       });
//     });

//     const collectImageCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imageResponse = await sendCommand(
//       collectImageCommand,
//       `Capture first fingerprint`
//     );

//     if (imageResponse[9] !== 0x00) {
//       console.log("❌ Fingerprint capture failed. Try again.");
//       return;
//     }
//     if (imageResponse[9] === 0x02) {
//       console.log(
//         "❌ No finger detected in first attempt. Please place your finger on the scanner."
//       );
//       return;
//     }

//     const storeBuffer1Command = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buffer1Response = await sendCommand(
//       storeBuffer1Command,
//       `Convert to Buffer 1`
//     );
//     if (buffer1Response[9] === 0x01) {
//       console.log("❌ Conversion failed (bad fingerprint image)");
//       return;
//     }
//     if (buffer1Response[9] === 0x06) {
//       console.log("❌ Fingerprint too messy (retry)");
//       return;
//     }
//     if (buffer1Response[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Conversion to buffer 1 failed." });

//     // Step 2: Fetch voters
//     const voter = await voterModel.findOne({ nic: nic });

//     if (!voter) {
//       res.status(404).json({ message: "No user found." });
//       return;
//     }

//     // console.log("first", voter);
//     const userFingerPrint = voter.fingerprint;

//     const fingerprintBuffer = Buffer.from(userFingerPrint, "base64");
//     console.log("hallo2", fingerprintBuffer);

//     // Step 4: Send fingerprint to Buffer 2 in chunks (using upload command: 0x09)
//     const header = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff, // Packet header
//       0x01,
//       0x00,
//       0x07,
//       0x09,
//       0x02, // Load to Buffer 2
//       0x00,
//       0x00, // Placeholder for checksum
//     ]);
//     // Add checksum to header
//     const checksum = 0x09 + 0x02;
//     header.writeUInt16BE(checksum, 10);

//     const sendTemplateToBuffer2 = Buffer.concat([header, fingerprintBuffer]);
//     await sendCommand(sendTemplateToBuffer2, "Load template into Buffer 2");

//     // Step 5: Match Buffers
//     const matchCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x03, 0x00, 0x07,
//     ]);

//     const matchResponse = await sendCommand(
//       matchCommand,
//       "Match buffers 1 and 2"
//     );
//     if (matchResponse[9] === 0x00) {
//       console.log("✅ Fingerprint matched with:", voter.name);
//       if (voter.hasVoted)
//         return res.status(403).json({
//           permission: false,
//           message: "You have already voted.",
//           voter: {
//             name: voter.name,
//             nic: voter.nic,
//             district: voter.district,
//             fingerprint: voter.fingerprint,
//             hasVoted: voter.hasVoted,
//           },
//         });

//       return res.status(200).json({
//         message: "Fingerprint matched.",
//         permission: true,
//         voter: {
//           name: voter.name,
//           nic: voter.nic,
//           district: voter.district,
//           fingerprint: voter.fingerprint,
//           hasVoted: voter.hasVoted,
//         },
//       });
//     }

//     // No match
//     return res.status(404).json({ message: "No match found." });
//   } catch (err) {
//     console.log("Error in getFingerPrintData", err);
//     res
//       .status(500)
//       .json({ error: "Internal Server Error", details: err.message });
//   } finally {
//     if (port.isOpen) {
//       port.close(() => console.log("🔌 Serial port closed."));
//     }
//   }
// }
// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // Send command safely
// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let responseData = Buffer.alloc(0);

//     const handleData = (data) => {
//       responseData = Buffer.concat([responseData, data]);

//       // R307 always sends minimum 12 bytes
//       if (responseData.length >= 12) {
//         port.off("data", handleData);
//         resolve(responseData);
//       }
//     };

//     port.on("data", handleData);

//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     // -------------------------
//     // 1. Open Serial Port
//     // -------------------------
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });
//     console.log("🔌 Serial Port Open");

//     // -------------------------
//     // 2. Capture Fingerprint Image
//     // -------------------------
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);

//     const imgResp = await sendCommand(collectImage, "Capture Fingerprint");

//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // -------------------------
//     // 3. Convert Image → Buffer1
//     // -------------------------
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);

//     const buf1Resp = await sendCommand(imgToBuf1, "Convert to Buffer1");
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // -------------------------
//     // 4. Get Voter by NIC
//     // -------------------------
//     const voter = await voterModel.findOne({ nic });

//     if (!voter) return res.status(404).json({ message: "NIC not found" });

//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // -------------------------
//     // 5. Load Template from Sensor Memory → Buffer2
//     // -------------------------
//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       0x00,
//       0x04, // << correct packet length
//       0x07, // Load Char command
//       0x02, // Buffer 2
//       templateId,
//       0x00,
//       0x00, // checksum placeholder
//     ]);

//     // Correct checksum = 0x07 + 0x02 + templateId
//     const checksum = 0x07 + 0x02 + templateId;
//     loadTemplateCmd.writeUInt16BE(checksum, 12);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2"
//     );
//     if (loadResp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Error loading stored fingerprint." });

//     // -------------------------
//     // 6. Match Buffer1 & Buffer2
//     // -------------------------
//     const matchCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x03, 0x00, 0x07,
//     ]);

//     const matchResp = await sendCommand(matchCmd, "Match Fingerprints");

//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);

//       if (voter.hasVoted)
//         return res.status(403).json({
//           message: "You have already voted.",
//           permission: false,
//           voter,
//         });

//       return res.status(200).json({
//         message: "Fingerprint authenticated.",
//         permission: true,
//         voter,
//       });
//     }

//     // -------------------------
//     // No Match
//     // -------------------------
//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     res.status(500).json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // Send command safely
// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let responseData = Buffer.alloc(0);

//     const handleData = (data) => {
//       responseData = Buffer.concat([responseData, data]);

//       if (responseData.length >= 12) {
//         port.off("data", handleData);
//         resolve(responseData);
//       }
//     };

//     port.on("data", handleData);

//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // -------------------------------------------------------
// // NEW FUNCTION: Read Template Index (0x1F)
// // This prints which templates actually exist in sensor
// // -------------------------------------------------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);

//   const resp = await sendCommand(readCmd, "Read Template Index");

//   if (resp[9] !== 0x00) {
//     console.log("⚠ No template index response");
//     return [];
//   }

//   const templates = [];

//   // Response format:
//   // Byte 10..41 = 32 bytes, each bit = template exists
//   const indexBytes = resp.subarray(10, 42);

//   for (let i = 0; i < indexBytes.length; i++) {
//     for (let bit = 0; bit < 8; bit++) {
//       if (indexBytes[i] & (1 << bit)) {
//         templates.push(i * 8 + bit);
//       }
//     }
//   }

//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) reject(err);
//         else resolve();
//       });
//     });
//     console.log("🔌 Serial Port Open");

//     // ---------------------------------------------------
//     // NEW STEP: Print what templates actually exist
//     // ---------------------------------------------------
//     await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // 1. Capture Fingerprint Image
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);

//     const imgResp = await sendCommand(collectImage, "Capture Fingerprint");

//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // 2. Convert Image → Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);

//     const buf1Resp = await sendCommand(imgToBuf1, "Convert to Buffer1");
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // 3. Get Voter
//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });

//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // 4. Load Template to Buffer2
//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       0x00,
//       0x04,
//       0x07,
//       0x02,
//       templateId,
//       0x00,
//       0x00,
//     ]);

//     const checksum = 0x07 + 0x02 + templateId;
//     loadTemplateCmd.writeUInt16BE(checksum, 12);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2"
//     );
//     if (loadResp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Error loading stored fingerprint." });

//     // 5. Match
//     const matchCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x03, 0x00, 0x07,
//     ]);

//     const matchResp = await sendCommand(matchCmd, "Match Fingerprints");

//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);

//       if (voter.hasVoted)
//         return res.status(403).json({
//           message: "You have already voted.",
//           permission: false,
//           voter,
//         });

//       return res.status(200).json({
//         message: "Fingerprint authenticated.",
//         permission: true,
//         voter,
//       });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     res.status(500).json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------------- CHECKSUM -----------------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------------- SAFE SEND COMMAND -----------------
// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);
//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);
//       if (response.length >= 12) {
//         port.off("data", handleData);
//         console.log(`📡 Response for "${description}":`, response);
//         resolve(response);
//       }
//     };
//     port.on("data", handleData);
//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // ----------------- READ SENSOR TEMPLATE INDEX -----------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);
//   const resp = await sendCommand(readCmd, "Read Template Index");

//   if (resp[9] !== 0x00) {
//     console.log("⚠ No template index response");
//     return [];
//   }

//   const templates = [];
//   const indexBytes = resp.subarray(10, 42);

//   for (let i = 0; i < indexBytes.length; i++) {
//     for (let bit = 0; bit < 8; bit++) {
//       if (indexBytes[i] & (1 << bit)) {
//         templates.push(i * 8 + bit);
//       }
//     }
//   }

//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// // ----------------- LOGIN FUNCTION -----------------
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     await new Promise((resolve, reject) => {
//       port.open((err) => (err ? reject(err) : resolve()));
//     });
//     console.log("🔌 Serial Port Open");

//     // --- DEBUG: Print stored templates ---
//     await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // 1. Capture Fingerprint
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imgResp = await sendCommand(collectImage, "Capture Fingerprint");
//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // 2. Convert Image → Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buf1Resp = await sendCommand(imgToBuf1, "Convert to Buffer1");
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // 3. Get Voter from DB
//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });
//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // 4. Load Template → Buffer2
//     const loadPayload = [0x07, 0x02, templateId]; // instruction + parameters
//     const lengthHigh = 0x00;
//     const lengthLow = loadPayload.length;
//     const checksum = calculateChecksum([
//       0x01,
//       lengthHigh,
//       lengthLow,
//       ...loadPayload,
//     ]);
//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       lengthHigh,
//       lengthLow,
//       ...loadPayload,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2"
//     );

//     // Confirm if Load Template was successful
//     const confirmation = loadResp[9];
//     console.log(
//       `📝 Load Template Response Code: 0x${confirmation.toString(16)}`
//     );
//     if (confirmation !== 0x00) {
//       return res.status(400).json({
//         message: `Error loading stored fingerprint. Sensor returned code 0x${confirmation.toString(
//           16
//         )}`,
//       });
//     }

//     // 5. Match Buffer1 & Buffer2
//     const matchPayload = [0x03, 0x00];
//     const matchLength = 2 + matchPayload.length;
//     const matchChecksum = calculateChecksum([
//       0x01,
//       (matchLength >> 8) & 0xff,
//       matchLength & 0xff,
//       ...matchPayload,
//     ]);
//     const matchCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       (matchLength >> 8) & 0xff,
//       matchLength & 0xff,
//       ...matchPayload,
//       (matchChecksum >> 8) & 0xff,
//       matchChecksum & 0xff,
//     ]);
//     const matchResp = await sendCommand(matchCmd, "Match Fingerprints");

//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);
//       if (voter.hasVoted)
//         return res
//           .status(403)
//           .json({ message: "Already voted.", permission: false, voter });
//       return res.status(200).json({
//         message: "Fingerprint authenticated.",
//         permission: true,
//         voter,
//       });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------------- CHECKSUM -----------------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------------- SAFE SEND COMMAND -----------------
// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);

//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);
//       if (response.length >= 12) {
//         port.off("data", handleData);
//         console.log(`📡 Response for "${description}":`, response);
//         resolve(response);
//       }
//     };

//     port.on("data", handleData);
//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // ----------------- READ SENSOR TEMPLATE INDEX -----------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);

//   const resp = await sendCommand(readCmd, "Read Template Index");

//   if (resp[9] !== 0x00) {
//     console.log("⚠ No template index response");
//     return [];
//   }

//   const templates = [];
//   const indexBytes = resp.subarray(10, 42);

//   for (let i = 0; i < indexBytes.length; i++) {
//     for (let bit = 0; bit < 8; bit++) {
//       if (indexBytes[i] & (1 << bit)) {
//         templates.push(i * 8 + bit);
//       }
//     }
//   }

//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// // ----------------- LOGIN FUNCTION -----------------
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     // Open serial port
//     await new Promise((resolve, reject) =>
//       port.open((err) => (err ? reject(err) : resolve()))
//     );
//     console.log("🔌 Serial Port Open");

//     // Read stored templates for debug
//     await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // 1. Capture Fingerprint
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imgResp = await sendCommand(collectImage, "Capture Fingerprint");
//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // 2. Convert Image → Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buf1Resp = await sendCommand(imgToBuf1, "Convert to Buffer1");
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // 3. Get Voter from DB
//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });

//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // 4. Load Template → Buffer2
//     const instruction = 0x07; // Load template
//     const bufferId = 0x02; // Buffer2
//     const loadPayload = [instruction, bufferId, templateId];
//     const length = loadPayload.length + 2; // instruction + parameters + checksum
//     const checksum = calculateChecksum([
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//     ]);

//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff, // header
//       0x01, // package identifier
//       length >> 8,
//       length & 0xff, // length
//       ...loadPayload,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2"
//     );

//     // Confirm load success
//     const confirmation = loadResp[9];
//     console.log(
//       `📝 Load Template Response Code: 0x${confirmation.toString(16)}`
//     );
//     if (confirmation !== 0x00) {
//       return res.status(400).json({
//         message: `Error loading stored fingerprint. Sensor returned code 0x${confirmation.toString(
//           16
//         )}`,
//       });
//     }

//     // 5. Match Buffer1 & Buffer2
//     const matchPayload = [0x03, 0x00];
//     const matchLength = 2 + matchPayload.length;
//     const matchChecksum = calculateChecksum([
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//     ]);

//     const matchCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//       (matchChecksum >> 8) & 0xff,
//       matchChecksum & 0xff,
//     ]);

//     const matchResp = await sendCommand(matchCmd, "Match Fingerprints");

//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);
//       if (voter.hasVoted)
//         return res
//           .status(403)
//           .json({ message: "Already voted.", permission: false, voter });

//       return res
//         .status(200)
//         .json({
//           message: "Fingerprint authenticated.",
//           permission: true,
//           voter,
//         });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------------- CHECKSUM -----------------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------------- SAFE SEND COMMAND -----------------
// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);

//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);
//       // Wait for at least 12 bytes header + response
//       if (response.length >= 12) {
//         port.off("data", handleData);
//         console.log(`📡 Response for "${description}":`, response);
//         resolve(response);
//       }
//     };

//     port.on("data", handleData);
//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // ----------------- READ SENSOR TEMPLATE INDEX -----------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);

//   const resp = await sendCommand(readCmd, "Read Template Index");

//   if (resp[9] !== 0x00) {
//     console.log("⚠ No template index response");
//     return [];
//   }

//   const templates = [];
//   const indexBytes = resp.subarray(10, 42);

//   for (let i = 0; i < indexBytes.length; i++) {
//     for (let bit = 0; bit < 8; bit++) {
//       if (indexBytes[i] & (1 << bit)) {
//         templates.push(i * 8 + bit);
//       }
//     }
//   }

//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// // ----------------- LOGIN FUNCTION -----------------
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     // Open serial port
//     await new Promise((resolve, reject) =>
//       port.open((err) => (err ? reject(err) : resolve()))
//     );
//     console.log("🔌 Serial Port Open");

//     // Read stored templates for debug
//     await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // 1. Capture Fingerprint
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imgResp = await sendCommand(collectImage, "Capture Fingerprint");
//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // 2. Convert Image → Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buf1Resp = await sendCommand(imgToBuf1, "Convert to Buffer1");
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // 3. Get Voter from DB
//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });

//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // 4. Load Template → Buffer2
//     const bufferId = 0x02; // Buffer2
//     const templateHigh = (templateId >> 8) & 0xff;
//     const templateLow = templateId & 0xff;
//     const loadPayload = [0x07, bufferId, templateHigh, templateLow];
//     const length = loadPayload.length + 2; // +2 for checksum bytes
//     const checksum = calculateChecksum([
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//     ]);

//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff, // header
//       0x01, // package identifier
//       length >> 8,
//       length & 0xff, // length
//       ...loadPayload,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2"
//     );

//     const confirmation = loadResp[9];
//     console.log(
//       `📝 Load Template Response Code: 0x${confirmation.toString(16)}`
//     );
//     if (confirmation !== 0x00) {
//       return res.status(400).json({
//         message: `Error loading stored fingerprint. Sensor returned code 0x${confirmation.toString(
//           16
//         )}`,
//       });
//     }

//     // 5. Match Buffer1 & Buffer2
//     const matchPayload = [0x03, 0x00];
//     const matchLength = 2 + matchPayload.length;
//     const matchChecksum = calculateChecksum([
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//     ]);
//     const matchCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//       (matchChecksum >> 8) & 0xff,
//       matchChecksum & 0xff,
//     ]);

//     const matchResp = await sendCommand(matchCmd, "Match Fingerprints");

//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);
//       if (voter.hasVoted)
//         return res
//           .status(403)
//           .json({ message: "Already voted.", permission: false, voter });

//       return res
//         .status(200)
//         .json({
//           message: "Fingerprint authenticated.",
//           permission: true,
//           voter,
//         });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------------- CHECKSUM -----------------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------------- SAFE SEND COMMAND -----------------
// function sendCommand(command, description, expectedLength = 12) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);

//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);
//       if (response.length >= expectedLength) {
//         port.off("data", handleData);
//         console.log(`📡 Response for "${description}":`, response);
//         resolve(response);
//       }
//     };

//     port.on("data", handleData);
//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // ----------------- READ SENSOR TEMPLATE INDEX -----------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);

//   const resp = await sendCommand(readCmd, "Read Template Index", 12);

//   if (resp[9] !== 0x00) {
//     console.log("⚠ No template index response");
//     return [];
//   }

//   const templates = [];
//   const indexBytes = resp.subarray(10, 42);
//   for (let i = 0; i < indexBytes.length; i++) {
//     for (let bit = 0; bit < 8; bit++) {
//       if (indexBytes[i] & (1 << bit)) {
//         templates.push(i * 8 + bit);
//       }
//     }
//   }

//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// // ----------------- LOGIN FUNCTION -----------------
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     // Open serial port
//     await new Promise((resolve, reject) =>
//       port.open((err) => (err ? reject(err) : resolve()))
//     );
//     console.log("🔌 Serial Port Open");

//     // Debug: stored templates
//     await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // 1. Capture Fingerprint
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imgResp = await sendCommand(collectImage, "Capture Fingerprint");
//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // 2. Convert Image → Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buf1Resp = await sendCommand(imgToBuf1, "Convert to Buffer1");
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // 3. Get voter from DB
//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });

//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // 4. Load Template → Buffer2
//     const bufferId = 0x02; // Buffer2
//     const loadPayload = [0x07, bufferId, templateId]; // Template ID as single byte
//     const length = loadPayload.length + 2;
//     const checksum = calculateChecksum([
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//     ]);

//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2",
//       12
//     );
//     const confirmation = loadResp[9];
//     console.log(
//       `📝 Load Template Response Code: 0x${confirmation.toString(16)}`
//     );

//     if (confirmation !== 0x00) {
//       return res.status(400).json({
//         message: `Error loading stored fingerprint. Sensor returned code 0x${confirmation.toString(
//           16
//         )}`,
//       });
//     }

//     // 5. Match Buffer1 & Buffer2
//     const matchPayload = [0x03, 0x00];
//     const matchLength = 2 + matchPayload.length;
//     const matchChecksum = calculateChecksum([
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//     ]);
//     const matchCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//       (matchChecksum >> 8) & 0xff,
//       matchChecksum & 0xff,
//     ]);

//     const matchResp = await sendCommand(matchCmd, "Match Fingerprints", 12);

//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);
//       if (voter.hasVoted)
//         return res
//           .status(403)
//           .json({ message: "Already voted.", permission: false, voter });

//       return res
//         .status(200)
//         .json({
//           message: "Fingerprint authenticated.",
//           permission: true,
//           voter,
//         });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------------- CHECKSUM -----------------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------------- SAFE SEND COMMAND -----------------
// function sendCommand(command, description, expectedLength = 12) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);

//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);
//       if (response.length >= expectedLength) {
//         port.off("data", handleData);
//         console.log(`📡 Response for "${description}":`, response);
//         resolve(response);
//       }
//     };

//     port.on("data", handleData);
//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // ----------------- CLEAR BUFFER2 -----------------
// async function clearBuffer2() {
//   const payload = [0x0c, 0x02]; // Clear template in Buffer2
//   const length = payload.length + 2;
//   const checksum = calculateChecksum([length >> 8, length & 0xff, ...payload]);

//   const cmd = Buffer.from([
//     0xef,
//     0x01,
//     0xff,
//     0xff,
//     0xff,
//     0xff,
//     0x01,
//     length >> 8,
//     length & 0xff,
//     ...payload,
//     (checksum >> 8) & 0xff,
//     checksum & 0xff,
//   ]);

//   await sendCommand(cmd, "Clear Buffer2", 12);
// }

// // ----------------- READ SENSOR TEMPLATE INDEX -----------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);

//   const resp = await sendCommand(readCmd, "Read Template Index", 12);
//   if (resp[9] !== 0x00) return [];

//   const templates = [];
//   const indexBytes = resp.subarray(10, 42);
//   for (let i = 0; i < indexBytes.length; i++)
//     for (let bit = 0; bit < 8; bit++)
//       if (indexBytes[i] & (1 << bit)) templates.push(i * 8 + bit);

//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// // ----------------- LOGIN FUNCTION -----------------
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     await new Promise((resolve, reject) =>
//       port.open((err) => (err ? reject(err) : resolve()))
//     );
//     console.log("🔌 Serial Port Open");

//     await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // 1. Capture Fingerprint
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imgResp = await sendCommand(collectImage, "Capture Fingerprint", 16);
//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // 2. Convert Image → Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buf1Resp = await sendCommand(imgToBuf1, "Convert to Buffer1", 16);
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // 3. Get voter from DB
//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });
//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // 4. Clear Buffer2 before loading
//     await clearBuffer2();

//     // 5. Load Template → Buffer2
//     const bufferId = 0x02;
//     const loadPayload = [0x07, bufferId, templateId];
//     const length = loadPayload.length + 2;
//     const checksum = calculateChecksum([
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//     ]);
//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);
//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2",
//       12
//     );
//     const confirmation = loadResp[9];
//     console.log(
//       `📝 Load Template Response Code: 0x${confirmation.toString(16)}`
//     );
//     if (confirmation !== 0x00)
//       return res
//         .status(400)
//         .json({
//           message: `Error loading fingerprint: 0x${confirmation.toString(16)}`,
//         });

//     // 6. Match Buffer1 & Buffer2
//     const matchPayload = [0x03, 0x00];
//     const matchLength = 2 + matchPayload.length;
//     const matchChecksum = calculateChecksum([
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//     ]);
//     const matchCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//       (matchChecksum >> 8) & 0xff,
//       matchChecksum & 0xff,
//     ]);
//     const matchResp = await sendCommand(matchCmd, "Match Fingerprints", 12);

//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);
//       if (voter.hasVoted)
//         return res
//           .status(403)
//           .json({ message: "Already voted.", permission: false, voter });
//       return res
//         .status(200)
//         .json({
//           message: "Fingerprint authenticated.",
//           permission: true,
//           voter,
//         });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------------- CHECKSUM -----------------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------------- SAFE SEND COMMAND -----------------
// function sendCommand(command, description, expectedLength = 16) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);
//     const timeout = setTimeout(() => {
//       port.off("data", handleData);
//       reject(new Error(`Timeout waiting for response for "${description}"`));
//     }, 3000);

//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);
//       // If we have at least the header + payload, resolve
//       if (response.length >= expectedLength) {
//         clearTimeout(timeout);
//         port.off("data", handleData);
//         console.log(`📡 Response for "${description}":`, response);
//         resolve(response);
//       }
//     };

//     port.on("data", handleData);
//     port.write(command, (err) => {
//       if (err) {
//         clearTimeout(timeout);
//         port.off("data", handleData);
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // ----------------- READ SENSOR TEMPLATE INDEX -----------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);

//   const resp = await sendCommand(readCmd, "Read Template Index", 16);

//   if (resp[9] !== 0x00) {
//     console.log("⚠ No template index response");
//     return [];
//   }

//   const templates = [];
//   const indexBytes = resp.subarray(10, resp.length);
//   for (let i = 0; i < indexBytes.length; i++) {
//     for (let bit = 0; bit < 8; bit++) {
//       if (indexBytes[i] & (1 << bit)) {
//         templates.push(i * 8 + bit);
//       }
//     }
//   }

//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// // ----------------- LOGIN FUNCTION -----------------
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     // Open serial port
//     await new Promise((resolve, reject) =>
//       port.open((err) => (err ? reject(err) : resolve()))
//     );
//     console.log("🔌 Serial Port Open");

//     // Read stored templates
//     const storedTemplates = await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // 1. Capture Fingerprint
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imgResp = await sendCommand(collectImage, "Capture Fingerprint", 16);
//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // 2. Convert Image → Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buf1Resp = await sendCommand(imgToBuf1, "Convert to Buffer1", 16);
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // 3. Get voter from DB
//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });

//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // Check template exists on sensor
//     if (!storedTemplates.includes(templateId)) {
//       return res
//         .status(400)
//         .json({ message: `Template ID ${templateId} not found on sensor.` });
//     }

//     // 4. Clear Buffer2 before loading
//     const clearBufferCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x0c, 0x00, 0x0d,
//     ]);
//     await sendCommand(clearBufferCmd, "Clear Buffer2", 12);

//     // 5. Load Template → Buffer2
//     const bufferId = 0x02; // Buffer2
//     const templateHigh = (templateId >> 8) & 0xff;
//     const templateLow = templateId & 0xff;
//     const loadPayload = [0x07, bufferId, templateHigh, templateLow];
//     const length = loadPayload.length + 2;
//     const checksum = calculateChecksum([
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//     ]);
//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2",
//       16
//     );
//     const confirmation = loadResp[9];
//     console.log(
//       `📝 Load Template Response Code: 0x${confirmation.toString(16)}`
//     );

//     if (confirmation !== 0x00) {
//       return res.status(400).json({
//         message: `Error loading stored fingerprint. Sensor returned code 0x${confirmation.toString(
//           16
//         )}`,
//       });
//     }

//     // 6. Match Buffer1 & Buffer2
//     const matchPayload = [0x03, 0x00];
//     const matchLength = 2 + matchPayload.length;
//     const matchChecksum = calculateChecksum([
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//     ]);
//     const matchCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//       (matchChecksum >> 8) & 0xff,
//       matchChecksum & 0xff,
//     ]);

//     const matchResp = await sendCommand(matchCmd, "Match Fingerprints", 16);

//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);
//       if (voter.hasVoted)
//         return res
//           .status(403)
//           .json({ message: "Already voted.", permission: false, voter });

//       return res
//         .status(200)
//         .json({
//           message: "Fingerprint authenticated.",
//           permission: true,
//           voter,
//         });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------------- CHECKSUM -----------------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------------- DELAY UTILITY -----------------
// function delay(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// // ----------------- SAFE SEND COMMAND -----------------
// function sendCommand(
//   command,
//   description,
//   expectedLength = 16,
//   timeoutMs = 5000
// ) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);

//     const timeout = setTimeout(() => {
//       port.off("data", handleData);
//       reject(new Error(`Timeout waiting for response for "${description}"`));
//     }, timeoutMs);

//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);
//       // Resolve if we have any response (sensor sometimes returns shorter packets)
//       if (response.length >= expectedLength || response.length > 0) {
//         clearTimeout(timeout);
//         port.off("data", handleData);
//         console.log(`📡 Response for "${description}":`, response);
//         resolve(response);
//       }
//     };

//     port.on("data", handleData);

//     port.write(command, (err) => {
//       if (err) {
//         clearTimeout(timeout);
//         port.off("data", handleData);
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // ----------------- READ SENSOR TEMPLATE INDEX -----------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);

//   const resp = await sendCommand(readCmd, "Read Template Index", 12);
//   if (resp[9] !== 0x00) {
//     console.log("⚠ No template index response");
//     return [];
//   }

//   const templates = [];
//   const indexBytes = resp.subarray(10, 42);
//   for (let i = 0; i < indexBytes.length; i++) {
//     for (let bit = 0; bit < 8; bit++) {
//       if (indexBytes[i] & (1 << bit)) {
//         templates.push(i * 8 + bit);
//       }
//     }
//   }

//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// // ----------------- LOGIN FUNCTION -----------------
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     // Open serial port
//     await new Promise((resolve, reject) =>
//       port.open((err) => (err ? reject(err) : resolve()))
//     );
//     console.log("🔌 Serial Port Open");

//     // Debug: read stored templates
//     await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // 1. Capture Fingerprint
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imgResp = await sendCommand(collectImage, "Capture Fingerprint");
//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // 2. Convert Image → Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buf1Resp = await sendCommand(imgToBuf1, "Convert to Buffer1");
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // 3. Get voter from DB
//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });

//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // 4. Clear Buffer2 before loading template
//     const clearBufferCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x0c, 0x00, 0x0e,
//     ]);
//     await sendCommand(clearBufferCmd, "Clear Buffer2", 12);
//     await delay(100); // small delay for sensor to stabilize

//     // 5. Load Template → Buffer2
//     const bufferId = 0x02;
//     const templateHigh = (templateId >> 8) & 0xff;
//     const templateLow = templateId & 0xff;
//     const loadPayload = [0x07, bufferId, templateHigh, templateLow];
//     const length = loadPayload.length + 2;
//     const checksum = calculateChecksum([
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//     ]);

//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2",
//       12,
//       6000
//     );
//     const confirmation = loadResp[9];
//     console.log(
//       `📝 Load Template Response Code: 0x${confirmation.toString(16)}`
//     );
//     if (confirmation !== 0x00)
//       return res
//         .status(400)
//         .json({
//           message: `Error loading fingerprint. Sensor code 0x${confirmation.toString(
//             16
//           )}`,
//         });

//     // 6. Match Buffer1 & Buffer2
//     const matchPayload = [0x03, 0x00];
//     const matchLength = 2 + matchPayload.length;
//     const matchChecksum = calculateChecksum([
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//     ]);
//     const matchCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//       (matchChecksum >> 8) & 0xff,
//       matchChecksum & 0xff,
//     ]);

//     const matchResp = await sendCommand(
//       matchCmd,
//       "Match Fingerprints",
//       12,
//       5000
//     );
//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);
//       if (voter.hasVoted)
//         return res
//           .status(403)
//           .json({ message: "Already voted.", permission: false, voter });

//       return res
//         .status(200)
//         .json({
//           message: "Fingerprint authenticated.",
//           permission: true,
//           voter,
//         });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------------- CHECKSUM -----------------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------------- DELAY UTILITY -----------------
// function delay(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// // ----------------- SAFE SEND COMMAND -----------------
// function sendCommand(
//   command,
//   description,
//   expectedLength = 16,
//   timeoutMs = 5000
// ) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);

//     const timeout = setTimeout(() => {
//       port.off("data", handleData);
//       reject(new Error(`Timeout waiting for response for "${description}"`));
//     }, timeoutMs);

//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);
//       // Wait for at least some response from sensor
//       if (response.length >= expectedLength) {
//         clearTimeout(timeout);
//         port.off("data", handleData);
//         console.log(`📡 Response for "${description}":`, response);
//         resolve(response);
//       }
//     };

//     port.on("data", handleData);

//     port.write(command, (err) => {
//       if (err) {
//         clearTimeout(timeout);
//         port.off("data", handleData);
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // ----------------- READ SENSOR TEMPLATE INDEX -----------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);
//   const resp = await sendCommand(readCmd, "Read Template Index", 12);
//   if (resp.length < 12 || resp[9] !== 0x00) {
//     console.log("⚠ No template index response");
//     return [];
//   }

//   const templates = [];
//   const indexBytes = resp.subarray(10, 42);
//   for (let i = 0; i < indexBytes.length; i++) {
//     for (let bit = 0; bit < 8; bit++) {
//       if (indexBytes[i] & (1 << bit)) {
//         templates.push(i * 8 + bit);
//       }
//     }
//   }
//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// // ----------------- LOGIN FUNCTION -----------------
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     // Open serial port
//     await new Promise((resolve, reject) =>
//       port.open((err) => (err ? reject(err) : resolve()))
//     );
//     console.log("🔌 Serial Port Open");

//     // IMPORTANT: give the sensor a short delay to initialize
//     await delay(200);

//     // Debug: read stored templates
//     await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // 1. Capture Fingerprint
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imgResp = await sendCommand(
//       collectImage,
//       "Capture Fingerprint",
//       12,
//       6000
//     );
//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // 2. Convert Image → Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buf1Resp = await sendCommand(
//       imgToBuf1,
//       "Convert to Buffer1",
//       12,
//       6000
//     );
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     // 3. Get voter from DB
//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });
//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // 4. Clear Buffer2
//     const clearBufferCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x0c, 0x00, 0x0e,
//     ]);
//     await sendCommand(clearBufferCmd, "Clear Buffer2", 12, 3000);
//     await delay(100);

//     // 5. Load Template → Buffer2
//     const bufferId = 0x02;
//     const templateHigh = (templateId >> 8) & 0xff;
//     const templateLow = templateId & 0xff;
//     const loadPayload = [0x07, bufferId, templateHigh, templateLow];
//     const length = loadPayload.length + 2;
//     const checksum = calculateChecksum([
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//     ]);

//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2",
//       12,
//       6000
//     );
//     if (loadResp.length < 12 || loadResp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({
//           message: `Error loading fingerprint. Sensor code 0x${loadResp[9]?.toString(
//             16
//           )}`,
//         });

//     // 6. Match Fingerprints
//     const matchPayload = [0x03, 0x00];
//     const matchLength = 2 + matchPayload.length;
//     const matchChecksum = calculateChecksum([
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//     ]);
//     const matchCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//       (matchChecksum >> 8) & 0xff,
//       matchChecksum & 0xff,
//     ]);

//     const matchResp = await sendCommand(
//       matchCmd,
//       "Match Fingerprints",
//       12,
//       6000
//     );
//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);
//       if (voter.hasVoted)
//         return res
//           .status(403)
//           .json({ message: "Already voted.", permission: false, voter });
//       return res
//         .status(200)
//         .json({
//           message: "Fingerprint authenticated.",
//           permission: true,
//           voter,
//         });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------------- CHECKSUM -----------------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------------- DELAY -----------------
// function delay(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// // ----------------- SAFE SEND COMMAND -----------------
// async function sendCommand(
//   command,
//   description,
//   timeoutMs = 5000,
//   retries = 2
// ) {
//   for (let attempt = 0; attempt <= retries; attempt++) {
//     try {
//       let response = Buffer.alloc(0);
//       await new Promise((resolve, reject) => {
//         let idleTimer;

//         const handleData = (data) => {
//           response = Buffer.concat([response, data]);
//           clearTimeout(idleTimer);
//           idleTimer = setTimeout(() => {
//             port.off("data", handleData);
//             resolve(response);
//           }, 200); // wait 200ms of idle to consider packet complete
//         };

//         const timeout = setTimeout(() => {
//           port.off("data", handleData);
//           reject(
//             new Error(`Timeout waiting for response for "${description}"`)
//           );
//         }, timeoutMs);

//         port.on("data", handleData);

//         port.write(command, (err) => {
//           if (err) {
//             clearTimeout(timeout);
//             port.off("data", handleData);
//             reject(err);
//           } else {
//             console.log(
//               `📝 ${description} Command Sent (Attempt ${attempt + 1})`
//             );
//           }
//         });
//       });
//       console.log(`📡 Response for "${description}":`, response);
//       return response;
//     } catch (err) {
//       console.warn(
//         `⚠ Attempt ${attempt + 1} failed for "${description}": ${err.message}`
//       );
//       if (attempt === retries) throw err;
//       await delay(300);
//     }
//   }
// }

// // ----------------- READ STORED TEMPLATES -----------------
// async function readStoredTemplates() {
//   const readCmd = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
//   ]);
//   const resp = await sendCommand(readCmd, "Read Template Index", 6000, 3);
//   if (!resp || resp.length < 12 || resp[9] !== 0x00) {
//     console.log("⚠ No template index response");
//     return [];
//   }

//   const templates = [];
//   const indexBytes = resp.subarray(10, 42);
//   for (let i = 0; i < indexBytes.length; i++) {
//     for (let bit = 0; bit < 8; bit++) {
//       if (indexBytes[i] & (1 << bit)) templates.push(i * 8 + bit);
//     }
//   }
//   console.log("📊 Stored Templates on Sensor:", templates);
//   return templates;
// }

// // ----------------- LOGIN FUNCTION -----------------
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;

//   try {
//     await new Promise((resolve, reject) =>
//       port.open((err) => (err ? reject(err) : resolve()))
//     );
//     console.log("🔌 Serial Port Open");

//     // Wait 1 second for sensor to be ready
//     await delay(1000);

//     await readStoredTemplates();
//     console.log("------------------------------------------------------");

//     // Capture Fingerprint
//     const collectImage = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const imgResp = await sendCommand(
//       collectImage,
//       "Capture Fingerprint",
//       6000,
//       3
//     );
//     if (imgResp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // Convert to Buffer1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const buf1Resp = await sendCommand(
//       imgToBuf1,
//       "Convert to Buffer1",
//       6000,
//       3
//     );
//     if (buf1Resp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({ message: "Fingerprint conversion failed." });

//     const voter = await voterModel.findOne({ nic });
//     if (!voter) return res.status(404).json({ message: "NIC not found" });
//     const templateId = voter.fingerprintTemplateId;
//     console.log("🆔 User Template ID:", templateId);

//     // Clear Buffer2
//     const clearBufferCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x0c, 0x00, 0x0e,
//     ]);
//     await sendCommand(clearBufferCmd, "Clear Buffer2", 3000, 1);
//     await delay(100);

//     // Load Template → Buffer2
//     const bufferId = 0x02;
//     const templateHigh = (templateId >> 8) & 0xff;
//     const templateLow = templateId & 0xff;
//     const loadPayload = [0x07, bufferId, templateHigh, templateLow];
//     const length = loadPayload.length + 2;
//     const checksum = calculateChecksum([
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//     ]);
//     const loadTemplateCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       length >> 8,
//       length & 0xff,
//       ...loadPayload,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);

//     const loadResp = await sendCommand(
//       loadTemplateCmd,
//       "Load Template to Buffer2",
//       6000,
//       3
//     );
//     if (!loadResp || loadResp[9] !== 0x00)
//       return res
//         .status(400)
//         .json({
//           message: `Error loading fingerprint. Sensor code 0x${loadResp[9]?.toString(
//             16
//           )}`,
//         });

//     // Match Fingerprints
//     const matchPayload = [0x03, 0x00];
//     const matchLength = 2 + matchPayload.length;
//     const matchChecksum = calculateChecksum([
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//     ]);
//     const matchCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       matchLength >> 8,
//       matchLength & 0xff,
//       ...matchPayload,
//       (matchChecksum >> 8) & 0xff,
//       matchChecksum & 0xff,
//     ]);

//     const matchResp = await sendCommand(
//       matchCmd,
//       "Match Fingerprints",
//       6000,
//       3
//     );
//     if (matchResp[9] === 0x00) {
//       console.log("✅ Fingerprint Matched:", voter.name);
//       if (voter.hasVoted)
//         return res
//           .status(403)
//           .json({ message: "Already voted.", permission: false, voter });
//       return res
//         .status(200)
//         .json({
//           message: "Fingerprint authenticated.",
//           permission: true,
//           voter,
//         });
//     }

//     return res.status(403).json({ message: "Fingerprint does not match." });
//   } catch (err) {
//     console.error("❌ Error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server Error", error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial Port Closed"));
//   }
// }

// module.exports = getLoginFingerPrintData;

// controllers/getLoginFingerPrintData.js

// controllers/getLoginFingerPrintData.js

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// // ---- R307 Packet Helpers ----
// function packet(u8array) {
//   return Buffer.from(u8array);
// }

// const COMMANDS = {
//   genImg: packet([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//   ]),
//   img2Tz1: packet([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//     0x08,
//   ]),
//   searchCmd: packet([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x08, 0x04, 0x01, 0x00,
//     0x00, 0x00, 0x00, 0x0e,
//   ]),
// };

// // ---- Safe Serial Command Sender ----
// async function sendCommand(
//   port,
//   command,
//   label,
//   timeoutMs = 2000,
//   waitMs = 300
// ) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);

//     const onData = (data) => (response = Buffer.concat([response, data]));
//     const onClose = () =>
//       reject(new Error(`${label}: Port closed unexpectedly`));

//     const timer = setTimeout(() => {
//       port.off("data", onData);
//       port.off("close", onClose);
//       reject(new Error(`${label}: Timeout waiting for response`));
//     }, timeoutMs);

//     port.on("data", onData);
//     port.on("close", onClose);

//     port.write(command, (err) => {
//       if (err) {
//         clearTimeout(timer);
//         port.off("data", onData);
//         port.off("close", onClose);
//         return reject(new Error(`${label}: Failed to send command`));
//       }

//       setTimeout(() => {
//         clearTimeout(timer);
//         port.off("data", onData);
//         port.off("close", onClose);
//         resolve(response);
//       }, waitMs);
//     });
//   });
// }

// // Retry helper
// async function retryCommand(port, command, label, retries = 3, timeoutMs = 5000, waitMs = 1500) {
//   for (let i = 1; i <= retries; i++) {
//     try {
//       console.log(`🔁 Attempt ${i} for ${label}`);
//       const res = await sendCommand(port, command, label, timeoutMs, waitMs);

//       // Check if response exists
//       if (!res || res.length < 10) {
//         throw new Error(`No response from sensor on attempt ${i}`);
//       }

//       // Check the confirmation code (9th byte)
//       const confirmationCode = res[9];
//       if (confirmationCode === 0x00) {
//         return res; // success
//       } else {
//         console.warn(`⚠️ ${label} attempt ${i} failed, sensor code: 0x${confirmationCode.toString(16)}`);
//         if (i === retries) throw new Error(`${label} failed after ${retries} attempts`);
//       }

//     } catch (err) {
//       console.warn(`⚠️ ${label} attempt ${i} error: ${err.message}`);
//       if (i === retries) throw err;
//       await new Promise((resolve) => setTimeout(resolve, 1000)); // small delay before retry
//     }
//   }
// }

// // ---- Login Controller ----
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;
//   console.log("🧾 Received NIC from frontend:", nic);

//   const port = new SerialPort({
//     path: "COM9",
//     baudRate: 57600,
//     autoOpen: false,
//   });

//   try {
//     // Open Serial Port
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) return reject(err);
//         console.log("🔌 Serial Port Opened");
//         resolve();
//       });
//     });

//     // 1️⃣ Capture fingerprint
//     console.log("📝 Capturing fingerprint...");
//     // const r1 = await sendCommand(port, COMMANDS.genImg, "GenImg", 5000, 1500);
//     const r1 = await retryCommand(port, COMMANDS.genImg, "GenImg", 3);
//     console.log("r1", r1);

//     if (!r1 || r1.length === 0 || r1[9] !== 0x00) {
//       throw new Error("Failed to capture fingerprint. Keep finger on sensor.");
//     }

//     // 2️⃣ Delay to ensure sensor processing
//     console.log("🕒 Waiting for sensor to process fingerprint...");
//     await new Promise((resolve) => setTimeout(resolve, 1500));

//     // 3️⃣ Convert to template (Buffer 1)
//     console.log("📝 Converting fingerprint to template...");
//     // const r2 = await sendCommand(port, COMMANDS.img2Tz1, "Img2Tz1", 5000, 1500);
//     const r2 = await retryCommand(port, COMMANDS.img2Tz1, "Img2Tz1", 3);
//     console.log("r2", r2);

//     if (!r2 || r2.length === 0) {
//       throw new Error(
//         "No response from sensor during template conversion. Keep finger on sensor longer."
//       );
//     }

//     if (r2[9] !== 0x00) {
//       throw new Error(
//         `Template conversion failed. Sensor error: ${r2[9].toString(16)}`
//       );
//     }

//     // 4️⃣ Search for match
//     console.log("📝 Searching for fingerprint match...");
//     const r3 = await sendCommand(
//       port,
//       COMMANDS.searchCmd,
//       "Search",
//       5000,
//       1500
//     );
//     console.log("r3", r3);

//     if (!r3 || r3.length === 0 || r3[9] !== 0x00) {
//       throw new Error("No matching fingerprint found");
//     }

//     const templateId = (r3[10] << 8) | r3[11];
//     const matchScore = (r3[12] << 8) | r3[13];

//     console.log(
//       "🎉 MATCH FOUND! Template ID:",
//       templateId,
//       "Score:",
//       matchScore
//     );

//     // 5️⃣ Lookup user in DB
//     const user = await voterModel.findOne({ templateId });
//     if (!user) throw new Error("Fingerprint matched but user not found in DB");

//     console.log("📌 User Found:", user.nic);

//     // 6️⃣ Validate NIC
//     if (user.nic !== nic)
//       throw new Error("NIC does not match fingerprint owner");

//     // ✅ Success Response
//     res.status(200).json({
//       success: true,
//       message: "Login successful",
//       voter: {
//         name: user.name,
//         nic: user.nic,
//         district: user.district,
//         politicalparty: user.politicalparty,
//         symbol: user.symbol,
//         number: user.number,
//         image: user.image,
//       },
//     });
//   } catch (error) {
//     console.error("❌ Login Error:", error.message);
//     res.status(400).json({ success: false, message: error.message });
//   } finally {
//     try {
//       if (port.isOpen) port.close(() => console.log("🔒 Serial Port Closed"));
//     } catch (err) {
//       console.log("⚠️ Error closing port:", err.message);
//     }
//   }
// }

// module.exports = getLoginFingerPrintData;

// const { SerialPort } = require("serialport");
// const voterModel = require("../models/voterModel");

// // ---- R307 Packet Helpers ----
// function packet(u8array) {
//   return Buffer.from(u8array);
// }

// const COMMANDS = {
//   genImg: packet([0xef,0x01,0xff,0xff,0xff,0xff,0x01,0x00,0x03,0x01,0x00,0x05]),
//   img2Tz1: packet([0xef,0x01,0xff,0xff,0xff,0xff,0x01,0x00,0x04,0x02,0x01,0x00,0x08]),
//   img2Tz2: packet([0xef,0x01,0xff,0xff,0xff,0xff,0x01,0x00,0x04,0x02,0x02,0x00,0x09]),
//   regModel: packet([0xef,0x01,0xff,0xff,0xff,0xff,0x01,0x00,0x05,0x05,0x01,0x00,0x00,0x0b]), // merge buffers
//   searchCmd: packet([0xef,0x01,0xff,0xff,0xff,0xff,0x01,0x00,0x08,0x04,0x01,0x00,0x00,0x00,0x00,0x0e]),
//   clearBuf1: packet([0xef,0x01,0xff,0xff,0xff,0xff,0x01,0x00,0x03,0x0c,0x01,0x00,0x10]),
//   clearBuf2: packet([0xef,0x01,0xff,0xff,0xff,0xff,0x01,0x00,0x03,0x0c,0x02,0x00,0x11])
// };

// // ---- Send Command ----
// async function sendCommand(port, command, label, timeoutMs = 2000, waitMs = 300) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);
//     const onData = (data) => (response = Buffer.concat([response, data]));
//     const onClose = () => reject(new Error(`${label}: Port closed unexpectedly`));
//     const timer = setTimeout(() => {
//       port.off("data", onData);
//       port.off("close", onClose);
//       reject(new Error(`${label}: Timeout waiting for response`));
//     }, timeoutMs);

//     port.on("data", onData);
//     port.on("close", onClose);

//     port.write(command, (err) => {
//       if (err) {
//         clearTimeout(timer);
//         port.off("data", onData);
//         port.off("close", onClose);
//         return reject(new Error(`${label}: Failed to send command`));
//       }
//       setTimeout(() => {
//         clearTimeout(timer);
//         port.off("data", onData);
//         port.off("close", onClose);
//         resolve(response);
//       }, waitMs);
//     });
//   });
// }

// // ---- Full Login Attempt (like registration) ----
// async function attemptFullFingerprint(port, retries = 3) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       console.log(`🔁 Full fingerprint attempt ${attempt} started`);

//       // 1️⃣ Capture first fingerprint (Buffer 1)
//       const r1 = await sendCommand(port, COMMANDS.genImg, "GenImg1", 5000, 1500);
//       if (r1[9] !== 0x00) throw new Error(`GenImg1 failed, code: 0x${r1[9].toString(16)}`);
//       const r2 = await sendCommand(port, COMMANDS.img2Tz1, "Img2Tz1", 5000, 1500);
//       if (r2[9] !== 0x00) throw new Error(`Img2Tz1 failed, code: 0x${r2[9].toString(16)}`);

//       // 2️⃣ Capture second fingerprint (Buffer 2)
//       const r3 = await sendCommand(port, COMMANDS.genImg, "GenImg2", 5000, 1500);
//       if (r3[9] !== 0x00) throw new Error(`GenImg2 failed, code: 0x${r3[9].toString(16)}`);
//       const r4 = await sendCommand(port, COMMANDS.img2Tz2, "Img2Tz2", 5000, 1500);
//       if (r4[9] !== 0x00) throw new Error(`Img2Tz2 failed, code: 0x${r4[9].toString(16)}`);

//       // 3️⃣ Merge Buffers into template
//       const merged = await sendCommand(port, COMMANDS.regModel, "MergeBuffers", 5000, 1500);
//       if (merged[9] !== 0x00) throw new Error(`Merge failed, code: 0x${merged[9].toString(16)}`);

//       // 4️⃣ Search for match
//       const search = await sendCommand(port, COMMANDS.searchCmd, "Search", 5000, 1500);
//       if (!search || search.length < 14 || search[9] !== 0x00) throw new Error("No matching fingerprint");

//       // 5️⃣ Clear buffers
//       await sendCommand(port, COMMANDS.clearBuf1, "ClearBuffer1", 3000, 300);
//       await sendCommand(port, COMMANDS.clearBuf2, "ClearBuffer2", 3000, 300);

//       // ✅ Return search result
//       return search;

//     } catch (err) {
//       console.warn(`⚠️ Full attempt ${attempt} failed: ${err.message}`);
//       if (attempt < retries) {
//         console.log("⏳ Retrying full fingerprint sequence...");
//         await new Promise((resolve) => setTimeout(resolve, 1000));
//       } else {
//         throw new Error(`All ${retries} full fingerprint attempts failed`);
//       }
//     }
//   }
// }

// // ---- Login Controller ----
// async function getLoginFingerPrintData(req, res) {
//   const { nic } = req.params;
//   console.log("🧾 Received NIC:", nic);

//   const port = new SerialPort({ path: "COM9", baudRate: 57600, autoOpen: false });

//   try {
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) return reject(err);
//         console.log("🔌 Serial Port Opened");
//         resolve();
//       });
//     });

//     const search = await attemptFullFingerprint(port, 3);
//     const templateId = (search[10] << 8) | search[11];
//     const matchScore = (search[12] << 8) | search[13];
//     console.log("🎉 MATCH FOUND! Template ID:", templateId, "Score:", matchScore);

//     const user = await voterModel.findOne({ templateId });
//     if (!user) throw new Error("Fingerprint matched but user not found");
//     if (user.nic !== nic) throw new Error("NIC does not match fingerprint owner");

//     res.status(200).json({
//       success: true,
//       message: "Login successful",
//       voter: {
//         name: user.name,
//         nic: user.nic,
//         district: user.district,
//         politicalparty: user.politicalparty,
//         symbol: user.symbol,
//         number: user.number,
//         image: user.image,
//       },
//     });

//   } catch (err) {
//     console.error("❌ Login Error:", err.message);
//     res.status(400).json({ success: false, message: err.message });
//   } finally {
//     try { if (port.isOpen) port.close(() => console.log("🔒 Serial Port Closed")); }
//     catch (err) { console.log("⚠️ Error closing port:", err.message); }
//   }
// }

// module.exports = getLoginFingerPrintData;

const { SerialPort } = require("serialport");
const voterModel = require("../models/voterModel");

// ---- R307 Packet Helpers ----
function packet(u8array) {
  return Buffer.from(u8array);
}

// ---- Checksum Calculation ----
function calculateChecksum(bytes) {
  return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
}

const COMMANDS = {
  genImg: packet([
    0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
  ]),
  img2Tz1: packet([
    0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
    0x08,
  ]),
  img2Tz2: packet([
    0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
    0x09,
  ]),
  regModel: packet([
    0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
  ]), // Merge Buffer 1 and Buffer 2
  match: packet([
    0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x03, 0x00, 0x07,
  ]), // Match Buffer 1 and Buffer 2
  search: packet([
    0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x08, 0x04, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x0e,
  ]), // Search Buffer 1 against all stored templates
};

// ---- Safe Serial Command Sender ----
async function sendCommand(
  port,
  command,
  label,
  timeoutMs = 5000,
  waitMs = 500
) {
  return new Promise((resolve, reject) => {
    let response = Buffer.alloc(0);

    const onData = (data) => {
      response = Buffer.concat([response, data]);
      // Wait for complete response (minimum 12 bytes for R307)
      if (response.length >= 12) {
        clearTimeout(timer);
        port.off("data", onData);
        port.off("close", onClose);
        resolve(response);
      }
    };

    const onClose = () => {
      clearTimeout(timer);
      port.off("data", onData);
      port.off("close", onClose);
      reject(new Error(`${label}: Port closed unexpectedly`));
    };

    const timer = setTimeout(() => {
      port.off("data", onData);
      port.off("close", onClose);
      // Return partial response if we have at least 12 bytes
      if (response.length >= 12) {
        resolve(response);
      } else {
        reject(new Error(`${label}: Timeout waiting for response`));
      }
    }, timeoutMs);

    port.on("data", onData);
    port.on("close", onClose);

    port.write(command, (err) => {
      if (err) {
        clearTimeout(timer);
        port.off("data", onData);
        port.off("close", onClose);
        return reject(new Error(`${label}: Failed to send command`));
      }
      console.log(`📝 ${label} command sent`);
    });
  });
}

// ---- Build Load Template Command (from sensor memory) ----
function buildLoadTemplateCmd(templateId) {
  // Command 0x07: Load Char (Load template from sensor memory)
  // Buffer ID: 0x02 (Load into Buffer 2)
  // Template ID: 16-bit value (high byte, low byte)
  
  const templateHigh = (templateId >> 8) & 0xff;
  const templateLow = templateId & 0xff;
  
  const payload = [0x07, 0x02, templateHigh, templateLow];
  const length = payload.length + 2; // +2 for checksum bytes
  
  const checksum = calculateChecksum([
    0x01, // Package ID
    (length >> 8) & 0xff, // Length high
    length & 0xff, // Length low
    ...payload
  ]);
  
  const chHigh = (checksum >> 8) & 0xff;
  const chLow = checksum & 0xff;
  
  return Buffer.from([
    0xef, 0x01, 0xff, 0xff, 0xff, 0xff, // Header
    0x01, // Package ID
    (length >> 8) & 0xff, // Length high
    length & 0xff, // Length low
    ...payload,
    chHigh, chLow // Checksum
  ]);
}

// ---- Upload Template from MongoDB Base64 to Buffer 2 ----
async function uploadTemplateToBuffer2(port, fingerprintBase64) {
  // Command 0x09: UpChar (Upload template to Buffer 2)
  // Format EXACTLY matches voterConfirmWithFingerprint.js (which is working)
  
  const fingerprintBuffer = Buffer.from(fingerprintBase64, 'base64');
  console.log(`📦 Template buffer size: ${fingerprintBuffer.length} bytes`);
  console.log(`📦 Template data preview (first 20 bytes): ${fingerprintBuffer.slice(0, 20).toString('hex')}`);
  
  // Build header EXACTLY as in voterConfirmWithFingerprint.js (which works!)
  // Length = 0x07 means: 0x09 + 0x02 = 11 bytes, but they use 0x07 (might be excluding something)
  // Actually, let's calculate proper length: 2 (command + buffer) + template length
  const dataLength = 2 + fingerprintBuffer.length; // 0x09 + 0x02 + template data
  const lengthHigh = (dataLength >> 8) & 0xff;
  const lengthLow = dataLength & 0xff;
  
  const header = Buffer.from([
    0xef, 0x01, 0xff, 0xff, 0xff, 0xff, // Header
    0x01, // Package ID
    lengthHigh, lengthLow, // Length (proper calculation)
    0x09, // UpChar command
    0x02, // Buffer ID (Buffer 2)
    0x00, 0x00 // Checksum placeholder
  ]);
  
  // Calculate checksum: sum of [0x01, length_high, length_low, 0x09, 0x02, ...all template bytes]
  let checksum = 0x01 + lengthHigh + lengthLow + 0x09 + 0x02;
  for (let i = 0; i < fingerprintBuffer.length; i++) {
    checksum += fingerprintBuffer[i];
  }
  checksum = checksum & 0xffff; // Keep it 16-bit
  
  // Write checksum to header
  header.writeUInt16BE(checksum, 10);
  
  // Combine header + fingerprint data
  const uploadCmd = Buffer.concat([header, fingerprintBuffer]);
  
  console.log(`📤 Upload command total size: ${uploadCmd.length} bytes`);
  console.log(`📤 Data length: ${dataLength}, Checksum: 0x${checksum.toString(16).padStart(4, '0')}`);
  
  // Use MUCH longer timeout for large template uploads (769 bytes needs time)
  const uploadResp = await sendCommand(port, uploadCmd, "Upload Template to Buffer 2", 20000, 8000);
  
  return uploadResp;
}

// ---- Read Template Index (check what's stored in sensor) ----
async function readTemplateIndex(port) {
  const readCmd = packet([
    0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1f, 0x00, 0x23,
  ]);
  
  const resp = await sendCommand(port, readCmd, "Read Template Index", 6000, 2000);
  
  if (resp[9] !== 0x00) {
    console.log("⚠️ Could not read template index");
    return [];
  }
  
  const templates = [];
  const indexBytes = resp.subarray(10, 42); // Bytes 10-41 contain the index
  
  for (let i = 0; i < indexBytes.length; i++) {
    for (let bit = 0; bit < 8; bit++) {
      if (indexBytes[i] & (1 << bit)) {
        templates.push(i * 8 + bit);
      }
    }
  }
  
  return templates;
}

// ---- Load Stored Template to Buffer 2 ----
async function loadStoredTemplateToBuffer2(port, templateId, fingerprintBase64) {
  // Method 1: Try uploading from MongoDB Base64 (most reliable - exact template data)
  if (fingerprintBase64) {
    try {
      console.log(`📤 Attempting to upload template from MongoDB (Base64) to Buffer 2...`);
      const uploadResp = await uploadTemplateToBuffer2(port, fingerprintBase64);
      
      console.log(`📊 Upload Response (hex): ${uploadResp.toString('hex')}`);
      console.log(`📊 Upload Response confirmation byte[9]: 0x${uploadResp[9]?.toString(16) || 'undefined'}`);
      
      if (uploadResp[9] === 0x00) {
        console.log("✅ Template uploaded from MongoDB to Buffer 2 successfully");
        return true;
      } else {
        console.log(`⚠️ MongoDB upload failed (code: 0x${uploadResp[9].toString(16)}), trying sensor memory...`);
      }
    } catch (err) {
      console.log(`⚠️ MongoDB upload error: ${err.message}, trying sensor memory...`);
    }
  }
  
  // Method 2: Fallback to loading from sensor memory
  try {
    console.log(`📥 Attempting to load template (ID: ${templateId}) from sensor memory to Buffer 2...`);
    const loadCmd = buildLoadTemplateCmd(templateId);
    const loadResp = await sendCommand(
      port,
      loadCmd,
      "Load Template to Buffer 2 (from sensor memory)",
      6000,
      2000
    );
    
    console.log(`📊 Load Response (hex): ${loadResp.toString('hex')}`);
    console.log(`📊 Load Response confirmation byte[9]: 0x${loadResp[9]?.toString(16) || 'undefined'}`);
    
    if (loadResp[9] !== 0x00) {
      const errorCode = loadResp[9];
      if (errorCode === 0x0c) {
        throw new Error(`Template ID ${templateId} not found in sensor memory. Registration may have failed or sensor was reset.`);
      }
      throw new Error(`Failed to load template. Sensor code: 0x${errorCode.toString(16)}`);
    }
    console.log("✅ Template loaded from sensor memory to Buffer 2 successfully");
    return true;
  } catch (err) {
    console.error(`❌ Sensor memory load failed: ${err.message}`);
    return false;
  }
}

// ---- Direct Template Matching Flow ----
async function attemptDirectMatch(port, templateId, storedFingerprintBase64, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔁 Direct match attempt ${attempt} for template ID: ${templateId}`);

      // SIMPLIFIED: Single capture approach (like voterConfirmWithFingerprint.js)
      // A single capture template can match the stored template
      
      // 1️⃣ Capture fingerprint image (ONCE - no merge needed)
      console.log("📸 Step 1: Capturing fingerprint image...");
      const img1Resp = await sendCommand(
        port,
        COMMANDS.genImg,
        "Capture Fingerprint #1",
        6000,
        2000
      );
      
      if (img1Resp[9] !== 0x00) {
        const errorCode = img1Resp[9];
        if (errorCode === 0x02) {
          throw new Error("No finger detected. Please place your finger on the sensor.");
        }
        throw new Error(`Fingerprint capture failed. Sensor code: 0x${errorCode.toString(16)}`);
      }
      console.log("✅ Fingerprint captured successfully");

      // 2️⃣ Convert image to template in Buffer 1
      console.log("🔄 Step 2: Converting image to template (Buffer 1)...");
      const buf1Resp = await sendCommand(
        port,
        COMMANDS.img2Tz1,
        "Convert to Buffer 1",
        6000,
        2000
      );
      
      if (buf1Resp[9] !== 0x00) {
        const errorCode = buf1Resp[9];
        if (errorCode === 0x06) {
          throw new Error("First fingerprint image too messy. Please try again with better finger placement.");
        }
        throw new Error(`Template conversion failed. Sensor code: 0x${errorCode.toString(16)}`);
      }
      console.log("✅ Template created in Buffer 1");

      // Delay before search (let sensor process the template)
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 3️⃣ Use SEARCH command - searches Buffer 1 against all stored templates
      // NOTE: SEARCH only uses Buffer 1, no need for second capture or Buffer 2
      console.log("🔍 Step 3: Searching for fingerprint match in sensor memory...");
      const searchResp = await sendCommand(
        port,
        COMMANDS.search,
        "Search Fingerprint",
        6000,
        2000
      );
      
      // Debug: Log full response
      console.log(`📊 Search Response (hex): ${searchResp.toString('hex')}`);
      console.log(`📊 Search Response (bytes): [${Array.from(searchResp).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
      console.log(`📊 Response length: ${searchResp.length}, Confirmation byte[9]: 0x${searchResp[9]?.toString(16) || 'undefined'}`);
      
      if (searchResp[9] !== 0x00) {
        // Search failed - no match found
        let matchScore = 0;
        if (searchResp.length >= 14) {
          matchScore = (searchResp[12] << 8) | searchResp[13];
          console.log(`📊 Match score from bytes 12-13: ${matchScore}`);
        }
        throw new Error(`Fingerprint not found in sensor memory. Match score: ${matchScore}`);
      }

      // Success - Extract template ID and match score from search response
      // Search response format: bytes 10-11 = template ID, bytes 12-13 = match score
      let foundTemplateId = 0;
      let matchScore = 0;
      if (searchResp.length >= 14) {
        foundTemplateId = (searchResp[10] << 8) | searchResp[11];
        matchScore = (searchResp[12] << 8) | searchResp[13];
      }
      
      console.log(`✅ Fingerprint found! Template ID: ${foundTemplateId}, Match score: ${matchScore}`);
      
      // Verify the found template ID matches what we're looking for
      if (foundTemplateId !== templateId) {
        throw new Error(`Template ID mismatch. Found: ${foundTemplateId}, Expected: ${templateId}`);
      }
      
      return { success: true, matchScore, templateId: foundTemplateId };

    } catch (err) {
      console.warn(`⚠️ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`⏳ Retrying in 1 second... (${retries - attempt} attempts remaining)`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw err;
      }
    }
  }
}

// ---- Login Controller ----
async function getLoginFingerPrintData(req, res) {
  const { nic } = req.params;
  console.log("🧾 Received NIC from frontend:", nic);

  const port = new SerialPort({
    path: "COM9",
    baudRate: 57600,
    autoOpen: false,
  });

  try {
    // Step 1: Lookup user by NIC first to get templateId
    console.log("🔍 Step 0: Looking up voter by NIC...");
    const user = await voterModel.findOne({ nic });
    
    if (!user) {
      throw new Error("Voter not found. Please check your NIC number.");
    }

    if (!user.fingerprintTemplateId && user.fingerprintTemplateId !== 0) {
      throw new Error("Fingerprint not registered for this voter. Please register first.");
    }

    if (!user.fingerprint) {
      throw new Error("Fingerprint data not found in database. Please re-register.");
    }

    if (user.hasVoted) {
      throw new Error("You have already voted. Cannot login again.");
    }

    console.log(`✅ Voter found: ${user.name}, Template ID: ${user.fingerprintTemplateId}`);
    console.log(`📦 Stored fingerprint data length: ${user.fingerprint.length} characters (Base64)`);

    // Step 2: Open serial port
    await new Promise((resolve, reject) => {
      port.open((err) => {
        if (err) return reject(new Error(`Failed to open serial port: ${err.message}`));
        console.log("🔌 Serial Port Opened");
        // Give sensor time to initialize
        setTimeout(resolve, 500);
      });
    });

    // Step 2.5: Check what templates are stored in sensor memory (for debugging)
    console.log("🔍 Checking templates stored in sensor memory...");
    const storedTemplates = await readTemplateIndex(port);
    console.log(`📊 Templates found in sensor memory: [${storedTemplates.join(', ')}]`);
    if (!storedTemplates.includes(user.fingerprintTemplateId)) {
      console.log(`⚠️ WARNING: Template ID ${user.fingerprintTemplateId} NOT found in sensor memory!`);
      console.log(`⚠️ Will use MongoDB stored template instead.`);
    } else {
      console.log(`✅ Template ID ${user.fingerprintTemplateId} found in sensor memory.`);
    }

    // Step 3: Attempt direct template matching
    const matchResult = await attemptDirectMatch(port, user.fingerprintTemplateId, user.fingerprint, 3);
    
    if (!matchResult.success) {
      throw new Error("Fingerprint matching failed");
    }

    console.log("🎉 LOGIN SUCCESSFUL!");
    console.log(`   Voter: ${user.name}`);
    console.log(`   NIC: ${user.nic}`);
    console.log(`   Match Score: ${matchResult.matchScore}`);

    // Return success response
    res.status(200).json({
      success: true,
      message: "Login successful",
      voter: {
        name: user.name,
        nic: user.nic,
        district: user.district,
        politicalparty: user.politicalparty,
        symbol: user.symbol,
        number: user.number,
        image: user.image,
      },
      matchScore: matchResult.matchScore,
    });

  } catch (error) {
    console.error("❌ Login Error:", error.message);
    res.status(400).json({ 
      success: false, 
      message: error.message,
      error: true 
    });
  } finally {
    try {
      if (port.isOpen) {
        port.close(() => console.log("🔒 Serial Port Closed"));
      }
    } catch (err) {
      console.log("⚠️ Error closing port:", err.message);
    }
  }
}

module.exports = getLoginFingerPrintData;
