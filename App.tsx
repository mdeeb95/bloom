import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, InteractionState, RingData, PetalData } from './types';
import { generateRoundColors, getRingConfig, ANIMATION_CONFIG } from './utils/gameLogic';
import { Flower } from './components/Flower';
import { soundManager } from './utils/soundManager';
import gsap from 'gsap';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [interactionState, setInteractionState] = useState<InteractionState>(InteractionState.IDLE);
  const [rings, setRings] = useState<RingData[]>([]);
  const [highScore, setHighScore] = useState<number>(0);
  const [suspensePetalId, setSuspensePetalId] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<number>(0);
  
  const pinchRef = useRef<{ distance: number | null, currentZoom: number }>({ distance: null, currentZoom: 1.0 });

  // Initialize zoom CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--user-zoom', '1.0');
  }, []);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('petal-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const startNewGame = () => {
    soundManager.play('START_GAME', 0.6);
    setGameState(GameState.PLAYING);
    setInteractionState(InteractionState.IDLE);
    setRings([]);
    setGameKey(prev => prev + 1); // Force Flower to unmount and remount clean
    setSuspensePetalId(null);
    
    // Reset zoom
    pinchRef.current.currentZoom = 1.0;
    document.documentElement.style.setProperty('--user-zoom', '1.0');
    
    addRing(0);
  };

  const addRing = (currentRingCount: number) => {
    const level = currentRingCount + 1;
    const { count, radius, petalSize } = getRingConfig(level);
    const colors = generateRoundColors(level, difficulty);

    const oddCount = Math.max(1, Math.floor(count * 0.1));
    const oddIndices = new Set<number>();
    while (oddIndices.size < Math.min(oddCount, count)) {
      oddIndices.add(Math.floor(Math.random() * count));
    }

    const rotationOffset = (level * 33) % 360;

    const petals: PetalData[] = Array.from({ length: count }).map((_, i) => {
      const angle = (360 / count) * i;
      const isOdd = oddIndices.has(i);
      return {
        id: `ring-${level}-petal-${i}`,
        angle,
        color: isOdd ? colors.odd : colors.primary,
        isOdd,
        x: 0,
        y: 0,
      };
    });

    const newRing: RingData = {
      id: level,
      petals,
      baseColor: colors.primary,
      radius: radius,
      petalSize: petalSize,
      rotationOffset: rotationOffset,
      scale: 1
    };

    setRings(prev => [...prev, newRing]);
  };

  const handlePetalClick = useCallback((ringId: number, petalId: string) => {
    if (interactionState !== InteractionState.IDLE) return;

    const currentRing = rings[rings.length - 1];
    if (currentRing.id !== ringId) return;

    const petal = currentRing.petals.find(p => p.id === petalId);
    if (!petal) return;

    soundManager.play('PETAL_CLICK', 0.4);
    const wobbleSound = soundManager.playLoop('SUSPENSE_WOBBLE', 0.3);

    setSuspensePetalId(petalId);
    setInteractionState(InteractionState.SUSPENSE);

    // Calculate total wobble duration: (cycle * (repeats + 1)) + return_to_center
    const wobbleDuration = (ANIMATION_CONFIG.WOBBLE.DURATION * (ANIMATION_CONFIG.WOBBLE.REPEATS + 1)) + ANIMATION_CONFIG.WOBBLE.RETURN_DURATION;

    setTimeout(() => {
      if (wobbleSound) {
        gsap.to(wobbleSound, { volume: 0, duration: 0.3, onComplete: () => wobbleSound.pause() });
      }
      if (petal.isOdd) {
        handleCorrectGuess(petalId);
      } else {
        handleWrongGuess();
      }
    }, wobbleDuration * 1000);
  }, [rings, interactionState]);

  const handleCorrectGuess = (petalId: string) => {
    soundManager.playShepard('LEVEL_UP', rings.length, 0.25);
    setInteractionState(InteractionState.BLOOMING);
    setSuspensePetalId(null);
    
    setTimeout(() => {
      addRing(rings.length);
      setInteractionState(InteractionState.IDLE);
    }, 400);
  };

  const handleWrongGuess = () => {
    soundManager.play('GAME_OVER', 0.5);
    setInteractionState(InteractionState.SCATTERING);
    setSuspensePetalId(null);

    const currentScore = rings.length;
    if (currentScore > highScore) {
      setHighScore(currentScore);
      localStorage.setItem('petal-highscore', currentScore.toString());
    }

    // Wait for scatter animation, then fade out, then restart
    setTimeout(() => {
      const flowerContainer = document.querySelector('.flower-main-container');
      if (flowerContainer) {
        gsap.to(flowerContainer, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
            startNewGame();
            gsap.to(flowerContainer, { opacity: 1, duration: 0.5 });
          }
        });
      } else {
        startNewGame();
      }
    }, 2500);
  };

  // --- Zoom Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    // Scroll up = Zoom In, Scroll down = Zoom Out
    const zoomSpeed = 0.0015;
    const delta = -e.deltaY * zoomSpeed;
    const newZoom = Math.min(Math.max(0.1, pinchRef.current.currentZoom + delta), 4.0);
    pinchRef.current.currentZoom = newZoom;
    document.documentElement.style.setProperty('--user-zoom', newZoom.toString());
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current.distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current.distance !== null) {
      const newDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const ratio = newDistance / pinchRef.current.distance;
      const newZoom = Math.min(Math.max(0.1, pinchRef.current.currentZoom * ratio), 4.0);
      pinchRef.current.currentZoom = newZoom;
      document.documentElement.style.setProperty('--user-zoom', newZoom.toString());
      pinchRef.current.distance = newDistance;
    }
  };

  const handleTouchEnd = () => {
    pinchRef.current.distance = null;
  };

  return (
    <div 
      className="relative w-full h-full min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden transition-colors duration-1000"
      onWheel={gameState === GameState.PLAYING ? handleWheel : undefined}
      onTouchStart={gameState === GameState.PLAYING ? handleTouchStart : undefined}
      onTouchMove={gameState === GameState.PLAYING ? handleTouchMove : undefined}
      onTouchEnd={handleTouchEnd}
    >
      
      {gameState === GameState.HOME && (
        <div className="z-10 flex flex-col items-center animate-fade-in space-y-12">
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-extralight tracking-[0.2em] text-slate-800 uppercase">Petal</h1>
            <p className="text-slate-400 text-sm tracking-widest uppercase">Perception Puzzle</p>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-0 bg-rose-200 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
            <button 
              onClick={startNewGame}
              onMouseEnter={() => soundManager.play('PETAL_HOVER', 0.2)}
              className="relative px-12 py-4 bg-white border border-slate-100 rounded-full shadow-lg text-slate-600 tracking-[0.15em] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              BLOOM
            </button>
          </div>

          <div className="w-64 flex flex-col items-center space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-between w-full px-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Normal</span>
              <span className="text-[10px] text-rose-400 uppercase tracking-[0.2em] font-medium">Girlfriend Mode</span>
            </div>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={difficulty}
              onChange={(e) => setDifficulty(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-400"
            />
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Best Bloom</p>
            <p className="text-2xl font-light text-slate-600">{highScore} Rings</p>
          </div>
        </div>
      )}

      {gameState === GameState.PLAYING && (
        <>
          <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-20 pointer-events-none">
            <div className="flex flex-col items-center w-full">
              <span className="text-slate-300 text-xs font-bold tracking-[0.3em] uppercase mb-2">
                Ring {rings.length}
              </span>
              {rings.length <= 2 && (
                <span className="text-slate-300 text-xs animate-pulse">
                  Find the odd petal
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 w-full flex items-center justify-center flower-main-container">
             <Flower 
               key={gameKey}
               rings={rings}
               onPetalClick={handlePetalClick}
               interactionState={interactionState}
               suspensePetalId={suspensePetalId}
             />
          </div>
        </>
      )}

      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden bg-[#fafafa]">
        <style>{`
          @keyframes float-slow {
            0% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(10vw, -10vh) scale(1.1); }
            66% { transform: translate(-5vw, 5vh) scale(0.9); }
            100% { transform: translate(0, 0) scale(1); }
          }
          @keyframes float-reverse {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-8vw, 12vh) scale(1.05); }
            100% { transform: translate(0, 0) scale(1); }
          }
          .animate-float-slow { animation: float-slow 25s infinite ease-in-out; }
          .animate-float-reverse { animation: float-reverse 30s infinite ease-in-out; }
        `}</style>
        
        {/* Soft Moving Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[80vh] h-[80vh] bg-rose-200/60 rounded-full blur-[80px] animate-float-slow will-change-transform" />
        <div className="absolute bottom-[0%] right-[-5%] w-[90vh] h-[90vh] bg-indigo-200/50 rounded-full blur-[80px] animate-float-reverse will-change-transform" />
        <div className="absolute top-[30%] left-[20%] w-[60vh] h-[60vh] bg-teal-100/70 rounded-full blur-[80px] animate-float-slow will-change-transform" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[70vh] h-[70vh] bg-amber-100/50 rounded-full blur-[80px] animate-float-reverse will-change-transform" />

        {/* Liquid Glass Overlay */}
        <div className="absolute inset-0 backdrop-blur-[80px] opacity-80" />
        
        {/* Subtle Paper Texture/Noise (Optional, but adds to the dreamlike feel) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

    </div>
  );
}
