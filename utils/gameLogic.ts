import { Colors } from '../types';

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

export const generateRoundColors = (level: number): Colors => {
  // Random base pastel color
  const baseHue = Math.floor(Math.random() * 360);
  const baseSat = Math.floor(Math.random() * 25) + 45; 
  const baseLight = Math.floor(Math.random() * 15) + 70;

  // Calculate difficulty (hue shift)
  let shiftAmount = 15; // Ring 1
  if (level >= 6) shiftAmount = 2.5;
  else if (level >= 4) shiftAmount = 5;
  else if (level >= 2) shiftAmount = 9;

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
  // We cap it at 55 to prevent performance issues with too many DOM nodes
  const count = Math.min(fibonacci(level + 5), 55); 
  
  // Calculate petal size: Grows larger as we go outwards
  const basePetalSize = 64;
  const sizeGrowthPerLevel = 10; 
  const petalSize = basePetalSize + (level - 1) * sizeGrowthPerLevel;

  // Calculate radius: Rings go further out and stack less
  // We calculate it cumulatively based on the size of previous petals
  let radius = 35; // Start radius (outside the center circle)
  
  // Visibility factor: How much of the petal is visible (not covered by previous ring)
  for (let i = 1; i < level; i++) {
    const currentSize = basePetalSize + (i - 1) * sizeGrowthPerLevel;
    // As levels increase, we increase the visibility factor slightly
    const visibilityFactor = Math.min(0.6 + (i * 0.05), 0.9);
    radius += currentSize * visibilityFactor;
  }
  
  return { count, radius, petalSize };
};
