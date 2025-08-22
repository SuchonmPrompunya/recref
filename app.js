// app.js
console.log("app.js loaded");

import { pushSnapshot, state, logic } from './store.js';
import { initDice } from './dice.js';
import { render } from './render.js';
import { bindEvents } from './events.js';
import { ensureServeWidgetsExist } from './serve-pick.js';
import { initSignCard } from './sign-card.js';
import { initPersistence, loadFromStorage, saveNow } from './persist.js';

// NEW: load the Godot bridge once so window.__godotBridge is available
import './godot-bridge.js';

// First paint / boot
ensureServeWidgetsExist();

// Init persistence and try to restore BEFORE seeding any snapshot
initPersistence(state, logic);
const restored = loadFromStorage();

if (!restored) {
  state.rallyTrace = [];
  pushSnapshot();
} else {
  state.rallyLive = false;
  saveNow();
}

render();
bindEvents();
initSignCard();
initDice();
console.log('[app] bindEvents() called; orientation=', state.orientation);

// Debug helpers
window.state  = state;
window.logic  = logic;
window.render = render;
