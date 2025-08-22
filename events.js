// events.js
console.log("events.js loaded");

import { $, state, pushSnapshot, popSnapshot, swapRowsInTeam, rotateSides180, logic } from './store.js';
import { render } from './render.js';
import { pickServe } from './serve-pick.js';
import { applyRally } from './rally.js';
import { nextBoxIndexForTeam } from './tally.js';
import { clearCanvas, clearStorage, unlockCanvas } from './sign-card.js';
import { createInitialState } from './state.js';
import { uiStack } from './store.js';
import { clearSaved, saveNow } from './persist.js';

function playersReady() {
  const vals = [
    state.players?.A?.[0],
    state.players?.A?.[1],
    state.players?.B?.[0],
    state.players?.B?.[1],
  ];
  return vals.every(v => (v ?? '').trim().length > 0);
}

function serverPicked() {
  // Using badges set by pickServe() is the most reliable indicator
  return !!state.badges?.serving?.team;
}

// Helper: is game ended (Sign Card visible)?
function gameEnded() {
  const sc = logic.getScores?.() ?? {1:0, 2:0};
  return (sc[1] >= state.pointsToWin) || (sc[2] >= state.pointsToWin);
}

/* ====== NEW: Save PNG helpers ====== */
function sanitizeFilename(s) {
  const bad = /[\\\/:*?"<>|]+/g; // remove illegal chars
  return (s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(bad, '')
    .slice(0, 120);
}
function makePngFilename() {
  const div = sanitizeFilename(state.division || '');
  const aTop = sanitizeFilename(state.players?.A?.[0] || 'Player A1');
  const aBot = sanitizeFilename(state.players?.A?.[1] || 'Player A2');
  const bTop = sanitizeFilename(state.players?.B?.[0] || 'Player B1');
  const bBot = sanitizeFilename(state.players?.B?.[1] || 'Player B2');

  const names = `${aTop} & ${aBot} vs ${bTop} & ${bBot}`;
  return (div ? `${div} - ${names}` : names) + '.png';
}
async function saveWholeAppAsPng() {
  const node = document.body; // capture app content
  // Guard: html2canvas loaded?
  const h2c = window.html2canvas;
  if (typeof h2c !== 'function') {
    alert('Save PNG failed: html2canvas not loaded.');
    return;
  }

  // Temporarily hide the Save button itself so it doesn’t appear in the image
  const btn = $('savePngBtn');
  const prevDisplay = btn ? btn.style.display : null;
  if (btn) btn.style.display = 'none';

  try {
    // Ensure scroll to top so everything is in view height (optional)
    window.scrollTo({ top: 0 });

    const canvas = await h2c(node, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || '#ffffff',
      useCORS: true,
      scale: window.devicePixelRatio || 1,
      logging: false
    });

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = makePngFilename();
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    console.warn('[save-png] capture failed', e);
    alert('Could not save PNG.');
  } finally {
    if (btn && prevDisplay !== null) btn.style.display = prevDisplay;
  }
}
/* ====== /NEW ====== */

export function bindEvents() {
  // Name inputs
  ['A_top_input','A_bot_input','B_top_input','B_bot_input'].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => {
      state.players.A[0] = $('A_top_input').value;
      state.players.A[1] = $('A_bot_input').value;
      state.players.B[0] = $('B_top_input').value;
      state.players.B[1] = $('B_bot_input').value;
      pushSnapshot();
      render();
    });
  });

  // Points
  $('pts11')?.addEventListener('change', e => {
    if (e.target.checked) { state.pointsToWin = 11; state.midPoint = 6; pushSnapshot(); render(); }
  });
  $('pts15')?.addEventListener('change', e => {
    if (e.target.checked) { state.pointsToWin = 15; state.midPoint = 8; pushSnapshot(); render(); }
  });

  // Manual sides swap (setup only)
  $('swapSidesBtn')?.addEventListener('click', () => {
    pushSnapshot();
    rotateSides180();
    render();
  });

  // Serve pick widgets
  $('BL_serve')?.addEventListener('change', () => { pickServe('BL'); pushSnapshot(); render(); });
  $('TR_serve')?.addEventListener('change', () => { pickServe('TR'); pushSnapshot(); render(); });

  // ===== Score Card acts as Start Rally trigger, but only when ready, idle, and NOT ended =====
  const scoreCard = document.querySelector('.score-card');
  if (scoreCard) {
    scoreCard.addEventListener('click', () => {
      // Block while a rally is live
      if (state.rallyLive) {
        console.log('[score-card] Ignored: rally already live');
        return;
      }

      // Block if match ended (Sign Card visible)
      if (gameEnded()) {
        console.log('[score-card] Ignored: game ended (Sign Card visible)');
        return;
      }

      const readyPlayers = playersReady();
      const picked = serverPicked();
      console.log('[score-card] click idle → playersReady=', readyPlayers, 'serverPicked=', picked);

      if (!readyPlayers || !picked) {
        // Not ready yet; render() already shows the message “Input players and pick server”
        return;
      }

      if (!state.started) {
        state.started = true;
        console.log('[score-card] First start → state.started = true');
      }
      state.phase = 'playing';
      state.rallyLive = true;
      console.log('[score-card] Rally started → phase=', state.phase, 'rallyLive=', state.rallyLive);
      pushSnapshot();      // allow undo back to setup
      render();
    });
  } else {
    console.warn('[score-card] .score-card not found');
  }

  // Per-team swap (setup only)
  $('swapA')?.addEventListener('click', () => { if (state.phase !== 'setup') return; pushSnapshot(); swapRowsInTeam('A'); render(); });
  $('swapB')?.addEventListener('click', () => { if (state.phase !== 'setup') return; pushSnapshot(); swapRowsInTeam('B'); render(); });

  // Team card click = rally WON (only while LIVE)
  const handleCardWin = (team) => {
    if (!state.started) return;                 // must have started
    if (!state.rallyLive) return;               // must be live
    if (!state.badges.serving.team) return;     // need serve picked

    applyRally(team);

    // Map the last rally classification to status text
    const last = state.rallyTrace?.[state.rallyTrace.length - 1];
    const action = last?.action;
    state.rallyStatus =
      action === 'server_scored' ? 'Point' :
      action === 'hand_change'   ? '2nd serve' :
      action === 'side_out'      ? 'Side out' :
      '';

    state.rallyLive = false;                    // back to idle (red bg)
    render();
  };

  $('teamA')?.addEventListener('click', (e) => {
    if (e.target.closest('input') || e.target.closest('.serve-unit') || e.target.closest('.tmo-btn')) return;
    handleCardWin('A');
  });
  $('teamB')?.addEventListener('click', (e) => {
    if (e.target.closest('input') || e.target.closest('.serve-unit') || e.target.closest('.tmo-btn')) return;
    handleCardWin('B');
  });

  // Time-out buttons (only when IDLE between rallies after start)
  const addTmo = (team) => {
    if (!state.started || state.rallyLive) return; // idle only
    state.tmoMarks ??= { A: [], B: [] };
    const idx = nextBoxIndexForTeam(team);        // 0-based
    state.tmoMarks[team].push(idx);
    state.rallyTrace.push({ action: 'tmo', team, index: idx });
    // No status change on TMO
    render();
  };
  $('tmoA')?.addEventListener('click', (e) => { e.stopPropagation(); addTmo('A'); });
  $('tmoB')?.addEventListener('click', (e) => { e.stopPropagation(); addTmo('B'); });

  // Undo
  $('undo')?.addEventListener('click', () => {
    const rt = state.rallyTrace ?? [];
    const last = rt[rt.length - 1];

    // Undo a TMO (UI-only)
    if (last?.action === 'tmo') {
      rt.pop();
      const arr = state.tmoMarks[last.team] ?? [];
      const k = arr.lastIndexOf(last.index);
      if (k !== -1) arr.splice(k, 1);
      state.rallyStatus = 'Replay';             // per requirement
      render();
      return;
    }

    // Undo a rally (logic + UI trace)
    if ((rt.length ?? 0) > 0) {
      const ok = logic.undo();
      if (!ok) return;

      const t = rt.pop();

      // Reverse autoswap if needed
      if (t.autoswapped) {
        rotateSides180();
        state.autoswapDone = t.prevAutoswapDone;
      }

      // Reverse rally UI (badges/rows)
      const flip = (b)=>{ b.row = b.row === 'top' ? 'bot' : 'top'; };
      switch (t.action) {
        case 'server_scored': {
          flip(state.badges.serving);
          flip(state.badges.receiving);
          const team = t.prevServingUi;
          const p = state.players[team];
          [p[0], p[1]] = [p[1], p[0]];
          break;
        }
        case 'hand_change':
          flip(state.badges.serving);
          flip(state.badges.receiving);
          break;
        case 'side_out':
          state.badges.serving   = { team: t.prevServingUi,   row: t.prevServingRow };
          state.badges.receiving = { team: t.prevReceivingUi, row: t.prevReceivingRow };
          break;
      }

      // After undoing a rally, remain IDLE and set status to Replay
      state.rallyLive = false;
      state.rallyStatus = 'Replay';

      // If no rallies remain, revert to setup fully
      if ((state.rallyTrace?.length ?? 0) === 0) {
        state.phase = 'setup';
        state.started = false;
        state.autoswapDone = false;
        state.servePick = { BL:false, TR:false };
        state.badges.serving   = { team:null, row:null };
        state.badges.receiving = { team:null, row:null };
      }

      render(); // ← render() will hide the Sign Card if gameEnded() is now false, and restore score-card behavior
      return;
    }

    // No rallies to undo → back to setup if started (pre-start snapshot)
    if (state.started && !state.rallyLive) {
      state.started = false;
      state.phase = 'setup';
      state.autoswapDone = false;
      state.servePick = { BL:false, TR:false };
      state.badges.serving   = { team:null, row:null };
      state.badges.receiving = { team:null, row:null };
      state.rallyLive = false;
      state.rallyStatus = 'Replay';
      render();
    } else {
      if (popSnapshot()) {
        state.rallyStatus = 'Replay';
        render();
      }
    }
  });

  // ===== RESET: confirmation modal + full wipe =====
  const resetBtn = $('resetBtn');
  const modal = $('resetModal');
  const confirmBtn = $('confirmResetBtn');
  const cancelBtn = $('cancelResetBtn');

  const showModal = () => { if (modal) modal.style.display = ''; };
  const hideModal = () => { if (modal) modal.style.display = 'none'; };

  resetBtn?.addEventListener('click', showModal);
  cancelBtn?.addEventListener('click', hideModal);
  modal?.querySelector('.modal-backdrop')?.addEventListener('click', hideModal);

  confirmBtn?.addEventListener('click', () => {
  try {
    // 1) Clear persisted match + signature image
    clearSaved();                // removes pb_match_v1
    // (optional: redundant because clearStorage() below also removes it)
    // try { localStorage.removeItem('pb_sign_v1'); } catch {}

    // 2) Reset logic completely
    if (typeof logic.reset === 'function') logic.reset();

    // 3) Reset UI state in-place to a fresh initial object
    const fresh = createInitialState();
    Object.keys(state).forEach(k => { delete state[k]; });
    Object.assign(state, fresh);

    // 4) Clear UI snapshot stack and seed initial snapshot
    if (Array.isArray(uiStack)) uiStack.length = 0;
    pushSnapshot();

    // 5) Clear + unlock the signature pad (same as Clear button)
    clearCanvas();
    clearStorage();
    unlockCanvas();

    // 6) Force repaint and persist immediately
    state.rallyLive = false;
    render();
    saveNow();
  } finally {
    hideModal();
  }
  });

  /* ===== NEW: wire Save PNG button ===== */
  $('savePngBtn')?.addEventListener('click', saveWholeAppAsPng);
}
