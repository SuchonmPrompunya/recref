// sign.js — minimal Sign Card controller (manual show/hide + basic drawing)
console.log("sign.js loaded");

(function () {
  // Cache DOM (may not exist yet if HTML changed — be defensive)
  let card   = document.getElementById('signCard');
  let canvas = document.getElementById('signCanvas');
  let ctx = null;

  // Drawing state
  let drawing = false;
  let last = { x: 0, y: 0 };

  // Ensure we have the latest nodes in case of hot reloads / re-renders
  function refreshNodes() {
    if (!card)   card   = document.getElementById('signCard');
    if (!canvas) canvas = document.getElementById('signCanvas');
  }

  // Basic canvas init (idempotent)
  function ensureCtx() {
    refreshNodes();
    if (!canvas) return null;
    if (!ctx) {
      ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap  = 'round';
      ctx.strokeStyle = '#111';
      bindDrawHandlers();
    }
    return ctx;
  }

  // Coordinate helpers
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function onDown(e) {
    if (!canvas || !ctx) return;
    e.preventDefault();
    drawing = true;
    const p = getPos(e);
    last.x = p.x; last.y = p.y;
  }

  function onMove(e) {
    if (!drawing || !canvas || !ctx) return;
    e.preventDefault();
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.x = p.x; last.y = p.y;
  }

  function onUp(e) {
    if (!canvas || !ctx) return;
    e.preventDefault();
    drawing = false;
  }

  function bindDrawHandlers() {
    if (!canvas) return;

    // Mouse
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // Touch
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove',  onMove, { passive: false });
    window.addEventListener('touchend',   onUp,   { passive: false });
  }

  function show() {
    refreshNodes();
    if (!card) return;
    card.style.display = '';
    ensureCtx(); // lazy init drawing once visible
  }

  function hide() {
    refreshNodes();
    if (!card) return;
    card.style.display = 'none';
  }

  function isVisible() {
    refreshNodes();
    if (!card) return false;
    // Treat empty string or 'block' as visible; inline style may be absent
    const st = card.style.display;
    if (!st) {
      // If no inline style, compute it
      return getComputedStyle(card).display !== 'none';
    }
    return st !== 'none';
  }

  // Expose tiny API
  window.sign = { show, hide, isVisible };
})();
