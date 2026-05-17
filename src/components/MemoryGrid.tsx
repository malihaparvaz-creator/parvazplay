import { useCallback, useEffect, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { useBestScore } from '../utils/useBestScore';

const GRID = 5;

type Phase = 'idle' | 'show' | 'guess' | 'right' | 'wrong';

function pickPattern(level: number): Set<string> {
  const tiles = Math.min(GRID * GRID - 1, 3 + level);
  const pattern = new Set<string>();
  while (pattern.size < tiles) {
    const r = Math.floor(Math.random() * GRID);
    const c = Math.floor(Math.random() * GRID);
    pattern.add(`${r}-${c}`);
  }
  return pattern;
}

export function MemoryGrid() {
  const [level, setLevel] = useState(1);
  const [pattern, setPattern] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>('idle');
  const [lives, setLives] = useState(3);
  const { best, submit } = useBestScore('memory-grid');

  const startLevel = useCallback((next: number) => {
    const newPattern = pickPattern(next);
    setPattern(newPattern);
    setSelected(new Set());
    setLevel(next);
    setPhase('show'); Sounds.tileShow();
    const showMs = Math.max(900, 2200 - next * 80);
    setTimeout(() => setPhase('guess'), showMs);
  }, []);

  const startGame = () => {
    setLives(3);
    submit(0); // ensure best score key exists
    startLevel(1);
  };

  useEffect(() => {
    if (phase !== 'guess') return;
    if (selected.size === pattern.size) {
      // check correctness
      let correct = true;
      for (const key of selected) if (!pattern.has(key)) { correct = false; break; }
      if (correct) {
        setPhase('right'); Sounds.gridRight();
        submit(level);
        setTimeout(() => startLevel(level + 1), 700);
      } else {
        setPhase('wrong'); Sounds.gridWrong();
        setTimeout(() => {
          setLives((l) => {
            if (l <= 1) {
              setPhase('idle');
              return 0;
            }
            startLevel(level);
            return l - 1;
          });
        }, 800);
      }
    }
  }, [phase, selected, pattern, level, startLevel, submit]);

  const tap = (key: string) => {
    if (phase !== 'guess') return;
    if (selected.has(key)) return;
    setSelected((prev) => new Set(prev).add(key)); Sounds.tileTap();
  };

  const cells = [] as React.ReactNode[];
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const key = `${r}-${c}`;
      const inPattern = pattern.has(key);
      const isPicked = selected.has(key);
      let className = 'bg-slate-800 hover:bg-slate-700';
      if (phase === 'show' && inPattern) className = 'bg-cyan-400';
      else if (phase === 'guess' && isPicked) className = 'bg-cyan-500';
      else if (phase === 'right') className = inPattern ? 'bg-emerald-400' : 'bg-slate-800';
      else if (phase === 'wrong') className = inPattern ? 'bg-red-500' : isPicked ? 'bg-orange-500' : 'bg-slate-800';
      cells.push(
        <button
          key={key}
          onClick={() => tap(key)}
          disabled={phase !== 'guess'}
          className={`h-14 w-14 rounded-xl border border-white/10 transition ${className}`}
        />
      );
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Level</div><div className="text-2xl font-bold text-yellow-300">{level}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Lives</div><div className="text-2xl font-bold text-red-300">{'❤️'.repeat(lives)}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Best Level</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div>
      </div>

      {phase === 'idle' ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center">
          <div className="mb-4 text-6xl">🧠</div>
          <div className="mb-2 text-2xl font-bold text-white">Memory Grid</div>
          <div className="mb-6 text-purple-200">Memorize the lit tiles, then tap them all back from memory.</div>
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 px-8 py-3 font-bold text-white active:scale-95">Start</button>
        </div>
      ) : (
        <>
          <div className="grid gap-2 rounded-2xl bg-slate-900 p-3" style={{ gridTemplateColumns: `repeat(${GRID}, 56px)` }}>
            {cells}
          </div>
          <div className="text-sm text-purple-200">
            {phase === 'show' && '👀 Memorize the pattern...'}
            {phase === 'guess' && `🎯 Tap ${pattern.size - selected.size} more tile${pattern.size - selected.size === 1 ? '' : 's'}`}
            {phase === 'right' && '✅ Correct! Next level...'}
            {phase === 'wrong' && '❌ Wrong tile!'}
          </div>
        </>
      )}
    </div>
  );
}
