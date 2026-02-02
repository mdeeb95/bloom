import { Colors } from '../types';

export const ANIMATION_CONFIG = {
  // Animation for new rings appearing
  BLOOM: {
    DURATION: 0.8,         // Total duration for each petal to scale up
    BASE_STAGGER: 0.05,    // Delay between each petal's animation start
    MIN_STAGGER: 0.01,     // Minimum delay (used for high petal counts)
    EASE: "back.out(1.7)"  // Easing function for the "pop" effect
  },
  // "Suspense" animation when a petal is clicked
  WOBBLE: {
    DURATION: 0.15,         // Duration of a single left-to-right swing
    ROTATION_OFFSET: 10,    // Degrees to rotate in each direction
    REPEATS: 5,           // Number of times to swing back and forth
    EASE: "sine.inOut",    // Smooth swing motion
    RETURN_DURATION: 0.2,  // Time to snap back to the center position
    RETURN_EASE: "back.out" // Easing for the snap-back
  },
  // Animation when the wrong petal is picked
  SCATTER: {
    MIN_DURATION: 2,     // Minimum time for petals to fly away
    GRAVITY: 1000,          // Downward force applied to petals
    FORCE_RANGE: [100, 600], // [Min, Max] initial explosive force
    ROTATION_RANGE: [-180, 180], // [Min, Max] rotation during flight
    EASE: "power2.out"     // Easing for the initial explosion
  }
};

export const LAYOUT_CONFIG = {
  // How much inner rings shrink as outer rings are added
  RING_SHRINK_FACTOR: 0.01,   // 0.08 = 8% reduction per level deep
  MIN_RING_SCALE: 0.2,        // Smallest an inner ring can get

  // Spacing between rings
  BASE_VISIBILITY: 0.25,      // Starting overlap (lower = tighter packing)
  VISIBILITY_GROWTH: 0.05,    // How much extra space each ring gets as we go out
  MAX_VISIBILITY: 0.50        // Maximum spacing factor
};

// HSL to Hex helper
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const generateRoundColors = (level: number, difficultyBoost: number = 0): Colors => {
  // Random base pastel color
  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = Math.floor(Math.random() * 25) + 45; 
  const baseLight = Math.floor(Math.random() * 15) + 70;

  // Calculate difficulty (hue shift)
  let shiftAmount = 15; // Ring 1
  if (level >= 15) shiftAmount = 1;
  else if (level >= 10) shiftAmount = 3;
  else if (level >= 3) shiftAmount = 7;

  // Apply Girlfriend Mode boost (adds up to 25 degrees of extra separation)
  shiftAmount += (difficultyBoost * 25);

  // Randomize shift direction
  const direction = Math.random() > 0.5 ? 1 : -1;
  const oddHue = (baseHue + (shiftAmount * direction) + 360) % 360;

  const oddSat = level > 3 ? baseSat + (Math.random() > 0.5 ? 5 : -5) : baseSat;

  return {
    primary: hslToHex(baseHue, baseSat, baseLight),
    odd: hslToHex(oddHue, oddSat, baseLight),
  };
};

// Fibonacci helper: Returns the n-th Fibonacci number
function fibonacci(n: number): number {
  let a = 0, b = 1, temp;
  while (n > 0) {
    temp = a;
    a = b;
    b = temp + b;
    n--;
  }
  return a;
}

export const getRingConfig = (level: number) => {
  // Level 1 = Ring 1 (start)
  
  // Fibonacci petal count
  // We start the sequence from index 6 (8 petals)
  // We cap it at 34 to prevent performance issues with too many DOM nodes at high ring counts (10+)
  // 34 petals is still a lot of complexity but much easier on the browser than 55+
  const count = Math.min(fibonacci(level + 5), 34); 
  
  // Calculate petal size: Grows larger as we go outwards
  const basePetalSize = 64;
  const sizeGrowthPerLevel = 10; 
  const petalSize = basePetalSize + (level - 1) * sizeGrowthPerLevel;

  // Calculate radius: Rings go further out and stack less
  // We calculate it cumulatively based on the size of previous petals
  // Reduced starting radius (from 30 to 25) to keep it tighter to center
  let radius = 25; 
  
  // Visibility factor: How much of the petal is visible (not covered by previous ring)
  // We use a tight visibility factor to ensure significant overlap, which prevents
  // gaps from forming when inner rings are dynamically scaled down.
  for (let i = 1; i < level; i++) {
    const currentSize = basePetalSize + (i - 1) * sizeGrowthPerLevel;
    const visibilityFactor = Math.min(
      LAYOUT_CONFIG.BASE_VISIBILITY + (i * LAYOUT_CONFIG.VISIBILITY_GROWTH), 
      LAYOUT_CONFIG.MAX_VISIBILITY
    );
    radius += currentSize * visibilityFactor;
  }
  
  return { count, radius, petalSize };
};
