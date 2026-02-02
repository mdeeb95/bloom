import React, { useRef, useEffect, useMemo } from 'react';
import { RingData, InteractionState } from '../types';
import gsap from 'gsap';

const ANIMATION_CONFIG = {
  BLOOM: {
    DURATION: 0.8,
    BASE_STAGGER: 0.05,
    MIN_STAGGER: 0.01,
    EASE: "back.out(1.7)"
  },
  WOBBLE: {
    DURATION: 0.1,
    ROTATION_OFFSET: 4,
    REPEATS: 19,
    EASE: "sine.inOut",
    RETURN_DURATION: 0.2,
    RETURN_EASE: "back.out"
  },
  SCATTER: {
    MIN_DURATION: 1.5,
    GRAVITY: 500,
    FORCE_RANGE: [100, 600], // 100 + 500
    ROTATION_RANGE: [-180, 180], // -180 + 360
    EASE: "power2.out"
  }
};

interface FlowerProps {
  rings: RingData[];
  onPetalClick: (ringId: number, petalId: string) => void;
  interactionState: InteractionState;
  suspensePetalId: string | null;
  userZoom?: number;
}

export const Flower: React.FC<FlowerProps> = ({ 
  rings, 
  onPetalClick, 
  interactionState,
  suspensePetalId,
  userZoom = 1.0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const petalRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Handle Bloom Animation (New Ring Entry)
  useEffect(() => {
    if (interactionState === InteractionState.IDLE && rings.length > 0) {
      const latestRing = rings[rings.length - 1];
      const ringEl = ringsRef.current.get(latestRing.id);
      
      if (ringEl) {
        // Animate petals scaling up from 0
        const petals = ringEl.querySelectorAll('.petal-wrapper');
        
        // Calculate dynamic stagger: less stagger for more petals to keep animation snappy
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
            stagger: staggerAmount, 
            ease: ANIMATION_CONFIG.BLOOM.EASE,
            force3D: true // Hint to use GPU
          }
        );
      }
    }
  }, [rings.length, interactionState]);

  // Handle Scatter Animation (Game Over)
  useEffect(() => {
    if (interactionState === InteractionState.SCATTERING && containerRef.current) {
      const allPetals = containerRef.current.querySelectorAll('.petal-wrapper');
      
      allPetals.forEach((petal) => {
        const p = petal as HTMLElement;
        
        // Random physics vectors
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
        // The petal is visually rotated 45deg in CSS. 
        // To wobble around its visual center, we use its current rotation as base.
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
              // Return to exact center after wobble
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
          gsap.set(el, { rotation: baseRotation });
        };
      }
    }
  }, [interactionState, suspensePetalId]);

  // Dynamic auto-scaling logic
  const baseScale = useMemo(() => 
    Math.min(10.0, 1.5 / (0.7 + rings.length * 0.15)),
  [rings.length]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      
      {/* Static Background Stem (Does not scale with flower) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-0">
        <svg 
          width="200" 
          height="800" 
          viewBox="0 0 200 800"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="stemGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" /> {/* emerald-500 */}
              <stop offset="100%" stopColor="#064e3b" /> {/* emerald-900 */}
            </linearGradient>
          </defs>
          
          {/* Main Stem Path */}
          <path 
            d="M 100 0 Q 120 150 80 300 T 110 600 T 90 800" 
            stroke="url(#stemGradient)" 
            strokeWidth="12" 
            fill="none" 
            strokeLinecap="round"
          />
          
          {/* Leaves */}
          <path d="M 88 250 Q 40 230 20 280 Q 50 300 88 250" fill="#34d399" className="opacity-90" />
          <path d="M 108 450 Q 160 430 180 480 Q 150 500 108 450" fill="#10b981" className="opacity-90" />
        </svg>
      </div>

      {/* Manual Zoom Wrapper (No Transition for instant response) */}
      <div 
        style={{ 
          transform: `scale(${userZoom})`,
          transition: 'none', // Critical: Instant response to scroll/pinch
        }}
        className="relative flex items-center justify-center"
      >
        {/* Auto-Scaling Content (Has smooth transition for blooms) */}
        <div 
          ref={containerRef}
          className="relative flex items-center justify-center transition-transform duration-1000 ease-in-out z-10"
          style={{ 
            width: '300px', 
            height: '300px',
            transform: `scale(${baseScale})`
          }}
        >
          {/* The Center (Receptacle) */}
          <div className="absolute w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-full z-[100] shadow-xl border-[6px] border-emerald-800/20 flex items-center justify-center">
            <div className="w-16 h-16 bg-emerald-300/20 rounded-full blur-md" />
          </div>

          {rings.map((ring, ringIndex) => {
            const isCurrentRing = ringIndex === rings.length - 1;
            
            // "Shrink in harder" logic:
            // Inner rings scale down more as outer rings are added.
            const ringsFromOutermost = rings.length - 1 - ringIndex;
            const ringScale = Math.max(0.4, 1 - (ringsFromOutermost * 0.12));
            
            return (
              <div 
                key={ring.id}
                ref={(el) => { if (el) ringsRef.current.set(ring.id, el); }}
                className="absolute top-1/2 left-1/2 w-0 h-0 transition-transform duration-1000 ease-in-out"
                style={{ 
                  zIndex: 90 - ringIndex,
                  transform: `rotate(${ring.rotationOffset}deg) scale(${ringScale})` 
                }}
              >
                {ring.petals.map((petal) => {
                  const isSuspense = suspensePetalId === petal.id && interactionState === InteractionState.SUSPENSE;
                  
                  return (
                    <button
                      key={petal.id}
                      className="petal-wrapper absolute origin-bottom cursor-pointer p-0 border-none bg-transparent"
                      aria-label={`Petal ${petal.id} in ring ${ring.id}`}
                      disabled={interactionState !== InteractionState.IDLE || !isCurrentRing}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (interactionState === InteractionState.IDLE && isCurrentRing) {
                          onPetalClick(ring.id, petal.id);
                        }
                      }}
                      style={{
                        width: `${ring.petalSize}px`,
                        height: `${ring.petalSize}px`, // Square for diamond shape
                        left: `${-ring.petalSize / 2}px`,
                        bottom: '0px',
                        // Position wrapper: Rotate to angle, move out by radius
                        transform: `rotate(${petal.angle}deg) translateY(-${ring.radius}px)`,
                        pointerEvents: isCurrentRing ? 'auto' : 'none',
                        willChange: 'transform, opacity' // Optimization hint
                      }}
                    >
                      {/* Inner Petal Shape - Rotated Diamond */}
                      <div
                        ref={(el) => { if (el) petalRefs.current.set(petal.id, el); }}
                        className={`
                          w-full h-full
                          transition-colors duration-300
                          ${!isCurrentRing ? 'filter brightness-95' : ''}
                        `}
                        style={{
                          backgroundColor: petal.color,
                          // Pointy top-left corner will point straight out
                          borderRadius: '12% 100% 100% 100%', 
                          // Rotate 45deg so the top-left corner (the point) faces UP (outwards)
                          transform: 'rotate(45deg)', 
                          boxShadow: 'inset 5px 5px 15px rgba(255,255,255,0.2), inset -5px -5px 15px rgba(0,0,0,0.05)',
                        }}
                      >
                        {/* Subtle spine line */}
                        <div className="absolute top-0 left-0 w-[150%] h-[1px] bg-black/5 origin-top-left rotate-45 pointer-events-none" />
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
