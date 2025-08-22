// persist.js — automatic localStorage persistence for state + ServeLogic (with full undo rebuild)
const KEY = 'pb_match_v1';

let st, lg;
let saveTimer = null;

const safeParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
const clone = (o) => JSON.parse(JSON.stringify(o));

function snapshot() {
  return {
    ts: Date.now(),
    state: {
      phase: st.phase,
      started: st.started,
      rallyLive: false,
      rallyStatus: st.rallyStatus,

      pointsToWin: st.pointsToWin,
      midPoint: st.midPoint,
      autoswapDone: st.autoswapDone,
      orientation: st.orientation,

      /** NEW: persist division */
      division: st.division ?? '',

      players: clone(st.players),
      badges: clone(st.badges),
      servePick: clone(st.servePick),
      uiToLogical: clone(st.uiToLogical),

      tmoMarks: clone(st.tmoMarks),
      rallyTrace: clone(st.rallyTrace),
    },
    logic: {
      server: lg.getServer?.() ?? 1,
      hand: lg.getHand?.() ?? 2,
      scores: lg.getScores?.() ?? {1:0,2:0},
      history: lg.getHistory?.() ?? [],
      serverHistory: lg.getServerHistory?.() ?? [],
      handHistory: lg.getHandHistory?.() ?? [],
    }
  };
}

function applyLogic(payload) {
  const L = payload.logic;
  if (!L) return;
  if (typeof lg.reset === 'function') lg.reset();
  const hist = Array.isArray(L.history) ? L.history : [];
  for (const w of hist) {
    const winner = (w === 1 || w === 2) ? w : null;
    if (winner != null) lg.addServe(winner);
  }
}

function applyState(payload) {
  const S = payload.state;
  if (!S) return;

  st.phase = S.phase ?? 'setup';
  st.started = !!S.started;
  st.rallyLive = false;
  st.rallyStatus = S.rallyStatus ?? '';

  st.pointsToWin = Number(S.pointsToWin ?? 11);
  st.midPoint = Number(S.midPoint ?? (st.pointsToWin === 15 ? 8 : 6));
  st.autoswapDone = !!S.autoswapDone;
  st.orientation = S.orientation === 'B-left' ? 'B-left' : 'A-left';

  /** NEW: load division */
  st.division = (typeof S.division === 'string') ? S.division : '';

  st.players = S.players && S.players.A && S.players.B ? clone(S.players) : { A:['',''], B:['',''] };
  st.badges  = S.badges  ? clone(S.badges) : { serving:{team:null,row:null}, receiving:{team:null,row:null} };
  st.servePick = S.servePick ? clone(S.servePick) : { BL:false, TR:false };
  st.uiToLogical = S.uiToLogical ? clone(S.uiToLogical) : { A:1, B:2 };

  st.tmoMarks = S.tmoMarks ? clone(S.tmoMarks) : { A:[], B:[] };
  st.rallyTrace = Array.isArray(S.rallyTrace) ? [...S.rallyTrace] : [];
}

export function initPersistence(stateRef, logicRef) { st = stateRef; lg = logicRef; }

export function loadFromStorage() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  const data = safeParse(raw);
  if (!data || !data.state || !data.logic) return false;
  applyState(data);
  applyLogic(data);
  return true;
}

export function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(snapshot())); }
    catch (e) { console.warn('[persist] save failed', e); }
  }, 120);
}

export function saveNow() {
  try { localStorage.setItem(KEY, JSON.stringify(snapshot())); }
  catch (e) { console.warn('[persist] saveNow failed', e); }
}

export function clearSaved() { try { localStorage.removeItem(KEY); } catch {} }

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { try { saveNow(); } catch {} });
  window.pbPersist = { loadFromStorage, saveNow, clearSaved };
}
