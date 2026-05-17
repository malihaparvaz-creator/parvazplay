import { useState, useEffect, useRef, useCallback } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

export function ArcheryGame() {
  const [gameState, setGameState] = useState<'idle' | 'aiming' | 'powering' | 'flying' | 'result' | 'ended'>('idle');
  const [angle, setAngle] = useState(45);
  const [power, setPower] = useState(0);
  const [powerDir, setPowerDir] = useState(1);
  const [arrowPos, setArrowPos] = useState({ x: 40, y: 280 });
  const [arrows, setArrows] = useState(5);
  const [totalScore, setTotalScore] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [highScore, setHighScore] = usePersistedNumber('archery-best', 0);
  const [wind, setWind] = useState(0);
  const frameRef = useRef<number>(0);
  const velRef = useRef({ vx: 0, vy: 0 });

  const TARGET_X = 320;
  const TARGET_Y = 180;
  const GRAVITY = 0.15;
  const WIDTH = 400;
  const HEIGHT = 300;

  const startGame = useCallback(() => {
    setGameState('aiming');
    setArrows(5);
    setTotalScore(0);
    setLastScore(null);
    setAngle(45);
    setPower(0);
    setArrowPos({ x: 40, y: 280 });
    setWind((Math.random() - 0.5) * 3);
  }, []);

  // Angle oscillation
  useEffect(() => {
    if (gameState !== 'aiming') return;
    const interval = setInterval(() => {
      setAngle((a) => {
        if (a >= 80) return 80;
        if (a <= 10) return 10;
        return a + 1;
      });
    }, 30);

    let dir = 1;
    const dirInterval = setInterval(() => {
      setAngle((a) => {
        if (a >= 80) dir = -1;
        if (a <= 10) dir = 1;
        return a + dir * 1.5;
      });
    }, 30);

    return () => {
      clearInterval(interval);
      clearInterval(dirInterval);
    };
  }, [gameState]);

  // Power oscillation
  useEffect(() => {
    if (gameState !== 'powering') return;
    const interval = setInterval(() => {
      setPower((p) => {
        const newP = p + powerDir * 2;
        if (newP >= 100) { setPowerDir(-1); return 100; }
        if (newP <= 0) { setPowerDir(1); return 0; }
        return newP;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [gameState, powerDir]);

  // Arrow flight
  useEffect(() => {
    if (gameState !== 'flying') return;

    const loop = () => {
      setArrowPos((pos) => {
        const newX = pos.x + velRef.current.vx;
        const newY = pos.y + velRef.current.vy;
        velRef.current.vy += GRAVITY;
        velRef.current.vx += wind * 0.01;

        // Check if hit target area
        const dx = newX - TARGET_X;
        const dy = newY - TARGET_Y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
          let pts = 0;
          if (dist < 8) { pts = 100; Sounds.bullseye(); }
          else if (dist < 16) { pts = 80; Sounds.arrowHit(); }
          else if (dist < 24) { pts = 50; Sounds.arrowHit(); }
          else if (dist < 32) { pts = 25; Sounds.arrowHit(); }
          else { pts = 10; Sounds.arrowHit(); }
          setLastScore(pts);
          setTotalScore((s) => s + pts);
          setGameState('result');
          return { x: newX, y: newY };
        }

        if (newX > WIDTH || newY > HEIGHT || newX < 0) {
          setLastScore(0); Sounds.arrowMiss();
          setGameState('result');
          return { x: newX, y: newY };
        }

        return { x: newX, y: newY };
      });

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState, wind]);

  const handleClick = () => {
    if (gameState === 'aiming') {
      setGameState('powering'); Sounds.click();
      setPower(0);
      setPowerDir(1);
    } else if (gameState === 'powering') {
      const rad = (angle * Math.PI) / 180;
      const p = power * 0.12;
      velRef.current = { vx: Math.cos(rad) * p, vy: -Math.sin(rad) * p };
      setArrowPos({ x: 40, y: 280 });
      setGameState('flying'); Sounds.shoot();
    } else if (gameState === 'result') {
      const newArrows = arrows - 1;
      setArrows(newArrows);
      if (newArrows <= 0) {
        setGameState('ended');
        if (totalScore > highScore) setHighScore(totalScore);
      } else {
        setArrowPos({ x: 40, y: 280 });
        setWind((Math.random() - 0.5) * 3);
        setGameState('aiming');
      }
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 100) return 'text-yellow-300';
    if (s >= 80) return 'text-orange-300';
    if (s >= 50) return 'text-green-300';
    if (s >= 25) return 'text-blue-300';
    if (s > 0) return 'text-purple-300';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-center flex-wrap justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Score</div>
          <div className="text-2xl font-bold text-yellow-300">{totalScore}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Arrows</div>
          <div className="text-2xl font-bold text-white">{'🏹'.repeat(Math.max(0, arrows))}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Wind</div>
          <div className="text-2xl font-bold text-cyan-300">
            {wind > 0 ? '→' : '←'} {Math.abs(wind).toFixed(1)}
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Best</div>
          <div className="text-2xl font-bold text-emerald-300">{highScore}</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-12 border border-white/20">
          <div className="text-6xl mb-4">🏹</div>
          <div className="text-2xl font-bold text-white mb-2">Archery Master</div>
          <div className="text-purple-200 mb-2">Click to set angle, then click to set power!</div>
          <div className="text-sm text-purple-300 mb-6">5 arrows • Watch the wind! 🌬️</div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg active:scale-95 text-lg">
            🎯 Start Shooting
          </button>
        </div>
      )}

      {(gameState === 'aiming' || gameState === 'powering' || gameState === 'flying' || gameState === 'result') && (
        <div onClick={handleClick} className="cursor-pointer select-none">
          <svg width={WIDTH} height={HEIGHT} className="rounded-xl border-2 border-white/20 bg-gradient-to-b from-sky-900 to-green-900">
            {/* Ground */}
            <rect x="0" y="270" width={WIDTH} height="30" fill="#2d5016" />

            {/* Target */}
            <circle cx={TARGET_X} cy={TARGET_Y} r="38" fill="#fff" stroke="#333" strokeWidth="2" />
            <circle cx={TARGET_X} cy={TARGET_Y} r="30" fill="#3b82f6" />
            <circle cx={TARGET_X} cy={TARGET_Y} r="22" fill="#ef4444" />
            <circle cx={TARGET_X} cy={TARGET_Y} r="14" fill="#fbbf24" />
            <circle cx={TARGET_X} cy={TARGET_Y} r="6" fill="#dc2626" />

            {/* Bow */}
            <line x1="40" y1="280" x2={40 + Math.cos((angle * Math.PI) / 180) * 30} y2={280 - Math.sin((angle * Math.PI) / 180) * 30} stroke="#8B4513" strokeWidth="3" />
            <circle cx="40" cy="280" r="5" fill="#8B4513" />

            {/* Angle indicator */}
            {gameState === 'aiming' && (
              <text x="60" y="260" fill="#fbbf24" fontSize="14" fontWeight="bold">
                {Math.round(angle)}°
              </text>
            )}

            {/* Arrow in flight */}
            {gameState === 'flying' && (
              <text x={arrowPos.x - 8} y={arrowPos.y + 5} fontSize="16">🏹</text>
            )}

            {/* Landed arrow */}
            {gameState === 'result' && (
              <text x={arrowPos.x - 8} y={arrowPos.y + 5} fontSize="16">🏹</text>
            )}

            {/* Wind indicator */}
            <text x={WIDTH / 2 - 30} y="25" fill="#87CEEB" fontSize="12">
              Wind: {wind > 0 ? '→' : '←'} {Math.abs(wind).toFixed(1)}
            </text>
          </svg>

          {/* Power bar */}
          {gameState === 'powering' && (
            <div className="mt-2 w-full bg-gray-700 rounded-full h-6 overflow-hidden border border-white/20">
              <div
                className="h-full transition-none rounded-full"
                style={{
                  width: `${power}%`,
                  background: power < 30 ? '#22c55e' : power < 70 ? '#eab308' : '#ef4444',
                }}
              />
            </div>
          )}

          {gameState === 'aiming' && (
            <div className="text-center text-yellow-300 text-sm mt-2 animate-pulse font-bold">Click to lock angle!</div>
          )}
          {gameState === 'powering' && (
            <div className="text-center text-red-300 text-sm mt-2 animate-pulse font-bold">Click to set power!</div>
          )}
          {gameState === 'result' && lastScore !== null && (
            <div className="text-center mt-2">
              <div className={`text-xl font-bold ${getScoreColor(lastScore)}`}>
                {lastScore === 0 ? '❌ Miss!' : `🎯 +${lastScore} points!`}
              </div>
              <div className="text-purple-300 text-sm mt-1">Click for next arrow</div>
            </div>
          )}
        </div>
      )}

      {gameState === 'ended' && (
        <div className="text-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-2xl px-8 py-6 border border-green-400/40">
          <div className="text-4xl mb-2">🏹</div>
          <div className="text-2xl font-bold text-green-300 mb-1">Round Complete!</div>
          <div className="text-3xl font-bold text-white mb-4">{totalScore} / 500</div>
          <button onClick={startGame} className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg active:scale-95">
            🔄 Shoot Again
          </button>
        </div>
      )}
    </div>
  );
}
