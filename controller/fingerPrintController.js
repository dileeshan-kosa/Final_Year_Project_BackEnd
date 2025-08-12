// Me Code eka hari.......................................
const { SerialPort } = require("serialport");

const port = new SerialPort({
  path: "COM9", // Change to your device port
  baudRate: 57600,
  autoOpen: false,
});

// Helper function to calculate checksum
function calculateChecksum(buffer) {
  let checksum = 0;
  for (let i = 0; i < buffer.length; i++) {
    checksum ^= buffer[i];
  }
  return checksum;
}

function sendCommand(command, description) {
  return new Promise((resolve, reject) => {
    let responseData = Buffer.alloc(0);

    const handleData = (data) => {
      responseData = Buffer.concat([responseData, data]);

      if (responseData.length >= 12) {
        port.off("data", handleData);
        resolve(responseData);
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

async function getFingerPrintData(req, res) {
  try {
    await new Promise((resolve, reject) => {
      port.open((err) => {
        if (err) {
          console.error("❌ Error opening port:", err.message);
          reject(err);
        } else {
          console.log(`✅ Serial port COM9 open.`);
          resolve();
        }
      });
    });

    // step 1:
    const collectImageCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
    ]);
    const collectImageResponse = await sendCommand(
      collectImageCommand,
      `Capture first fingerprint`
    );
    console.log("📦 Full response buffer:", collectImageResponse);

    if (collectImageResponse[9] !== 0x00) {
      console.log("❌ Fingerprint capture failed. Try again.");
      return;
    }
    if (collectImageResponse[9] === 0x02) {
      console.log("❌ No finger detected in first attempt.");
      return;
    }
    // console.log("Hiii methent weda")
    // console.log("Hiii methent weda")

    const storeImageInBufferOneCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
      0x08,
    ]);
    const saveImageResponse = await sendCommand(
      storeImageInBufferOneCommand,
      `Convert to Buffer 1`
    );
    if (saveImageResponse[9] === 0x01) {
      console.log("❌ Conversion failed (bad fingerprint image)");
      return;
    }
    if (saveImageResponse[9] === 0x06) {
      console.log("❌ Fingerprint too messy (retry)");
      return;
    }

    // step 2:
    const collectNewImageCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
    ]);
    const collectNewImageResponse = await sendCommand(
      collectNewImageCommand,
      `Capture second fingerprint`
    );

    if (collectNewImageResponse[9] !== 0x00) {
      console.log("❌ Fingerprint capture failed. Try again.");
      return;
    }
    if (collectNewImageResponse[9] === 0x02) {
      console.log("❌ No finger detected in second attempt.");
      return;
    }

    const storeNewImageInBufferTwoCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
      0x09,
    ]);
    const saveSecondImageResponse = await sendCommand(
      storeNewImageInBufferTwoCommand,
      `Convert to Buffer 2`
    );
    if (saveSecondImageResponse[9] === 0x01) {
      console.log("❌ Conversion failed (bad fingerprint image)");
      return;
    }
    if (saveSecondImageResponse[9] === 0x06) {
      console.log("❌ Fingerprint too messy (retry)");
      return;
    }

    await new Promise((r) => setTimeout(r, 2000));

    const generateTemplatedCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
    ]);
    const saveImageBuffersResponse = await sendCommand(
      generateTemplatedCommand,
      `Merge together in Buffer 1`
    );

    console.log("✅ Fingerprint merged into template.");

    // Upload the template from Buffer 1 using UpChar
    const extractTemplateCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
      0x0e,
    ]);

    const fingerprintChunks = [];

    await new Promise((resolve, reject) => {
      let fullData = Buffer.alloc(0);
      let packetCount = 0;

      const handleData = (data) => {
        fullData = Buffer.concat([fullData, data]);

        while (fullData.length >= 12) {
          const dataLength = fullData.readUInt16BE(7);
          const totalPacketLength = 9 + dataLength;

          if (fullData.length < totalPacketLength) break;

          const packet = fullData.slice(0, totalPacketLength);
          const packetId = packet[6];
          const fingerprintChunk = packet.slice(9, totalPacketLength - 2);

          console.log(
            `📦 Packet ${packetCount + 1} [${
              packetId === 0x08 ? "End" : "Data"
            } Packet]:`
          );
          console.log(fingerprintChunk);

          fingerprintChunks.push(fingerprintChunk);
          packetCount++;

          if (packetId === 0x08) {
            port.off("data", handleData);
            resolve();
            break;
          }

          fullData = fullData.slice(totalPacketLength);
        }
      };

      port.on("data", handleData);

      port.write(extractTemplateCommand, (err) => {
        if (err) {
          console.error("❌ Error sending extract template command:", err);
          reject(err);
        } else {
          console.log("📤 Template Upload Command Sent");
        }
      });
    });

    const fullFingerprintTemplate = Buffer.concat(fingerprintChunks);
    const fingerprintBase64 = fullFingerprintTemplate.toString("base64");
    console.log("✅ Final Fingerprint Template (Base64):", fingerprintBase64);
    res.status(200).json({
      message: "FingerPrint caputered.",
      fingerprintBase64,
      data: fullFingerprintTemplate,
    });
  } catch (err) {
    console.log("Error in getFingerPrintData", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: err.message });
  } finally {
    if (port.isOpen) {
      port.close(() => console.log("🔌 Serial port closed."));
    }
  }
}

