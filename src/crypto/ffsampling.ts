// ffsampling.ts

import { RandomBytesFn } from "./chacha20";
import { add, mul, adj } from "./fft";
import { GramFFT, FFTVec, LDLTree, Basis2, Gram2 } from "./types";
import { Complex, addFft, divFft, mulFft, adjFft, subFft, mergeFft, splitFft } from "./fft";
import { samplerz } from "./samplerz";

export function gram(B0: Basis2): Gram2 {
  const deg = B0[0][0].length;

  const zero = new Array<number>(deg).fill(0);
  const G: Gram2 = [
    [zero.slice(), zero.slice()],
    [zero.slice(), zero.slice()],
  ];

  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      let acc = new Array<number>(deg).fill(0);
      for (let k = 0; k < 2; k++) {
        acc = add(acc, mul(B0[i][k], adj(B0[j][k])));
      }
      G[i][j] = acc;
    }
  }

  return G;
}

export function ldl_fft(G: GramFFT): { L10: FFTVec; D00: FFTVec; D11: FFTVec } {
  const [[g00, g01], [g10, g11]] = G;

  // In a symmetric Gram matrix, g10 == g01, but keep explicit
  const D00 = g00;
  const L10 = divFft(g10, g00);

  // D11 = g11 - L10*adj(L10)*g00
  const t = mulFft(mulFft(L10, adjFft(L10)), g00);
  const D11 = subFft(g11, t);

  return { L10, D00, D11 };
}

export function ffsampling_fft(
  t_fft: [Complex[], Complex[]],
  T: LDLTree,
  sigmin: number,
  randomBytes: RandomBytesFn
): [Complex[], Complex[]] {
  const [t0, t1] = t_fft;
  const n = t0.length;
  if (t1.length !== n) throw new Error("ffsampling_fft: dimension mismatch");

  if (n > 1) {
    if (T.kind !== "node") throw new Error("ffsampling_fft: expected node");

    const { l10, left: T0, right: T1 } = T;

    // z1 = merge_fft( ffsampling_fft(split_fft(t1), T1) )
    const t1s = splitFft(t1); // [left,right] polys in FFT
    const z1s = ffsampling_fft(t1s as any, T1, sigmin, randomBytes);
    const z1 = mergeFft(z1s as any);

    // t0b = t0 + (t1 - z1) * l10
    const t0b = addFft(t0, mulFft(subFft(t1, z1), l10));

    // z0 = merge_fft( ffsampling_fft(split_fft(t0b), T0) )
    const t0bs = splitFft(t0b);
    const z0s = ffsampling_fft(t0bs as any, T0, sigmin, randomBytes);
    const z0 = mergeFft(z0s as any);

    return [z0, z1];
  }

  // leaf (n==1)
  if (T.kind !== "leaf") throw new Error("ffsampling_fft: expected leaf");

  // Here Falcon samples integers with variance derived from the leaf.
  // For dev plumbing, you can start with a coarse samplerz and then refine.
  const mu0 = t0[0].re;
  const mu1 = t1[0].re;

  const z0 = samplerz(mu0, Math.sqrt(T.d00), sigmin, randomBytes);
  const z1 = samplerz(mu1, Math.sqrt(T.d11), sigmin, randomBytes);

  return [[{ re: z0, im: 0 }], [{ re: z1, im: 0 }]];
}

export function ffldl_fft(G: GramFFT): LDLTree {
  const { L10, D00, D11 } = ldl_fft(G);

  // Your split halves length each time. When length==1, we are at leaf.
  if (D00.length === 1) {
    console.log("leaf D00[0] =", D00[0], "leaf D11[0] =", D11[0]);
    // At the bottom of the recursion, values should be real (im ≈ 0)
    const d00 = D00[0].re;
    const d11 = D11[0].re;

    if (!Number.isFinite(d00) || d00 <= 0) throw new Error(`ffldl_fft leaf bad d00: ${d00}`);
    if (!Number.isFinite(d11) || d11 <= 0) throw new Error(`ffldl_fft leaf bad d11: ${d11}`);

    return { kind: "leaf", d00, d11 };
  }

  // Split D00 and D11 to make two sub-problems
  const [d00_0, d00_1] = splitFft(D00);
  const [d11_0, d11_1] = splitFft(D11);

  // Build child Gram matrices:
  // G0 = [[d00_0, d00_1],[adj(d00_1), d00_0]]
  // G1 = [[d11_0, d11_1],[adj(d11_1), d11_0]]
  const G0: GramFFT = [
    [d00_0, d00_1],
    [adjFft(d00_1), d00_0],
  ];
  const G1: GramFFT = [
    [d11_0, d11_1],
    [adjFft(d11_1), d11_0],
  ];

  return {
    kind: "node",
    l10: L10,
    left: ffldl_fft(G0),
    right: ffldl_fft(G1),
  };
}



/**
 * Normalize the LDL tree so that diagonal leaf values are scaled
 * to roughly match sigma^2 (dev heuristic).
 *
 * We scale all leaf diagonals by a constant factor:
 *   d00 *= factor
 *   d11 *= factor
 *
 * where factor = (sigma^2) / avgLeafDiag
 */
export function normalizeTree(tree: LDLTree, sigma: number): void {
  if (!Number.isFinite(sigma) || sigma <= 0) {
    throw new Error(`normalizeTree: bad sigma=${sigma}`);
  }

  // First pass: compute average diagonal magnitude across leaves
  let sum = 0;
  let count = 0;

  const accumulate = (t: LDLTree) => {
    if (t.kind === "leaf") {
      const a = Math.abs(t.d00);
      const b = Math.abs(t.d11);
      if (Number.isFinite(a) && a > 0) { sum += a; count++; }
      if (Number.isFinite(b) && b > 0) { sum += b; count++; }
      return;
    }
    accumulate(t.left);
    accumulate(t.right);
  };

  accumulate(tree);

  if (count === 0) return;

  const avg = sum / count;
  if (!Number.isFinite(avg) || avg <= 0) return;

  const targetVar = sigma * sigma;
  const factor = targetVar / avg;

  // Second pass: scale leaves
  const scale = (t: LDLTree) => {
    if (t.kind === "leaf") {
      t.d00 *= factor;
      t.d11 *= factor;

      // Optional safety clamps
      if (!Number.isFinite(t.d00) || t.d00 <= 0) throw new Error(`normalizeTree: leaf d00 invalid after scale: ${t.d00}`);
      if (!Number.isFinite(t.d11) || t.d11 <= 0) throw new Error(`normalizeTree: leaf d11 invalid after scale: ${t.d11}`);
      return;
    }
    scale(t.left);
    scale(t.right);
  };

  scale(tree);
}

