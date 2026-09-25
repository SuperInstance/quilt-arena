// Reversi — flipped cells — elite specimen #1
// family: ray_loop   hash: 56c863e30a
// bred by the quilt-loom Divergence Foundry (offline run, gen curve in outputs/results.json)
// contract: Given a Reversi grid (0 empty, 1/2 players), and a move (r,c) by `player`, return the sorted "r,c" list of ALL cells flipped by the move (the placement cell is not included).
export const solve = function solve(input) {
  const g = input.grid, opp = input.player === 1 ? 2 : 1;
  const flips = new Set();
  const DIRS = [[-1,1],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[1,-1],[-1,0]];
  for (const [dr, dc] of DIRS) {
    const run = [];
    let r = input.r + dr, c = input.c + dc;
    while (r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === opp) {
      run.push([r, c]); r += dr; c += dc;
    }
    if (run.length && r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === input.player)
      run.forEach(([fr, fc]) => flips.add(fr + "," + fc));
  }
  const out = [...flips]; out.sort(); return out;
};
export default solve;