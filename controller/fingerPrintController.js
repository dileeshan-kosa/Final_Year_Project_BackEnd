// // // Me Code eka hari.......................................
// const { SerialPort } = require("serialport");

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

// async function getFingerPrintData(req, res) {
//   try {
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) {
//           console.error("❌ Error opening port:", err.message);
//           reject(err);
//         } else {
//           console.log(`✅ Serial port COM9 open.`);
//           resolve();
//         }
//       });
//     });

//     // step 1:
//     const collectImageCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const collectImageResponse = await sendCommand(
//       collectImageCommand,
//       `Capture first fingerprint`
//     );
//     console.log("📦 Full response buffer:", collectImageResponse);

//     if (collectImageResponse[9] !== 0x00) {
//       console.log("❌ Fingerprint capture failed. Try again.");
//       return;
//     }
//     if (collectImageResponse[9] === 0x02) {
//       console.log("❌ No finger detected in first attempt.");
//       return;
//     }
//     // console.log("Hiii methent weda")
//     // console.log("Hiii methent weda")

//     const storeImageInBufferOneCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     const saveImageResponse = await sendCommand(
//       storeImageInBufferOneCommand,
//       `Convert to Buffer 1`
//     );
//     if (saveImageResponse[9] === 0x01) {
//       console.log("❌ Conversion failed (bad fingerprint image)");
//       return;
//     }
//     if (saveImageResponse[9] === 0x06) {
//       console.log("❌ Fingerprint too messy (retry)");
//       return;
//     }

//     // step 2:
//     const collectNewImageCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const collectNewImageResponse = await sendCommand(
//       collectNewImageCommand,
//       `Capture second fingerprint`
//     );

//     if (collectNewImageResponse[9] !== 0x00) {
//       console.log("❌ Fingerprint capture failed. Try again.");
//       return;
//     }
//     if (collectNewImageResponse[9] === 0x02) {
//       console.log("❌ No finger detected in second attempt.");
//       return;
//     }

//     const storeNewImageInBufferTwoCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
//       0x09,
//     ]);
//     const saveSecondImageResponse = await sendCommand(
//       storeNewImageInBufferTwoCommand,
//       `Convert to Buffer 2`
//     );
//     if (saveSecondImageResponse[9] === 0x01) {
//       console.log("❌ Conversion failed (bad fingerprint image)");
//       return;
//     }
//     if (saveSecondImageResponse[9] === 0x06) {
//       console.log("❌ Fingerprint too messy (retry)");
//       return;
//     }

//     await new Promise((r) => setTimeout(r, 2000));

//     const generateTemplatedCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     ]);
//     const saveImageBuffersResponse = await sendCommand(
//       generateTemplatedCommand,
//       `Merge together in Buffer 1`
//     );

//     console.log("✅ Fingerprint merged into template.");

//     // Upload the template from Buffer 1 using UpChar
//     const extractTemplateCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//       0x0e,
//     ]);

//     const fingerprintChunks = [];

//     await new Promise((resolve, reject) => {
//       let fullData = Buffer.alloc(0);
//       let packetCount = 0;

//       const handleData = (data) => {
//         fullData = Buffer.concat([fullData, data]);

//         while (fullData.length >= 12) {
//           const dataLength = fullData.readUInt16BE(7);
//           const totalPacketLength = 9 + dataLength;

//           if (fullData.length < totalPacketLength) break;

//           const packet = fullData.slice(0, totalPacketLength);
//           const packetId = packet[6];
//           const fingerprintChunk = packet.slice(9, totalPacketLength - 2);

//           console.log(
//             `📦 Packet ${packetCount + 1} [${
//               packetId === 0x08 ? "End" : "Data"
//             } Packet]:`
//           );
//           console.log(fingerprintChunk);

//           fingerprintChunks.push(fingerprintChunk);
//           packetCount++;

//           if (packetId === 0x08) {
//             port.off("data", handleData);
//             resolve();
//             break;
//           }

//           fullData = fullData.slice(totalPacketLength);
//         }
//       };

//       port.on("data", handleData);

//       port.write(extractTemplateCommand, (err) => {
//         if (err) {
//           console.error("❌ Error sending extract template command:", err);
//           reject(err);
//         } else {
//           console.log("📤 Template Upload Command Sent");
//         }
//       });
//     });

//     const fullFingerprintTemplate = Buffer.concat(fingerprintChunks);
//     const fingerprintBase64 = fullFingerprintTemplate.toString("base64");
//     console.log("✅ Final Fingerprint Template (Base64):", fingerprintBase64);
//     res.status(200).json({
//       message: "FingerPrint caputered.",
//       fingerprintBase64,
//       data: fullFingerprintTemplate,
//     });
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

// module.exports = getFingerPrintData;

// const { SerialPort } = require("serialport");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // Send command
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

// async function getFingerPrintData(req, res) {
//   try {
//     // Open port
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) return reject(err);
//         console.log("✅ Serial Port Open");
//         resolve();
//       });
//     });

