// serve-pick.js
console.log("serve-pick.js loaded");

import { $, state, leftTeam, rightTeam } from './store.js';

export function ensureServeWidgetsExist() {
  let container = $('serveWidgets');
  if (!container) {
    container = document.createElement('div');
    container.id = 'serveWidgets';
    container.className = 'sr-only';
    document.body.appendChild(container);
  }
  if (!$('BL_unit')) {
    const l = document.createElement('label');
    l.id = 'BL_unit'; l.className = 'serve-unit';
    l.innerHTML = `<input type="checkbox" id="BL_serve"/><span>Serve</span>`;
    container.appendChild(l);
  }
  if (!$('TR_unit')) {
    const l = document.createElement('label');
    l.id = 'TR_unit'; l.className = 'serve-unit';
    l.innerHTML = `<input type="checkbox" id="TR_serve"/><span>Serve</span>`;
    container.appendChild(l);
  }
}

export function moveServeWidgetsToCorners() {
  ensureServeWidgetsExist();
  const aLeft = state.orientation === 'A-left';
  const leftColId  = aLeft ? 'teamA' : 'teamB';
  const rightColId = aLeft ? 'teamB' : 'teamA';

  const blHolder = document.querySelector(`#${leftColId} .player-row[data-slot="bot"] .serve-holder`);
  const trHolder = document.querySelector(`#${rightColId} .player-row[data-slot="top"] .serve-holder`);

  const BL_unit = $('BL_unit'), TR_unit = $('TR_unit');
  if (blHolder && BL_unit && BL_unit.parentNode !== blHolder) blHolder.appendChild(BL_unit);
  if (trHolder && TR_unit && TR_unit.parentNode !== trHolder) trHolder.appendChild(TR_unit);

  // Do NOT auto-hide here; render() decides visibility based on first rally.
  // (We only reflect the "checked" state.)
  const BL = $('BL_serve'), TR = $('TR_serve');
  if (BL) BL.checked = !!state.servePick.BL;
  if (TR) TR.checked = !!state.servePick.TR;
}

export function pickServe(corner /* 'BL'|'TR' */) {
  if (corner === 'BL') {
    state.servePick.BL = $('BL_serve').checked;
    state.servePick.TR = false;
  } else {
    state.servePick.TR = $('TR_serve').checked;
    state.servePick.BL = false;
  }

  if (!state.servePick.BL && !state.servePick.TR) {
    state.badges.serving   = { team:null, row:null };
    state.badges.receiving = { team:null, row:null };
    return;
  }

  const lTeam = leftTeam(), rTeam = rightTeam();
  if (state.servePick.BL) {
    state.badges.serving   = { team: lTeam, row:'bot' };
    state.badges.receiving = { team: rTeam, row:'top' };
    state.uiToLogical = (lTeam === 'A') ? {A:1,B:2} : {A:2,B:1};
  } else {
    state.badges.serving   = { team: rTeam, row:'top' };
    state.badges.receiving = { team: lTeam, row:'bot' };
    state.uiToLogical = (rTeam === 'A') ? {A:1,B:2} : {A:2,B:1};
  }
}
