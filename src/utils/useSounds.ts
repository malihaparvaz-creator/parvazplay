/**
 * useSounds.ts — Parvaz Play Sound Engine
 * Full Web Audio API synthesis. Zero files. Works offline. Mobile safe.
 * All 30 games covered with per-event sounds + 4 background music tracks.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}

// ─── Core synth helpers ───────────────────────────────────────────────────────

function mkOsc(ac: AudioContext, freq: number, type: OscillatorType, t0: number, t1: number, fEnd?: number): OscillatorNode {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (fEnd != null) o.frequency.exponentialRampToValueAtTime(Math.max(fEnd, 0.01), t1);
  o.start(t0); o.stop(t1);
  return o;
}

function mkGain(ac: AudioContext, peak: number, t0: number, atk: number, sus: number, rel: number): GainNode {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + atk);
  g.gain.setValueAtTime(peak, t0 + atk + sus);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + atk + sus + rel);
  return g;
}

function mkNoise(ac: AudioContext, dur: number): AudioBufferSourceNode {
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ac.createBufferSource(); s.buffer = buf;
  return s;
}

function mkFilter(ac: AudioContext, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  return f;
}

function chain(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
}

// ─── Tone / noise shortcuts ───────────────────────────────────────────────────

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.13, fEnd?: number) {
  const ac = getCtx(); if (!ac) return;
  const t = ac.currentTime;
  const o = mkOsc(ac, freq, type, t, t + dur, fEnd);
  const g = mkGain(ac, vol, t, 0.005, dur * 0.55, dur * 0.4);
  chain(o, g, ac.destination);
}

function noise(dur: number, vol = 0.12, hp = 1000) {
  const ac = getCtx(); if (!ac) return;
  const t = ac.currentTime;
  const n = mkNoise(ac, dur);
  const f = mkFilter(ac, 'highpass', hp, 0.5);
  const g = mkGain(ac, vol, t, 0.001, dur * 0.3, dur * 0.7);
  chain(n, f, g, ac.destination);
  n.start(t); n.stop(t + dur);
}

function seq(notes: [number, number, OscillatorType?, number?][], interval: number) {
  notes.forEach(([freq, dur, type = 'sine', vol = 0.13], i) => {
    setTimeout(() => tone(freq, dur, type, vol), i * interval);
  });
}

// ─── Background Music ─────────────────────────────────────────────────────────

export type BgTrack = 'arcade' | 'chill' | 'intense' | 'puzzle' | 'action';

let bgStop: (() => void) | null = null;
let bgMuted = false;

const NOTE: Record<string, number> = {
  C3:130.8,D3:146.8,E3:164.8,F3:174.6,G3:196,A3:220,B3:246.9,
  C4:261.6,D4:293.7,E4:329.6,F4:349.2,G4:392,A4:440,B4:493.9,
  C5:523.3,D5:587.3,E5:659.3,F5:698.5,G5:784,A5:880,B5:987.8,
  Eb4:311.1,Bb3:233.1,Ab4:415.3,Bb4:466.2,Eb5:622.3,F2:87.3,G2:98,A2:110,
};

const TRACK_CFG: Record<BgTrack, { bpm: number; scale: string[]; bass: string[]; kickEvery: number; vol: number }> = {
  arcade:  { bpm:148, scale:['C4','E4','G4','A4','C5','E5'], bass:['C3','G3','A3','E3','C3','G3','F3','G3'], kickEvery:2, vol:0.05 },
  chill:   { bpm: 90, scale:['C4','D4','F4','G4','A4','C5'], bass:['C3','A3','F3','G3','C3','A3','F3','G3'], kickEvery:4, vol:0.04 },
  intense: { bpm:170, scale:['C4','Eb4','G4','Bb4','C5','Eb5'], bass:['C3','C3','G3','G3','A3','A3','F3','F3'], kickEvery:1, vol:0.055 },
  puzzle:  { bpm:110, scale:['C4','D4','E4','G4','A4','C5'], bass:['C3','G3','A3','F3','E3','G3','C3','D3'], kickEvery:2, vol:0.045 },
  action:  { bpm:160, scale:['C4','E4','G4','Bb4','C5','E5'], bass:['C3','G3','Bb3','G3','A3','F3','G3','A3'], kickEvery:1, vol:0.055 },
};

function startTrack(trackName: BgTrack): () => void {
  const ac = getCtx(); if (!ac) return () => {};
  const cfg = TRACK_CFG[trackName];
  const beatLen = 60 / cfg.bpm;
  let running = true;
  let beat = 0;
  let nextTime = ac.currentTime + 0.05;

  const master = ac.createGain(); master.gain.value = bgMuted ? 0 : cfg.vol; master.connect(ac.destination);

  // Simple reverb
  const revBuf = ac.createBuffer(2, ac.sampleRate * 1.2, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = revBuf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
  const rev = ac.createConvolver(); rev.buffer = revBuf;
  const revGain = ac.createGain(); revGain.gain.value = 0.15;
  rev.connect(revGain); revGain.connect(master);

  function scheduleBeat() {
    if (!running) return;
    const t = nextTime;
    const scale = cfg.scale;
    const bass = cfg.bass;

    // Bass
    if (beat % 2 === 0) {
      const bFreq = NOTE[bass[Math.floor(beat / 2) % bass.length]];
      const bOsc = mkOsc(ac, bFreq, 'triangle', t, t + beatLen * 1.8, bFreq * 0.99);
      const bFilt = mkFilter(ac, 'lowpass', 420, 1);
      const bGain = mkGain(ac, 0.5, t, 0.01, beatLen * 0.55, beatLen * 0.4);
      chain(bOsc, bFilt, bGain, master);
    }

    // Melody
    if (beat % 3 === 0 || beat % 5 === 0) {
      const mFreq = NOTE[scale[Math.floor(Math.random() * scale.length)]];
      const mType: OscillatorType = trackName === 'intense' || trackName === 'action' ? 'square' : 'sine';
      const mOsc = mkOsc(ac, mFreq, mType, t, t + beatLen * 1.4);
      const mGain = mkGain(ac, 0.2, t, 0.02, beatLen * 0.5, beatLen * 0.5);
      chain(mOsc, mGain, master);
      const rOsc = mkOsc(ac, mFreq, 'sine', t, t + beatLen * 1.4);
      const rGain = mkGain(ac, 0.08, t, 0.02, beatLen * 0.4, beatLen * 0.5);
      chain(rOsc, rGain, rev);
    }

    // Chord stab (arcade/action)
    if ((trackName === 'arcade' || trackName === 'action') && beat % 4 === 0) {
      [1, 1.25, 1.5].forEach((mult, i) => {
        const cOsc = mkOsc(ac, NOTE[scale[0]] * mult, 'sawtooth', t, t + beatLen * 0.22);
        const cFilt = mkFilter(ac, 'lowpass', 1100 - i * 100, 0.8);
        const cGain = mkGain(ac, 0.07, t, 0.005, 0.04, beatLen * 0.18);
        chain(cOsc, cFilt, cGain, master);
      });
    }

    // Hi-hat
    const hatSrc = mkNoise(ac, 0.05);
    const hatFilt = mkFilter(ac, 'highpass', 8000, 0.5);
    const hatGain = mkGain(ac, trackName === 'chill' ? 0.035 : 0.065, t, 0.001, 0.01, 0.04);
    chain(hatSrc, hatFilt, hatGain, master);
    hatSrc.start(t); hatSrc.stop(t + 0.06);

    // Kick
    if (beat % cfg.kickEvery === 0) {
      const kOsc = mkOsc(ac, 110, 'sine', t, t + 0.22, 28);
      const kGain = mkGain(ac, 0.75, t, 0.001, 0.05, 0.18);
      chain(kOsc, kGain, master);
    }

    // Snare
    if (beat % 4 === 2) {
      const sNoise = mkNoise(ac, 0.14);
      const sFilt = mkFilter(ac, 'bandpass', 2400, 0.8);
      const sGain = mkGain(ac, 0.14, t, 0.001, 0.02, 0.11);
      chain(sNoise, sFilt, sGain, master);
      sNoise.start(t); sNoise.stop(t + 0.15);
    }

    // Chill arp
    if (trackName === 'chill' && beat % 2 === 1) {
      const aFreq = NOTE[scale[(beat * 3) % scale.length]];
      const aOsc = mkOsc(ac, aFreq, 'sine', t, t + beatLen * 0.85);
      const aGain = mkGain(ac, 0.09, t, 0.03, beatLen * 0.4, beatLen * 0.4);
      chain(aOsc, aGain, master);
    }

    // Puzzle bell
    if (trackName === 'puzzle' && beat % 3 === 1) {
      const bFreq = NOTE[scale[beat % scale.length]] * 2;
      const bOsc = mkOsc(ac, bFreq, 'sine', t, t + beatLen * 2);
      const bGain = mkGain(ac, 0.055, t, 0.001, 0.01, beatLen * 1.8);
      chain(bOsc, bGain, rev);
    }

    beat++;
    nextTime += beatLen;
    const ahead = nextTime - ac.currentTime;
    setTimeout(scheduleBeat, Math.max(0, (ahead - 0.1) * 1000));
  }

  scheduleBeat();

  return () => {
    running = false;
    master.gain.setTargetAtTime(0, ac.currentTime, 0.25);
  };
}

export const BgMusic = {
  play(track: BgTrack) { this.stop(); bgStop = startTrack(track); },
  stop() { if (bgStop) { bgStop(); bgStop = null; } },
  mute() { bgMuted = true; this.stop(); },
  unmute(track: BgTrack) { bgMuted = false; this.play(track); },
  toggle(track: BgTrack) { bgMuted ? this.unmute(track) : this.mute(); },
  isMuted() { return bgMuted; },
};

// ─── Sound Effects ────────────────────────────────────────────────────────────

export const Sounds = {
  unlock() { getCtx(); },

  // ── UI / Generic ──────────────────────────────────────────────────────────
  click()    { tone(600, 0.07, 'sine', 0.1); },
  start()    { seq([[440,.15,'triangle',.14],[554,.15,'triangle',.14],[659,.2,'triangle',.15]], 90); },
  gameOver() { seq([[440,.2,'triangle',.13],[370,.2,'triangle',.13],[311,.2,'triangle',.13],[220,.25,'triangle',.13]], 150); },
  win()      { seq([[523,.18,'sine',.13],[659,.18,'sine',.13],[784,.18,'sine',.14],[1047,.22,'sine',.15]], 90); },
  newBest()  { seq([[659,.18,'sine',.14],[784,.18,'sine',.14],[880,.18,'sine',.15],[1047,.18,'sine',.15],[1319,.25,'sine',.16]], 80); },
  score()    { tone(880, 0.08, 'sine', 0.13, 1100); },
  combo()    { seq([[660,.08,'sine',.12],[880,.08,'sine',.14],[1100,.12,'sine',.16]], 65); },
  miss()     { tone(220, 0.13, 'sawtooth', 0.09, 110); },
  correct()  { tone(880, 0.07, 'sine', 0.13); setTimeout(() => tone(1100, 0.1, 'sine', 0.14), 70); },
  wrong()    { tone(220, 0.12, 'sawtooth', 0.09, 160); },
  tick()     { tone(1000, 0.04, 'sine', 0.07); },
  warning()  { tone(880, 0.09, 'square', 0.1); },
  levelUp()  { seq([[523,.1,'triangle',.13],[659,.1,'triangle',.14],[784,.1,'triangle',.14],[1047,.18,'sine',.15]], 70); },

  // ── Flappy Dash ──────────────────────────────────────────────────────────
  flap()     { tone(320, 0.09, 'sine', 0.12, 640); },
  pipe()     { tone(523, 0.09, 'triangle', 0.1, 659); },
  birdDie()  { noise(0.35, 0.17, 300); tone(200, 0.28, 'sawtooth', 0.11, 80); },

  // ── Doodle Bouncer ────────────────────────────────────────────────────────
  bounce()   { tone(420, 0.07, 'triangle', 0.1, 720); },
  movingBounce() { tone(560, 0.07, 'triangle', 0.12, 900); },
  doodleFall()   { tone(280, 0.3, 'sawtooth', 0.09, 90); },

  // ── Grid Gobblers ─────────────────────────────────────────────────────────
  pellet()   { tone(1400, 0.03, 'sine', 0.06); },
  powerPellet() { seq([[440,.07,'sine',.14],[660,.07,'sine',.15],[880,.1,'sine',.16]], 70); },
  eatGhost() { tone(880, 0.06, 'square', 0.13); setTimeout(() => tone(440, 0.1, 'square', 0.13), 60); },
  ghostKill(){ noise(0.18, 0.13, 1500); tone(120, 0.2, 'sine', 0.09, 60); },
  powerWarning() { tone(660, 0.06, 'square', 0.08); },

  // ── Street Racer ─────────────────────────────────────────────────────────
  engineRev() { tone(85 + Math.random() * 20, 0.07, 'sawtooth', 0.06, 140); },
  dodge()     { tone(350, 0.06, 'triangle', 0.09, 500); },
  crash()     { noise(0.5, 0.24, 150); tone(90, 0.38, 'sawtooth', 0.2, 35); },
  speedUp()   { tone(200, 0.1, 'sawtooth', 0.07, 400); },

  // ── Rhythm Tap ───────────────────────────────────────────────────────────
  perfect()  { tone(1047, 0.12, 'sine', 0.17, 1319); },
  good()     { tone(784, 0.09, 'sine', 0.12); },
  rhythmMiss(){ tone(220, 0.1, 'square', 0.08, 150); },
  noteHit(lane: number) { const f = [523,659,784,880]; tone(f[lane] ?? 660, 0.07, 'sine', 0.13); },

  // ── Memory Match ─────────────────────────────────────────────────────────
  flip()     { tone(800, 0.06, 'sine', 0.08, 1000); },
  match()    { tone(880, 0.07, 'sine', 0.11); setTimeout(() => tone(1100, 0.1, 'sine', 0.13), 70); },
  noMatch()  { tone(300, 0.1, 'square', 0.08, 220); },

  // ── Memory Grid ──────────────────────────────────────────────────────────
  tileShow() { tone(660, 0.05, 'sine', 0.09); },
  tileTap()  { tone(880, 0.06, 'sine', 0.1); },
  gridRight(){ seq([[784,.08,'sine',.12],[1047,.1,'sine',.14]], 80); },
  gridWrong(){ tone(280, 0.12, 'sawtooth', 0.09, 200); },

  // ── Whack a Mole ─────────────────────────────────────────────────────────
  moleUp()   { tone(500, 0.06, 'sine', 0.08, 650); },
  whack()    { noise(0.08, 0.2, 2000); tone(200, 0.07, 'sine', 0.09, 150); },
  moleEscape(){ tone(330, 0.09, 'sawtooth', 0.06, 200); },
  moleWrongHit() { tone(260, 0.07, 'square', 0.07); },

  // ── Tetris ───────────────────────────────────────────────────────────────
  tetrisMove()    { tone(220, 0.04, 'sine', 0.06); },
  tetrisRotate()  { tone(330, 0.05, 'sine', 0.07); },
  tetrisPlace()   { tone(150, 0.1, 'triangle', 0.09); },
  tetrisSoftDrop(){ tone(180, 0.05, 'triangle', 0.07); },
  tetrisHardDrop(){ tone(120, 0.12, 'triangle', 0.1, 80); },
  tetrisLine()    { seq([[523,.1,'triangle',.14],[659,.1,'triangle',.15],[784,.13,'triangle',.15]], 50); },
  tetrisTetris()  { seq([[523,.12,'square',.14],[659,.12,'square',.15],[784,.12,'square',.15],[1047,.18,'square',.16]], 60); },

  // ── Archery ──────────────────────────────────────────────────────────────
  drawBow()   { tone(120, 0.22, 'triangle', 0.06, 160); },
  shoot()     { noise(0.14, 0.1, 3000); tone(180, 0.09, 'sawtooth', 0.06, 80); },
  arrowHit()  { tone(660, 0.06, 'triangle', 0.11); setTimeout(() => tone(880, 0.09, 'triangle', 0.13), 55); },
  bullseye()  { seq([[880,.1,'sine',.15],[1100,.1,'sine',.15],[1320,.14,'sine',.16]], 60); },
  arrowMiss() { noise(0.2, 0.07, 500); },

  // ── Target Shooter ───────────────────────────────────────────────────────
  shoot2()        { noise(0.1, 0.09, 4000); tone(300, 0.06, 'sawtooth', 0.06, 120); },
  targetHit()     { tone(760, 0.07, 'triangle', 0.13); },
  targetMiss()    { tone(200, 0.1, 'sawtooth', 0.07, 150); },
  bombExplode()   { noise(0.5, 0.22, 100); tone(60, 0.4, 'sawtooth', 0.2, 20); },
  bonusCollect()  { tone(1200, 0.08, 'sine', 0.14, 1500); },

  // ── Speed Typist ─────────────────────────────────────────────────────────
  typeKey()       { tone(1100 + Math.random() * 400, 0.03, 'sine', 0.05); },
  wordComplete()  { tone(880, 0.06, 'sine', 0.11); setTimeout(() => tone(1100, 0.08, 'sine', 0.12), 55); },
  typeWrong()     { tone(280, 0.08, 'square', 0.09, 200); },

  // ── Trivia / Math Blitz / Color Match ────────────────────────────────────
  answerCorrect() { tone(880, 0.08, 'sine', 0.13); setTimeout(() => tone(1100, 0.1, 'sine', 0.14), 65); },
  answerWrong()   { tone(220, 0.13, 'sawtooth', 0.09, 160); },
  streak5()       { seq([[660,.07,'sine',.13],[880,.07,'sine',.14],[1100,.1,'sine',.15]], 60); },

  // ── Word Puzzle (Hangman) ─────────────────────────────────────────────────
  letterCorrect() { tone(660, 0.05, 'sine', 0.09); },
  letterWrong()   { tone(200, 0.1, 'square', 0.08, 160); },
  wordSolve()     { seq([[523,.11,'sine',.13],[659,.11,'sine',.14],[784,.11,'sine',.14],[1047,.15,'sine',.15]], 70); },

  // ── Word Scramble ─────────────────────────────────────────────────────────
  scrambleCorrect() { tone(880, 0.07, 'sine', 0.12); setTimeout(() => tone(1100, 0.09, 'sine', 0.13), 60); },
  scrambleWrong()   { tone(300, 0.1, 'square', 0.08, 220); },

  // ── Connect Four ─────────────────────────────────────────────────────────
  dropPiece()  { tone(300, 0.08, 'triangle', 0.09, 200); },
  connect4Win(){ seq([[440,.14,'sine',.14],[554,.14,'sine',.14],[659,.14,'sine',.15],[880,.18,'sine',.15]], 80); },

  // ── Pong ─────────────────────────────────────────────────────────────────
  paddleHit()  { tone(440, 0.05, 'square', 0.09); },
  wallBounce() { tone(300, 0.04, 'square', 0.06); },
  pongScore()  { tone(880, 0.1, 'sine', 0.13, 1100); },
  pongLose()   { tone(220, 0.2, 'sawtooth', 0.09, 110); },

  // ── TicTacToe ────────────────────────────────────────────────────────────
  tttPlace()  { tone(500, 0.06, 'triangle', 0.09); },
  tttWin()    { seq([[523,.1,'sine',.13],[659,.1,'sine',.13],[784,.13,'sine',.14]], 80); },
  tttDraw()   { tone(440, 0.12, 'sine', 0.08, 330); },

  // ── Reaction Time ────────────────────────────────────────────────────────
  reactionGo()      { tone(880, 0.14, 'sine', 0.2); },
  reactionEarly()   { tone(200, 0.15, 'sawtooth', 0.11, 120); },
  reactionResult(ms: number) { const f = ms < 200 ? 1047 : ms < 300 ? 784 : ms < 400 ? 659 : 440; tone(f, 0.12, 'sine', 0.13); },

  // ── Simon Says ───────────────────────────────────────────────────────────
  simonRed()    { tone(349, 0.28, 'sine', 0.18); },
  simonBlue()   { tone(440, 0.28, 'sine', 0.18); },
  simonGreen()  { tone(523, 0.28, 'sine', 0.18); },
  simonYellow() { tone(659, 0.28, 'sine', 0.18); },
  simonWrong()  { tone(180, 0.35, 'sawtooth', 0.14, 80); },
  simonButton(idx: number) { const f = [349,440,523,659]; tone(f[idx] ?? 440, 0.28, 'sine', 0.18); },

  // ── 2048 ────────────────────────────────────────────────────────────────
  slideMove()  { tone(220, 0.04, 'sine', 0.06); },
  tileMerge()  { tone(440 + Math.random() * 200, 0.08, 'sine', 0.1, 660); },
  tile2048()   { seq([[880,.1,'sine',.15],[1100,.1,'sine',.15],[1320,.14,'sine',.16]], 60); },

  // ── Brick Breaker ────────────────────────────────────────────────────────
  brickHit()    { tone(600, 0.05, 'square', 0.1); },
  paddleBounce(){ tone(440, 0.05, 'square', 0.08); },
  brickLoseLife(){ tone(180, 0.25, 'sawtooth', 0.12, 80); },
  boardClear()  { seq([[523,.1,'sine',.13],[659,.1,'sine',.13],[784,.1,'sine',.14],[1047,.15,'sine',.15],[1319,.18,'sine',.16]], 85); },

  // ── Catch Game ───────────────────────────────────────────────────────────
  catchFruit()  { tone(880, 0.07, 'sine', 0.12, 1100); },
  catchGold()   { tone(1200, 0.08, 'sine', 0.14, 1500); },
  catchBomb()   { noise(0.3, 0.18, 200); tone(120, 0.25, 'sawtooth', 0.12, 50); },

  // ── Asteroid Dodger ──────────────────────────────────────────────────────
  asteroidClose() { tone(300, 0.06, 'sine', 0.07, 200); },
  asteroidHit()   { noise(0.4, 0.2, 200); tone(100, 0.3, 'sawtooth', 0.15, 40); },
  thruster()      { noise(0.06, 0.04, 800); },

  // ── Tower Stack ──────────────────────────────────────────────────────────
  blockDrop()   { tone(280, 0.1, 'triangle', 0.1, 200); },
  blockPerfect(){ tone(880, 0.08, 'sine', 0.13); setTimeout(() => tone(1100, 0.1, 'sine', 0.14), 65); },
  blockFall()   { noise(0.25, 0.15, 200); tone(150, 0.2, 'sawtooth', 0.1, 60); },

  // ── Minesweeper ──────────────────────────────────────────────────────────
  mineReveal()  { tone(440, 0.04, 'sine', 0.07); },
  mineFlag()    { tone(660, 0.06, 'triangle', 0.08); },
  mineBoom()    { noise(0.5, 0.22, 100); tone(60, 0.4, 'sawtooth', 0.2, 25); },
  mineClear()   { seq([[523,.1,'sine',.12],[659,.1,'sine',.13],[784,.12,'sine',.14]], 70); },

  // ── Maze Runner ──────────────────────────────────────────────────────────
  mazeStep()    { tone(300, 0.03, 'triangle', 0.05); },
  mazeCoin()    { tone(1100, 0.07, 'sine', 0.1, 1400); },
  mazeExit()    { seq([[659,.1,'sine',.13],[784,.1,'sine',.13],[1047,.14,'sine',.15]], 80); },
  mazeWall()    { tone(200, 0.06, 'square', 0.07); },

  // ── Lights Out ───────────────────────────────────────────────────────────
  lightOn()     { tone(660, 0.07, 'sine', 0.1); },
  lightOff()    { tone(440, 0.07, 'sine', 0.08); },
  lightsSolved(){ seq([[523,.1,'sine',.12],[659,.1,'sine',.13],[784,.12,'sine',.14],[1047,.15,'sine',.15]], 80); },

  // ── Sliding Puzzle ───────────────────────────────────────────────────────
  slideTile()   { tone(350, 0.05, 'triangle', 0.07); },
  slideSolved() { seq([[659,.1,'sine',.13],[784,.1,'sine',.13],[880,.1,'sine',.14],[1047,.14,'sine',.15]], 70); },
};
