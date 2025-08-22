// store.js
console.log("store.js loaded");

import { createInitialState } from './state.js';
import { ServeLogic } from './logic.js';

export const $ = (id) => document.getElementById(id);

// Singletons
export const state = createInitialState();
export const uiStack = [];
export const logic = new ServeLogic();

// deep clone
const clone = (o) => JSON.parse(JSON.stringify(o));

export function pushSnapshot() { uiStack.push(clone(state)); }
export function popSnapshot() {
  if (uiStack.length > 1) {
    uiStack.pop();
    const last = uiStack[uiStack.length - 1];
    Object.assign(state, clone(last));
    return true;
  }
  return false;
}

// Orientation helpers
export const leftTeam  = () => state.orientation === 'A-left' ? 'A' : 'B';
export const rightTeam = () => leftTeam() === 'A' ? 'B' : 'A';

// Row swap within a team (used when SERVER SCORES)
export function swapRowsInTeam(team) {
  const p = state.players[team];
  [p[0], p[1]] = [p[1], p[0]];
}
export function flipBadgeRow(b) { if (b?.row) b.row = b.row === 'top' ? 'bot' : 'top'; }

/**
 * 180° ends change (midpoint):
 *  - swap columns (orientation)
 *  - swap rows within both teams (people rotate with the court)
 *  - flip badge rows so badges stick to the same person
 *  - swap BL/TR bookkeeping (corners invert across the net)
 * Matches old working app.js behavior.
 */
export function rotateSides180() {
  state.orientation = state.orientation === 'A-left' ? 'B-left' : 'A-left';
  swapRowsInTeam('A');
  swapRowsInTeam('B');
  flipBadgeRow(state.badges.serving);
  flipBadgeRow(state.badges.receiving);
  const oldBL = state.servePick.BL;
  state.servePick.BL = state.servePick.TR;
  state.servePick.TR = oldBL;
}