//     // --- STEP 1: Capture Image 1 ---
//     const collectImage1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const img1Resp = await sendCommand(
//       collectImage1,
//       "Capture First Fingerprint"
//     );
//     if (img1Resp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // Convert to Buffer 1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     await sendCommand(imgToBuf1, "Convert Image to Buffer 1");

//     // --- STEP 2: Capture Image 2 ---
//     const collectImage2 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const img2Resp = await sendCommand(
//       collectImage2,
//       "Capture Second Fingerprint"
//     );
//     if (img2Resp[9] !== 0x00)
//       return res.status(400).json({ message: "Second scan failed." });

//     // Convert to Buffer 2
//     const imgToBuf2 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
//       0x09,
//     ]);
//     await sendCommand(imgToBuf2, "Convert Image to Buffer 2");

//     // --- STEP 3: Merge into Template ---
//     const mergeCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     ]);
//     await sendCommand(mergeCmd, "Generate Template");

//     console.log("✅ Template generated in Buffer 1");

//     // --- STEP 4: Assign template ID (0–127) ---
//     const templateId = Math.floor(Math.random() * 120);
//     console.log("🆔 Assigned Template ID:", templateId);

//     // --- STEP 5: Store template inside sensor memory ---
//     const storeTemplate = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       0x00,
//       0x04,
//       0x06,
//       templateId,
//       0x00,
//       0x0a,
//     ]);
//     await sendCommand(storeTemplate, "Store Template in Sensor");

//     console.log("📥 Template stored inside sensor memory");

//     // --- STEP 6: Upload template for MongoDB storage ---
//     const uploadTemplateCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//       0x0e,
//     ]);

//     const fingerprintChunks = [];

//     await new Promise((resolve) => {
//       let fullData = Buffer.alloc(0);

//       const handleData = (data) => {
//         fullData = Buffer.concat([fullData, data]);

//         while (fullData.length >= 12) {
//           const len = fullData.readUInt16BE(7);
//           const total = 9 + len;
//           if (fullData.length < total) break;

//           const packet = fullData.slice(0, total);
//           fingerprintChunks.push(packet.slice(9, total - 2));

//           if (packet[6] === 0x08) {
//             port.off("data", handleData);
//             resolve();
//             break;
//           }

//           fullData = fullData.slice(total);
//         }
//       };

//       port.on("data", handleData);
//       port.write(uploadTemplateCmd);
//     });

//     const finalTemplate = Buffer.concat(fingerprintChunks);
//     const fingerprintBase64 = finalTemplate.toString("base64");

//     console.log("📌 Fingerprint Template Extracted");

//     // --- RETURN to Frontend ---
//     res.status(200).json({
//       message: "Fingerprint captured successfully",
//       fingerprint: fingerprintBase64,
//       fingerprintTemplateId: templateId,
//     });
//   } catch (err) {
//     console.log("❌ Error:", err);
//     res.status(500).json({ error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Port Closed"));
//   }
// }

// module.exports = getFingerPrintData;

// const { SerialPort } = require("serialport");
// const FingerCounter = require("../models/fingerCounterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // Send command
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

