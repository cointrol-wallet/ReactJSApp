import type { Abi } from "viem";

// add erc20, erc721, erc1155
// add base account and/or quantum account ABIs too

export const gameSquaresAbi: Abi = [
  {
    type: "constructor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner_", type: "address", internalType: "address" },
      { name: "usdc_", type: "address", internalType: "address" },
      { name: "pricePerSquare_", type: "uint256", internalType: "uint256" },
      { name: "timeToStartSec", type: "uint256", internalType: "uint256" },
    ],
  },
  {
    type: "function",
    name: "buySquare",
    stateMutability: "nonpayable",
    inputs: [
      { name: "row", type: "uint8", internalType: "uint8" },
      { name: "col", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "colDigits",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
  },
  {
    type: "function",
    name: "digitsAssigned",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "getAllSquareOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address[100]",
        internalType: "address[100]",
      },
    ],
  },
  {
    type: "function",
    name: "getColDigits",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8[10]",
        internalType: "uint8[10]",
      },
    ],
  },
  {
    type: "function",
    name: "getOwnerAt",
    stateMutability: "view",
    inputs: [
      { name: "row", type: "uint8", internalType: "uint8" },
      { name: "col", type: "uint8", internalType: "uint8" },
    ],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "getRefund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "row", type: "uint8", internalType: "uint8" },
      { name: "col", type: "uint8", internalType: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getRowDigits",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8[10]",
        internalType: "uint8[10]",
      },
    ],
  },
  {
    type: "function",
    name: "getState",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum SuperBowlSquares.State",
      },
    ],
  },
  {
    type: "function",
    name: "lockBoard",
    stateMutability: "nonpayable",
    inputs: [
      { name: "seedRows", type: "uint256", internalType: "uint256" },
      { name: "seedCols", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "lockedPot",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "owners",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
  },
  {
    type: "function",
    name: "paidFinal",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "paidQ1",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "paidQ2",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "paidQ3",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
  {
    type: "function",
    name: "pricePerSquare",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
  },
  {
    type: "function",
    name: "refundAll",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "renounceOwnership",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "rescueTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address", internalType: "address" },
      { name: "to", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "rowDigits",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
  },
  {
    type: "function",
    name: "settleQuarter",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "quarter",
        type: "uint8",
        internalType: "enum SuperBowlSquares.Quarter",
      },
      { name: "afcScore", type: "uint256", internalType: "uint256" },
      { name: "nfcScore", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "squaresSold",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
  },
  {
    type: "function",
    name: "state",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum SuperBowlSquares.State",
      },
    ],
  },
  {
    type: "function",
    name: "transferOwnership",
    stateMutability: "nonpayable",
    inputs: [
      { name: "newOwner", type: "address", internalType: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "", type: "address", internalType: "contract IERC20" },
    ],
  },
  // events and errors omitted from this snippet for brevity; leave them in if you like
];


