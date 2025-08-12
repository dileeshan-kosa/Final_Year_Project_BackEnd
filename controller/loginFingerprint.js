const { SerialPort } = require("serialport");
const voterModel = require("../models/voterModel");

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

async function getLoginFingerPrintData(req, res) {
  const { nic } = req.params;
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

    const collectImageCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x01, 0x00, 0x05,
    ]);
    const imageResponse = await sendCommand(
      collectImageCommand,
      `Capture first fingerprint`
    );

    if (imageResponse[9] !== 0x00) {
      console.log("❌ Fingerprint capture failed. Try again.");
      return;
    }
    if (imageResponse[9] === 0x02) {
      console.log(
        "❌ No finger detected in first attempt. Please place your finger on the scanner."
      );
      return;
    }

    const storeBuffer1Command = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x04, 0x02, 0x01, 0x00,
      0x08,
    ]);
    const buffer1Response = await sendCommand(
      storeBuffer1Command,
      `Convert to Buffer 1`
    );
    if (buffer1Response[9] === 0x01) {
      console.log("❌ Conversion failed (bad fingerprint image)");
      return;
    }
    if (buffer1Response[9] === 0x06) {
      console.log("❌ Fingerprint too messy (retry)");
      return;
    }
    if (buffer1Response[9] !== 0x00)
      return res
        .status(400)
        .json({ message: "Conversion to buffer 1 failed." });

    // Step 2: Fetch voters
    const voter = await voterModel.findOne({ nic: nic });

    if (!voter) {
      res.status(404).json({ message: "No user found." });
      return;
    }

    // console.log("first", voter);
    const userFingerPrint = voter.fingerprint;

    const fingerprintBuffer = Buffer.from(userFingerPrint, "base64");
    console.log("hallo2", fingerprintBuffer);

    // Step 4: Send fingerprint to Buffer 2 in chunks (using upload command: 0x09)
    const header = Buffer.from([
      0xef,
      0x01,
      0xff,
      0xff,
      0xff,
      0xff, // Packet header
      0x01,
      0x00,
      0x07,
      0x09,
      0x02, // Load to Buffer 2
      0x00,
      0x00, // Placeholder for checksum
    ]);
    // Add checksum to header
    const checksum = 0x09 + 0x02;
    header.writeUInt16BE(checksum, 10);

    const sendTemplateToBuffer2 = Buffer.concat([header, fingerprintBuffer]);
    await sendCommand(sendTemplateToBuffer2, "Load template into Buffer 2");

    // Step 5: Match Buffers
    const matchCommand = Buffer.from([
      0xef, 0x01, 0xff, 0xff, 0xff, 0xff, 0x01, 0x00, 0x03, 0x03, 0x00, 0x07,
    ]);

    const matchResponse = await sendCommand(
      matchCommand,
      "Match buffers 1 and 2"
    );
    if (matchResponse[9] === 0x00) {
      console.log("✅ Fingerprint matched with:", voter.name);
      return res.status(200).json({
        message: "Fingerprint matched.",
        voter: {
          name: voter.name,
          nic: voter.nic,
          district: voter.district,
          fingerprint: voter.fingerprint,
        },
      });
    }

    // No match
    return res.status(404).json({ message: "No match found." });
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
module.exports = getLoginFingerPrintData;
