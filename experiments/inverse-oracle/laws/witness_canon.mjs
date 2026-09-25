// inverse-oracle/laws/witness_canon.mjs — FNV-1a 64-bit witness hash.
// Vendored verbatim from quilt-loom/loom/targets_fleet.mjs (the ledger-seal
// idiom the whole fleet receipts with). This is the OPAQUE control law: no
// probe strategy may infer it; the honest instrument must say so.
export const solve = function solve(input) {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.text.length; i++) {
    h ^= BigInt(input.text.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
};
export default solve;
