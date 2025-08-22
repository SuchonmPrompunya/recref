// render.js
console.log("render.js loaded");

import { $, state, logic, uiStack } from './store.js';
import { moveServeWidgetsToCorners } from './serve-pick.js';
import { renderTallies } from './tally.js';
import { updateSignCardVisibility } from './sign-card.js';
import { scheduleSave } from './persist.js';   // ensure autosave continues

// Safe DOM helpers
const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = String(value ?? ''); };
const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = String(value ?? ''); };

function allPlayersReady() {
  const vals = [
    state.players?.A?.[0],
    state.players?.A?.[1],
    state.players?.B?.[0],
    state.players?.B?.[1],
  ];
  return vals.every(v => (v ?? '').trim().length > 0);
}
function isServerPicked() { return !!state.badges?.serving?.team; }

export function render() {
  const namesGrid = $('namesGrid'), teamACol = $('teamA'), teamBCol = $('teamB');

  // --- NEW: Division title binding & lock/unlock
  const titleInput = $('divisionInput');
  if (titleInput) {
    // bind once
    if (!titleInput.dataset.bound) {
      titleInput.addEventListener('input', () => {
        state.division = titleInput.value;
        // trigger UI update + autosave via render
        render();
      });
      titleInput.dataset.bound = '1';
    }
    // reflect state into UI and lock state
    titleInput.value = state.division ?? '';
    titleInput.disabled = !!state.started;  // lock when game started
  }

  // Keep A-left/B-left column order
  if (namesGrid && teamACol && teamBCol) {
    const aLeft = state.orientation === 'A-left';
    if (aLeft) {
      if (namesGrid.firstElementChild !== teamACol) namesGrid.insertBefore(teamACol, namesGrid.firstElementChild);
    } else {
      if (namesGrid.firstElementChild !== teamBCol) namesGrid.insertBefore(teamBCol, namesGrid.firstElementChild);
    }
  }

  // Inputs + badges text
  setValue('A_top_input', state.players.A[0]);
  setValue('A_bot_input', state.players.A[1]);
  setValue('B_top_input', state.players.B[0]);
  setValue('B_bot_input', state.players.B[1]);

  // Reset all badges first
  ['A','B'].forEach(t => ['top','bot'].forEach(r => {
    const el = document.getElementById(`${t}_${r}_badge`);
    if (el) { el.className = 'badge'; el.textContent = ''; }
  }));
  // Apply serving/receiving badges
  if (state.badges.serving.team) {
    const el = document.getElementById(`${state.badges.serving.team}_${state.badges.serving.row}_badge`);
    if (el) { el.classList.add('serving'); el.textContent = 'Serving'; }
  }
  if (state.badges.receiving.team) {
    const el = document.getElementById(`${state.badges.receiving.team}_${state.badges.receiving.row}_badge`);
    if (el) { el.classList.add('receiving'); el.textContent = 'Receiving'; }
  }

  // Place/mirror serve widgets in BL/TR
  moveServeWidgetsToCorners();

  // Mirrors from logic (for numeric score)
  const sc        = logic.getScores?.() ?? {1:0,2:0};
  const curServer = logic.getServer?.() ?? '-';
  const curHand   = logic.getHand?.() ?? '-';

  setText('server', curServer);
  setText('hand', curHand);
  setText('s1', sc[1] ?? 0);
  setText('s2', sc[2] ?? 0);
  setText('hist', (logic.getHistory?.() ?? []).join(', '));
  setText('shist', (logic.getServerHistory?.() ?? []).join(', '));
  setText('hhist', (logic.getHandHistory?.() ?? []).join(', '));

  // ===== Score card (sideout score + status) =====
  const scoreEl  = $('sideoutScore');
  const statusEl = $('rallyStatus');

  const started  = !!state.started;
  const live     = !!state.rallyLive;

  const readyPlayers = allPlayersReady();
  const pickedServe  = isServerPicked();
  const readyToStart = readyPlayers && pickedServe;

  if (scoreEl && statusEl) {
    if (!started) {
      statusEl.textContent = '';

      if (!readyToStart) {
        scoreEl.textContent = 'Input players and pick server';
        scoreEl.classList.remove('is-green');
      } else {
        scoreEl.textContent = 'Start Rally';
        scoreEl.classList.add('is-green');
      }
    } else {
      if (curServer === 1 || curServer === 2) {
        const serverScore   = sc[curServer] ?? 0;
        const receiverScore = sc[curServer === 1 ? 2 : 1] ?? 0;
        scoreEl.textContent = `${serverScore} - ${receiverScore} - ${curHand}`;
      } else {
        scoreEl.textContent = '0 - 0 - 2';
      }
      scoreEl.classList.remove('is-green');
      setText('rallyStatus', state.rallyStatus || '');
    }
  }

  // ===== Body background (red idle / white live) =====
  document.body.classList.toggle('rally-live', live);
  document.body.classList.toggle('rally-idle', !live);

  // Start button: safe no-op if removed from HTML
  const startBtn = $('startBtn');
  if (startBtn) startBtn.style.display = live ? 'none' : '';

  // Manual Swap Sides button: hide after start, reappear if undone to setup
  const swapBtn = $('swapSidesBtn');
  if (swapBtn) swapBtn.style.display = started ? 'none' : '';

  // Undo button visible after game has started
  const undoBtn = $('undo');
  if (undoBtn) {
    undoBtn.style.display = started ? '' : 'none';
    const canUndo = started || (uiStack?.length ?? 0) > 1;
    undoBtn.disabled = !canUndo;
  }

  // Hide headings and lock inputs once game has started
  const teamAH = teamACol?.querySelector?.('h2');
  const teamBH = teamBCol?.querySelector?.('h2');
  if (teamAH) teamAH.style.display = started ? 'none' : '';
  if (teamBH) teamBH.style.display = started ? 'none' : '';

  ['A_top_input','A_bot_input','B_top_input','B_bot_input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = started;
  });

  // Whole card becomes tap target after start
  if (teamACol) teamACol.classList.toggle('clickable', started);
  if (teamBCol) teamBCol.classList.toggle('clickable', started);

  // Setup-only controls in cards
  const swapA = $('swapA'), swapB = $('swapB');
  if (swapA) swapA.style.display = started ? 'none' : '';
  if (swapB) swapB.style.display = started ? 'none' : '';

  // Serve widgets visible only during setup
  const pointsRow = document.querySelector('.card.options .points');
  const BL = $('BL_unit'), TR = $('TR_unit');
  if (pointsRow) pointsRow.style.display = started ? 'none' : '';
  if (BL) BL.style.display = started ? 'none' : '';
  if (TR) TR.style.display = started ? 'none' : '';

  // ===== BIG won arrows (inside team cards, above tally) =====
  const hintA = $('wonHintA');
  const hintB = $('wonHintB');
  if (hintA) hintA.style.display = (started && live) ? '' : 'none';
  if (hintB) hintB.style.display = (started && live) ? '' : 'none';

  // L/R arrow text based on orientation
  const isALeft = state.orientation === 'A-left';
  if (started && live) {
    if (isALeft) {
      if (hintA) hintA.textContent = '<-- won';
      if (hintB) hintB.textContent = 'won -->';
    } else {
      if (hintA) hintA.textContent = 'won -->';
      if (hintB) hintB.textContent = '<-- won';
    }
  }

  // ===== Green/black emphasis rules =====
  if (statusEl && scoreEl) {
    statusEl.classList.remove('is-green');
    scoreEl.classList.remove('is-green');

    if (!started) {
      if (readyToStart) scoreEl.classList.add('is-green');
    } else if (live) {
      scoreEl.classList.add('is-green');
    } else {
      statusEl.classList.add('is-green');
    }
  }

  // Tallies + TMO render (TMO shows only when idle)
  renderTallies();

  // ===== Sign Card visibility + Score-card disabled state =====
  const gameHasEnded = (sc[1] >= state.pointsToWin) || (sc[2] >= state.pointsToWin);
  updateSignCardVisibility(gameHasEnded);

  const scoreCard = document.querySelector('.score-card');
  if (scoreCard) {
    scoreCard.classList.toggle('disabled', gameHasEnded);
    scoreCard.setAttribute('aria-disabled', gameHasEnded ? 'true' : 'false');
    const canStartNow = !started && !live && readyToStart && !gameHasEnded;
    scoreCard.classList.toggle('startable', canStartNow);
  }

  // === AUTO-SAVE after each render ===
  scheduleSave();

    // === NEW: push to Godot every render ===
  window.__godotBridge?.push();
}