// async function getNextTemplateId() {
//   let counter = await FingerCounter.findById("fingerCounter");

//   if (!counter) {
//     counter = await FingerCounter.create({ _id: "fingerCounter", lastId: 0 });
//   }

//   counter.lastId += 1;

//   // Prevent overflow beyond sensor memory limit 0–127
//   if (counter.lastId > 127) {
//     throw new Error("Sensor memory full! No more template slots available.");
//   }

//   await counter.save();
//   return counter.lastId;
// }

// async function getFingerPrintData(req, res) {
//   try {
//     // Open port
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) return reject(err);
//         console.log("✅ Serial Port Open");
//         resolve();
//       });
//     });

//     // --- STEP 1: Capture Image 1 ---
//     const collectImage1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const img1Resp = await sendCommand(
//       collectImage1,
//       "Capture First Fingerprint"
//     );
//     if (img1Resp[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly." });

//     // Convert to Buffer 1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     await sendCommand(imgToBuf1, "Convert Image to Buffer 1");

//     // --- STEP 2: Capture Image 2 ---
//     const collectImage2 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const img2Resp = await sendCommand(
//       collectImage2,
//       "Capture Second Fingerprint"
//     );
//     if (img2Resp[9] !== 0x00)
//       return res.status(400).json({ message: "Second scan failed." });

//     // Convert to Buffer 2
//     const imgToBuf2 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
//       0x09,
//     ]);
//     await sendCommand(imgToBuf2, "Convert Image to Buffer 2");

//     // --- STEP 3: Merge into Template ---
//     const mergeCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     ]);
//     await sendCommand(mergeCmd, "Generate Template");

//     console.log("✅ Template generated in Buffer 1");

//     // --- STEP 4: Get auto-increment Template ID ---
//     const templateId = await getNextTemplateId();
//     console.log("🆔 Assigned Auto Template ID:", templateId);

//     // --- STEP 5: Store template inside sensor memory ---
//     const storeTemplate = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       0x00,
//       0x04,
//       0x06, // Store command
//       0x01, // Buffer 1
//       templateId, // Auto-increment ID
//       0x00,
//       0x0a, // checksum
//     ]);
//     await sendCommand(storeTemplate, "Store Template in Sensor");

//     console.log("📥 Template stored inside sensor memory");

//     // --- STEP 6: Upload template for MongoDB storage ---
//     const uploadTemplateCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//       0x0e,
//     ]);

//     const fingerprintChunks = [];

//     await new Promise((resolve) => {
//       let fullData = Buffer.alloc(0);

//       const handleData = (data) => {
//         fullData = Buffer.concat([fullData, data]);

//         while (fullData.length >= 12) {
//           const len = fullData.readUInt16BE(7);
//           const total = 9 + len;
//           if (fullData.length < total) break;

//           const packet = fullData.slice(0, total);
//           fingerprintChunks.push(packet.slice(9, total - 2));

//           // Last packet indicator
//           if (packet[6] === 0x08) {
//             port.off("data", handleData);
//             resolve();
//             break;
//           }

//           fullData = fullData.slice(total);
//         }
//       };

//       port.on("data", handleData);
//       port.write(uploadTemplateCmd);
//     });

//     const finalTemplate = Buffer.concat(fingerprintChunks);
//     const fingerprintBase64 = finalTemplate.toString("base64");

//     console.log("📌 Fingerprint Template Extracted");

//     // --- RETURN to Frontend ---
//     res.status(200).json({
//       message: "Fingerprint captured successfully",
//       fingerprintBase64,
//       templateId,
//     });
//   } catch (err) {
//     console.log("❌ Error:", err);
//     res.status(500).json({ error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Port Closed"));
//   }
// }

// module.exports = getFingerPrintData;

// const { SerialPort } = require("serialport");
// const FingerCounter = require("../models/fingerCounterModel");

// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // Safe send command
// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);

//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);
//       if (response.length >= 12) {
//         port.off("data", handleData);
//         resolve(response);
//       }
//     };

//     port.on("data", handleData);

