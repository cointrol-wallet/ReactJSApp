/** Convert liboqs 14-bit packed public key to raw big-endian uint16 format. */
export function packedToRaw(packed: Uint8Array, level: 512 | 1024): Uint8Array {
  const n = level;
  const start = packed.length === (n * 14 / 8) + 1 ? 1 : 0;
  const coeffs = new Uint16Array(n);
  let idx = start, acc = 0, accBits = 0;
  for (let i = 0; i < n; i++) {
    while (accBits < 14) { acc = (acc << 8) | packed[idx++]; accBits += 8; }
    coeffs[i] = (acc >> (accBits - 14)) & 0x3FFF;
    accBits -= 14;
    acc &= (1 << accBits) - 1;
  }
  const typeHdr = level === 512 ? 0x09 : 0x0A;
  const out = new Uint8Array(2 + n * 2);
  out[0] = typeHdr; out[1] = 0x01;
  for (let i = 0; i < n; i++) {
    out[2 + 2 * i] = (coeffs[i] >> 8) & 0xFF;
    out[2 + 2 * i + 1] = coeffs[i] & 0xFF;
  }
  return out;
}

/** Convert raw big-endian uint16 Falcon public key to liboqs 14-bit packed format. */
export function rawToPacked(raw: Uint8Array, level: 512 | 1024): Uint8Array {
  const n = level;
  const coeffs = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    coeffs[i] = ((raw[2 + 2 * i] << 8) | raw[2 + 2 * i + 1]) & 0x3FFF;
  }
  const totalBits = n * 14;
  const out = new Uint8Array(1 + Math.ceil(totalBits / 8));
  out[0] = level === 512 ? 0x09 : 0x0A;
  let acc = 0, accBits = 0, outIdx = 1;
  for (let i = 0; i < n; i++) {
    acc = (acc << 14) | (coeffs[i] & 0x3FFF);
    accBits += 14;
    while (accBits >= 8) {
      accBits -= 8;
      out[outIdx++] = (acc >> accBits) & 0xFF;
      acc &= (1 << accBits) - 1;
    }
  }
  if (accBits > 0) out[outIdx] = (acc << (8 - accBits)) & 0xFF;
  return out;
}
