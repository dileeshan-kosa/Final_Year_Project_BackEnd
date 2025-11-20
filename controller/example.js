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
      // console.log(`📥 Response:`, responseData);

      if (responseData.length >= 12) {
        // You may need to adjust the length depending on your expected response size
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
          //   console.log(`✅ Serial port COM9 open.`);
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

    if (collectImageResponse[9] !== 0x00) {
      console.log("❌ Fingerprint capture failed. Try again.");
      return;
    }
    if (collectImageResponse[9] === 0x02) {
      console.log(
        "❌ No finger detected in first attempt. Please place your finger on the scanner."
      );
      return;
    }

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

    // await new Promise((r) => setTimeout(r, 2000));

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
      console.log(
        "❌ No finger detected in second attempt. Please place your finger on the scanner."
      );
      return;
    }

    const storeNewImageInBufferOneCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
      0x09,
    ]);
    const saveSecondImageResponse = await sendCommand(
      storeNewImageInBufferOneCommand,
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

    console.log("saveImageBuffersResponse : ", saveImageBuffersResponse);

    // extract saved fingerprint template
    const extractTemplateCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x08, 0x01, 0x00,
      0x0e,
    ]);
    const extractBufferedImage = await sendCommand(
      extractTemplateCommand,
      `Extract saved iamge`
    );
    if (extractBufferedImage[9] !== 0x00) {
      console.log("❌ Failed to extract fingerprint template.");
      return;
    }
    // The actual fingerprint template data starts after 9 bytes (header)
    const fingerprintData = extractBufferedImage.slice(9);

    // Convert to Base64 for easy storage
    const fingerprintBase64 = fingerprintData.toString("base64");
    console.log("✅ Fingerprint Template Extracted!", fingerprintBase64);
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


    // 3rd fingerprint step 3
    // const collectthirdImageCommand = Buffer.from([
    //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
    // ]);
    // const collectthirdImageResponse = await sendCommand(
    //   collectthirdImageCommand,
    //   `Capture third fingerprint`
    // );
    // if (collectthirdImageResponse[9] !== 0x00) {
    //   console.log("❌ Fingerprint capture failed. Try again.");
    //   return;
    // }
    // if (collectthirdImageResponse[9] === 0x02) {
    //   console.log(
    //     "❌ No finger detected in second attempt. Please place your finger on the scanner."
    //   );
    //   return;
    // }

    // const storeThirdImageInBufferOneCommand = Buffer.from([
    //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
    //   0x09,
    // ]);
    // const saveThirdImageResponse = await sendCommand(
    //   storeThirdImageInBufferOneCommand,
    //   `Convert to Buffer 3`
    // );
    // if (saveThirdImageResponse[9] === 0x01) {
    //   console.log("❌ Conversion failed (bad fingerprint image)");
    //   return;
    // }
    // if (saveThirdImageResponse[9] === 0x06) {
    //   console.log("❌ Fingerprint too messy (retry)");
    //   return;
    // }

    // // 4th fingerprint step 4
    // const collectforthImageCommand = Buffer.from([
    //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
    // ]);
    // const collectforthImageResponse = await sendCommand(
    //   collectforthImageCommand,
    //   `Capture forth fingerprint`
    // );
    // if (collectforthImageResponse[9] !== 0x00) {
    //   console.log("❌ Fingerprint capture failed. Try again.");
    //   return;
    // }
    // if (collectforthImageResponse[9] === 0x02) {
    //   console.log(
    //     "❌ No finger detected in second attempt. Please place your finger on the scanner."
    //   );
    //   return;
    // }

    // const storeFourImageInBufferOneCommand = Buffer.from([
    //   0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x02, 0x00,
    //   0x09,
    // ]);
    // const saveFourthImageResponse = await sendCommand(
    //   storeFourImageInBufferOneCommand,
    //   `Convert to Buffer 4`
    // );
    // if (saveFourthImageResponse[9] === 0x01) {
    //   console.log("❌ Conversion failed (bad fingerprint image)");
    //   return;
    // }
    // if (saveFourthImageResponse[9] === 0x06) {
    //   console.log("❌ Fingerprint too messy (retry)");
    //   return;
    // }





















    

// const { SerialPort } = require("serialport");

// const port = new SerialPort({
//   path: "COM9", // Change to your sensor port
//   baudRate: 57600,
//   autoOpen: false,
// });

// // Helper to send command
// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let responseData = Buffer.alloc(0);

