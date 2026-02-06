import { RandomBytesFn } from "./chacha20";
// === Gaussian helpers ===

/**
 * Sample N(0,1) using Box–Muller.
 * Not constant-time; only for testing / dev.
 */
function gaussian01(randomBytes: RandomBytesFn): number {
  const buf = randomBytes(8);
  if (buf.length < 8) throw new Error("randomBytes did not return enough bytes");

  const u1 = uint32ToUnitInterval(buf[0], buf[1], buf[2], buf[3]);
  const u2 = uint32ToUnitInterval(buf[4], buf[5], buf[6], buf[7]);

  const r = Math.sqrt(-2.0 * Math.log(u1));
  const theta = 2.0 * Math.PI * u2;

  const x = r * Math.cos(theta);
  if (!Number.isFinite(x)) throw new Error(`gaussian01 produced non-finite: u1=${u1}, u2=${u2}, x=${x}`);
  return x;
}

function uint32ToUnitInterval(b0: number, b1: number, b2: number, b3: number): number {
  // force unsigned uint32
  const val = ((b0) | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;

  // map to (0,1), not including endpoints
  let u = (val + 0.5) / 4294967296; // 2^32

  // extra safety against any edge-case
  if (u <= 0) u = Number.MIN_VALUE;
  if (u >= 1) u = 1 - Number.EPSILON;
  return u;
}

// Simple RNG type we control
export type RNG = (len: number) => Uint8Array;


// Secure random bytes using Web Crypto API
export function randomBytes(len: number): Uint8Array {
  const out = new Uint8Array(len);

  // Works in modern browsers
  if (typeof globalThis.crypto !== "undefined" && "getRandomValues" in globalThis.crypto) {
    (globalThis.crypto as Crypto).getRandomValues(out);
    return out;
  }

  // If you *ever* hit this in the browser, something is very wrong
  throw new Error("Secure random generator (crypto.getRandomValues) not available in this environment.");
}

// Wrap Node's randomBytes into our simple RNG
const defaultRng: RNG = (len: number) => randomBytes(len);

/* function random64(): bigint {
  const buf = randomBytes(8);
  let x = 0n;
  for (let i = 0; i < 8; i++) {
    x = (x << 8n) | BigInt(buf[i]);
  }
  return x;
} */

const RCDT_PREC = 72

const RCDT: bigint[] = [
  3024686241123004913666n,
  1564742784480091954050n,
  636254429462080897535n,
  199560484645026482916n,
  47667343854657281903n,
  8595902006365044063n,
  1163297957344668388n,
  117656387352093658n,
  8867391802663976n,
  496969357462633n,
  20680885154299n,
  638331848991n,
  14602316184n,
  247426747n,
  3104126n,
  28824n,
  198n,
  1n,
];

const LN2 = 0.69314718056;
const ILN2 = 1.44269504089;
const MAX_SIGMA = 1.8205;
const INV_2SIGMA2 = 1 / (2 * (MAX_SIGMA ** 2));

const C: bigint[] = [
    0x00000004741183A3n,
    0x00000036548CFC06n,
    0x0000024FDCBF140An,
    0x0000171D939DE045n,
    0x0000D00CF58F6F84n,
    0x000680681CF796E3n,
    0x002D82D8305B0FEAn,
    0x011111110E066FD0n,
    0x0555555555070F00n,
    0x155555555581FF00n,
    0x400000000002B400n,
    0x7FFFFFFFFFFF4800n,
    0x8000000000000000n];

function basesampler(rng: RNG = defaultRng) {
  // number of bytes needed: PREC >> 3
  const byteCount = RCDT_PREC >> 3;

  // Load random bytes
  const buf = rng(byteCount);

  // Convert to BigInt (little-endian)
  let u = 0n;
  for (let i = byteCount - 1; i >= 0; i--) {
    u = (u << 8n) | BigInt(buf[i]);
  }

  // Run cumulative table test
  let z0 = 0;
  for (const elt of RCDT) {
    if (u < elt) z0++;
  }

  return z0; // always safe as number ∈ [0, 18]
}

/**
 * Approximate 2^63 * ccs * exp(-x).
 *
 * Inputs:
 *  - x: number (must be > 0)
 *  - ccs: number (must be > 0)
 *
 * Output:
 *  - bigint approximation of 2^63 * ccs * exp(-x)
 */
export function approxexp(x: number, ccs: number): bigint {
  if (ccs <= 0) {
    throw new Error("approxexp: ccs must be positive");
  }
  if (!Number.isFinite(x)) {
    throw new Error(`berexp: x must be finite (got ${x})`);
  }

  if (C.length === 0) {
    throw new Error("approxexp: C table is empty – fill it from falcon.py");
  }

  // y = C[0]
  let y: bigint = C[0];

  // z = int(x * (1 << 63))
  // This mirrors Python: float x * 2^63, then floor -> int -> BigInt
  const FIX63 = 2 ** 63; // same as float(1 << 63) in Python
  let z: bigint = BigInt(Math.floor(x * FIX63));

  // for elt in C[1:]:
  //     y = elt - ((z * y) >> 63)
  for (let i = 1; i < C.length; i++) {
    const elt = C[i];
    y = elt - ((z * y) >> 63n);
  }

  // z = int(ccs * (1 << 63)) << 1
  z = BigInt(Math.floor(ccs * FIX63)) << 1n;

  // y = (z * y) >> 63
  y = (z * y) >> 63n;

  // return y
  return y;
}

/**
 * Return a single bit, equal to 1 with probability ~ ccs * exp(-x).
 * Both inputs x and ccs MUST be positive.
 */
export function berexp(
  x: number,
  ccs: number,
  rng: RNG = defaultRng
): boolean {
  if (ccs <= 0) {
    throw new Error("berexp: ccs must be positive");
  }
  if (!Number.isFinite(x)) {
    throw new Error(`berexp: x must be finite (got ${x})`);
  }

  // s = int(x * ILN2)
  let s = Math.floor(x * ILN2);
  // r = x - s * LN2
  const r = x - s * LN2;

  // s = min(s, 63)
  if (s > 63) s = 63;
  if (s < 0) s = 0;

  // approxexp(r, ccs) should return a fixed-point integer (like Python).
  // We treat it as bigint to keep all bits exact.
  const zRaw = approxexp(r, ccs) as any; // expect bigint, like Python's int
  const zBig: bigint =
    typeof zRaw === "bigint" ? zRaw : BigInt(zRaw); // if you made it a number

  // z = (approxexp(r, ccs) - 1) >> s
  let z = (zBig - 1n) >> BigInt(s);

  // Main loop: compare random byte p to successive bytes of z (from MSB to LSB)
  let w = 0;
  for (let i = 56; i >= 0; i -= 8) {
    const p = rng(1)[0]; // 0..255
    const zi = Number((z >> BigInt(i)) & 0xffn); // ((z >> i) & 0xFF)
    w = p - zi;
    if (w !== 0) {
      break;
    }
  }

  return w < 0;
}

/**
 * Sample z according to the discrete Gaussian D_{Z, mu, sigma}.
 *
 * Inputs:
 *  - mu: center
 *  - sigma: standard deviation
 *  - sigmin: scaling factor (1 < sigmin < sigma < MAX_SIGMA in the original spec)
 *  - rng: randomness source (default: crypto.randomBytes)
 */
export function samplerz(
  mu: number,
  sigma: number,
  sigmin: number,
  rng: RNG = defaultRng,
): number {
  // s = int(floor(mu))
  const s = Math.floor(mu);
  // r = mu - s
  const r = mu - s;

  // dss = 1 / (2 * sigma * sigma)
  const dss = 1 / (2 * sigma * sigma);
  // ccs = sigmin / sigma
  const ccs = sigmin / sigma;


  // rejection-sampling loop
  // eslint-disable-next-line no-constant-condition
  while (true) {

    // Half-Gaussian sample z0
    const z0 = basesampler(rng);

    // b = random bit
    let b = rng(1)[0]; // 0..255
    b &= 1; // low bit

    // z = b + (2*b - 1)*z0
    // if b = 0: z = -z0
    // if b = 1: z = 1 + z0
    const z = b + (2 * b - 1) * z0;

    // x = ((z - r)^2) * dss
    let x = (z - r) ** 2 * dss;
    // x -= (z0^2) * INV_2SIGMA2
    x -= z0 ** 2 * INV_2SIGMA2;

    // if berexp(x, ccs): accept and return z + s
    if (berexp(x, ccs, rng)) {
      return z + s;
    }
  }
}