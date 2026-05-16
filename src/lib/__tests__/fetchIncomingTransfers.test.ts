// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { chunkedGetLogs, MAX_BLOCK_RANGE } from "../fetchIncomingTransfers";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("chunkedGetLogs", () => {
  it("makes a single call when range is exactly MAX_BLOCK_RANGE", async () => {
    const fetch = vi.fn().mockResolvedValue(["log1"]);
    const start = 0n;
    const end = MAX_BLOCK_RANGE - 1n;

    const result = await chunkedGetLogs(fetch, start, end);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(0n, MAX_BLOCK_RANGE - 1n);
    expect(result).toEqual(["log1"]);
  });

  it("makes exactly two calls when range is MAX_BLOCK_RANGE + 1 blocks", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(["log1"])
      .mockResolvedValueOnce(["log2"]);
    const start = 0n;
    const end = MAX_BLOCK_RANGE; // 50_000n — one block over the limit

    const result = await chunkedGetLogs(fetch, start, end);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(1, 0n, MAX_BLOCK_RANGE - 1n);
    expect(fetch).toHaveBeenNthCalledWith(2, MAX_BLOCK_RANGE, MAX_BLOCK_RANGE);
    expect(result).toEqual(["log1", "log2"]);
  });

  it("splits a large range into the correct number of chunks and merges results", async () => {
    const totalBlocks = MAX_BLOCK_RANGE * 3n + 1n; // 3 full chunks + 1 block
    const start = 1000n;
    const end = start + totalBlocks - 1n;

    const fetch = vi.fn()
      .mockResolvedValueOnce(["a"])
      .mockResolvedValueOnce(["b"])
      .mockResolvedValueOnce(["c"])
      .mockResolvedValueOnce(["d"]);

    const result = await chunkedGetLogs(fetch, start, end);

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch).toHaveBeenNthCalledWith(1, start, start + MAX_BLOCK_RANGE - 1n);
    const lastFrom = start + MAX_BLOCK_RANGE * 3n;
    expect(fetch).toHaveBeenNthCalledWith(4, lastFrom, end);
    expect(result).toEqual(["a", "b", "c", "d"]);
  });

  it("returns an empty array when startBlock > endBlock", async () => {
    const fetch = vi.fn();

    const result = await chunkedGetLogs(fetch, 100n, 50n);

    expect(fetch).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("makes a single call for a range of one block", async () => {
    const fetch = vi.fn().mockResolvedValue(["only"]);

    const result = await chunkedGetLogs(fetch, 42n, 42n);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(42n, 42n);
    expect(result).toEqual(["only"]);
  });
});
