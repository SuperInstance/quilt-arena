// inverse-oracle/laws/life_canon.mjs — canonical Conway life step, B3/S23,
// dead borders. Vendored verbatim from quilt-loom/loom/targets_grid.mjs T2
// (the Divergence Foundry's reference oracle). The inverse-oracle mind never
// sees this file's semantics — it only gets probe answers.
export const solve = function solve(input) {
  const g = input.grid, H = g.length, W = g[0].length;
  const out = g.map(row => row.slice());
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
      n += g[nr][nc];
    }
    out[r][c] = g[r][c] ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
  }
  return out;
};
export default solve;
