#!/usr/bin/env python3
# inverse-oracle/charts.py — the perception receipts, drawn.
# Palette = the SuperInstance kit (same as e11/e12 charts).
import json, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.font_manager as fm
for f in ['/usr/share/fonts/truetype/chinese/NotoSansSC-Regular.ttf',
          '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
    if os.path.exists(f):
        fm.fontManager.addfont(f)
import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['Noto Sans SC', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

HERE = os.path.dirname(os.path.abspath(__file__))
INK, PAPER = '#1a2332', '#fbfaf7'
BLUE, ORANGE, TEAL, GRAY, RED = '#2f6f8f', '#c96f2e', '#3d8a7d', '#9aa1ab', '#a94438'

with open(os.path.join(HERE, 'outputs', 'results.json')) as f:
    R = json.load(f)

BUDGETS = R['meta']['budgets']
variants = [d for d in R['discovery'] if d['tier'] == 'variant']

def curve(arm, fn):
    ys = []
    for b in BUDGETS:
        vs = [d for d in variants if d['arm'] == arm and d['budget'] == b]
        ys.append(fn(vs))
    return ys

# ── chart 1: exact recovery + held-out agreement ────────────────────────────
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.4, 4.6), constrained_layout=True)
fig.patch.set_facecolor(PAPER)
for ax in (ax1, ax2):
    ax.set_facecolor(PAPER)
    ax.spines[['top', 'right']].set_visible(False)
    ax.spines[['left', 'bottom']].set_color(GRAY)
    ax.tick_params(colors=INK, labelsize=9)
    ax.grid(color=GRAY, alpha=0.18, lw=0.6)

ARMS = [('adaptive', TEAL, 'o', 'adaptive (economy)'), ('structured', BLUE, 's', 'structured (textbook battery)'), ('mechanical', RED, '^', 'mechanical (random)')]
for arm, c, m, label in ARMS:
    ax1.plot(BUDGETS, curve(arm, lambda vs: sum(1 for d in vs if d['exactHit']) / max(1, len(vs))), color=c, marker=m, lw=1.8, ms=5, label=label)
    ax2.plot(BUDGETS, curve(arm, lambda vs: sum(d['heldOut'] for d in vs) / max(1, len(vs))), color=c, marker=m, lw=1.8, ms=5, label=label)
ax1.set_title('exact ground-truth recovery — 10 off-spec laws', color=INK, fontsize=11)
ax1.set_ylabel('fraction of laws exactly recovered')
ax1.set_xlabel('probe ration (answers bought)')
ax2.set_title('behavioral agreement on 200 fresh inputs', color=INK, fontsize=11)
ax2.set_ylabel('mean held-out agreement')
ax2.set_xlabel('probe ration (answers bought)')
for ax in (ax1, ax2):
    ax.set_ylim(-0.04, 1.06)
    ax.legend(frameon=False, fontsize=8.5, loc='lower right')
fig.savefig(os.path.join(HERE, 'outputs', 'recovery_curves.png'), dpi=160, facecolor=PAPER)
plt.close(fig)

# ── chart 2: recovery cost by law family (the two-sided dividend) ───────────
fams = ['life.v0', 'life.v1', 'life.v2', 'life.v3', 'life.v4', 'reversi.v0', 'reversi.v1', 'reversi.v2', 'reversi.v3', 'reversi.v4']
first = {arm: [] for arm, _, _, _ in ARMS}
for law in fams:
    for arm, _, _, _ in ARMS:
        rows = [d for d in variants if d['arm'] == arm and d['law'] == law and d['exactHit']]
        first[arm].append(min((d['budget'] for d in rows), default=None))
fig2, ax = plt.subplots(figsize=(9.6, 4.4), constrained_layout=True)
fig2.patch.set_facecolor(PAPER)
ax.set_facecolor(PAPER)
ax.spines[['top', 'right']].set_visible(False)
ax.spines[['left', 'bottom']].set_color(GRAY)
ax.tick_params(colors=INK, labelsize=8.6)
ax.grid(color=GRAY, alpha=0.18, lw=0.6, axis='y')
x = range(len(fams))
W = 0.26
for i, (arm, c, m, label) in enumerate(ARMS):
    vals = [(v if v is not None else 40) for v in first[arm]]
    ax.bar([xx + (i - 1) * W for xx in x], vals, width=W, color=c, label=label, alpha=0.88)
for xx, v in zip(x, first['adaptive']):
    if v is None:
        ax.text(xx, 1.2, 'never', ha='center', fontsize=7.5, color=RED, rotation=90)
ax.set_xticks(list(x))
ax.set_xticklabels(fams, rotation=38, ha='right')
ax.axhline(40, color=RED, lw=1, ls=':')
ax.text(len(fams) - 0.4, 40.8, '= never recovered (mechanical, all laws)', fontsize=8, color=RED, ha='right')
ax.set_ylabel('first budget with exact recovery')
ax.set_title('the probe economy is two-sided: adaptivity wins masks, isolation wins ray-identity', color=INK, fontsize=11)
ax.legend(frameon=False, fontsize=8.5)
fig2.savefig(os.path.join(HERE, 'outputs', 'recovery_cost.png'), dpi=160, facecolor=PAPER)
plt.close(fig2)

# ── chart 3: identification + opacity receipt panel ─────────────────────────
fig3, (ax3, ax4) = plt.subplots(1, 2, figsize=(12.4, 4.2), constrained_layout=True)
fig3.patch.set_facecolor(PAPER)
for ax in (ax3, ax4):
    ax.set_facecolor(PAPER)
    ax.spines[['top', 'right']].set_visible(False)
    ax.spines[['left', 'bottom']].set_color(GRAY)
    ax.tick_params(colors=INK, labelsize=9)
ident = R['identification']
ids = [i['law'] for i in ident]
shapes = [i['shape'] for i in ident]
ax3.bar(range(len(ids)), [1] * len(ids), color=[TEAL if i['hit'] else RED for i in ident], alpha=0.85)
ax3.set_xticks(range(len(ids)))
ax3.set_xticklabels(ids, rotation=40, ha='right', fontsize=8)
ax3.set_yticks([])
ax3.set_ylim(0, 1.25)
for xx, i in enumerate(ident):
    ax3.text(xx, 1.04, i['shape'], ha='center', fontsize=7.2, color=INK, rotation=0)
ax3.set_title(f'law-class identification: {sum(1 for i in ident if i["hit"])}/{len(ident)} in ONE probe\n(output shape is a free signature)', color=INK, fontsize=10.5)
arms = ['mechanical', 'structured', 'adaptive']
vals = [next(o['heldOut'] for o in R['opacity'] if o['arm'] == a) for a in arms]
ax4.bar(arms, vals, color=[GRAY, BLUE, TEAL], alpha=0.85, width=0.55)
ax4.axhline(0.02, color=RED, lw=1, ls=':')
ax4.text(0.02, 0.03, 'chance floor (2^-64)', fontsize=8, color=RED)
for i, v in enumerate(vals):
    ax4.text(i, v + 0.02, f'{v:.3f}', ha='center', fontsize=9, color=INK)
ax4.set_ylim(0, 1.1)
ax4.set_ylabel('held-out agreement after 32 probes')
ax4.set_title('the opaque law: witness_fnv — the instrument says OPAQUE,\nit does not hallucinate a model', color=INK, fontsize=10.5)
fig3.savefig(os.path.join(HERE, 'outputs', 'identification_opacity.png'), dpi=160, facecolor=PAPER)
plt.close(fig3)

print('charts written:', 'recovery_curves.png recovery_cost.png identification_opacity.png')
