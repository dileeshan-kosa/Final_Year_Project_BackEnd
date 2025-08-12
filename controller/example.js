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