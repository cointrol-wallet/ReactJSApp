import { describe, it, expect } from "vitest";
import { sortCoins } from "../coinSorting";
import type { Coin } from "@/storage/coinStore";

function coin(name: string, symbol: string, chainId: number, createdAt: number): Coin {
  return { id: name, name, symbol, chainId, createdAt, decimals: 18, type: "ERC20" } as unknown as Coin;
}

const ETH  = coin("Ether",    "ETH",  1,         100);
const USDC = coin("USD Coin", "USDC", 1,         200);
const LINK = coin("Chainlink","LINK", 11155111,  50);

describe("sortCoins", () => {
  it("nameAsc — alphabetical ascending", () => {
    const r = sortCoins([USDC, ETH, LINK], "nameAsc");
    expect(r.map(c => c.name)).toEqual(["Chainlink", "Ether", "USD Coin"]);
  });

  it("nameDesc — alphabetical descending", () => {
    const r = sortCoins([ETH, USDC, LINK], "nameDesc");
    expect(r.map(c => c.name)).toEqual(["USD Coin", "Ether", "Chainlink"]);
  });

  it("symbolAsc — ascending by symbol", () => {
    const r = sortCoins([USDC, LINK, ETH], "symbolAsc");
    expect(r.map(c => c.symbol)).toEqual(["ETH", "LINK", "USDC"]);
  });

  it("symbolDesc — descending by symbol", () => {
    const r = sortCoins([ETH, LINK, USDC], "symbolDesc");
    expect(r.map(c => c.symbol)).toEqual(["USDC", "LINK", "ETH"]);
  });

  it("createdAsc — oldest first", () => {
    const r = sortCoins([ETH, USDC, LINK], "createdAsc");
    expect(r.map(c => c.createdAt)).toEqual([50, 100, 200]);
  });

  it("createdDesc — newest first", () => {
    const r = sortCoins([ETH, USDC, LINK], "createdDesc");
    expect(r.map(c => c.createdAt)).toEqual([200, 100, 50]);
  });

  it("chainIdAsc — lowest chainId first", () => {
    const r = sortCoins([LINK, ETH, USDC], "chainIdAsc");
    expect(r.map(c => c.chainId)).toEqual([1, 1, 11155111]);
  });

  it("chainIdDesc — highest chainId first", () => {
    const r = sortCoins([ETH, USDC, LINK], "chainIdDesc");
    expect(r[0].chainId).toBe(11155111);
  });

  it("does not mutate the input array", () => {
    const input = [USDC, ETH, LINK];
    sortCoins(input, "nameAsc");
    expect(input[0].name).toBe("USD Coin");
  });

  it("empty array returns empty array", () => {
    expect(sortCoins([], "nameAsc")).toEqual([]);
  });

  it("default mode is createdAsc", () => {
    const r = sortCoins([ETH, USDC, LINK]);
    expect(r.map(c => c.createdAt)).toEqual([50, 100, 200]);
  });
});
