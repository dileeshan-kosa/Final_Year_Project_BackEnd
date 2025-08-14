const contractABI = [
  {
    inputs: [],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "cryptographicKey", type: "string" },
      { indexed: false, name: "encryptedData", type: "string" },
      { indexed: false, name: "Decodekey", type: "string" },
    ],
    name: "VoteAdded",
    type: "event",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "votes",
    outputs: [
      { internalType: "string", name: "cryptographicKey", type: "string" },
      { internalType: "string", name: "encryptedData", type: "string" },
      { internalType: "string", name: "Decodekey", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      { internalType: "string", name: "_cryptographicKey", type: "string" },
      { internalType: "string", name: "_encryptedData", type: "string" },
      { internalType: "string", name: "_Decodekey", type: "string" },
    ],
    name: "addVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getVoteCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
];

module.exports = { contractABI };
