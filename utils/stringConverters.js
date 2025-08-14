// stringConverters.js (CommonJS)
function toBytes32(str) {
  const buff = Buffer.alloc(32);
  buff.write(str, "utf-8");
  return "0x" + buff.toString("hex");
}

function toString(bytes32) {
  const hex = bytes32.replace(/^0x/, "");
  const buffer = Buffer.from(hex, "hex");
  return buffer.toString("utf8").replace(/\0+$/, "");
}

module.exports = { toBytes32, toString };
