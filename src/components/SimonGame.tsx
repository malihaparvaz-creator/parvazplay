import { useCallback, useEffect, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

const BUTTONS = [
  { name: 'Red', className: 'bg-red-500', ring: 'ring-red-200' },
  { name: 'Blue', className: 'bg-blue-500', ring: 'ring-blue-200' },
  { name: 'Green', className: 'bg-green-500', ring: 'ring-green-200' },
  { name: 'Yellow', className: 'bg-yellow-400', ring: 'ring-yellow-100' },
];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomButton = () => Math.floor(Math.random() * BUTTONS.length);

export function SimonGame() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showing, setShowing] = useState(false);
  const [best, setBest] = usePersistedNumber('simon-best', 0);
  const startGame = useCallback(() => { setSequence([randomButton()]); setPlayerIndex(0); setGameState('playing'); }, []);
  useEffect(() => {
    if (gameState !== 'playing' || !sequence.length) return;
    let cancelled = false;
    const show = async () => {
      setShowing(true);
      await wait(450);
      for (const value of sequence) {
        if (cancelled) return;
        setActive(value); Sounds.simonButton(value);
        await wait(Math.max(230, 520 - sequence.length * 18));
        setActive(null);
        await wait(170);
      }
      if (!cancelled) setShowing(false);
    };
    show();
    return () => { cancelled = true; };
  }, [gameState, sequence]);
  const press = (index: number) => {
    if (gameState !== 'playing' || showing) return;
    setActive(index);
    setTimeout(() => setActive(null), 140);
    if (sequence[playerIndex] !== index) { setBest((b) => Math.max(b, sequence.length - 1)); Sounds.simonWrong(); setGameState('ended'); return; }
    if (playerIndex === sequence.length - 1) { setPlayerIndex(0); setTimeout(() => setSequence((s) => [...s, randomButton()]), 500); }
    else setPlayerIndex((i) => i + 1);
  };
  return <div className="flex flex-col items-center gap-5"><div className="flex gap-4 text-center"><div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs text-purple-200">Level</div><div className="text-2xl font-bold text-yellow-300">{sequence.length}</div></div><div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3"><div className="text-xs text-purple-200">Best</div><div className="text-2xl font-bold text-emerald-300">{best}</div></div></div>{gameState === 'idle' && <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center"><div className="mb-4 text-6xl">🟢</div><div className="mb-2 text-2xl font-bold">Simon Says</div><div className="mb-6 text-purple-200">Watch the pattern, then repeat it perfectly.</div><button onClick={startGame} className="rounded-xl bg-gradient-to-r from-green-500 to-teal-600 px-8 py-3 font-bold text-white active:scale-95">Start Pattern</button></div>}{gameState !== 'idle' && <><div className="grid grid-cols-2 gap-4">{BUTTONS.map((button, i) => <button key={button.name} disabled={showing || gameState === 'ended'} onClick={() => press(i)} className={`h-32 w-32 rounded-3xl ${button.className} transition-all active:scale-95 ${active === i ? `scale-110 ring-8 ${button.ring} brightness-150` : 'opacity-75'}`} />)}</div><div className="text-center text-purple-200">{gameState === 'ended' ? 'Pattern broken!' : showing ? 'Watch...' : `Repeat ${sequence.length} taps`}</div>{gameState === 'ended' && <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-green-500 to-teal-600 px-8 py-3 font-bold text-white active:scale-95">Try Again</button>}</>}</div>;
}