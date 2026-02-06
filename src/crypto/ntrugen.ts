// ntrugen.ts

import {
  fft,
  ifft,
  addFft,
  mulFft,
  adjFft,
  divFft,
  add,
  mul,
  div,
  adj,
} from "./fft";
import { ntt } from "./ntt";
import { sqnorm } from "./common";
import { samplerz } from "./samplerz";
import { Poly, toBigPoly, bigPolyToUint16 } from "./types";

// q is the integer modulus used in Falcon.
export const Q_BIG = 12289n; // q as bigint
const q = 12289;

/**
 * Karatsuba multiplication between polynomials.
 * Coefficients may be integer or real. Returns a polynomial of length 2n.
 */
export function karatsuba(a: Poly, b: Poly, n: number): Poly {
  if (n === 1) {
    return [a[0] * b[0], 0n];
  } else {
    const n2 = n >> 1;

    const a0 = a.slice(0, n2);
    const a1 = a.slice(n2);
    const b0 = b.slice(0, n2);
    const b1 = b.slice(n2);

    const ax = new Array<bigint>(n2);
    const bx = new Array<bigint>(n2);
    for (let i = 0; i < n2; i++) {
      ax[i] = a0[i] + a1[i];
      bx[i] = b0[i] + b1[i];
    }

    const a0b0 = karatsuba(a0, b0, n2);
    const a1b1 = karatsuba(a1, b1, n2);
    const axbx = karatsuba(ax, bx, n2);

    // axbx[i] -= (a0b0[i] + a1b1[i])  for i in [0, n)
    for (let i = 0; i < n; i++) {
      axbx[i] -= (a0b0[i] + a1b1[i]);
    }

    const ab = new Array<bigint>(2 * n).fill(0n);
    for (let i = 0; i < n; i++) {
      ab[i] += a0b0[i];
      ab[i + n] += a1b1[i];
      ab[i + n2] += axbx[i];
    }

    return ab;
  }
}

/**
 * Karatsuba multiplication, followed by reduction mod (x^n + 1).
 */
export function karamul(a: Poly, b: Poly): Poly {
  const n = a.length;
  const ab = karatsuba(a, b, n);
  const abr = new Array<bigint>(n);
  for (let i = 0; i < n; i++) {
    abr[i] = ab[i] - ab[i + n];
  }
  return abr;
}

/**
 * Galois conjugate in Q[x]/(x^n + 1): a(x) -> a(-x).
 */
export function galoisConjugate(a: Poly): Poly {
  const n = a.length;
  const res = new Array<bigint>(n);
  for (let i = 0; i < n; i++) {
    // (-1)^i * a[i]
    res[i] = (i & 1) === 0 ? a[i] : -a[i];
  }
  return res;
}

/**
 * Field norm projection Q[x]/(x^n + 1) -> Q[x]/(x^(n/2) + 1), n power-of-two.
 */
export function fieldNorm(a: Poly): Poly {
  const n2 = a.length >> 1;
  const ae = new Array<bigint>(n2);
  const ao = new Array<bigint>(n2);

  for (let i = 0; i < n2; i++) {
    ae[i] = a[2 * i];
    ao[i] = a[2 * i + 1];
  }

  const aeSquared = karamul(ae, ae);
  const aoSquared = karamul(ao, ao);

  const res = aeSquared.slice();
  for (let i = 0; i < n2 - 1; i++) {
    res[i + 1] -= aoSquared[i];
  }
  res[0] += aoSquared[n2 - 1];

  return res;
}

/**
 * Lift Q[x]/(x^(n/2) + 1) -> Q[x]/(x^n + 1) via a(x) -> a(x^2).
 */
export function lift(a: Poly): Poly {
  const n = a.length;
  const res = new Array<bigint>(2 * n).fill(0n);
  for (let i = 0; i < n; i++) {
    res[2 * i] = a[i];
  }
  return res;
}

/**
 * Bitsize of a signed integer |a|, rounded to next multiple of 8.
 */
export function bitsize(a: bigint): number {
  if (a === 0n) return 0;
  let val = a < 0n ? -a : a;
  let res = 0;
  while (val !== 0n) {
    res += 8;
    val >>= 8n;  // shift right 8 bits
  }
  return res;
}

function polyBitsize(p: Poly): number {
  let minVal = p[0];
  let maxVal = p[0];
  for (const c of p) {
    if (c < minVal) minVal = c;
    if (c > maxVal) maxVal = c;
  }
  return Math.max(bitsize(minVal), bitsize(maxVal));
}

/**
 * Babai reduction of (F, G) relative to (f, g).
 * (F,G) <- (F,G) - k*(f,g) with k ≈ (F f* + G g*)/(f f* + g g*).
 */
