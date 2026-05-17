import { useCallback, useEffect, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

type Block = { x: number; y: number; width: number; color: string };
const W = 320;
const H = 380;
const BLOCK_H = 22;
const COLORS = ['bg-cyan-400', 'bg-purple-400', 'bg-pink-400', 'bg-yellow-400', 'bg-green-400', 'bg-orange-400'];

export function TowerStack() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [movingX, setMovingX] = useState(0);
  const [dir, setDir] = useState(1);
  const [score, setScore] = useState(0);
  const [best, setBest] = usePersistedNumber('tower-best', 0);
  const [speed, setSpeed] = useState(3);

  const startGame = useCallback(() => {
    setBlocks([{ x: 60, y: H - BLOCK_H, width: 200, color: 'bg-slate-500' }]);
    setMovingX(0);
    setDir(1);
    setScore(0);
    setSpeed(3);
    setGameState('playing');
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setMovingX((x) => {
        const currentWidth = blocks[blocks.length - 1]?.width || 200;
        let next = x + dir * speed;
        if (next <= 0 || next + currentWidth >= W) {
          setDir((d) => -d);
          next = Math.max(0, Math.min(W - currentWidth, next));
        }
        return next;
      });
    }, 16);
    return () => clearInterval(timer);
  }, [blocks, dir, gameState, speed]);

  const drop = () => {
    if (gameState !== 'playing') return;
    const base = blocks[blocks.length - 1];
    const overlapLeft = Math.max(base.x, movingX);
    const overlapRight = Math.min(base.x + base.width, movingX + base.width);
    const overlap = overlapRight - overlapLeft;
    if (overlap <= 0) {
      setGameState('ended');
      setBest((b) => Math.max(b, score));
      return;
    }
    const newScore = score + 1;
    const newBlock: Block = { x: overlapLeft, y: H - BLOCK_H * (blocks.length + 1), width: overlap, color: COLORS[newScore % COLORS.length] };
    const visibleBlocks = [...blocks, newBlock].slice(-15).map((block, i, arr) => ({ ...block, y: H - BLOCK_H * (arr.length - i) }));
    setBlocks(visibleBlocks);
    setScore(newScore); if (overlap >= base.width - 2) Sounds.blockPerfect(); else Sounds.blockDrop();
    setBest((b) => Math.max(b, newScore));
    setSpeed((s) => Math.min(8, s + 0.18));
    setMovingX(dir > 0 ? 0 : W - overlap);
  };

  const currentWidth = blocks[blocks.length - 1]?.width || 200;
  const currentY = H - BLOCK_H * (blocks.length + 1);

  return <div className="flex flex-col items-center gap-4"><div className="flex gap-4 text-center"><div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs text-purple-200">Height</div><div className="text-2xl font-bold text-yellow-300">{score}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs text-purple-200">Best</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div></div>{gameState === 'idle' && <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center"><div className="mb-4 text-6xl">🏗️</div><div className="mb-2 text-2xl font-bold">Tower Stack</div><div className="mb-6 text-purple-200">Stop each moving block over the tower. Miss and it collapses.</div><button onClick={startGame} className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-8 py-3 font-bold text-white active:scale-95">Start Stacking</button></div>}{gameState === 'playing' && <div><div onClick={drop} className="relative cursor-pointer overflow-hidden rounded-xl border-2 border-white/20 bg-slate-900" style={{ width: W, height: H }}>{blocks.map((block, i) => <div key={i} className={`absolute rounded ${block.color}`} style={{ left: block.x, top: block.y, width: block.width, height: BLOCK_H }} />)}<div className={`absolute rounded ${COLORS[score % COLORS.length]} shadow-lg`} style={{ left: movingX, top: currentY, width: currentWidth, height: BLOCK_H }} /></div><div className="mt-2 text-center text-purple-300">Click or tap to drop</div></div>}{gameState === 'ended' && <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/20 px-8 py-6 text-center"><div className="mb-2 text-4xl">🏗️</div><div className="mb-1 text-2xl font-bold text-cyan-300">Tower Fell!</div><div className="mb-4 text-3xl font-bold">{score} blocks</div><button onClick={startGame} className="rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-8 py-3 font-bold text-white active:scale-95">Stack Again</button></div>}</div>;
}