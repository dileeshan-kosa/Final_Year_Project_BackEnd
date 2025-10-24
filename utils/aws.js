// // utils/aws.js
// const AWS = require("aws-sdk");
// const dotenv = require("dotenv");

// dotenv.config();

// // AWS configuration
// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// const s3 = new AWS.S3();

// /**
//  * Upload data to AWS S3 under the correct election folder.
//  * @param {Object|string} data - The data to upload.
//  * @param {string} fileName - The name of the file (e.g., "vote123.json").
//  * @param {string} electionName - The election folder name (e.g., "Presidential_2025").
//  */
// const uploadToS3 = async (data, fileName, electionName) => {
//   try {
//     const params = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `${electionName}/${fileName}`,
//       Body: typeof data === "string" ? data : JSON.stringify(data),
//       ContentType: "application/json",
//     };

//     await s3.upload(params).promise();
//     console.log(`✅ Uploaded to S3: ${electionName}/${fileName}`);
//   } catch (error) {
//     console.error("❌ Error uploading to S3:", error);
//   }
// };

// module.exports = { uploadToS3 };

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
dotenv.config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Convert stream to string
const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });

/**
 * Upload backup data to S3
 * @param {Object} data - The backup object to upload
 * @param {String} fileName - The unique file name for this upload
 * @param {String} electionName - The folder name (like "presidential-2025")
 */

const uploadToS3 = async (data, fileName, electionName) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${electionName}/${fileName}.json`,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    };

    const command = new PutObjectCommand(params);
    await s3.send(command);

    console.log(`✅ Uploaded ${fileName}.json to S3 (${electionName})`);
  } catch (err) {
    console.error("❌ S3 Upload failed:", err);
  }

  /**
   * Read (download) a JSON file from S3 and convert it to an object
   * @param {String} fileName - The file name without extension
   * @param {String} electionName - Folder name
   */

  const redFromS3 = async (fileName, electionName) => {
    try {
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${electionName}/${fileName}.json`,
      };

      const command = new GetObjectCommand(params);
      const data = await s3.send(command);

      const fileContent = await streamToString(data.Body);
      console.log(`📥 Downloaded file from S3: ${fileName}.json`);
      return JSON.parse(fileContent);
    } catch (err) {
      console.error("❌ S3 Read failed:", err);
    }
  };
};

module.exports = { uploadToS3 };
