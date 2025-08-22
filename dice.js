// dice.js — Image-based chooser (Drillyard/Naya/Livwell) with 36/32/32 weighting
console.log("dice.js loaded");

// Labels for alt text
const LABELS = {
  1: 'Drillyard',
  2: 'Naya',
  3: 'Livwell',
};

// Image filenames (same folder as index.html)
const IMAGES = {
  1: 'Drillyard.jpg',
  2: 'Naya.png',
  3: 'Livwell.png',
};

const $ = (id) => document.getElementById(id);

// ---------- RNG helpers ----------
function weightedFirst() {
  // 36% Drillyard, 32% Naya, 32% Livwell
  const n = Math.floor(Math.random() * 100); // 0..99
  if (n < 36) return 1;        // Drillyard
  if (n < 68) return 2;        // Naya (36–67)
  return 3;                    // Livwell (68–99)
}
function secondFromRemaining(a) {
  const rem = [1, 2, 3].filter(v => v !== a);
  return rem[Math.floor(Math.random() * 2)]; // 50/50
}
function finalOutcome(a, b) {
  return Math.random() < 0.5 ? a : b; // 50/50 between shown choices
}

// ---------- modal helpers ----------
function setVerdictClass(ok) {
  const dlg = $('diceModal')?.querySelector('.modal-dialog');
  dlg?.classList.remove('is-success', 'is-error');
  dlg?.classList.add(ok ? 'is-success' : 'is-error');
}
function clearVerdictClass() {
  const dlg = $('diceModal')?.querySelector('.modal-dialog');
  dlg?.classList.remove('is-success', 'is-error');
}

function resetModal() {
  clearVerdictClass();

  const verdict = $('diceVerdict');
  if (verdict) verdict.textContent = '';

  const choices = $('diceChoices');
  const finalV  = $('diceFinal');
  if (choices) { choices.style.display = ''; choices.classList.remove('hidden'); }
  if (finalV)  { finalV.classList.add('hidden'); finalV.innerHTML = ''; }

  const a = $('diceOptA');
  const b = $('diceOptB');
  if (a) { a.innerHTML = ''; a.dataset.val = ''; a.classList.remove('disabled'); }
  if (b) { b.innerHTML = ''; b.dataset.val = ''; b.classList.remove('disabled'); }
}

function showModal(){ const m=$('diceModal'); if (m) m.style.display=''; }
function hideModal(){ const m=$('diceModal'); if (m){ m.style.display='none'; resetModal(); } }

// ---------- DOM helpers ----------
function setOptionImage(el, id) {
  if (!el) return;
  el.innerHTML = '';
  const img = document.createElement('img');
  img.src = IMAGES[id];
  img.alt = LABELS[id];
  img.decoding = 'async';
  img.loading = 'eager';
  el.appendChild(img);
  el.dataset.val = String(id);
  el.classList.remove('disabled');
}

// ---------- round flow ----------
function startRound() {
  resetModal();

  const first  = weightedFirst();
  const second = secondFromRemaining(first);

  setOptionImage($('diceOptA'), first);
  setOptionImage($('diceOptB'), second);

  showModal();
}

function onPick(evt){
  const pickedStr = evt.currentTarget?.dataset?.val;
  if (!pickedStr) return;
  const picked = Number(pickedStr);

  const a = $('diceOptA'); a?.classList.add('disabled');
  const b = $('diceOptB'); b?.classList.add('disabled');

  const shownA = Number(a?.dataset?.val || '0');
  const shownB = Number(b?.dataset?.val || '0');

  const outcome = finalOutcome(shownA, shownB);
  const correct = (outcome === picked);
  setVerdictClass(correct);

  const verdictEl = $('diceVerdict');
  if (verdictEl) verdictEl.textContent = correct ? 'Correct' : 'Wrong';

  const choices = $('diceChoices');
  if (choices) choices.style.display = 'none';

  const finalView = $('diceFinal');
  if (finalView) {
    finalView.innerHTML = `
      <div class="result-card ${correct ? 'ok' : 'fail'}" role="status" aria-live="polite">
        <img src="${IMAGES[outcome]}" alt="${LABELS[outcome]}" />
      </div>
    `;
    finalView.classList.remove('hidden');
  }
}

// ---------- public init ----------
export function initDice(){
  $('diceBtn')?.addEventListener('click', startRound);
  $('diceOptA')?.addEventListener('click', onPick);
  $('diceOptB')?.addEventListener('click', onPick);

  const backdrop = $('diceModal')?.querySelector('.modal-backdrop');
  backdrop?.addEventListener('click', hideModal);

  if (typeof window !== 'undefined') {
    window.dice = { start: startRound, close: hideModal };
  }
}