module.exports = getFingerPrintData;

// Methanin uda Code eka hari.......................................

// meka thm tikk hari code eka

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

// function sendCommandForTemplateExtraction(command, description) {
//   return new Promise((resolve, reject) => {
//     let fullData = Buffer.alloc(0); // To store all received data
//     let templateChunks = []; // To store the chunks of the template

//     const handleData = (data) => {
//       fullData = Buffer.concat([fullData, data]);
//       console.log("📦 Received chunk. Full buffer length:", fullData.length);

//       let offset = 0;

//       // Process incoming data
//       while (offset + 9 <= fullData.length) {
//         // Header check (starting with 0xEF 0x01)
//         if (fullData[offset] === 0xef && fullData[offset + 1] === 0x01) {
//           const dataLen = fullData.readUInt16BE(offset + 7); // Data length
//           const packetLen = 9 + dataLen; // Total packet length

//           if (offset + packetLen > fullData.length) break; // Incomplete packet, wait for more data

//           const packetType = fullData[offset + 6]; // Packet type
//           const payload = fullData.slice(offset + 9, offset + 9 + dataLen - 2); // Extract payload

//           // If this is a data packet (type 0x08), add to template chunks
//           if (packetType === 0x08) {
//             templateChunks.push(payload);
//             console.log(`🧩 Got DATA packet (${templateChunks.length})`);
//           }

//           offset += packetLen; // Move to the next packet
//         } else {
//           offset += 1; // Move to next byte if header doesn't match
//         }
//       }

//       // Check if we have enough data (4 or more packets, 512 bytes)
//       const totalBytes = Buffer.concat(templateChunks).length;
//       if (templateChunks.length >= 4 && totalBytes >= 512) {
//         port.off("data", handleData); // Stop listening for data
//         console.log("✅ Complete fingerprint data received!");
//         console.log(`📊 Final fingerprint buffer size: ${totalBytes}`);

//         // Resolve the promise with the final fingerprint data
//         resolve(Buffer.concat(templateChunks));
//       } else {
//         // If we don't have enough data, continue listening for more chunks
//         console.log("⏳ Waiting for more chunks...");
//       }
//     };

//     // Attach data listener to the port
//     port.on("data", handleData);

//     // Send the command to initiate template extraction
//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         reject(err);
//       } else {
//         console.log(`📤 ${description} command sent.`);
//       }
//     });
//   });
// }

// // Helper to strip headers and extract raw template
// function extractTemplateData(buffer) {
//   const chunks = [];
//   let offset = 0;

//   while (offset < buffer.length - 9) {
//     // Confirm packet header structure: 0xEF 0x01 [Device ID x4] packetType dataLen
//     if (
//       buffer[offset] === 0xef &&
//       buffer[offset + 1] === 0x01 &&
//       buffer[offset + 6] !== undefined
//     ) {
//       const packetType = buffer[offset + 6];
//       const dataLen = buffer.readUInt16BE(offset + 7);
//       const expectedPacketSize = 9 + dataLen;

//       if (offset + expectedPacketSize > buffer.length) {
//         console.log("🛑 Incomplete packet found, waiting for more data...");
//         break; // Don't process incomplete packet
//       }

