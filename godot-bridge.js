// godot-bridge.js
// Posts current UI state to the local Godot HTTP server on EVERY render.
// Safe if Godot isn't running (fails silently).

(function () {
  const ENDPOINT = 'http://127.0.0.1:8765/state';

  async function push() {
    try {
      const st = window.state;
      const lg = window.logic;
      if (!st || !lg) return;

      const sc = (lg.getScores?.() ?? {1:0, 2:0});
      const curServer = lg.getServer?.();
      const curHand   = lg.getHand?.();
      let sideoutScoreString = '0 - 0 - 2';

      if (curServer === 1 || curServer === 2) {
        const serverScore   = sc[curServer] ?? 0;
        const receiverScore = sc[curServer === 1 ? 2 : 1] ?? 0;
        sideoutScoreString  = `${serverScore} - ${receiverScore} - ${curHand ?? 2}`;
      }

      const payload = {
        division: st.division ?? '',
        players: {
          A: [st.players?.A?.[0] ?? '', st.players?.A?.[1] ?? ''],
          B: [st.players?.B?.[0] ?? '', st.players?.B?.[1] ?? ''],
        },
        sideoutScoreString,
      };

      await fetch(ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {
      // don't break render()
    }
  }

  window.__godotBridge = { push };
})();