//     port.write(command, (err) => {
//       if (err) {
//         console.log(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📝 ${description} Command Sent!`);
//       }
//     });
//   });
// }

// // Create correct checksum
// function addChecksum(buffer) {
//   let sum = 0;
//   for (let i = 6; i < buffer.length - 2; i++) sum += buffer[i];
//   buffer.writeUInt16BE(sum, buffer.length - 2);
//   return buffer;
// }

// // Build Store Template command (important!)
// function buildStoreTemplateCmd(templateId) {
//   const packet = Buffer.from([
//     0xef,
//     0x01, // Header
//     0xff,
//     0xff,
//     0xff,
//     0xff, // Address
//     0x01, // PID
//     0x00,
//     0x06, // Length = 6 bytes (CMD + BUF + ID + CHK)
//     0x06, // Store template command
//     0x01, // Buffer 1
//     templateId, // Slot to save
//     0x00,
//     0x00, // Checksum (will be inserted)
//   ]);

//   return addChecksum(packet);
// }

// async function getNextTemplateId() {
//   let counter = await FingerCounter.findById("fingerCounter");
//   if (!counter)
//     counter = await FingerCounter.create({ _id: "fingerCounter", lastId: 0 });

//   counter.lastId += 1;
//   if (counter.lastId > 127) throw new Error("Sensor memory full");

//   await counter.save();
//   return counter.lastId;
// }

// async function getFingerPrintData(req, res) {
//   try {
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) reject(err);
//         else {
//           console.log("🔌 Serial Port Open");
//           resolve();
//         }
//       });
//     });

//     // Capture image command
//     const captureImageCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);

//     // Convert to buffer 1 (corrected)
//     const imgToBuf1 = addChecksum(
//       Buffer.from([
//         0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//         0x00,
//       ])
//     );

//     // Convert to buffer 2 (corrected)
//     const imgToBuf2 = addChecksum(
//       Buffer.from([
//         0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
//         0x00,
//       ])
//     );

//     // Merge template command (corrected)
//     const mergeCmd = addChecksum(
//       Buffer.from([
//         0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x00,
//       ])
//     );

//     // Upload template (corrected)
//     const uploadTemplateCmd = addChecksum(
//       Buffer.from([
//         0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//         0x00,
//       ])
//     );

//     // ---- STEP 1: FIRST SCAN ----
//     const img1 = await sendCommand(
//       captureImageCmd,
//       "Capture First Fingerprint"
//     );
//     if (img1[9] !== 0x00)
//       return res.status(400).json({ message: "Place finger properly" });

//     await sendCommand(imgToBuf1, "Convert Image to Buffer 1");

//     // ---- STEP 2: SECOND SCAN ----
//     const img2 = await sendCommand(
//       captureImageCmd,
//       "Capture Second Fingerprint"
//     );
//     if (img2[9] !== 0x00)
//       return res.status(400).json({ message: "Second scan failed" });

//     await sendCommand(imgToBuf2, "Convert Image to Buffer 2");

//     // ---- STEP 3: MERGE ----
//     await sendCommand(mergeCmd, "Merge Buffers into Template");

//     console.log("✅ Template generated inside Buffer");

//     // ---- STEP 4: GET TEMPLATE ID ----
//     const templateId = await getNextTemplateId();
//     console.log("🆔 Assigned Template ID:", templateId);

//     // ---- STEP 5: STORE TEMPLATE IN SENSOR ----
//     const storeCmd = buildStoreTemplateCmd(templateId);
//     await sendCommand(storeCmd, `Store Template ${templateId}`);

//     console.log("📥 Template stored inside sensor memory");

//     // ---- STEP 6: UPLOAD TEMPLATE ----
//     const chunks = [];

//     await new Promise((resolve) => {
//       let full = Buffer.alloc(0);

//       const handle = (data) => {
//         full = Buffer.concat([full, data]);

//         while (full.length >= 12) {
//           const len = full.readUInt16BE(7);
//           const total = 9 + len;

//           if (full.length < total) break;

//           const packet = full.slice(0, total);
//           chunks.push(packet.slice(9, total - 2));

