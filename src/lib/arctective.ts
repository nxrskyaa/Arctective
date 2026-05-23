import { defineChain } from "viem";

export const ARC_TESTNET = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

export const ARCTECTIVE_CONTRACT_ADDRESS =
  "0x6b3BaF2Ed389D23fa30203Dc1ef6AEa288f51995" as const;

export const ARCTECTIVE_CASES = {
  FINAL_RECEIPT: 1,
  AGENT_PAID_TWICE: 2,
  PRIVATE_LEDGER: 3,
} as const;

export const ARCTECTIVE_BADGES = {
  FINAL_RECEIPT_FOUND: 1,
  DOUBLE_PAY_SLAYER: 2,
  REDACTION_EXPERT: 3,
  ROOKIE_ARCTECTIVE: 100,
} as const;

export const ARCTECTIVE_ABI = [
  {
    type: "function",
    name: "hasProfile",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getProfile",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "wallet", type: "address" },
          { name: "xUsername", type: "string" },
          { name: "nickname", type: "string" },
          { name: "avatarURI", type: "string" },
          { name: "motto", type: "string" },
          { name: "reputation", type: "uint256" },
          { name: "casesSolved", type: "uint256" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getSolvedCaseIds",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getUserBadgeIds",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "hasSolvedCase",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "caseId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getTopDetectives",
    stateMutability: "view",
    inputs: [{ name: "limit", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "wallet", type: "address" },
          { name: "xUsername", type: "string" },
          { name: "nickname", type: "string" },
          { name: "avatarURI", type: "string" },
          { name: "motto", type: "string" },
          { name: "reputation", type: "uint256" },
          { name: "casesSolved", type: "uint256" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "createProfile",
    stateMutability: "nonpayable",
    inputs: [
      { name: "xUsername", type: "string" },
      { name: "nickname", type: "string" },
      { name: "avatarURI", type: "string" },
      { name: "motto", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateProfile",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nickname", type: "string" },
      { name: "avatarURI", type: "string" },
      { name: "motto", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "solveCase",
    stateMutability: "nonpayable",
    inputs: [
      { name: "caseId", type: "uint256" },
      { name: "score", type: "uint8" },
      { name: "evidenceHash", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimBadge",
    stateMutability: "nonpayable",
    inputs: [{ name: "badgeId", type: "uint256" }],
    outputs: [],
  },
] as const;

export type DetectiveProfile = {
  wallet: `0x${string}`;
  xUsername: string;
  nickname: string;
  avatarURI: string;
  motto: string;
  reputation: bigint;
  casesSolved: bigint;
  createdAt: bigint;
};

export function rankTitle(reputation: bigint | number | undefined) {
  const value = Number(reputation ?? 0);
  if (value >= 600) return "Chief Arctective";
  if (value >= 400) return "Finality Inspector";
  if (value >= 250) return "Stablecoin Sleuth";
  if (value >= 100) return "Receipt Hunter";
  return "Rookie Trace";
}

export function shortAddress(address?: string) {
  if (!address) return "0x....";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
