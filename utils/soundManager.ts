
const SOUNDS = {
  START_GAME: '/sounds/start_game.mp3',
  PETAL_HOVER: '/sounds/petal_hover.mp3',
  PETAL_CLICK: '/sounds/petal_click.mp3',
  SUSPENSE_WOBBLE: '/sounds/suspense_wobble.mp3',
  LEVEL_UP: '/sounds/level_up.mp3',
  GAME_OVER: '/sounds/game_over.mp3',
} as const;

class SoundManager {
  private audios: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    // Preload sounds
    if (typeof window !== 'undefined') {
      Object.values(SOUNDS).forEach(path => {
        const audio = new Audio(path);
        audio.preload = 'auto';
        this.audios.set(path, audio);
      });
    }
  }

  play(soundName: keyof typeof SOUNDS, volume: number = 0.5, pitch: number = 1.0) {
    const path = SOUNDS[soundName];
    const audio = this.audios.get(path);
    
    if (audio) {
      // For overlapping sounds (like hover), we clone the node or reset the time
      const sound = audio.cloneNode() as HTMLAudioElement;
      sound.volume = volume;
      sound.playbackRate = pitch;
      sound.play().catch(e => console.warn('Audio playback failed:', e));
    }
  }

  /**
   * Shepard Tone Illusion: Plays two versions of the sound at different octaves
   * and crossfades them to create the illusion of infinitely rising pitch.
   */
  playShepard(soundName: keyof typeof SOUNDS, level: number, baseVolume: number = 0.5) {
    const stepsPerOctave = 12; // Chromatic scale feel
    const offset = (level % stepsPerOctave) / stepsPerOctave;
    
    // Voice A: 1.0 -> 2.0 (High octave)
    // Voice B: 0.5 -> 1.0 (Low octave)
    const rateA = Math.pow(2, offset);
    const rateB = Math.pow(2, offset - 1);

    // Volume curves: Use a sine-based crossfade to maintain constant power
    // volA is loudest in the middle, quietest at the wrap point (1.0 -> 2.0)
    // Actually, we want the transition at the wrap point to be seamless.
    // Standard Shepard Tone window is bell-shaped over log frequency.
    // volA = sin(offset * PI) is 0 at both ends (1.0 and 2.0) and 1 in middle.
    // This is good! But we need the other voice to fill the gaps.
    
    // Let's use the cosine window on log-pitch: vol = 0.5 * (1 + cos(x * PI))
    // where x is distance from center in octaves.
    const volA = 0.5 * (1 + Math.cos(offset * Math.PI));
    const volB = 0.5 * (1 + Math.cos((offset - 1) * Math.PI));

    this.play(soundName, baseVolume * volA, rateA);
    this.play(soundName, baseVolume * volB, rateB);
  }

  // Special case for looping sounds or sounds that need to be stopped
  playLoop(soundName: keyof typeof SOUNDS, volume: number = 0.5): HTMLAudioElement | null {
    const path = SOUNDS[soundName];
    const audio = this.audios.get(path);
    
    if (audio) {
      const sound = audio.cloneNode() as HTMLAudioElement;
      sound.volume = volume;
      sound.loop = true;
      sound.play().catch(e => console.warn('Audio playback failed:', e));
      return sound;
    }
    return null;
  }
}

export const soundManager = new SoundManager();