export function reduceFG(
  f: Poly,
  g: Poly,
  F: Poly,
  G: Poly,
): [Poly, Poly] {
  const n = f.length;

  // Note: Large coefficients (thousands of digits) are expected per Falcon spec
  // The Python implementation also encounters this and just retries

  // Size is based on f and g only, NOT on F and G (per Python reference)
  const size = Math.max(53, polyBitsize(f), polyBitsize(g));

  const shiftF = size - 53;
  const fAdjust = f.map(c => Number(c >> BigInt(shiftF)));
  const gAdjust = g.map(c => Number(c >> BigInt(shiftF)));
  const faFft = fft(fAdjust);
  const gaFft = fft(gAdjust);

  // Repeatedly reduce until the size drops below initial size
  let reduceIter = 0;
  const MAX_REDUCE_ITERS = 100;

  while (reduceIter < MAX_REDUCE_ITERS) {
    reduceIter++;

    const Size = Math.max(
      53,
      polyBitsize(F),
      polyBitsize(G),
    );

    if (reduceIter === 1 || reduceIter % 50 === 0) {
      console.log(`[reduceFG] iter=${reduceIter} n=${n} size=${size} Size=${Size}`);
    }

    if (Size < size) {
      break;
    }

    const shiftFG = Size - 53;
    const FAdjust = F.map(c => Number(c >> BigInt(shiftFG)));
    const GAdjust = G.map(c => Number(c >> BigInt(shiftFG)));
    const FaFft = fft(FAdjust);
    const GaFft = fft(GAdjust);

    const denFft = addFft(
      mulFft(faFft, adjFft(faFft)),
      mulFft(gaFft, adjFft(gaFft)),
    );
    const EPS = 1e-12;
    const badDen = denFft.some((z) => (z.re * z.re + z.im * z.im) < EPS);

    if (badDen) {
      break;
    }

    const numFft = addFft(
      mulFft(FaFft, adjFft(faFft)),
      mulFft(GaFft, adjFft(gaFft)),
    );

    const kFft = divFft(numFft, denFft);
    let k = ifft(kFft);
    k = k.map((elt) => {
      if (!Number.isFinite(elt) || Number.isNaN(elt)) {
        return 0;
      }
      return Math.round(elt);
    });
    if (k.every((elt) => elt === 0)) {
      break;
    }
    const k_big = k.map((x) => BigInt(x));
    const fk = karamul(f, k_big);
    const gk = karamul(g, k_big);

    const upShift = BigInt(Size - size);

    for (let i = 0; i < n; i++) {
      F[i] -= fk[i] << upShift;
      G[i] -= gk[i] << upShift;
    }
  }

  if (reduceIter >= MAX_REDUCE_ITERS) {
    throw new Error(`[reduceFG] exceeded max iterations (${MAX_REDUCE_ITERS}) at n=${n}`);
  }

  return [F, G];
}

/**
 * Extended GCD for integers: return d, u, v such that d = u*b + v*n, d = gcd(b, n).
 */
export function xgcd(
  a: bigint,
  b: bigint,
): [bigint, bigint, bigint] {
  // Returns [d, u, v] such that d = gcd(a,b) and u*a + v*b = d

  if (b === 0n) {
    return [a >= 0n ? a : -a, a >= 0n ? 1n : -1n, 0n];
  }
  if (a === 0n) {
    return [b >= 0n ? b : -b, 0n, b >= 0n ? 1n : -1n];
  }

  let old_r = a;
  let r = b;
  let old_s = 1n, s = 0n;
  let old_t = 0n, t = 1n;

  while (r !== 0n) {
    const q = old_r / r;

    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
    [old_t, t] = [t, old_t - q * t];
  }

  // old_r = gcd, old_s * a + old_t * b = old_r
  return [old_r, old_s, old_t];
}

/**
 * Solve the NTRU equation for f and g (NTRUSolve in Falcon).
 * Returns (F, G) such that f*G - g*F = q mod (x^n + 1).
 */
let solveDepth = 0;
const MAX_DEPTH = 40;

function ntruSolveInner(f: Poly, g: Poly): [Poly, Poly] {
  const n = f.length;
  solveDepth++;
  // Only log at depth 1 to reduce console spam
  if (solveDepth === 1) {
    console.log(`[ntruSolve] starting recursion for n=${n}`);
  }

  try {
    if (solveDepth > MAX_DEPTH) {
      throw new Error(`[ntruSolve] exceeded max recursion depth at n=${n}`);
    }

    if (n === 1) {
      const f0 = f[0];
      const g0 = g[0];

      const [d, u, v] = xgcd(f0, g0);
      if (d !== 1n) {
        throw new Error("ntruSolve: gcd(f0, g0) != 1");
      }

      return [[-Q_BIG * v], [Q_BIG * u]];
    } else {
      const fp = fieldNorm(f);
      const gp = fieldNorm(g);

      const [Fp, Gp] = ntruSolveInner(fp, gp);

      let F = karamul(lift(Fp), galoisConjugate(g));
      let G = karamul(lift(Gp), galoisConjugate(f));

      [F, G] = reduceFG(f, g, F, G);
      return [F, G];
    }
  } finally {
    solveDepth--;
  }
}

