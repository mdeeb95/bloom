import React, { useState, useEffect, useCallback } from 'react';
import { GameState, InteractionState, RingData, PetalData } from './types';
import { generateRoundColors, getRingConfig } from './utils/gameLogic';
import { Flower } from './components/Flower';
import gsap from 'gsap';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [interactionState, setInteractionState] = useState<InteractionState>(InteractionState.IDLE);
  const [rings, setRings] = useState<RingData[]>([]);
  const [highScore, setHighScore] = useState<number>(0);
  const [suspensePetalId, setSuspensePetalId] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState<number>(0);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('petal-highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const startNewGame = () => {
    setGameState(GameState.PLAYING);
    setInteractionState(InteractionState.IDLE);
    setRings([]);
    setGameKey(prev => prev + 1); // Force Flower to unmount and remount clean
    setSuspensePetalId(null);
    addRing(0);
  };

  const addRing = (currentRingCount: number) => {
    const level = currentRingCount + 1;
    const { count, radius, petalSize } = getRingConfig(level);
    const colors = generateRoundColors(level);

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

    setSuspensePetalId(petalId);
    setInteractionState(InteractionState.SUSPENSE);

    setTimeout(() => {
      if (petal.isOdd) {
        handleCorrectGuess(petalId);
      } else {
        handleWrongGuess();
      }
    }, 2300);
  }, [rings, interactionState]);

  const handleCorrectGuess = (petalId: string) => {
    setInteractionState(InteractionState.BLOOMING);
    setSuspensePetalId(null);
    
    setTimeout(() => {
      addRing(rings.length);
      setInteractionState(InteractionState.IDLE);
    }, 400);
  };

  const handleWrongGuess = () => {
    setInteractionState(InteractionState.SCATTERING);
    setSuspensePetalId(null);

    const currentScore = rings.length;
    if (currentScore > highScore) {
      setHighScore(currentScore);
      localStorage.setItem('petal-highscore', currentScore.toString());
    }

    // Wait for scatter animation, then fade out, then restart
    setTimeout(() => {
      // Use GSAP to fade out the flower container before restarting
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

  return (
    <div className="relative w-full h-full min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-slate-50 transition-colors duration-1000">
      
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
              className="relative px-12 py-4 bg-white border border-slate-100 rounded-full shadow-lg text-slate-600 tracking-[0.15em] hover:scale-105 active:scale-95 transition-all duration-300"
            >
              BLOOM
            </button>
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

      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-indigo-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vh] h-[60vh] bg-teal-50 rounded-full blur-3xl opacity-60" />
      </div>

    </div>
  );
}
