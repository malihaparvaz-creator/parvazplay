import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sounds } from '../utils/useSounds';

const MAZES = [
  ['##########', '#S..#....#', '#.#.#.##.#', '#.#...#..#', '#.###.#C##', '#...#....#', '###.####.#', '#C......G#', '#.######.#', '##########'],
  ['##########', '#S...#...#', '###.#.#C.#', '#...#.#..#', '#.###.##.#', '#...C....#', '#.######.#', '#......#G#', '#.####...#', '##########'],
  ['##########', '#S#......#', '#.#.####.#', '#.#....#.#', '#.####.#.#', '#....#.#C#', '####.#.#.#', '#C...#...#', '#.######G#', '##########'],
];
type Pos = { r: number; c: number };

export function MazeRunner() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [level, setLevel] = useState(0);
  const [player, setPlayer] = useState<Pos>({ r: 1, c: 1 });
  const [coins, setCoins] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const maze = useMemo(() => MAZES[level] || MAZES[0], [level]);
  const loadLevel = useCallback((index: number) => {
    const nextMaze = MAZES[index];
    const nextCoins = new Set<string>();
    let start = { r: 1, c: 1 };
    nextMaze.forEach((row, r) => row.split('').forEach((cell, c) => { if (cell === 'S') start = { r, c }; if (cell === 'C') nextCoins.add(`${r}-${c}`); }));
    setPlayer(start);
    setCoins(nextCoins);
    setMoves(0);
  }, []);
  const startGame = useCallback(() => { setLevel(0); setScore(0); loadLevel(0); setGameState('playing'); }, [loadLevel]);
  const move = useCallback((dr: number, dc: number) => {
    if (gameState !== 'playing') return;
    const nr = player.r + dr;
    const nc = player.c + dc;
    const cell = maze[nr]?.[nc];
    if (!cell || cell === '#') return;
    setMoves((m) => m + 1);
    setPlayer({ r: nr, c: nc });
    const key = `${nr}-${nc}`;
    if (coins.has(key)) { const nextCoins = new Set(coins); nextCoins.delete(key); setCoins(nextCoins); setScore((s) => s + 25); Sounds.mazeCoin(); }
    if (cell === 'G') { Sounds.mazeExit(); setScore((s) => s + Math.max(50, 180 - moves * 3)); if (level + 1 >= MAZES.length) setGameState('ended'); else { setLevel((l) => l + 1); loadLevel(level + 1); } }
  }, [coins, gameState, level, loadLevel, maze, moves, player]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { const dirs: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1] }; const dir = dirs[e.key]; if (dir) { e.preventDefault(); move(dir[0], dir[1]); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);
  return <div className="flex flex-col items-center gap-4"><div className="flex gap-4 text-center"><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Score</div><div className="text-2xl font-bold text-yellow-300">{score}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Level</div><div className="text-2xl font-bold text-cyan-300">{level + 1}/{MAZES.length}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3"><div className="text-xs text-purple-200">Moves</div><div className="text-2xl font-bold">{moves}</div></div></div>{gameState === 'idle' && <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center"><div className="mb-4 text-6xl">🗺️</div><div className="mb-2 text-2xl font-bold">Maze Runner</div><div className="mb-6 text-purple-200">Collect coins and find the exit in as few moves as possible.</div><button onClick={startGame} className="rounded-xl bg-gradient-to-r from-lime-500 to-green-600 px-8 py-3 font-bold text-white active:scale-95">Enter Maze</button></div>}{gameState === 'playing' && <><div className="grid gap-1 rounded-xl bg-slate-900 p-2" style={{ gridTemplateColumns: `repeat(${maze[0].length}, 28px)` }}>{maze.map((row, r) => row.split('').map((cell, c) => { const isPlayer = player.r === r && player.c === c; const hasCoin = coins.has(`${r}-${c}`); return <div key={`${r}-${c}`} className={`flex h-7 w-7 items-center justify-center rounded text-sm ${cell === '#' ? 'bg-slate-700' : cell === 'G' ? 'bg-emerald-600' : 'bg-slate-800'}`}>{isPlayer ? '🏃' : hasCoin ? '🪙' : cell === 'G' ? '🚪' : ''}</div>; }))}</div><div className="grid w-40 grid-cols-3 gap-2"><div /><button onClick={() => move(-1, 0)} className="rounded-lg bg-white/10 py-2">↑</button><div /><button onClick={() => move(0, -1)} className="rounded-lg bg-white/10 py-2">←</button><button onClick={() => move(1, 0)} className="rounded-lg bg-white/10 py-2">↓</button><button onClick={() => move(0, 1)} className="rounded-lg bg-white/10 py-2">→</button></div></>}{gameState === 'ended' && <div className="rounded-2xl border border-green-400/40 bg-green-500/20 px-8 py-6 text-center"><div className="mb-2 text-4xl">🚪</div><div className="mb-1 text-2xl font-bold text-green-300">Escaped!</div><div className="mb-4 text-3xl font-bold">{score} points</div><button onClick={startGame} className="rounded-xl bg-gradient-to-r from-lime-500 to-green-600 px-8 py-3 font-bold text-white active:scale-95">Run Again</button></div>}</div>;
}