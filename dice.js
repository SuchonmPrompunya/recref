// dice.js — Show one result card with the actual outcome text + verdict on top
console.log("dice.js loaded");

const LABELS = {
  1: 'Drillyard', // 40%
  2: 'Welive', // 30%
  3: 'need sponsor', // 30%
};

const $ = (id) => document.getElementById(id);

// ---------- RNG helpers ----------
function weightedFirst() {
  const n = Math.floor(Math.random() * 100); // 0..99
  if (n < 40) return 1;
  if (n < 70) return 2;
  return 3;
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

  // Clear verdict text at the very top
  const verdict = $('diceVerdict');
  if (verdict) verdict.textContent = '';

  // Reset containers
  const choices = $('diceChoices');
  const finalV  = $('diceFinal');
  if (choices) { choices.style.display = ''; choices.classList.remove('hidden'); }
  if (finalV)  { finalV.classList.add('hidden'); finalV.innerHTML = ''; }

  // Reset option cards
  const a = $('diceOptA');
  const b = $('diceOptB');
  if (a) { a.textContent = ''; a.dataset.val = ''; a.classList.remove('disabled'); }
  if (b) { b.textContent = ''; b.dataset.val = ''; b.classList.remove('disabled'); }
}

function showModal(){ const m=$('diceModal'); if (m) m.style.display=''; }
function hideModal(){ const m=$('diceModal'); if (m){ m.style.display='none'; resetModal(); } }

// ---------- round flow ----------
function startRound() {
  resetModal();

  // Build the two choices
  const first  = weightedFirst();
  const second = secondFromRemaining(first);

  // Paint stacked “cards” (divs)
  const a = $('diceOptA');
  const b = $('diceOptB');
  if (a) { a.textContent = LABELS[first];  a.dataset.val = String(first);  a.classList.remove('disabled'); }
  if (b) { b.textContent = LABELS[second]; b.dataset.val = String(second); b.classList.remove('disabled'); }

  showModal();
}

function onPick(evt){
  const pickedStr = evt.currentTarget?.dataset?.val;
  if (!pickedStr) return;
  const picked = Number(pickedStr);

  // Lock the two cards
  const a = $('diceOptA'); a?.classList.add('disabled');
  const b = $('diceOptB'); b?.classList.add('disabled');

  const shownA = Number(a?.dataset?.val || '0');
  const shownB = Number(b?.dataset?.val || '0');

  // Final 50/50 reveal
  const outcome = finalOutcome(shownA, shownB);
  const correct = (outcome === picked);
  setVerdictClass(correct);

  // Top verdict text
  const verdictText = correct ? 'Correct' : 'Wrong';
  const verdictEl = $('diceVerdict');
  if (verdictEl) verdictEl.textContent = verdictText;

  // Hide the two option boxes so only ONE result remains
  const choices = $('diceChoices');
  if (choices) choices.style.display = 'none';

  // Show ONE result card with the actual outcome label INSIDE the box
  const finalView = $('diceFinal');
  if (finalView) {
    const outcomeLabel = LABELS[outcome]; // <-- the name you want in the box
    finalView.innerHTML = `
      <div class="result-card ${correct ? 'ok' : 'fail'}" role="status" aria-live="polite">
        <div class="dice-outcome">${outcomeLabel}</div>
      </div>
    `;
    finalView.classList.remove('hidden');
  }
}

// ---------- public init ----------
export function initDice(){
  // Trigger button
  $('diceBtn')?.addEventListener('click', startRound);

  // Stacked card picks
  $('diceOptA')?.addEventListener('click', onPick);
  $('diceOptB')?.addEventListener('click', onPick);

  // Backdrop closes & resets
  const backdrop = $('diceModal')?.querySelector('.modal-backdrop');
  backdrop?.addEventListener('click', hideModal);

  // Debug helpers
  if (typeof window !== 'undefined') {
    window.dice = { start: startRound, close: hideModal };
  }
}
