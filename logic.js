// logic.js — self-contained ServeLogic with undo

export class ServeLogic {
  constructor() {
    this.reset();
  }

  reset() {
    // Standard pickleball doubles start: Team 1, second server (“hand 2”)
    this.server = 1;
    this.hand = 2;
    this.scores = { 1: 0, 2: 0 };

    this.history = [];         // winners per rally (1 or 2)
    this.serverHistory = [this.server];
    this.handHistory   = [this.hand];

    // stack of snapshots for undo
    this.stack = [];
    this._pushSnapshot();
  }

  _pushSnapshot() {
    this.stack.push({
      server: this.server,
      hand: this.hand,
      scores: { 1: this.scores[1], 2: this.scores[2] },
      history: [...this.history],
      serverHistory: [...this.serverHistory],
      handHistory: [...this.handHistory],
    });
  }

  _restoreSnapshot(s) {
    this.server = s.server;
    this.hand   = s.hand;
    this.scores = { 1: s.scores[1], 2: s.scores[2] };
    this.history = [...s.history];
    this.serverHistory = [...s.serverHistory];
    this.handHistory   = [...s.handHistory];
  }

  addServe(winner /* 1|2 */) {
    // record winner for history
    this.history.push(winner);

    if (winner === this.server) {
      // Server scored → same server continues, switch courts (UI handles court),
      // hand does NOT change; add a point.
      this.scores[this.server] += 1;
    } else {
      // Receiver won rally → fault on server
      if (this.hand === 1) {
        // go to second server of SAME team
        this.hand = 2;
      } else {
        // hand was 2 → side-out to the other team, first server
        this.server = 3 - this.server;
        this.hand = 1;
      }
    }

    this.serverHistory.push(this.server);
    this.handHistory.push(this.hand);
    this._pushSnapshot();
  }

  undo() {
    if (this.stack.length <= 1) return false;
    this.stack.pop();
    const prev = this.stack[this.stack.length - 1];
    this._restoreSnapshot(prev);
    return true;
  }

  getServer() { return this.server; }
  getHand()   { return this.hand; }
  getScores() { return { 1: this.scores[1], 2: this.scores[2] }; }
  getHistory() { return [...this.history]; }
  getServerHistory() { return [...this.serverHistory]; }
  getHandHistory() { return [...this.handHistory]; }
}
