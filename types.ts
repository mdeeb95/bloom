export interface PetalData {
  id: string;
  angle: number; // Rotation in degrees
  color: string;
  isOdd: boolean;
  x: number;     // Relative X from center of ring
  y: number;     // Relative Y from center of ring
}

export interface RingData {
  id: number;
  petals: PetalData[];
  baseColor: string;
  radius: number;
  petalSize: number;
  rotationOffset: number;
  scale: number;
}

export enum GameState {
  HOME = 'HOME',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum InteractionState {
  IDLE = 'IDLE',
  SUSPENSE = 'SUSPENSE', // Waiting for result
  BLOOMING = 'BLOOMING', // Success animation
  SCATTERING = 'SCATTERING' // Failure animation
}

export interface Colors {
  primary: string;
  odd: string;
}