//           if (packet[6] === 0x08 || packet[6] === 0x0a) {
//             port.off("data", handle);
//             resolve();
//             break;
//           }

//           full = full.slice(total);
//         }
//       };

//       port.on("data", handle);
//       port.write(uploadTemplateCmd);
//     });

//     const finalTemplate = Buffer.concat(chunks);
//     const fingerprintBase64 = finalTemplate.toString("base64");

//     console.log("📌 Fingerprint Template Extracted");

//     res.status(200).json({
//       message: "Fingerprint captured successfully",
//       fingerprintBase64,
//       templateId,
//     });
//   } catch (err) {
//     console.log("❌ Error:", err);
//     res.status(500).json({ error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Port Closed"));
//   }
// }

// module.exports = getFingerPrintData;

// const { SerialPort } = require("serialport");
// const FingerCounter = require("../models/fingerCounterModel");

// // ----------- SERIAL PORT -----------
// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ----------- CHECKSUM UTILITY -----------
// function calculateChecksum(bytes) {
//   return bytes.reduce((sum, b) => sum + b, 0) & 0xffff;
// }

// // ----------- SAFE SEND COMMAND -----------
// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let response = Buffer.alloc(0);

//     const handleData = (data) => {
//       response = Buffer.concat([response, data]);

//       if (response.length >= 12) {
//         port.off("data", handleData);
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

// // ----------- AUTO TEMPLATE ID -----------
// async function getNextTemplateId() {
//   let counter = await FingerCounter.findById("fingerCounter");

//   if (!counter) {
//     counter = await FingerCounter.create({ _id: "fingerCounter", lastId: 0 });
//   }

//   counter.lastId += 1;

//   if (counter.lastId > 127) {
//     throw new Error("❌ Sensor memory full!");
//   }

//   await counter.save();
//   return counter.lastId;
// }

// // ----------- MAIN FUNCTION -----------
// async function getFingerPrintData(req, res) {
//   try {
//     // Open serial port
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) return reject(err);
//         console.log("🔌 Serial Port Open");
//         resolve();
//       });
//     });

//     // -----------------------
//     // STEP 1: Capture Fingerprint #1
//     // -----------------------
//     const collectImageCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);

//     const img1Resp = await sendCommand(
//       collectImageCmd,
//       "Capture Fingerprint #1"
//     );
//     if (img1Resp[9] !== 0x00) {
//       return res.status(400).json({ message: "Place finger properly" });
//     }

//     // Convert Image → Buffer 1
//     const imgToBuf1 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//       0x08,
//     ]);
//     await sendCommand(imgToBuf1, "Convert Image → Buffer 1");

//     // -----------------------
//     // STEP 2: Capture Fingerprint #2
//     // -----------------------
//     const img2Resp = await sendCommand(
//       collectImageCmd,
//       "Capture Fingerprint #2"
//     );
//     if (img2Resp[9] !== 0x00) {
//       return res.status(400).json({ message: "Second scan failed" });
//     }

//     // Convert Image → Buffer 2
//     const imgToBuf2 = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
//       0x09,
//     ]);
//     await sendCommand(imgToBuf2, "Convert Image → Buffer 2");

//     // -----------------------
//     // STEP 3: Merge buffers → Template
//     // -----------------------
//     const mergeCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     ]);
//     const mergeResp = await sendCommand(mergeCmd, "Generate Template");

//     if (mergeResp[9] !== 0x00) {
//       return res.status(400).json({ message: "Template merge failed" });
//     }

//     console.log("✅ Template generated in buffer");

//     // -----------------------
//     // STEP 4: Get Template ID
//     // -----------------------
//     const templateId = await getNextTemplateId();
//     console.log("🆔 AUTO Template ID:", templateId);

//     // -----------------------
//     // STEP 5: Store template in sensor
//     // -----------------------
//     const storePayload = [0x06, 0x01, templateId];
//     const checksum = calculateChecksum([0x01, 0x00, 0x04, ...storePayload]);

