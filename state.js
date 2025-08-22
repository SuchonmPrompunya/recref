// state.js — single source of truth + snapshot stack

export function createInitialState() {
  return {
    phase: 'setup',               // 'setup' | 'playing'
    started: false,               // game UI left setup at least once
    rallyLive: false,             // true = ball in play, false = idle (between rallies)
    rallyStatus: '',              // "Point" | "Second serve" | "Side out" | "Replay" | ''

    pointsToWin: 11,              // 11 or 15
    midPoint: 6,                  // 6 (for 11) or 8 (for 15)
    autoswapDone: false,
    orientation: 'A-left',        // 'A-left' | 'B-left'

    /** NEW: Division/title shown at top */
    division: '',

    players: { A: ["", ""], B: ["", ""] },

    badges: {
      serving:   { team: null, row: null },    // row: 'top'|'bot'
      receiving: { team: null, row: null }
    },

    servePick: { BL: false, TR: false },       // setup only
    uiToLogical: { A: 1, B: 2 },               // set when serving picked

    // UI-only marks
    tmoMarks: { A: [], B: [] },

    // debug mirror (optional)
    logic: {
      server: '-',
      hand: '-',
      scores: {1:0, 2:0},
      history: [],
      serverHistory: [],
      handHistory: []
    },

    rallyTrace: []
  };
}

// deep clone for snapshots
export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

// simple stack
const stack = [];
export function pushState(s) { stack.push(cloneState(s)); }
export function canUndo() { return stack.length > 1; }
export function undoState() {
  if (stack.length <= 1) return null;
  stack.pop();
  return cloneState(stack[stack.length - 1]);
}
export function clearStack() { stack.length = 0; }
export function peekState()  { return stack[stack.length - 1] ?? null; }
