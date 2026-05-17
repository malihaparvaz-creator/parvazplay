import { useCallback, useEffect, useRef, useState } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

type Obstacle = { id: number; lane: number; y: number };

const LANES = 3;
const LANE_W = 84;
const GAME_W = LANES * LANE_W + 20;
const GAME_H = 420;
const PLAYER_Y = GAME_H - 72;
const CAR_H = 36; // actual hitbox height
const CAR_W = 28; // actual hitbox width

export function RacingGame() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [playerLane, setPlayerLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(2.4);
  const [roadOffset, setRoadOffset] = useState(0);
  const [highScore, setHighScore] = usePersistedNumber('racing-best', 0);

  const laneRef = useRef(1);
  const scoreRef = useRef(0);
  const speedRef = useRef(2.4);
  const obstacleRef = useRef<Obstacle[]>([]);
  const nextIdRef = useRef(0);
  const lastFrameRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const frameRef = useRef(0);
  const endedRef = useRef(false);
  const roadOffsetRef = useRef(0);

  const endGame = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setGameState('ended');
    setHighScore((best) => Math.max(best, Math.floor(scoreRef.current)));
  }, [setHighScore]);

  const startGame = useCallback(() => {
    laneRef.current = 1;
    scoreRef.current = 0;
    speedRef.current = 2.4;
    obstacleRef.current = [];
    nextIdRef.current = 0;
    spawnTimerRef.current = 0;
    roadOffsetRef.current = 0;
    lastFrameRef.current = performance.now();
    endedRef.current = false;
    setPlayerLane(1);
    setObstacles([]);
    setScore(0);
    setSpeed(2.4);
    setRoadOffset(0);
    setGameState('playing');
  }, []);

  const moveLane = useCallback((delta: number) => {
    laneRef.current = Math.max(0, Math.min(LANES - 1, laneRef.current + delta)); Sounds.dodge();
    setPlayerLane(laneRef.current);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') moveLane(-1);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') moveLane(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, moveLane]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const loop = (time: number) => {
      const dt = Math.min(34, time - lastFrameRef.current);
      lastFrameRef.current = time;

      const spd = speedRef.current;
      const dtNorm = dt / 16.67;

      // Score + acceleration
      scoreRef.current += dt * 0.055;
      speedRef.current = Math.min(10, 2.4 + scoreRef.current / 260);

      // Road scroll offset — both the dashes AND traffic move at same speed
      roadOffsetRef.current = (roadOffsetRef.current + spd * dtNorm) % 46;

      // Spawn
      spawnTimerRef.current += dt;
      const spawnDelay = Math.max(400, 1100 - scoreRef.current * 1.3);
      if (spawnTimerRef.current >= spawnDelay) {
        spawnTimerRef.current = 0;
        // Avoid spawning in same lane as player when too close
        const availLanes = [0, 1, 2].filter(
          (l) => !(l === laneRef.current && obstacleRef.current.some((o) => o.lane === l && o.y < 80))
        );
        const lane = availLanes[Math.floor(Math.random() * availLanes.length)] ?? Math.floor(Math.random() * LANES);
        obstacleRef.current = [
          ...obstacleRef.current,
          { id: nextIdRef.current++, lane, y: -48 },
        ];
      }

      // Move obstacles
      obstacleRef.current = obstacleRef.current
        .map((o) => ({ ...o, y: o.y + spd * dtNorm }))
        .filter((o) => o.y < GAME_H + 60);

      // Collision — tight pixel-accurate box
      const playerCenterX = laneRef.current * LANE_W + LANE_W / 2 + 10;
      const playerLeft = playerCenterX - CAR_W / 2;
      const playerRight = playerCenterX + CAR_W / 2;
      const playerTop = PLAYER_Y;
      const playerBottom = PLAYER_Y + CAR_H;

      const crashed = obstacleRef.current.some((o) => {
        const obCenterX = o.lane * LANE_W + LANE_W / 2 + 10;
        const obLeft = obCenterX - CAR_W / 2;
        const obRight = obCenterX + CAR_W / 2;
        const obTop = o.y;
        const obBottom = o.y + CAR_H;
        return (
          playerRight > obLeft &&
          playerLeft < obRight &&
          playerBottom > obTop &&
          playerTop < obBottom
        );
      });

      setScore(Math.floor(scoreRef.current));
      setSpeed(Number(speedRef.current.toFixed(1)));
      setObstacles([...obstacleRef.current]);
      setRoadOffset(roadOffsetRef.current);

      if (crashed) { Sounds.crash(); endGame(); return; }
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState, endGame]);

  const laneCenter = (lane: number) => lane * LANE_W + LANE_W / 2 + 10;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-4 text-center">
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3">
          <div className="text-xs uppercase tracking-wider text-purple-200">Score</div>
          <div className="text-2xl font-bold text-yellow-300">{score}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3">
          <div className="text-xs uppercase tracking-wider text-purple-200">Speed</div>
          <div className="text-2xl font-bold text-cyan-300">{speed.toFixed(1)}</div>
        </div>
        <div className="rounded-xl border border-white/20 bg-white/10 px-5 py-3">
          <div className="text-xs uppercase tracking-wider text-purple-200">Best</div>
          <div className="text-2xl font-bold text-emerald-300">{highScore}</div>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-8 py-12 text-center">
          <div className="mb-4 text-6xl">🏎️</div>
          <div className="mb-2 text-2xl font-bold text-white">Street Racer</div>
          <div className="mb-6 text-purple-200">Dodge traffic. Speed increases over time.</div>
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-600 px-8 py-3 text-lg font-bold text-white shadow-lg active:scale-95">
            🏁 Start Race
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="select-none">
          <div
            className="relative overflow-hidden rounded-xl border-2 border-white/20"
            style={{ width: GAME_W, height: GAME_H, background: '#1c1c2e' }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              moveLane(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
            }}
          >
            {/* Road surface */}
            <div className="absolute inset-0" style={{ background: '#2d2d44' }} />

            {/* Scrolling road dashes — moves at same speed as traffic */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(180deg, transparent, transparent 22px, rgba(255,220,0,0.45) 22px, rgba(255,220,0,0.45) 24px)',
                backgroundSize: `100% 46px`,
                backgroundPositionY: `${roadOffset}px`,
              }}
            />

            {/* Lane dividers */}
            {[1, 2].map((l) => (
              <div
                key={l}
                className="absolute bottom-0 top-0 w-px"
                style={{ left: l * LANE_W + 10, background: 'rgba(255,255,255,0.15)' }}
              />
            ))}

            {/* Roadside strips */}
            <div className="absolute bottom-0 left-0 top-0 w-2.5 bg-green-900/60" />
            <div className="absolute bottom-0 right-0 top-0 w-2.5 bg-green-900/60" />

            {/* Traffic cars */}
            {obstacles.map((o) => (
              <div
                key={o.id}
                className="absolute text-3xl"
                style={{
                  left: laneCenter(o.lane) - 18,
                  top: o.y,
                  lineHeight: '36px',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))',
                }}
              >
                {['🚗', '🚕', '🚙', '🚓', '🚌'][o.id % 5]}
              </div>
            ))}

            {/* Player car */}
            <div
              className="absolute text-3xl transition-all duration-100"
              style={{
                left: laneCenter(playerLane) - 18,
                top: PLAYER_Y,
                lineHeight: '36px',
                filter: 'drop-shadow(0 0 8px rgba(255,100,0,0.8))',
              }}
            >
              🏎️
            </div>

            {/* Speed indicator */}
            <div className="absolute right-2 top-2 rounded bg-black/40 px-2 py-1 text-xs font-bold text-cyan-300">
              {speed.toFixed(1)}x
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-purple-300">Arrow keys / A D — or tap left/right half</div>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="rounded-2xl border border-red-400/40 bg-gradient-to-r from-red-500/20 to-orange-500/20 px-8 py-6 text-center">
          <div className="mb-2 text-4xl">💥</div>
          <div className="mb-1 text-2xl font-bold text-red-300">Crashed!</div>
          <div className="mb-4 text-3xl font-bold text-white">{score} points</div>
          {score >= highScore && score > 0 && (
            <div className="mb-3 text-sm font-bold text-yellow-300">🏆 New best!</div>
          )}
          <button onClick={startGame} className="rounded-xl bg-gradient-to-r from-red-500 to-orange-600 px-8 py-3 font-bold text-white shadow-lg active:scale-95">
            🔄 Race Again
          </button>
        </div>
      )}
    </div>
  );
}