//     const storeCmd = Buffer.from([
//       0xef,
//       0x01,
//       0xff,
//       0xff,
//       0xff,
//       0xff,
//       0x01,
//       0x00,
//       0x04,
//       0x06,
//       0x01,
//       templateId,
//       (checksum >> 8) & 0xff,
//       checksum & 0xff,
//     ]);

//     const storeResp = await sendCommand(storeCmd, "Store Template in Sensor");

//     if (storeResp[9] !== 0x00) {
//       console.log("❌ FAILED storing template:", storeResp);
//       return res.status(400).json({ message: "Sensor store failed" });
//     }

//     console.log("📥 Template stored in sensor ✔️");

//     // -----------------------
//     // STEP 6: Upload template (for MongoDB storage)
//     // -----------------------
//     const uploadCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//       0x0e,
//     ]);

//     const fingerprintChunks = [];

//     await new Promise((resolve) => {
//       let tmp = Buffer.alloc(0);

//       const onData = (data) => {
//         tmp = Buffer.concat([tmp, data]);

//         while (tmp.length >= 12) {
//           const len = tmp.readUInt16BE(7);
//           const packetSize = 9 + len;

//           if (tmp.length < packetSize) break;

//           const packet = tmp.slice(0, packetSize);
//           fingerprintChunks.push(packet.slice(9, packetSize - 2));

//           // End packet (0x08)
//           if (packet[6] === 0x08) {
//             port.off("data", onData);
//             resolve();
//             break;
//           }

//           tmp = tmp.slice(packetSize);
//         }
//       };

//       port.on("data", onData);
//       port.write(uploadCmd);
//     });

//     const finalTemplate = Buffer.concat(fingerprintChunks);
//     const fingerprintBase64 = finalTemplate.toString("base64");

//     console.log("📌 Template uploaded successfully");

//     // -----------------------
//     // RETURN RESPONSE
//     // -----------------------
//     return res.status(200).json({
//       message: "Fingerprint saved successfully",
//       templateId,
//       fingerprintBase64,
//     });
//   } catch (err) {
//     console.log("❌ ERROR:", err);
//     return res.status(500).json({ error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Port Closed"));
//   }
// }

// module.exports = getFingerPrintData;



const { SerialPort } = require("serialport");
const FingerCounter = require("../models/fingerCounterModel");

// ----------- SERIAL PORT -----------
const port = new SerialPort({
  path: "COM9",
  baudRate: 57600,
  autoOpen: false,
});

// ----------- CHECKSUM UTILITY -----------
function calculateChecksum(bytes) {
  return bytes.reduce((sum, b) => sum + b, 0) & 0xFFFF;
}

// ----------- SAFE SEND COMMAND -----------
function sendCommand(command, description) {
  return new Promise((resolve, reject) => {
    let response = Buffer.alloc(0);

    const handleData = (data) => {
      response = Buffer.concat([response, data]);

      if (response.length >= 12) {
        port.off("data", handleData);
        resolve(response);
      }
    };

    port.on("data", handleData);

    port.write(command, (err) => {
      if (err) {
        console.error(`❌ Error sending ${description}:`, err);
        reject(err);
      } else {
        console.log(`📝 ${description} Command Sent!`);
      }
    });
  });
}

// ----------- AUTO TEMPLATE ID -----------
async function getNextTemplateId() {
  let counter = await FingerCounter.findById("fingerCounter");

  if (!counter) {
    counter = await FingerCounter.create({ _id: "fingerCounter", lastId: 0 });
  }

  counter.lastId += 1;

  if (counter.lastId > 127) {
    throw new Error("❌ Sensor memory full!");
  }

  await counter.save();
  return counter.lastId;
}

