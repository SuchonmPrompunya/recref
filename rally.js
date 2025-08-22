// rally.js
console.log("rally.js loaded");

import { state, logic, rotateSides180, leftTeam, swapRowsInTeam } from './store.js';

export function startGameIfNeeded() {
  if (state.phase !== 'playing') state.phase = 'playing';
}

export function applyRally(uiWinner /* 'A'|'B' */) {
  startGameIfNeeded();

  // Mappings & snapshots
  const map = state.uiToLogical;
  const winnerLogical = map[uiWinner];
  const prevServingUi    = state.badges.serving.team;
  const prevServingRow   = state.badges.serving.row;
  const prevReceivingUi  = state.badges.receiving.team;
  const prevReceivingRow = state.badges.receiving.row;
  const prevAutoswapDone = state.autoswapDone;

  // Core logic forward
  logic.addServe(winnerLogical);

  const curServer = logic.getServer();               // 1|2
  const prevServingLogical = map[prevServingUi];     // 1|2
  let action;

  // Rally classification & UI
  if (winnerLogical === prevServingLogical) {
    // Server scored → flip badges + swap rows in serving team
    action = 'server_scored';
    state.badges.serving.row   = (state.badges.serving.row === 'top') ? 'bot' : 'top';
    state.badges.receiving.row = (state.badges.receiving.row === 'top') ? 'bot' : 'top';
    swapRowsInTeam(prevServingUi);
  } else if (curServer === prevServingLogical) {
    // Hand change → flip badges only
    action = 'hand_change';
    state.badges.serving.row   = (state.badges.serving.row === 'top') ? 'bot' : 'top';
    state.badges.receiving.row = (state.badges.receiving.row === 'top') ? 'bot' : 'top';
  } else {
    // Side-out → move badges to other team’s correct diagonal; no name swaps
    action = 'side_out';
    const newServingUi = (map.A === curServer) ? 'A' : 'B';
    const isLeft = (newServingUi === leftTeam());
    state.badges.serving   = { team: newServingUi,                 row: isLeft ? 'bot' : 'top' };
    state.badges.receiving = { team: (newServingUi === 'A') ? 'B' : 'A', row: isLeft ? 'top' : 'bot' };
  }

  // Auto-swap at midpoint (once), AFTER rally UI
  let didAutoswap = false;
  if (!state.autoswapDone) {
    const sc = logic.getScores();
    const reached = Math.max(sc[1], sc[2]);
    if (reached === state.midPoint) {
      rotateSides180();
      state.autoswapDone = true;
      didAutoswap = true;
    }
  }

  // Trace for undo
  state.rallyTrace ??= [];
  state.rallyTrace.push({
    action,
    prevServingUi,
    prevServingRow,
    prevReceivingUi,
    prevReceivingRow,
    autoswapped: didAutoswap,
    prevAutoswapDone
  });
}

// Exported so events.js can call it
export function undoLast() {
  if ((state.rallyTrace?.length ?? 0) === 0) return false;
  if (!logic.undo()) return false;

  const t = state.rallyTrace.pop();

  // Reverse autoswap first (it happened after rally UI)
  if (t.autoswapped) {
    rotateSides180();
    state.autoswapDone = t.prevAutoswapDone;
  }

  // Reverse rally UI
  const flip = (b)=>{ b.row = b.row === 'top' ? 'bot' : 'top'; };
  switch (t.action) {
    case 'server_scored':
      flip(state.badges.serving);
      flip(state.badges.receiving);
      // revert name swap on serving team
      {
        const team = t.prevServingUi;
        const p = state.players[team];
        [p[0], p[1]] = [p[1], p[0]];
      }
      break;
    case 'hand_change':
      flip(state.badges.serving);
      flip(state.badges.receiving);
      break;
    case 'side_out':
      state.badges.serving   = { team: t.prevServingUi,   row: t.prevServingRow };
      state.badges.receiving = { team: t.prevReceivingUi, row: t.prevReceivingRow };
      break;
  }

  // If back to true setup, reset the flags/badges
  if ((state.rallyTrace?.length ?? 0) === 0) {
    state.phase = 'setup';
    state.started = false;                    // <-- reset start gate
    state.servePick = { BL:false, TR:false };
    state.badges.serving   = { team:null, row:null };
    state.badges.receiving = { team:null, row:null };
    state.autoswapDone = false;
  }
  return true;
}
