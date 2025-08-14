const crypto = require("crypto");

// --- Secret Key Setup ---
const secretKey = process.env.SECRET_KEY?.padEnd(32, "0"); // Pad the key to 32 bytes
if (!secretKey) {
  throw new Error("SECRET_KEY environment variable is not set");
}

function hmacSha256(secretKey, data) {
  return crypto.createHmac("sha256", secretKey).update(data).digest("hex");
}

// AES Encryption Function
function encrypt(text, secretKey) {
  try {
    const algorithm = "aes-256-cbc"; // AES algorithm with CBC mode
    const iv = crypto.randomBytes(16); // Initialization vector (16 bytes)
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv); // Create cipher with secret key and IV
    let encrypted = cipher.update(text, "utf8", "hex"); // Encrypt the text
    encrypted += cipher.final("hex"); // Finalize encryption
    return { iv: iv.toString("hex"), encryptedData: encrypted }; // Return IV and encrypted data
  } catch (error) {
    console.log("error in encrypt: ", error);
  }
}

// AES Decryption Function
function decrypt(encryptedData, iv, secretKey) {
  try {
    const algorithm = "aes-256-cbc"; // AES algorithm with CBC mode
    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(secretKey),
      Buffer.from(iv, "hex")
    ); // Create decipher
    let decrypted = decipher.update(encryptedData, "hex", "utf8"); // Decrypt the text
    decrypted += decipher.final("utf8"); // Finalize decryption
    console.log("dencrypted_combined: ", decrypted);
    return decrypted; // Return the original text
  } catch (error) {
    console.log("error in decrypt: ", error);
  }
}

module.exports = { encrypt, hmacSha256, decrypt };