// ----------- MAIN FUNCTION -----------
async function getFingerPrintData(req, res) {
  try {
    // Open serial port
    await new Promise((resolve, reject) => {
      port.open((err) => {
        if (err) return reject(err);
        console.log("🔌 Serial Port Open");
        resolve();
      });
    });

    // -----------------------
    // STEP 1: Capture Fingerprint #1
    // -----------------------
    const collectImageCmd = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff,
      0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
    ]);

    const img1Resp = await sendCommand(collectImageCmd, "Capture Fingerprint #1");
    if (img1Resp[9] !== 0x00) {
      return res.status(400).json({ message: "Place finger properly" });
    }

    // Convert Image → Buffer 1
    const imgToBuf1 = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff,
      0x01, 0x00, 0x04, 0x02, 0x01, 0x00, 0x08,
    ]);
    await sendCommand(imgToBuf1, "Convert Image → Buffer 1");

    // -----------------------
    // STEP 2: Capture Fingerprint #2
    // -----------------------
    const img2Resp = await sendCommand(collectImageCmd, "Capture Fingerprint #2");
    if (img2Resp[9] !== 0x00) {
      return res.status(400).json({ message: "Second scan failed" });
    }

    // Convert Image → Buffer 2
    const imgToBuf2 = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff,
      0x01, 0x00, 0x04, 0x02, 0x02, 0x00, 0x09,
    ]);
    await sendCommand(imgToBuf2, "Convert Image → Buffer 2");

    // -----------------------
    // STEP 3: Merge buffers → Template
    // -----------------------
    const mergeCmd = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff,
      0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
    ]);
    const mergeResp = await sendCommand(mergeCmd, "Generate Template");

    if (mergeResp[9] !== 0x00) {
      return res.status(400).json({ message: "Template merge failed" });
    }

    console.log("✅ Template generated in buffer");

    // -----------------------
    // STEP 4: Get Template ID
    // -----------------------
    const templateId = await getNextTemplateId();
    console.log("🆔 AUTO Template ID:", templateId);

    // -----------------------
    // STEP 5: Store template in sensor
    // -----------------------
    const templateHigh = (templateId >> 8) & 0xff;
    const templateLow = templateId & 0xff;

    const payload = [0x06, 0x01, templateHigh, templateLow];

    const lengthHigh = 0x00;
    const lengthLow = 0x06; // Correct length

    const checksum = calculateChecksum([0x01, lengthHigh, lengthLow, ...payload]);
    const chHigh = (checksum >> 8) & 0xff;
    const chLow = checksum & 0xff;

    const storeCmd = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff,
      0x01,
      lengthHigh, lengthLow,
      ...payload,
      chHigh, chLow
    ]);

    const storeResp = await sendCommand(storeCmd, "Store Template in Sensor");

    if (storeResp[9] !== 0x00) {
      console.log("❌ FAILED storing template:", storeResp);
      return res.status(400).json({ message: "Sensor store failed" });
    }

    console.log("📥 Template stored in sensor ✔️");

    // -----------------------
    // STEP 6: Upload template (for MongoDB storage)
    // -----------------------
    const uploadCmd = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff,
      0x01, 0x00, 0x04, 0x08, 0x01, 0x00, 0x0e,
    ]);

    const fingerprintChunks = [];

    await new Promise((resolve) => {
      let tmp = Buffer.alloc(0);

      const onData = (data) => {
        tmp = Buffer.concat([tmp, data]);

        while (tmp.length >= 12) {
          const len = tmp.readUInt16BE(7);
          const packetSize = 9 + len;

          if (tmp.length < packetSize) break;

          const packet = tmp.slice(0, packetSize);
          fingerprintChunks.push(packet.slice(9, packetSize - 2));

          // End packet (0x08)
          if (packet[6] === 0x08) {
            port.off("data", onData);
            resolve();
            break;
          }

          tmp = tmp.slice(packetSize);
        }
      };

      port.on("data", onData);
      port.write(uploadCmd);
    });

    const finalTemplate = Buffer.concat(fingerprintChunks);
    const fingerprintBase64 = finalTemplate.toString("base64");

    console.log("📌 Template uploaded successfully");

    // -----------------------
    // RETURN RESPONSE
    // -----------------------
    return res.status(200).json({
      message: "Fingerprint saved successfully",
      templateId,
      fingerprintBase64,
    });
  } catch (err) {
    console.log("❌ ERROR:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (port.isOpen) port.close(() => console.log("🔌 Port Closed"));
  }
}

module.exports = getFingerPrintData;
