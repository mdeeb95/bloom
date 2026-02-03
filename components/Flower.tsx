import React, { useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { RingData, InteractionState } from '../types';
import { ANIMATION_CONFIG, LAYOUT_CONFIG } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';
import gsap from 'gsap';

interface PetalProps {
  petal: any;
  ring: RingData;
  isCurrentRing: boolean;
  interactionState: InteractionState;
  onPetalClick: (ringId: number, petalId: string) => void;
  onPetalHover: (angle: number) => void;
  suspensePetalId: string | null;
  petalRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

const Petal = React.memo(({ 
  petal, 
  ring, 
  isCurrentRing, 
  interactionState, 
  onPetalClick, 
  onPetalHover,
  suspensePetalId,
  petalRefs
}: PetalProps) => {
  return (
    <button
      className="petal-wrapper absolute origin-bottom cursor-pointer p-0 border-none bg-transparent"
      aria-label={`Petal ${petal.id} in ring ${ring.id}`}
      disabled={interactionState !== InteractionState.IDLE || !isCurrentRing}
      onMouseEnter={() => {
        if (interactionState === InteractionState.IDLE && isCurrentRing) {
          onPetalHover(petal.angle);
          
          const el = petalRefs.current.get(petal.id);
          if (el) {
            const hoverOffset = ANIMATION_CONFIG.WOBBLE.ROTATION_OFFSET * 0.4;
            gsap.to(el, {
              rotation: 45 + hoverOffset,
              duration: ANIMATION_CONFIG.WOBBLE.DURATION,
              yoyo: true,
              repeat: 1,
              ease: ANIMATION_CONFIG.WOBBLE.EASE
            });
          }
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (interactionState === InteractionState.IDLE && isCurrentRing) {
          soundManager.play('PETAL_CLICK', 0.6);
          onPetalClick(ring.id, petal.id);
        }
      }}
      style={{
        width: `${ring.petalSize}px`,
        height: `${ring.petalSize}px`,
        left: `${-ring.petalSize / 2}px`,
        bottom: '0px',
        transform: `rotate(${petal.angle}deg) translateY(-${ring.radius}px)`,
        pointerEvents: isCurrentRing ? 'auto' : 'none',
        willChange: 'transform',
        // Hide new petals until GSAP starts to avoid "pop flicker"
        opacity: isCurrentRing && interactionState === InteractionState.IDLE ? 0 : 1,
      }}
    >
      <div
        ref={(el) => { if (el) petalRefs.current.set(petal.id, el); }}
        className={`
          w-full h-full
          ${!isCurrentRing ? 'filter brightness-95' : ''}
        `}
        style={{
          backgroundColor: petal.color,
          borderRadius: '12% 100% 100% 100%', 
          transform: 'rotate(45deg)', 
          // Use CSS gradients for the spine and shading to save 1 DOM node per petal
          backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%, rgba(0,0,0,0.05) 100%)',
          boxShadow: 'inset 5px 5px 15px rgba(255,255,255,0.2), inset -5px -5px 15px rgba(0,0,0,0.05)',
        }}
      >
        {/* Decorative spine using a pseudo-element or simple CSS border is better, but gradient above handles it */}
      </div>
    </button>
  );
});

interface RingProps {
  ring: RingData;
  ringIndex: number;
  totalRings: number;
  interactionState: InteractionState;
  onPetalClick: (ringId: number, petalId: string) => void;
  onPetalHover: (angle: number) => void;
  suspensePetalId: string | null;
  ringsRef: React.MutableRefObject<Map<number, HTMLDivElement>>;
  petalRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

const Ring = React.memo(({
  ring,
  ringIndex,
  totalRings,
  interactionState,
  onPetalClick,
  onPetalHover,
  suspensePetalId,
  ringsRef,
  petalRefs
}: RingProps) => {
  const isCurrentRing = ringIndex === totalRings - 1;
  const ringsFromOutermost = totalRings - 1 - ringIndex;
  
  const ringScale = Math.max(
    LAYOUT_CONFIG.MIN_RING_SCALE, 
    1 - (ringsFromOutermost * LAYOUT_CONFIG.RING_SHRINK_FACTOR)
  );

  return (
    <div 
      ref={(el) => { if (el) ringsRef.current.set(ring.id, el); }}
      className="absolute top-1/2 left-1/2 w-0 h-0 transition-transform duration-1000 ease-in-out"
      style={{ 
        zIndex: 90 - ringIndex,
        transform: `rotate(${ring.rotationOffset}deg) scale(${ringScale})`,
        // Disable pointer events for inner rings to reduce hit testing overhead
        pointerEvents: isCurrentRing ? 'auto' : 'none',
        willChange: 'transform'
      }}
    >
      {ring.petals.map((petal) => (
        <Petal 
          key={petal.id}
          petal={petal}
          ring={ring}
          isCurrentRing={isCurrentRing}
          interactionState={interactionState}
          onPetalClick={onPetalClick}
          onPetalHover={onPetalHover}
          suspensePetalId={suspensePetalId}
          petalRefs={petalRefs}
        />
      ))}
    </div>
  );
});

interface FlowerProps {
  rings: RingData[];
  onPetalClick: (ringId: number, petalId: string) => void;
  interactionState: InteractionState;
  suspensePetalId: string | null;
}

export const Flower: React.FC<FlowerProps> = ({ 
  rings, 
  onPetalClick, 
  interactionState,
  suspensePetalId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const petalRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastHoverTime = useRef<number>(0);

  const handlePetalHover = React.useCallback((angle: number) => {
    const now = Date.now();
    // Throttle sound to once every 60ms for a smooth musical phrase
    if (now - lastHoverTime.current > 60) {
      lastHoverTime.current = now;
      // Map angle to sine wave for deterministic musical pitch (0.7 to 1.3)
      const pitch = 1.0 + 0.3 * Math.sin(angle * (Math.PI / 180));
      soundManager.play('PETAL_HOVER', 0.12, pitch);
    }
  }, []);

  // Handle Bloom Animation
  useLayoutEffect(() => {
    if (interactionState === InteractionState.IDLE && rings.length > 0) {
      const latestRing = rings[rings.length - 1];
      
      // Play a subtle bloom sound for the new ring if it's not the first one
      // (First one is handled by START_GAME sound)
      if (rings.length > 1) {
        soundManager.play('START_GAME', 0.3);
      }

      const ringEl = ringsRef.current.get(latestRing.id);
      
      if (ringEl) {
        const petals = ringEl.querySelectorAll('.petal-wrapper');
        const petalCount = latestRing.petals.length;
        const staggerAmount = Math.max(
          ANIMATION_CONFIG.BLOOM.MIN_STAGGER, 
          ANIMATION_CONFIG.BLOOM.BASE_STAGGER / (petalCount / 8)
        );

        gsap.fromTo(petals, 
          { scale: 0, opacity: 0 },
          { 
            scale: 1, 
            opacity: 1, 
            duration: ANIMATION_CONFIG.BLOOM.DURATION, 
            stagger: {
              each: staggerAmount,
              onStart: function() {
                // Play pop sound for each petal as it starts its bloom animation
                soundManager.play('PETAL_POP', 0.2, 0.8 + Math.random() * 0.4);
              }
            }, 
            ease: ANIMATION_CONFIG.BLOOM.EASE,
            force3D: true
          }
        );
      }
    }
  }, [rings.length, interactionState]);

  // Handle Scatter Animation
  useEffect(() => {
    if (interactionState === InteractionState.SCATTERING && containerRef.current) {
      const allPetals = containerRef.current.querySelectorAll('.petal-wrapper');
      
      allPetals.forEach((petal) => {
        const p = petal as HTMLElement;
        const angle = Math.random() * Math.PI * 2;
        const force = ANIMATION_CONFIG.SCATTER.FORCE_RANGE[0] + Math.random() * (ANIMATION_CONFIG.SCATTER.FORCE_RANGE[1] - ANIMATION_CONFIG.SCATTER.FORCE_RANGE[0]);
        const rotate = ANIMATION_CONFIG.SCATTER.ROTATION_RANGE[0] + Math.random() * (ANIMATION_CONFIG.SCATTER.ROTATION_RANGE[1] - ANIMATION_CONFIG.SCATTER.ROTATION_RANGE[0]);
        
        gsap.to(p, {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force + ANIMATION_CONFIG.SCATTER.GRAVITY,
          rotation: rotate,
          opacity: 0,
          duration: ANIMATION_CONFIG.SCATTER.MIN_DURATION + Math.random(),
          ease: ANIMATION_CONFIG.SCATTER.EASE,
          force3D: true
        });
      });
    }
  }, [interactionState]);

  // Handle Suspense Wobble
  useEffect(() => {
    if (interactionState === InteractionState.SUSPENSE && suspensePetalId) {
      const el = petalRefs.current.get(suspensePetalId);
      if (el) {
        // Play suspense wobble sound
        const suspenseSound = soundManager.playLoop('SUSPENSE_WOBBLE', 0.3);
        
        const baseRotation = gsap.getProperty(el, "rotation") as number;
        const wobble = gsap.fromTo(el, 
          { rotation: baseRotation - ANIMATION_CONFIG.WOBBLE.ROTATION_OFFSET }, 
          { 
            rotation: baseRotation + ANIMATION_CONFIG.WOBBLE.ROTATION_OFFSET, 
            duration: ANIMATION_CONFIG.WOBBLE.DURATION,
            yoyo: true,
            repeat: ANIMATION_CONFIG.WOBBLE.REPEATS, 
            ease: ANIMATION_CONFIG.WOBBLE.EASE,
            onComplete: () => {
              if (suspenseSound) {
                gsap.to(suspenseSound, { 
                  volume: 0, 
                  duration: 0.5, 
                  onComplete: () => suspenseSound.pause() 
                });
              }
              gsap.to(el, { 
                rotation: baseRotation, 
                duration: ANIMATION_CONFIG.WOBBLE.RETURN_DURATION, 
                ease: ANIMATION_CONFIG.WOBBLE.RETURN_EASE 
              });
            }
          }
        );

        return () => {
          wobble.kill();
          if (suspenseSound) {
            suspenseSound.pause();
          }
          gsap.set(el, { rotation: baseRotation });
        };
      }
    }
  }, [interactionState, suspensePetalId]);

  const baseScale = useMemo(() => 
    Math.min(10.0, 1.5 / (0.7 + rings.length * 0.15)),
  [rings.length]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <svg width="200" height="800" viewBox="0 0 200 800" className="overflow-visible">
          <defs>
            <linearGradient id="stemGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>
          <path d="M 100 0 Q 120 150 80 300 T 110 600 T 90 800" stroke="url(#stemGradient)" strokeWidth="12" fill="none" strokeLinecap="round" />
          <path d="M 88 250 Q 40 230 20 280 Q 50 300 88 250" fill="#34d399" className="opacity-90" />
          <path d="M 108 450 Q 160 430 180 480 Q 150 500 108 450" fill="#10b981" className="opacity-90" />
        </svg>
      </div>

      <div 
        style={{ transform: `scale(var(--user-zoom, 1))`, willChange: 'transform' }}
        className="relative flex items-center justify-center"
      >
        <div 
          ref={containerRef}
          className="relative flex items-center justify-center transition-transform duration-1000 ease-in-out z-10"
          style={{ 
            width: '300px', 
            height: '300px', 
            transform: `scale(${baseScale})`,
            willChange: 'transform'
          }}
        >
          <div className="absolute w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-full z-[100] shadow-xl border-[6px] border-emerald-800/20 flex items-center justify-center">
            <div className="w-16 h-16 bg-emerald-300/20 rounded-full blur-md" />
          </div>

          {rings.map((ring, ringIndex) => (
            <Ring 
              key={ring.id}
              ring={ring}
              ringIndex={ringIndex}
              totalRings={rings.length}
              interactionState={interactionState}
              onPetalClick={onPetalClick}
              onPetalHover={handlePetalHover}
              suspensePetalId={suspensePetalId}
              ringsRef={ringsRef}
              petalRefs={petalRefs}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
