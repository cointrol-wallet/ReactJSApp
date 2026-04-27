import { decodeSharePayload, encodeSharePayload } from "./sharePayload";
import type { SharePayload } from "./sharePayload";
import { zSharePayload } from "./sharePayload";

export { encodeSharePayload };

export const COINTROL_TEXT_HEADER = "=== Cointrol Share v1 ===";

// ---------------------------------------------------------------------------
// Low-level file download helper (replaces the local one in recovery.tsx)
// ---------------------------------------------------------------------------

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Filename generation
// ---------------------------------------------------------------------------

function makeFilename(payload: SharePayload): string {
  const now = new Date();
  const ts = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");

  let rawName = "";
  if (payload.t === "txrequest") {
    rawName = (payload.data as any).functionName ?? "transaction";
  } else if (payload.t === "recovery") {
    rawName = (payload.data.name as string).slice(0, 10);
  } else {
    rawName = (payload.data as any).name ?? "";
  }

  const safe = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40);
  return `cointrol-${payload.t}-${safe}-${ts}.txt`;
}

// ---------------------------------------------------------------------------
// Encoder
// ---------------------------------------------------------------------------

export function encodeShareText(payload: SharePayload): string {
  const lines: string[] = [
    COINTROL_TEXT_HEADER,
    `Type: ${payload.t}`,
    "Source: Cointrol",
    "---",
  ];

  const d = payload.data as any;

  switch (payload.t) {
    case "contact": {
      lines.push(`Name: ${d.name}`);
      if (d.surname) lines.push(`Surname: ${d.surname}`);
      (d.wallets ?? []).forEach((w: any, i: number) => {
        lines.push(`Wallet[${i + 1}].address: ${w.address}`);
        lines.push(`Wallet[${i + 1}].chainId: ${w.chainId}`);
        if (w.name) lines.push(`Wallet[${i + 1}].name: ${w.name}`);
      });
      break;
    }
    case "contract": {
      lines.push(`Name: ${d.name}`);
      lines.push(`Address: ${d.address}`);
      lines.push(`Chain ID: ${d.chainId}`);
      if (d.metadata != null) lines.push(`Metadata: ${JSON.stringify(d.metadata)}`);
      break;
    }
    case "coin": {
      lines.push(`Name: ${d.name}`);
      lines.push(`Symbol: ${d.symbol}`);
      lines.push(`Decimals: ${d.decimals}`);
      lines.push(`Chain ID: ${d.chainId}`);
      lines.push(`Address: ${d.address}`);
      lines.push(`Token Type: ${d.type}`);
      break;
    }
    case "profile": {
      lines.push(`Name: ${d.name}`);
      (d.wallets ?? []).forEach((w: any, i: number) => {
        lines.push(`Wallet[${i + 1}].address: ${w.address}`);
        lines.push(`Wallet[${i + 1}].chainId: ${w.chainId}`);
        if (w.name) lines.push(`Wallet[${i + 1}].name: ${w.name}`);
      });
      break;
    }
    case "recovery": {
      lines.push(`Account: ${d.name}`);
      lines.push(`Chain ID: ${d.chainId}`);
      lines.push(`Recoverable Contract: ${d.recoverableAddress}`);
      lines.push(`Paymaster: ${d.paymaster}`);
      lines.push(`Threshold: ${d.threshold}`);
      lines.push(`Status: ${d.status ? "Enabled" : "Disabled"}`);
      (d.participants ?? []).forEach((p: string, i: number) => {
        lines.push(`Participant[${i + 1}]: ${p}`);
      });
      break;
    }
    case "txrequest": {
      lines.push(`Sub-type: ${d.type}`);
      lines.push(`Chain ID: ${d.chainId}`);
      if (d.sender) lines.push(`Sender: ${d.sender}`);
      if (d.contractAddress) lines.push(`Contract Address: ${d.contractAddress}`);
      if (d.contractName) lines.push(`Contract Name: ${d.contractName}`);
      if (d.coinAddress) lines.push(`Coin Address: ${d.coinAddress}`);
      if (d.coinSymbol) lines.push(`Coin Symbol: ${d.coinSymbol}`);
      if (d.coinDecimals != null) lines.push(`Coin Decimals: ${d.coinDecimals}`);
      if (d.functionName) lines.push(`Function: ${d.functionName}`);
      for (const [k, v] of Object.entries(d.args ?? {})) {
        lines.push(`Arg[${k}]: ${v}`);
      }
      if (d.payableValue) lines.push(`Payable Value: ${d.payableValue}`);
      break;
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Decoder
// ---------------------------------------------------------------------------

function splitKV(line: string): [string, string] {
  const idx = line.indexOf(": ");
  if (idx === -1) throw new Error(`Malformed line (no ": "): ${line}`);
  return [line.slice(0, idx), line.slice(idx + 2)];
}

export function decodeShareText(text: string): SharePayload {
  const allLines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  if (allLines.length === 0 || allLines[0] !== COINTROL_TEXT_HEADER) {
    throw new Error("Not a Cointrol text file");
  }

  const sepIdx = allLines.findIndex(l => l === "---");
  if (sepIdx === -1) throw new Error("Missing separator line (---)");

  const headerLines = allLines.slice(1, sepIdx);
  const bodyLines = allLines.slice(sepIdx + 1);

  // Parse header
  const header: Record<string, string> = {};
  for (const line of headerLines) {
    const [k, v] = splitKV(line);
    header[k] = v;
  }
  const type = header["Type"];
  if (!type) throw new Error("Missing 'Type' in header");

  // Parse body
  const body: Record<string, string> = {};
  for (const line of bodyLines) {
    const [k, v] = splitKV(line);
    body[k] = v;
  }

  // Build raw data object from body
  let raw: any;
  switch (type) {
    case "contact": {
      const wallets = parseIndexedWallets(body);
      raw = {
        v: 1,
        t: "contact",
        data: {
          name: body["Name"],
          ...(body["Surname"] ? { surname: body["Surname"] } : {}),
          ...(wallets.length ? { wallets } : {}),
        },
      };
      break;
    }
    case "contract": {
      raw = {
        v: 1,
        t: "contract",
        data: {
          name: body["Name"],
          address: body["Address"],
          chainId: parseInt(body["Chain ID"], 10),
          ...(body["Metadata"] ? { metadata: JSON.parse(body["Metadata"]) } : {}),
        },
      };
      break;
    }
    case "coin": {
      raw = {
        v: 1,
        t: "coin",
        data: {
          name: body["Name"],
          symbol: body["Symbol"],
          decimals: parseInt(body["Decimals"], 10),
          chainId: parseInt(body["Chain ID"], 10),
          address: body["Address"],
          type: body["Token Type"],
        },
      };
      break;
    }
    case "profile": {
      raw = {
        v: 1,
        t: "profile",
        data: {
          name: body["Name"],
          wallets: parseIndexedWallets(body),
        },
      };
      break;
    }
    case "recovery": {
      raw = {
        v: 1,
        t: "recovery",
        data: {
          name: body["Account"],
          chainId: parseInt(body["Chain ID"], 10),
          recoverableAddress: body["Recoverable Contract"],
          paymaster: body["Paymaster"],
          threshold: parseInt(body["Threshold"], 10),
          status: body["Status"] === "Enabled",
          participants: parseIndexedParticipants(body),
        },
      };
      break;
    }
    case "txrequest": {
      const args = parseIndexedArgs(body);
      raw = {
        v: 1,
        t: "txrequest",
        data: {
          type: body["Sub-type"],
          chainId: parseInt(body["Chain ID"], 10),
          ...(body["Sender"] ? { sender: body["Sender"] } : {}),
          ...(body["Contract Address"] ? { contractAddress: body["Contract Address"] } : {}),
          ...(body["Contract Name"] ? { contractName: body["Contract Name"] } : {}),
          ...(body["Coin Address"] ? { coinAddress: body["Coin Address"] } : {}),
          ...(body["Coin Symbol"] ? { coinSymbol: body["Coin Symbol"] } : {}),
          ...(body["Coin Decimals"] != null ? { coinDecimals: parseInt(body["Coin Decimals"], 10) } : {}),
          ...(body["Function"] ? { functionName: body["Function"] } : {}),
          ...(Object.keys(args).length ? { args } : {}),
          ...(body["Payable Value"] ? { payableValue: body["Payable Value"] } : {}),
        },
      };
      break;
    }
    default:
      throw new Error(`Unknown Type: ${type}`);
  }

  return zSharePayload.parse(raw);
}

// ---------------------------------------------------------------------------
// Indexed field parsers
// ---------------------------------------------------------------------------

function parseIndexedWallets(body: Record<string, string>) {
  const wallets: { address: string; chainId: number; name?: string }[] = [];
  let i = 1;
  while (body[`Wallet[${i}].address`]) {
    const w: { address: string; chainId: number; name?: string } = {
      address: body[`Wallet[${i}].address`],
      chainId: parseInt(body[`Wallet[${i}].chainId`], 10),
    };
    if (body[`Wallet[${i}].name`]) w.name = body[`Wallet[${i}].name`];
    wallets.push(w);
    i++;
  }
  return wallets;
}

function parseIndexedParticipants(body: Record<string, string>): string[] {
  const participants: string[] = [];
  let i = 1;
  while (body[`Participant[${i}]`]) {
    participants.push(body[`Participant[${i}]`]);
    i++;
  }
  return participants;
}

function parseIndexedArgs(body: Record<string, string>): Record<string, string> {
  const args: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    const m = k.match(/^Arg\[(.+)\]$/);
    if (m) args[m[1]] = v;
  }
  return args;
}

// ---------------------------------------------------------------------------
// Unified decoder (text format first, compressed QR fallback)
// ---------------------------------------------------------------------------

export function decodeShareAny(text: string): SharePayload {
  const t = text.trim();
  if (t.startsWith(COINTROL_TEXT_HEADER)) return decodeShareText(t);
  return decodeSharePayload(t);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export function downloadShareTextFile(payload: SharePayload, filename?: string): void {
  downloadTextFile(filename ?? makeFilename(payload), encodeShareText(payload));
}
