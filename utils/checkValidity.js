const { hmacSha256 } = require("../utils/encryption");
const crypto = require("crypto");
// const secretKey = process.env.SECRET_KEY.padEnd(32, "0");

function checkValidity(combinedKey, cryptographicKey) {
  const secretKey = process.env.SECRET_KEY?.padEnd(32, "0");
  if (!secretKey) {
    throw new Error("SECRET_KEY environment variable is not set");
  }

  const currentHash = hmacSha256(secretKey, combinedKey);
  console.log("veryfied_hash:", currentHash);

  if (currentHash == cryptographicKey) {
    return true;
  } else {
    console.log("Data tampered : ", currentHash, " : ", cryptographicKey);
    return false;
  }
}

module.exports = { checkValidity };
