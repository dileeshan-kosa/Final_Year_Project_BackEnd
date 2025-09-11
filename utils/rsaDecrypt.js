const forge = require("node-forge");
const { privateKeyPem } = require("./rsaKeys");

function decryptVote(encryptedBase64) {
  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

    // decode base64 → decrypt using RSA-OAEP
    const decrypted = privateKey.decrypt(
      forge.util.decode64(encryptedBase64),
      "RSA-OAEP"
    );

    return decrypted; // this should be the original vote (e.g. candidate name or ID)
  } catch (err) {
    console.error("RSA decryption error:", err);
    return null;
  }
}

module.exports = { decryptVote };
