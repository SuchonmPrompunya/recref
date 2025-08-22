// tally.js — paper-style tally with wrap-friendly layout (TMO above its own box)
import { $, state, logic } from './store.js';

/** Next inline box index for a UI team ('A'|'B') */
export function nextBoxIndexForTeam(uiTeam) {
  const map = state.uiToLogical;                   // {A:1,B:2} or {A:2,B:1}
  const scores = logic.getScores();                // {1: x, 2: y}
  const logical = map[uiTeam];                     // 1 or 2
  return scores[logical] ?? 0;                     // 0-based slot
}

/** Build tally data for a UI team from ServeLogic histories */
function buildTallyData(uiTeam) {
  const hist  = logic.getHistory();        // winners per rally (1|2)
  const sHist = logic.getServerHistory();  // server BEFORE each rally
  const hHist = logic.getHandHistory();    // hand BEFORE each rally

  const running = { 1: 0, 2: 0 };          // next box to strike per logical team
  const marks = {};                         // {index: '/', '\\'}
  const sideouts = new Set();               // indexes where a side-out bar shows

  const uiFor = (logicalTeam) => (state.uiToLogical.A === logicalTeam ? 'A' : 'B');

  for (let r = 0; r < hist.length; r++) {
    const prevServer = sHist[r];
    const prevHand   = hHist[r];
    const winner     = hist[r];

    if (winner === prevServer) {
      // Server scored → slash in that team's next box
      const idx = running[prevServer];
      const handSlash = (prevHand === 1) ? '/' : '\\';
      const ui = uiFor(prevServer);
      if (ui === uiTeam) marks[idx] = handSlash;
      running[prevServer]++;
    } else {
      // Receiver scored; if server was on 2nd hand, mark side-out at this server's next box
      if (prevHand === 2) {
        const ui = uiFor(prevServer);
        if (ui === uiTeam) sideouts.add(running[prevServer]);
      }
      // If hand was 1, no tally mark here (hand change is shown by slashes pattern)
    }
  }

  const rawTmo = (state.tmoMarks?.[uiTeam] ?? []);
  const tmoSet = new Set(rawTmo);
  return { marks, sideouts, tmoSet };
}

/** Render both tallies (A & B). Now visible from START; TMO only after start & while idle. */
export function renderTallies() {
  const started = !!state.started;
  const live = !!state.rallyLive;               // true while ball in play
  const pts = state.pointsToWin;                // 11 or 15
  const swapIdx = state.midPoint - 1;           // 5 (for 11) or 7 (for 15)

  const A = $('tallyA');
  const B = $('tallyB');
  const tmoA = $('tmoA');
  const tmoB = $('tmoB');

  // Always show tally containers (even before start; overrides HTML inline style)
  const wrapA = A?.parentElement;
  const wrapB = B?.parentElement;
  if (wrapA) wrapA.style.display = '';
  if (wrapB) wrapB.style.display = '';

  // TMO buttons: only after start AND while idle
  const showTmo = started && !live;
  [tmoA, tmoB].forEach(btn => {
    if (!btn) return;
    btn.style.display = showTmo ? '' : 'none';
    btn.disabled = !showTmo;
  });

  const mount = (uiTeam, root) => {
    if (!root) return;

    const { marks, sideouts, tmoSet } = buildTallyData(uiTeam);

    root.style.setProperty('--pts', String(pts));
    root.innerHTML = '';

    // Wrap-friendly layout:
    // <div class="tally-grid">
    //   <div class="tally-col"> <div class="tally-tmo-cell">TMO?</div> <div class="tally-box">...</div> </div>
    //   ...
    // </div>
    const grid = document.createElement('div');
    grid.className = 'tally-grid';

    for (let i = 0; i < pts; i++) {
      const col = document.createElement('div');
      col.className = 'tally-col';

      // TMO cell (above box)
      const tmoCell = document.createElement('div');
      tmoCell.className = 'tally-tmo-cell';
      if (tmoSet.has(i)) {
        const label = document.createElement('div');
        label.className = 'tmo-mark';
        label.textContent = 'TMO';
        tmoCell.appendChild(label);
      }
      col.appendChild(tmoCell);

      // Box
      const box = document.createElement('div');
      box.className = 'tally-box';
      if (i === swapIdx) box.classList.add('swap');

      // Number
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(i + 1);
      box.appendChild(num);

      // Slash for points
      const m = marks[i];
      if (m === '/') {
        const s = document.createElement('div');
        s.className = 'slash forward';
        box.appendChild(s);
      } else if (m === '\\') {
        const s = document.createElement('div');
        s.className = 'slash backward';
        box.appendChild(s);
      }

      // Side-out vertical bar at this box
      if (sideouts.has(i)) {
        const bar = document.createElement('div');
        bar.className = 'sideout';
        box.appendChild(bar);
      }

      col.appendChild(box);
      grid.appendChild(col);
    }

    root.appendChild(grid);
  };

  // Render both teams—visible immediately; marks appear as rallies are played
  mount('A', A);
  mount('B', B);
}