export function ntruSolve(f: Poly, g: Poly): [Poly, Poly] {
  solveDepth = 0;
  return ntruSolveInner(f, g);
}


/**
 * Squared Gram–Schmidt norm of the NTRU matrix [[g, -f], [G, -F]].
 * Equivalent to line 9 of Algorithm 5 (NTRUGen).
 */
export function gsNorm(f: Poly, g: Poly, qq: number): number {
  const fnum = Array.from(f, x=> Number(x));
  const gnum = Array.from(g, x=> Number(x));
  const sqnormFg = sqnorm([fnum, gnum]); // [f, g] as a vector of polynomials
  const ffgg = add(mul(fnum, adj(fnum)), mul(gnum, adj(gnum)));
  const Ft = div(adj(gnum), ffgg);
  const Gt = div(adj(fnum), ffgg);

  const sqnormFG = qq * qq * sqnorm([Ft, Gt]);

  return Math.max(sqnormFg, sqnormFG);
}

/**
 * Generate polynomial with coefficients ~ D_{Z, 0, sigma_fg},
 * where sigma_fg = 1.17 * sqrt(q / (2n)).
 * For n <= 4096, we follow the same construction as reference falcon.py.
 */
export function genPoly(n: number): Poly {
  // Precomputed: 1.17 * sqrt(12289 / 8192)
  const sigma = 1.43300980528773;
  if (n >= 4096) {
    throw new Error("genPoly: n must be < 4096");
  }

  const f0 = new Array<number>(4096);
  for (let i = 0; i < 4096; i++) {
    f0[i] = samplerz(0, sigma, sigma - 0.001);
  }

  const f = new Array<number>(n).fill(0);
  const k = Math.trunc(4096 / n);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < k; j++) {
      sum += f0[i * k + j];
    }
    f[i] = sum;
  }

  return toBigPoly(f);
}

function clipBig(coef: bigint, bits: number): bigint {
  const max = 1n << BigInt(bits - 1); // symmetric range [-max, max)
  if (coef >= max) {
    return coef - (max << 1n);
  } else if (coef < -max) {
    return coef + (max << 1n);
  }
  return coef;
}

/**
 * Algorithm 5 (NTRUGen) from Falcon:
 * returns f, g, F, G in Z[x]/(x^n + 1) such that f*G - g*F = q mod (x^n + 1).
 */
export function ntruGen(n: number): [Poly, Poly, Poly, Poly] {
  let iter = 0;
  const MAX_ITERS = 10000; // Python uses infinite loop; we use large limit for safety

  while (true) {
    iter++;

    if (iter % 100 === 0) {
      console.log(`[ntruGen] attempt ${iter}...`);
    }

    if (iter > MAX_ITERS) {
      throw new Error(`ntruGen: exceeded max iterations (${MAX_ITERS})`);
    }

    const f = genPoly(n);
    const g = genPoly(n);

    const gs = gsNorm(f, g, q);
    if (gs > (1.17 ** 2) * q) {
      continue;
    }

    const fCoeffsModQ = f.map((c) => {
      const r = c % Q_BIG;
      return r < 0n ? r + Q_BIG : r;
    });

    const fNtt = ntt(bigPolyToUint16(fCoeffsModQ));
    if (fNtt.some((elem) => elem === 0)) {
      continue;
    }

    try {
      let [F, G] = ntruSolve(f, g);

      // Log coefficient magnitudes for debugging
      const maxF = F.reduce((max, c) => {
        const abs = c < 0n ? -c : c;
        return abs > max ? abs : max;
      }, 0n);
      const maxG = G.reduce((max, c) => {
        const abs = c < 0n ? -c : c;
        return abs > max ? abs : max;
      }, 0n);
      console.log(`ntruGen iter=${iter}: max|F|=${maxF}, max|G|=${maxG}`);

      // Validate NTRU equation: f*G - g*F = q (mod x^n + 1)
      const fG = karamul(f, G);
      const gF = karamul(g, F);
      const diff = new Array<bigint>(n);
      for (let i = 0; i < n; i++) {
        diff[i] = fG[i] - gF[i];
      }

      // Check if diff = q (constant polynomial)
      let ntruValid = (diff[0] === Q_BIG);
      for (let i = 1; i < n; i++) {
        if (diff[i] !== 0n) {
          ntruValid = false;
          break;
        }
      }

      if (!ntruValid) {
        console.warn(`ntruGen: NTRU equation failed at iter=${iter}: diff[0]=${diff[0]}, expected ${Q_BIG}`);
        continue;
      }

      console.log(`ntruGen: success at iter=${iter}, NTRU equation verified`);
      return [f, g, F, G];
    } catch (err) {
      console.warn(`ntruGen: ntruSolve failed at iter=${iter}:`, err);
      continue;
    }
  }
}