//       // Only extract DATA packets (0x08) and ACK packets (0x07 if needed)
//       if (packetType === 0x08) {
//         const payload = buffer.slice(offset + 9, offset + 9 + dataLen - 2); // exclude checksum
//         chunks.push(payload);
//       }

//       offset += expectedPacketSize;
//     } else {
//       offset += 1; // Shift until we find a valid packet start
//     }
//   }

//   const result = Buffer.concat(chunks);

//   console.log("📦 Total extracted fingerprint data length:", result.length);
//   return result;
// }

// async function getFingerPrintData(req, res) {
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

//     // step 1: Capture first fingerprint
//     const collectImageCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     ]);
//     const collectImageResponse = await sendCommand(
//       collectImageCommand,
//       `Capture first fingerprint`
//     );

//     if (collectImageResponse[9] !== 0x00) {
//       console.log("❌ Fingerprint capture failed. Try again.");
//       return;
//     }
//     if (collectImageResponse[9] === 0x02) {
//       console.log(
//         "❌ No finger detected in first attempt. Please place your finger on the scanner."
//       );
//       return;
//     }

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

//     // await new Promise((r) => setTimeout(r, 2000));

//     // step 2: Capture second fingerprint
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
//       console.log(
//         "❌ No finger detected in second attempt. Please place your finger on the scanner."
//       );
//       return;
//     }

//     const storeNewImageInBufferOneCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
//       0x09,
//     ]);
//     const saveSecondImageResponse = await sendCommand(
//       storeNewImageInBufferOneCommand,
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

//     // Merge Buffer 1 and 2 to generate template
//     const generatefirstTemplateCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     ]);
//     const saveImageBuffersResponse1 = await sendCommand(
//       generatefirstTemplateCommand,
//       `Marge Buffer 1 and Buffer 2`
//     );
//     console.log(
//       "saveImageBuffer1_and_2 Response : ",
//       saveImageBuffersResponse1
//     );

//     // extract saved fingerprint template
//     const extractTemplateCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//       0x0e,
//     ]);
//     await new Promise((r) => setTimeout(r, 300)); // small delay before extract
//     const extractBufferedImage = await sendCommandForTemplateExtraction(
//       extractTemplateCommand,
//       `Extract saved template`
//     );

//     if (extractBufferedImage[9] !== 0x00) {
//       console.log("❌ Failed to extract fingerprint template.");
//       return;
//     }
//     // The actual fingerprint template data starts after 9 bytes (header)
//     const fingerprintData = extractBufferedImage;
//     console.log("📊 Final fingerprint buffer size:", fingerprintData.length);

//     // Convert to Base64 for easy storage
//     const fingerprintBase64 = fingerprintData.toString("base64");
//     res.status(200).json({ fingerprintBase64: fingerprintBase64 });
//     console.log("✅ Fingerprint Template Extracted!", fingerprintBase64);
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

