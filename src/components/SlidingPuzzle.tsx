import { useCallback, useEffect, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { useAutosave, useBestScore } from '../utils/useBestScore';

const SIZE = 4;
const TOTAL = SIZE * SIZE;

type Tiles = number[]; // 0 = blank

const solved: Tiles = Array.from({ length: TOTAL }, (_, i) => (i + 1) % TOTAL);

function isSolvable(tiles: Tiles): boolean {
  const flat = tiles.filter((value) => value !== 0);
  let inversions = 0;
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inversions++;
    }
  }
  const blankRowFromBottom = SIZE - Math.floor(tiles.indexOf(0) / SIZE);
  if (SIZE % 2 === 1) return inversions % 2 === 0;
  return (inversions + blankRowFromBottom) % 2 === 0;
}

function shuffle(): Tiles {
  while (true) {
    const next = [...solved].sort(() => Math.random() - 0.5);
    if (isSolvable(next) && next.some((value, i) => value !== solved[i])) return next;
  }
}

function neighbors(index: number): number[] {
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  const result: number[] = [];
  if (r > 0) result.push(index - SIZE);
  if (r < SIZE - 1) result.push(index + SIZE);
  if (c > 0) result.push(index - 1);
  if (c < SIZE - 1) result.push(index + 1);
  return result;
}

interface SaveState {
  tiles: Tiles;
  moves: number;
  startedAt: number | null;
}

const INITIAL: SaveState = { tiles: solved, moves: 0, startedAt: null };

export function SlidingPuzzle() {
  const [save, setSave, clearSave] = useAutosave<SaveState>('sliding', INITIAL);
  const [tiles, setTiles] = useState<Tiles>(save.tiles);
  const [moves, setMoves] = useState(save.moves);
  const [startedAt, setStartedAt] = useState<number | null>(save.startedAt);
  const [now, setNow] = useState(Date.now());
  const { best, submit } = useBestScore('sliding-best', 'lower');

  const isSolved = tiles.every((value, i) => value === solved[i]);

  useEffect(() => {
    setSave({ tiles, moves, startedAt });
  }, [tiles, moves, startedAt, setSave]);

  useEffect(() => {
    if (!startedAt || isSolved) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt, isSolved]);

  useEffect(() => {
    if (isSolved && startedAt && moves > 0) { Sounds.slideSolved();
      submit(moves);
      clearSave();
    }
  }, [isSolved, startedAt, moves, submit, clearSave]);

  const newGame = useCallback(() => {
    setTiles(shuffle());
    setMoves(0);
    setStartedAt(Date.now());
  }, []);

  const move = (index: number) => {
    if (isSolved && moves > 0) return;
    const blankIndex = tiles.indexOf(0);
    if (!neighbors(index).includes(blankIndex)) return;
    const next = [...tiles];
    [next[index], next[blankIndex]] = [next[blankIndex], next[index]];
    setTiles(next);
    setMoves((m) => m + 1);
    if (!startedAt) setStartedAt(Date.now());
  };

  const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const formatted = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-3 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Moves</div><div className="text-2xl font-bold text-yellow-300">{moves}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Time</div><div className="text-2xl font-bold text-cyan-300">{formatted}</div></div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Best (moves)</div><div className="text-2xl font-bold text-emerald-300">{best || '—'}</div></div>
      </div>

      <div className="grid gap-2 rounded-2xl bg-slate-900 p-3" style={{ gridTemplateColumns: `repeat(${SIZE}, 64px)` }}>
        {tiles.map((value, i) => (
          <button
            key={i}
            onClick={() => move(i)}
            disabled={value === 0}
            className={`flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-black transition ${
              value === 0
                ? 'bg-transparent'
                : value === solved[i]
                  ? 'bg-emerald-400 text-slate-900'
                  : 'bg-cyan-400 text-slate-900 hover:bg-cyan-300'
            }`}
          >
            {value || ''}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={newGame} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2 font-bold text-white active:scale-95">{startedAt ? '🔄 Shuffle' : '🎲 New Puzzle'}</button>
      </div>

      {isSolved && startedAt && moves > 0 && (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-8 py-4 text-center">
          <div className="text-2xl font-bold text-emerald-300">🎉 Solved in {moves} moves • {formatted}</div>
        </div>
      )}
    </div>
  );
}
