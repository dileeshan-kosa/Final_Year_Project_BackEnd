const forge = require("node-forge");
const fs = require("fs");
const path = require("path");

// Paths for key files
const publicKeyPath = path.join(__dirname, "..", "keys", "public.pem");
const privateKeyPath = path.join(__dirname, "..", "keys", "private.pem");

// Generate keys if not already created
if (!fs.existsSync(publicKeyPath) || !fs.existsSync(privateKeyPath)) {
  console.log("Generating RSA key pair...");
  const keypair = forge.pki.rsa.generateKeyPair(2048);

  const publicPem = forge.pki.publicKeyToPem(keypair.publicKey);
  const privatePem = forge.pki.privateKeyToPem(keypair.privateKey);

  fs.mkdirSync(path.join(__dirname, "..", "keys"), { recursive: true });
  fs.writeFileSync(publicKeyPath, publicPem);
  fs.writeFileSync(privateKeyPath, privatePem);
}

const publicKeyPem = fs.readFileSync(publicKeyPath, "utf8");
const privateKeyPem = fs.readFileSync(privateKeyPath, "utf8");

module.exports = { publicKeyPem, privateKeyPem };