//     const handleData = (data) => {
//       responseData = Buffer.concat([responseData, data]);
//       // The R307 response is usually 12 bytes
//       if (responseData.length >= 12) {
//         port.off("data", handleData);
//         resolve(responseData);
//       }
//     };

//     port.on("data", handleData);

//     port.write(command, (err) => {
//       if (err) reject(`Error sending ${description}: ${err}`);
//       else console.log(`📝 ${description} command sent`);
//     });
//   });
// }

// // Open port helper
// async function openPort() {
//   return new Promise((resolve, reject) => {
//     if (port.isOpen) return resolve();
//     port.open((err) => {
//       if (err) return reject(err);
//       console.log("✅ Serial port open");
//       resolve();
//     });
//   });
// }

// // 1️⃣ Check template count
// async function checkTemplateCount() {
//   try {
//     await openPort();

//     // Command to get template count
//     const command = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x1d, 0x00, 0x21
//     ]);

//     const response = await sendCommand(command, "Get template count");
//     // Template count is usually in bytes 9 & 10
//     const templateCount = response[9];
//     console.log(`📊 Templates stored: ${templateCount} / 127`);
//     return templateCount;
//   } catch (err) {
//     console.error("Error checking template count:", err);
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial port closed"));
//   }
// }

// // 2️⃣ Clear all templates
// async function clearAllTemplates() {
//   try {
//     await openPort();

//     const command = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x0d, 0x00, 0x11
//     ]);

//     const response = await sendCommand(command, "Clear all templates");
//     if (response[9] === 0x00) {
//       console.log("✅ All templates cleared successfully");
//       return true;
//     } else {
//       console.log("❌ Failed to clear templates. Sensor response:", response[9]);
//       return false;
//     }
//   } catch (err) {
//     console.error("Error clearing templates:", err);
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Serial port closed"));
//   }
// }

// // Example usage
// (async () => {
//   await checkTemplateCount();
//   // await clearAllTemplates(); // Uncomment to clear all templates
// })();







// sensor template delete command 


// const { SerialPort } = require("serialport");

// // ------------------------------
// // SERIAL PORT CONFIG
// // ------------------------------
// const port = new SerialPort({
//   path: "COM9",
//   baudRate: 57600,
//   autoOpen: false,
// });

// // ------------------------------
// // GENERIC SEND COMMAND
// // ------------------------------
// function sendCommand(command, description) {
//   return new Promise((resolve, reject) => {
//     let responseData = Buffer.alloc(0);

//     const handleData = (data) => {
//       responseData = Buffer.concat([responseData, data]);

//       // Full packet length = 9 + payload length (bytes [7] & [8])
//       if (
//         responseData.length >= 9 &&
//         responseData.length >= 9 + ((responseData[7] << 8) | responseData[8])
//       ) {
//         port.off("data", handleData);
//         resolve(responseData);
//       }
//     };

//     port.on("data", handleData);

//     port.write(command, (err) => {
//       if (err) {
//         console.error(`❌ Error sending ${description}:`, err);
//         return reject(err);
//       }
//       console.log(`📝 ${description} Command Sent!`);
//     });
//   });
// }

// // ------------------------------
// // REGISTRATION CONTROLLER
// // ------------------------------
// async function getFingerPrintData(req, res) {
//   try {
//     // Open Serial Port
//     await new Promise((resolve, reject) => {
//       port.open((err) => {
//         if (err) return reject(err);
//         console.log("🔌 Serial Port Opened");
//         resolve();
//       });
//     });

//     // Empty library command: 0x0D
//     const emptyLibraryCmd = Buffer.from([
//       0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x0d, 0x00, 0x11,
//     ]);

//     const resp = await sendCommand(emptyLibraryCmd, "Delete All Templates");

//     if (resp[9] === 0x00) {
//       console.log("🗑️ All templates deleted successfully from sensor");
//       return res
//         .status(200)
//         .json({ message: "All templates deleted successfully" });
//     } else {
//       console.log(
//         "❌ Failed to delete all templates. Sensor response:",
//         resp[9]
//       );
//       return res
//         .status(500)
//         .json({ message: "Failed to delete all templates" });
//     }
//   } catch (err) {
//     console.log("❌ Error:", err);
//     res.status(500).json({ error: err.message });
//   } finally {
//     if (port.isOpen) port.close(() => console.log("🔌 Port Closed"));
//   }
// }

// module.exports = getFingerPrintData;
