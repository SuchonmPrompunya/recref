// sign-card.js
// Signature Card controller: responsive canvas + Clear/Done + persistence to localStorage

const SIGN_KEY = 'pb_sign_v1';   // where the PNG dataURL is stored

let card, canvas, ctx, clearBtn, doneBtn;
let drawing = false;
let locked = false;
let last = { x: 0, y: 0 };
let ro; // ResizeObserver
let cachedUrl = null; // last saved/restored dataURL (for redraw after resize)

const ASPECT = 2 / 1; // ~2:1 width:height for signature area

function dpr() {
  return window.devicePixelRatio || 1;
}

function ensureDom() {
  card     = document.getElementById('signCard');
  canvas   = document.getElementById('signCanvas');
  clearBtn = document.getElementById('clearSignBtn');
  doneBtn  = document.getElementById('doneSignBtn');

  if (!card || !canvas || !clearBtn || !doneBtn) {
    console.warn('[sign-card] Missing required elements; init skipped.');
    return false;
  }

  // Ensure "Sign" label exists
  const hasHeading = card.querySelector('[data-sign-title]') || card.querySelector('h3, .sign-title');
  if (!hasHeading) {
    const h = document.createElement('h3');
    h.textContent = 'Sign';
    h.setAttribute('data-sign-title', '1');
    h.style.margin = '0 0 8px 0';
    card.insertBefore(h, card.firstChild);
  }

  return true;
}

function resizeCanvasToCard() {
  if (!card || !canvas) return;

  const cssW = Math.max(1, card.clientWidth);
  const cssH = Math.max(120, Math.round(cssW / ASPECT));

  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.style.display = 'block';

  const scale = dpr();
  const pxW = Math.max(1, Math.floor(cssW * scale));
  const pxH = Math.max(1, Math.floor(cssH * scale));

  const sizeChanged = (canvas.width !== pxW || canvas.height !== pxH);
  if (sizeChanged) {
    canvas.width = pxW;
    canvas.height = pxH;

    if (!ctx) ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, 2.5 * scale);
    ctx.strokeStyle = '#111';

    if (cachedUrl) {
      drawDataUrl(cachedUrl);
    }
  }
}

function posFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = dpr();
  let clientX, clientY;

  if (e.touches && e.touches.length) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  return {
    x: (clientX - rect.left) * scale,
    y: (clientY - rect.top) * scale
  };
}

function onDown(e) {
  if (locked || !ctx) return;
  drawing = true;
  last = posFromEvent(e);
  e.preventDefault();
}

function onMove(e) {
  if (!drawing || locked || !ctx) return;
  const p = posFromEvent(e);
  ctx.beginPath();
  ctx.moveTo(last.x, last.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  last = p;
  e.preventDefault();
}

function onUp() { drawing = false; }

function bindPointerHandlers() {
  canvas.addEventListener('mousedown', onDown, { passive: false });
  window.addEventListener('mousemove', onMove, { passive: false });
  window.addEventListener('mouseup', onUp, { passive: true });

  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp, { passive: true });
  window.addEventListener('touchcancel', onUp, { passive: true });
}

function clearCanvas() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function lockCanvas() {
  locked = true;
  card.classList.add('locked');
  if (clearBtn) clearBtn.disabled = true;
  if (doneBtn)  doneBtn.disabled  = true;
}

function unlockCanvas() {
  locked = false;
  card.classList.remove('locked');
  if (clearBtn) clearBtn.disabled = false;
  if (doneBtn)  doneBtn.disabled  = false;
}

function observeResizes() {
  const reflow = () => {
    if (card && card.style.display !== 'none') resizeCanvasToCard();
  };
  if (window.ResizeObserver) {
    ro = new ResizeObserver(() => requestAnimationFrame(reflow));
    ro.observe(card);
  }
  window.addEventListener('resize', () => requestAnimationFrame(reflow));
}

// ===== Persistence helpers =====
function saveToStorage() {
  try {
    const url = canvas.toDataURL('image/png');
    localStorage.setItem(SIGN_KEY, url);
    cachedUrl = url;
  } catch (e) {
    console.warn('[sign-card] saveToStorage failed', e);
  }
}

function loadFromStorage() {
  try {
    const url = localStorage.getItem(SIGN_KEY);
    cachedUrl = url || null;
    return cachedUrl;
  } catch {
    return null;
  }
}

function clearStorage() {
  try { localStorage.removeItem(SIGN_KEY); } catch {}
  cachedUrl = null;
}

function drawDataUrl(dataUrl) {
  if (!dataUrl || !ctx) return;
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = dataUrl;
}

function restoreSignatureIfAny() {
  const url = loadFromStorage();
  if (url) {
    drawDataUrl(url);
    lockCanvas();
  } else {
    unlockCanvas();
    clearCanvas();
  }
}

/** Public: call once from app.js after DOM is ready */
export function initSignCard() {
  if (!ensureDom()) return;

  ctx = canvas.getContext('2d');
  resizeCanvasToCard();
  bindPointerHandlers();

  // Buttons
  clearBtn.addEventListener('click', () => {
    clearCanvas();
    clearStorage();
    unlockCanvas();
  });

  doneBtn.addEventListener('click', () => {
    saveToStorage();
    lockCanvas();
  });

  observeResizes();

  // Rehydrate on show/hide
  const mo = new MutationObserver(() => {
    const visible = card.style.display !== 'none';
    if (visible) {
      resizeCanvasToCard();
      restoreSignatureIfAny();
    }
  });
  mo.observe(card, { attributes: true, attributeFilter: ['style'] });

  // Initial restore
  restoreSignatureIfAny();

  // Debug helpers
  if (typeof window !== 'undefined') {
    window.signCardDebug = {
      save: saveToStorage,
      load: () => { const u = loadFromStorage(); if (u) drawDataUrl(u); },
      clear: () => { clearStorage(); clearCanvas(); unlockCanvas(); }
    };
  }
}

/** Public: show/hide card */
export function updateSignCardVisibility(show) {
  if (!card) ensureDom();
  if (!card) return;

  const shouldShow = !!show;
  const nextDisplay = shouldShow ? '' : 'none';
  if (card.style.display !== nextDisplay) {
    card.style.display = nextDisplay;
  }
  if (shouldShow) {
    resizeCanvasToCard();
    restoreSignatureIfAny();
  }
}

/** Public: reusable “Clear” for Reset */
export function clearSignatureCanvas() {
  clearCanvas();
  clearStorage();
  unlockCanvas();
}

// sign-card.js (add exports)
export { clearCanvas, clearStorage, unlockCanvas };