// async function getFingerPrintData(req, res) {
//   try {
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) {
//           console.error("❌ Error opening port:", err.message);
//           reject(err);
//         } else {
//           console.log("✅ Serial port opened.");
//           resolve();
//         }
//       });
//     });

//     // Helper function to scan & convert a fingerprint
//     async function scanAndConvert(bufferId) {
//       const collectCmd = Buffer.from([
//         0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//       ]);
//       const collectRes = await sendCommand(
//         collectCmd,
//         `Capture fingerprint for buffer ${bufferId}`
//       );
//       if (collectRes[9] !== 0x00)
//         throw new Error("❌ Failed to capture fingerprint.");

//       const convertCmd = Buffer.from([
//         0xef,
//         0x01,
//         0xff,
//         0xff,
//         0xff,
//         0xff,
//         0x01,
//         0x00,
//         0x04,
//         0x02,
//         bufferId,
//         0x00,
//         0x07 + bufferId,
//       ]);
//       const convertRes = await sendCommand(
//         convertCmd,
//         `Convert to buffer ${bufferId}`
//       );
//       if (convertRes[9] !== 0x00)
//         throw new Error(`❌ Conversion failed for buffer ${bufferId}`);
//     }

//     // Helper: create template from Buffer1 & Buffer2, store to flash at given ID
//     async function createAndStoreTemplate(id) {
//       const createCmd = Buffer.from([
//         0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//       ]);
//       const createRes = await sendCommand(createCmd, `Create template`);
//       if (createRes[9] !== 0x00)
//         throw new Error("❌ Failed to create template.");

//       const storeCmd = Buffer.from([
//         0xef,
//         0x01,
//         0xff,
//         0xff,
//         0xff,
//         0xff,
//         0x01,
//         0x00,
//         0x06,
//         0x06,
//         0x01,
//         id,
//         0x00,
//         0x0e + id, // checksum auto for 0x06 + 0x01 + id
//       ]);
//       const storeRes = await sendCommand(storeCmd, `Store to flash ID ${id}`);
//       if (storeRes[9] !== 0x00)
//         throw new Error(`❌ Failed to store template ID ${id}`);
//     }

//     // Step 1: Scan Finger 1 → Buffers 1 & 2 → Save as Template ID 1
//     await scanAndConvert(1);
//     await scanAndConvert(2);
//     await createAndStoreTemplate(1);

//     // Step 2: Scan Finger 2 → Buffers 1 & 2 → Save as Template ID 2
//     await scanAndConvert(1);
//     await scanAndConvert(2);
//     await createAndStoreTemplate(2);

//     // Step 3: Scan Finger 3 → Buffers 1 & 2 → Save as Template ID 3
//     await scanAndConvert(1);
//     await scanAndConvert(2);
//     await createAndStoreTemplate(3);

//     // Step 4: Scan Finger 4 → Buffers 1 & 2 → Save as Template ID 4
//     await scanAndConvert(1);
//     await scanAndConvert(2);
//     await createAndStoreTemplate(4);

//     // Step 5: Merge Template 1 & 2 → Buffers 1 & 2 → Save as ID 5
//     await loadTemplateToBuffer(1, 1); // ID 1 → Buffer 1
//     await loadTemplateToBuffer(2, 2); // ID 2 → Buffer 2
//     await createAndStoreTemplate(5);

//     // Step 6: Merge Template 3 & 4 → Save as ID 6
//     await loadTemplateToBuffer(3, 1);
//     await loadTemplateToBuffer(4, 2);
//     await createAndStoreTemplate(6);

//     // Step 7: Merge Template 5 & 6 → final in Buffer 1
//     await loadTemplateToBuffer(5, 1);
//     await loadTemplateToBuffer(6, 2);
//     const finalMergeCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     ]);
//     const finalMergeRes = await sendCommand(
//       finalMergeCmd,
//       `Final merge to Buffer 1`
//     );
//     if (finalMergeRes[9] !== 0x00) throw new Error("❌ Final merge failed.");

//     // Step 8: Upload final buffer and convert to Base64
//     const uploadCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//       0x0e,
//     ]);
//     const uploadRes = await sendCommand(
//       uploadCmd,
//       "Upload final merged template"
//     );
//     if (uploadRes[9] !== 0x00)
//       throw new Error("❌ Failed to extract final template.");

//     const fingerprintData = uploadRes.slice(12); // skip header
//     const fingerprintBase64 = fingerprintData.toString("base64");
//     console.log("✅ Final Fingerprint Base64:", fingerprintBase64);

//     res.status(200).json({ success: true, fingerprint: fingerprintBase64 });
//   } catch (err) {
//     console.log("Error in getFingerPrintData", err);
//     res.status(500).json({
//       error: "Internal Server Error",
//       details: err.message,
//     });
//   } finally {
//     if (port.isOpen) {
//       port.close(() => console.log("🔌 Serial port closed."));
//     }
//   }
// }

// // Helper: load template ID to buffer
// async function loadTemplateToBuffer(templateId, bufferId) {
//   const checksum = 0x07 + bufferId + templateId;
//   const loadCmd = Buffer.from([
//     0xef,
//     0x01,
//     0xff,
//     0xff,
//     0xff,
//     0xff,
//     0x01,
//     0x00,
//     0x06,
//     0x07,
//     bufferId,
//     templateId,
//     0x00,
//     checksum,
//   ]);
//   const res = await sendCommand(
//     loadCmd,
//     `Load template ${templateId} into buffer ${bufferId}`
//   );
//   if (res[9] !== 0x00)
//     throw new Error(`❌ Failed to load template ${templateId}`);
// }

// module.exports = getFingerPrintData;

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

// async function getFingerPrintData(req, res) {
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

//     const imageBuffers = []; // To store 10 image buffers

//     //capture 10 fingerprint and store in buffer
//     for (let i = 0; i < 10; i++) {
//       const collectImageCommand = Buffer.from([
//         0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//       ]);
//       const collectImageResponse = await sendCommand(
//         collectImageCommand,
//         `Capture fingerprint image ${i + 1}`
//       );

//       if (collectImageResponse[9] !== 0x00) {
//         console.log(
//           `❌ Fingerprint capture failed on image ${i + 1}. Try again.`
//         );
//         return;
//       }

//       if (collectImageResponse[9] === 0x02) {
//         console.log(
//           `❌ No finger detected in image ${
//             i + 1
//           }. Please place your finger on the scanner.`
//         );
//         return;
//       }

//       const storeImageInBufferCommand = Buffer.from([
//         0xef,
//         0x01,
//         0xff,
//         0xff,
//         0xff,
//         0xff,
//         0x01,
//         0x00,
//         0x04,
//         0x02,
//         i + 1,
//         0x00,
//         0x08,
//       ]);

//       const storeImageResponse = await sendCommand(
//         storeImageInBufferCommand,
//         `Store fingerprint image ${i + 1} in buffer`
//       );

//       if (storeImageResponse[9] === 0x01) {
//         console.log(
//           `❌ Conversion failed on image ${i + 1} (bad fingerprint image)`
//         );
//         return;
//       }
//       if (storeImageResponse[9] === 0x06) {
//         console.log(`❌ Fingerprint too messy on image ${i + 1} (retry)`);
//         return;
//       }
//       // Store the image buffer
//       imageBuffers.push(storeImageResponse);
//     }

//     // Merge all the 10 buffers into a fingerprint template
//     const generateTemplatedCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     ]);
//     const saveImageBuffersResponse = await sendCommand(
//       generateTemplatedCommand,
//       `Merge 10 fingerprint buffers into template`
//     );
//     console.log("saveImageBuffersResponse : ", saveImageBuffersResponse);

//     // // step 1:
//     // const collectImageCommand = Buffer.from([
//     //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     // ]);
//     // const collectImageResponse = await sendCommand(
//     //   collectImageCommand,
//     //   `Capture first fingerprint`
//     // );

//     // if (collectImageResponse[9] !== 0x00) {
//     //   console.log("❌ Fingerprint capture failed. Try again.");
//     //   return;
//     // }
//     // if (collectImageResponse[9] === 0x02) {
//     //   console.log(
//     //     "❌ No finger detected in first attempt. Please place your finger on the scanner."
//     //   );
//     //   return;
//     // }

//     // const storeImageInBufferOneCommand = Buffer.from([
//     //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
//     //   0x08,
//     // ]);
//     // const saveImageResponse = await sendCommand(
//     //   storeImageInBufferOneCommand,
//     //   `Convert to Buffer 1`
//     // );
//     // if (saveImageResponse[9] === 0x01) {
//     //   console.log("❌ Conversion failed (bad fingerprint image)");
//     //   return;
//     // }
//     // if (saveImageResponse[9] === 0x06) {
//     //   console.log("❌ Fingerprint too messy (retry)");
//     //   return;
//     // }

//     // // await new Promise((r) => setTimeout(r, 2000));

//     // // step 2:
//     // const collectNewImageCommand = Buffer.from([
//     //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//     // ]);
//     // const collectNewImageResponse = await sendCommand(
//     //   collectNewImageCommand,
//     //   `Capture first fingerprint`
//     // );

//     // if (collectNewImageResponse[9] !== 0x00) {
//     //   console.log("❌ Fingerprint capture failed. Try again.");
//     //   return;
//     // }
//     // if (collectNewImageResponse[9] === 0x02) {
//     //   console.log(
//     //     "❌ No finger detected in second attempt. Please place your finger on the scanner."
//     //   );
//     //   return;
//     // }

//     // const storeNewImageInBufferOneCommand = Buffer.from([
//     //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
//     //   0x09,
//     // ]);
//     // const saveSecondImageResponse = await sendCommand(
//     //   storeNewImageInBufferOneCommand,
//     //   `Convert to Buffer 1`
//     // );
//     // if (saveSecondImageResponse[9] === 0x01) {
//     //   console.log("❌ Conversion failed (bad fingerprint image)");
//     //   return;
//     // }
//     // if (saveSecondImageResponse[9] === 0x06) {
//     //   console.log("❌ Fingerprint too messy (retry)");
//     //   return;
//     // }

//     // await new Promise((r) => setTimeout(r, 2000));

//     // // const generateTemplatedCommand = Buffer.from([
//     // //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x06, 0x06, 0x01, 0x00,
//     // //   0x01, 0x00, 0x0f,
//     // // ]);
//     // const generateTemplatedCommand = Buffer.from([
//     //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     // ]);
//     // const saveImageBuffersResponse = await sendCommand(
//     //   generateTemplatedCommand,
//     //   `Merge together in Buffer 1`
//     // );

//     // console.log("saveImageBuffersResponse : ", saveImageBuffersResponse);

//     // extract saved fingerprint template
//     const extractTemplateCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//       0x0e,
//     ]);
//     const extractBufferedImage = await sendCommand(
//       extractTemplateCommand,
//       `Extract fingerprint template`
//     );
//     // const extractBufferedImage = await sendCommand(
//     //   extractTemplateCommand,
//     //   `Extract saved iamge`
//     // );
//     if (extractBufferedImage[9] !== 0x00) {
//       console.log("❌ Failed to extract fingerprint template.");
//       return;
//     }
//     // The actual fingerprint template data starts after 9 bytes (header)
//     const fingerprintData = extractBufferedImage.slice(9);

//     // Convert to Base64 for easy storage
//     const fingerprintBase64 = fingerprintData.toString("base64");
//     console.log("✅ Fingerprint Template Extracted!", fingerprintBase64);
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

// async function captureFingerprintImage(imageIndex) {
//   const collectImageCommand = Buffer.from([
//     0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//   ]);
//   const collectImageResponse = await sendCommand(
//     collectImageCommand,
//     `Capture fingerprint image ${imageIndex + 1}`
//   );

//   if (collectImageResponse[9] !== 0x00) {
//     console.log(
//       `❌ Fingerprint capture failed on image ${imageIndex + 1}. Try again.`
//     );
//     return null;
//   }

//   if (collectImageResponse[9] === 0x02) {
//     console.log(
//       `❌ No finger detected in image ${
//         imageIndex + 1
//       }. Please place your finger on the scanner.`
//     );
//     return null;
//   }

//   const storeImageInBufferCommand = Buffer.from([
//     0xef,
//     0x01,
//     0xff,
//     0xff,
//     0xff,
//     0xff,
//     0x01,
//     0x00,
//     0x04,
//     0x02,
//     imageIndex + 1,
//     0x00,
//     0x08,
//   ]);

//   const storeImageResponse = await sendCommand(
//     storeImageInBufferCommand,
//     `Store fingerprint image ${imageIndex + 1} in buffer`
//   );

//   if (storeImageResponse[9] === 0x01) {
//     console.log(
//       `❌ Conversion failed on image ${imageIndex + 1} (bad fingerprint image)`
//     );
//     return null;
//   }
//   if (storeImageResponse[9] === 0x06) {
//     console.log(`❌ Fingerprint too messy on image ${imageIndex + 1} (retry)`);
//     return null;
//   }

//   return storeImageResponse;
// }

// async function getFingerPrintData(req, res) {
//   try {
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) {
//           console.error("❌ Error opening port:", err.message);
//           reject(err);
//         } else {
//           resolve();
//         }
//       });
//     });

//     const imageBuffers = []; // To store 10 image buffers

//     // Capture and store 10 fingerprint images with retry logic
//     for (let i = 0; i < 10; i++) {
//       let captureAttempt = 0;
//       let imageBuffer = null;

//       // Retry up to 3 times if the image conversion fails
//       while (captureAttempt < 3 && !imageBuffer) {
//         imageBuffer = await captureFingerprintImage(i);

//         if (!imageBuffer) {
//           captureAttempt++;
//           console.log(`🔄 Retrying image ${i + 1}, attempt ${captureAttempt}`);
//           await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
//         }
//       }

//       if (!imageBuffer) {
//         console.log(
//           `❌ Failed to capture image ${i + 1} after 3 attempts. Exiting...`
//         );
//         return;
//       }

//       // Store the image buffer
//       imageBuffers.push(imageBuffer);
//     }

//     // Merge all the 10 buffers into a fingerprint template
//     const generateTemplatedCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     ]);
//     const saveImageBuffersResponse = await sendCommand(
//       generateTemplatedCommand,
//       `Merge 10 fingerprint buffers into template`
//     );

//     console.log("saveImageBuffersResponse : ", saveImageBuffersResponse);

//     // Extract the fingerprint template
//     const extractTemplateCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//       0x0e,
//     ]);
//     const extractBufferedImage = await sendCommand(
//       extractTemplateCommand,
//       `Extract fingerprint template`
//     );

//     if (extractBufferedImage[9] !== 0x00) {
//       console.log("❌ Failed to extract fingerprint template.");
//       return;
//     }

//     // The actual fingerprint template data starts after 9 bytes (header)
//     const fingerprintData = extractBufferedImage.slice(9);

//     // Convert to Base64 for easy storage
//     const fingerprintBase64 = fingerprintData.toString("base64");
//     console.log("✅ Fingerprint Template Extracted!", fingerprintBase64);
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

// async function captureMultipleFingerprints(numFingerprints = 5) {
//   try {
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) {
//           console.error("❌ Error opening port:", err.message);
//           reject(err);
//         } else {
//           resolve();
//         }
//       });
//     });

//     let fingerprintBuffers = [];

//     for (let i = 1; i <= numFingerprints; i++) {
//       console.log(`📝 Capture fingerprint image ${i} Command Sent!`);
//       const captureCommand = Buffer.from([
//         0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
//       ]);
//       const captureResponse = await sendCommand(
//         captureCommand,
//         `Capture fingerprint image ${i}`
//       );

//       if (captureResponse[9] !== 0x00) {
//         console.log(`❌ Fingerprint capture ${i} failed. Try again.`);
//         continue; // Skip to next fingerprint if capture fails
//       }
//       if (captureResponse[9] === 0x02) {
//         console.log(
//           `❌ No finger detected in fingerprint ${i}. Please place your finger on the scanner.`
//         );
//         continue; // Skip to next fingerprint if no finger detected
//       }

//       console.log(`📝 Store fingerprint image ${i} in buffer Command Sent!`);
//       const storeCommand = Buffer.from([
//         0xef,
//         0x01,
//         0xff,
//         0xff,
//         0xff,
//         0xff,
//         0x01,
//         0x00,
//         0x04,
//         0x02,
//         i,
//         0x00,
//         0x08,
//       ]);
//       const storeResponse = await sendCommand(
//         storeCommand,
//         `Store fingerprint image ${i} in buffer`
//       );

//       if (storeResponse[9] === 0x01) {
//         console.log(
//           `❌ Conversion failed on image ${i} (bad fingerprint image)`
//         );
//         continue; // Skip to next image if conversion fails
//       }
//       if (storeResponse[9] === 0x06) {
//         console.log(`❌ Fingerprint too messy on image ${i} (retry)`);
//         continue; // Retry if image is too messy
//       }

//       fingerprintBuffers.push(storeResponse); // Store the successful image buffer
//     }

//     // After capturing all fingerprints, proceed to merge them into a template
//     if (fingerprintBuffers.length < numFingerprints) {
//       console.log(
//         `❌ Not all images captured successfully. Captured: ${fingerprintBuffers.length}`
//       );
//       return;
//     }

//     // Merge the captured buffers into a template
//     const mergeCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x05, 0x00, 0x09,
//     ]);
//     const mergeResponse = await sendCommand(
//       mergeCommand,
//       `Merge captured images`
//     );

//     console.log("📝 Fingerprints merged into template:", mergeResponse);

//     // Extract and save the fingerprint template
//     const extractTemplateCommand = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
//       0x0e,
//     ]);
//     const extractResponse = await sendCommand(
//       extractTemplateCommand,
//       `Extract fingerprint template`
//     );

//     if (extractResponse[9] !== 0x00) {
//       console.log("❌ Failed to extract fingerprint template.");
//       return;
//     }

//     // Extract template data (skipping the header)
//     const fingerprintTemplate = extractResponse.slice(9);
//     const fingerprintBase64 = fingerprintTemplate.toString("base64");

//     console.log("✅ Fingerprint Template Extracted!", fingerprintBase64);
//   } catch (err) {
//     console.log("Error in captureMultipleFingerprints:", err);
//   } finally {
//     if (port.isOpen) {
//       port.close(() => console.log("🔌 Serial port closed."));
//     }
//   }
// }

// module.exports = captureMultipleFingerprints;
