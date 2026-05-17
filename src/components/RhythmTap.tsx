import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

type Note = { id: number; lane: number; y: number };
const LANES = ['A', 'S', 'D', 'F'];
const LANE_COLORS = ['bg-pink-500', 'bg-fuchsia-500', 'bg-violet-500', 'bg-purple-500'];
const LANE_GLOW = ['shadow-pink-500/60', 'shadow-fuchsia-500/60', 'shadow-violet-500/60', 'shadow-purple-500/60'];
const HIT_Y = 265;
const GAME_H = 320;

export function RhythmTap() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [notes, setNotes] = useState<Note[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [feedback, setFeedback] = useState<{ lane: number; text: string; id: number } | null>(null);
  const [best] = usePersistedNumber('rhythm-best', 0);

  const notesRef = useRef<Note[]>([]);
  const idRef = useRef(0);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const missesRef = useRef(0);
  const feedbackIdRef = useRef(0);

  const showFeedback = (lane: number, text: string) => {
    setFeedback({ lane, text, id: feedbackIdRef.current++ });
    setTimeout(() => setFeedback(null), 400);
  };

  const startGame = useCallback(() => {
    notesRef.current = [];
    idRef.current = 0;
    comboRef.current = 0;
    scoreRef.current = 0;
    missesRef.current = 0;
    setNotes([]);
    setScore(0);
    setCombo(0);
    setMisses(0);
    setTimeLeft(45);
    setFeedback(null);
    setGameState('playing');
  }, []);

  const hit = useCallback((lane: number) => {
    if (gameState !== 'playing') return;
    const candidates = notesRef.current
      .filter((n) => n.lane === lane)
      .map((n) => ({ ...n, dist: Math.abs(n.y - HIT_Y) }))
      .sort((a, b) => a.dist - b.dist);

    if (candidates[0] && candidates[0].dist < 38) {
      const perfect = candidates[0].dist < 16;
      const points = (perfect ? 30 : 15) + comboRef.current;
      notesRef.current = notesRef.current.filter((n) => n.id !== candidates[0].id);
      setNotes([...notesRef.current]);
      scoreRef.current += points;
      comboRef.current += 1;
      setScore(scoreRef.current);
      setCombo(comboRef.current);
      if (perfect) Sounds.perfect(); else Sounds.good(); showFeedback(lane, perfect ? '✨ Perfect!' : '👍 Good');
    } else {
      comboRef.current = 0;
      missesRef.current += 1;
      setCombo(0);
      setMisses(missesRef.current);
      Sounds.rhythmMiss(); showFeedback(lane, '❌ Miss');
      if (missesRef.current >= 12) setGameState('ended');
    }
  }, [gameState]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = LANES.indexOf(e.key.toUpperCase());
      if (idx >= 0) hit(idx);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hit]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setGameState('ended'); return 0; }
        return t - 1;
      });
    }, 1000);

    const spawn = setInterval(() => {
      const lane = Math.floor(Math.random() * 4);
      notesRef.current = [...notesRef.current, { id: idRef.current++, lane, y: -20 }];
      setNotes([...notesRef.current]);
    }, 650);

    const move = setInterval(() => {
      let missed = 0;
      notesRef.current = notesRef.current
        .map((n) => ({ ...n, y: n.y + 5 }))
        .filter((n) => {
          const keep = n.y < GAME_H + 20;
          if (!keep && n.y > HIT_Y + 38) missed++;
          return keep;
        });
      if (missed > 0) {
        missesRef.current += missed;
        comboRef.current = 0;
        setCombo(0);
        setMisses(missesRef.current);
        if (missesRef.current >= 12) setGameState('ended');
      }
      setNotes([...notesRef.current]);
    }, 30);

    return () => { clearInterval(timer); clearInterval(spawn); clearInterval(move); };
  }, [gameState]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Score</div>
          <div className="text-2xl font-bold text-yellow-300">{score}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Combo</div>
          <div className="text-2xl font-bold text-orange-300">x{combo}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Misses</div>
          <div className="text-2xl font-bold text-red-300">{misses}/12</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
          <div className="text-xs text-purple-200">Time</div>
          <div className="text-2xl font-bold">{timeLeft}s</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center">
          <div className="mb-4 text-6xl">🎵</div>
          <div className="mb-2 text-2xl font-bold">Rhythm Tap</div>
          <div className="mb-2 text-purple-200">Tap the buttons when notes reach the glowing line.</div>
          <div className="mb-6 text-sm text-purple-300">Keyboard: A S D F — or tap the lane buttons</div>
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-600 px-8 py-3 font-bold text-white active:scale-95">
            🎵 Start Rhythm
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex flex-col items-center gap-0 select-none">
          {/* Game area */}
          <div
            className="relative overflow-hidden rounded-t-xl border-2 border-b-0 border-white/20 bg-slate-950"
            style={{ width: 320, height: GAME_H }}
          >
            {/* Lane dividers */}
            {[1, 2, 3].map((l) => (
              <div key={l} className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: l * 80 }} />
            ))}

            {/* Hit line */}
            <div
              className="absolute left-0 right-0 h-1 bg-pink-400"
              style={{ top: HIT_Y, boxShadow: '0 0 12px 3px rgba(244,114,182,0.7)' }}
            />

            {/* Notes */}
            {notes.map((note) => (
              <div
                key={note.id}
                className={`absolute flex h-10 w-16 items-center justify-center rounded-xl font-bold text-white shadow-lg ${LANE_COLORS[note.lane]} ${LANE_GLOW[note.lane]}`}
                style={{ left: note.lane * 80 + 8, top: note.y, fontSize: 18 }}
              >
                ♪
              </div>
            ))}

            {/* Feedback */}
            {feedback && (
              <div
                className="pointer-events-none absolute text-sm font-bold text-white"
                style={{ left: feedback.lane * 80 + 4, top: HIT_Y - 30, width: 80, textAlign: 'center' }}
              >
                {feedback.text}
              </div>
            )}
          </div>

          {/* Tap buttons — large, easy to tap on mobile */}
          <div className="flex rounded-b-xl overflow-hidden border-2 border-t-0 border-white/20">
            {[0, 1, 2, 3].map((lane) => (
              <button
                key={lane}
                onTouchStart={(e) => { e.preventDefault(); hit(lane); }}
                onMouseDown={() => hit(lane)}
                className={`flex h-16 w-20 flex-col items-center justify-center gap-0.5 text-white font-bold active:brightness-150 active:scale-95 transition-all ${LANE_COLORS[lane]} bg-opacity-30`}
                style={{ background: 'rgba(255,255,255,0.07)', borderRight: lane < 3 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}
              >
                <span className="text-lg">♪</span>
                <span className="text-xs opacity-70">{LANES[lane]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="rounded-2xl border border-pink-400/40 bg-pink-500/20 px-8 py-6 text-center">
          <div className="mb-2 text-4xl">🎵</div>
          <div className="mb-1 text-2xl font-bold text-pink-300">Song Over!</div>
          <div className="mb-4 text-3xl font-bold">{score} points</div>
          {score >= best && score > 0 && (
            <div className="mb-3 text-sm font-bold text-yellow-300">🏆 New best!</div>
          )}
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-600 px-8 py-3 font-bold text-white active:scale-95">
            🔄 Play Again
          </button>
        </div>
      )}
    </div>
  );
}