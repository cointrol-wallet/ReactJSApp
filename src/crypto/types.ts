import { Complex } from "./fft";

export type FFTVec = Complex[];  
export type Poly = bigint[];         // ring element as JS array
export type GramFFT = [[FFTVec, FFTVec], [FFTVec, FFTVec]]; // 2x2 matrix of FFT vectors

export type Basis2 = [[number[], number[]], [number[], number[]]];
export type Gram2  = [[number[], number[]], [number[], number[]]];

export type LDLTree =
  | { kind: "leaf"; d00: number; d11: number } // leaf variances (real, >0)
  | { kind: "node"; l10: FFTVec; left: LDLTree; right: LDLTree };

// Convert number[] -> BigPoly
export function toBigPoly(a: number[]): Poly {
  return a.map((x) => BigInt(x));
}

// Convert BigPoly -> Uint16Array mod q (for DB / Solidity / Uint16 code)
export function bigPolyToUint16(p: Poly, q: bigint = 12289n): Uint16Array {
  const arr = new Uint16Array(p.length);
  for (let i = 0; i < p.length; i++) {
    let v = p[i] % q;
    if (v < 0n) v += q;
    arr[i] = Number(v); // safe because v < q <= 12289 < 2^16
  }
  return arr;
}
