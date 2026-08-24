/**
 * Sound design — design doc §28.
 * Toàn bộ âm thanh được tổng hợp bằng WebAudio nên game không cần file audio nào,
 * tải nhanh và chạy được offline.
 */
import type { GamePhase } from '@tongbi/game-rules';

type Ctx = AudioContext & { _unlocked?: boolean };

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let muted = false;

function audio(): Ctx | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC() as Ctx;
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

/** iOS/Android chỉ cho phát âm thanh sau một thao tác chạm. */
export function unlockAudio(): void {
  const c = audio();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  c._unlocked = true;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (master) master.gain.value = value ? 0 : 0.5;
}

export function isMuted(): boolean {
  return muted;
}

interface ToneOptions {
  freq: number;
  type?: OscillatorType;
  duration?: number;
  gain?: number;
  /** Tần số cuối để tạo hiệu ứng trượt cao/thấp. */
  slideTo?: number;
  delay?: number;
}

function tone({ freq, type = 'sine', duration = 0.15, gain = 0.2, slideTo, delay = 0 }: ToneOptions): void {
  const c = audio();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Nhiễu trắng lọc — dùng cho tiếng va chạm, tiếng lắc xúc xắc, whoosh. */
function noise(duration: number, gainValue: number, filterFreq: number, delay = 0, sweepTo?: number): void {
  const c = audio();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const frames = Math.max(1, Math.floor(c.sampleRate * duration));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterFreq, t0);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
  filter.Q.value = 1.2;

  const g = c.createGain();
  g.gain.setValueAtTime(gainValue, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(filter).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

export const sfx = {
  /** Bi chạm nhau khi tăng/giảm số lượng. */
  marbleClick(): void {
    tone({ freq: 1250 + Math.random() * 250, type: 'triangle', duration: 0.06, gain: 0.14 });
  },
  /** Bi rơi vào lòng bàn tay. */
  marbleDrop(index = 0): void {
    tone({
      freq: 700 + Math.random() * 180,
      type: 'sine',
      duration: 0.13,
      gain: 0.16,
      slideTo: 320,
      delay: index * 0.07,
    });
    noise(0.05, 0.05, 2200, index * 0.07);
  },
  handClose(): void {
    noise(0.16, 0.1, 420, 0, 180);
    tone({ freq: 180, type: 'sine', duration: 0.16, gain: 0.13, slideTo: 90 });
  },
  handOpen(): void {
    noise(0.14, 0.08, 300, 0, 900);
    tone({ freq: 320, type: 'sine', duration: 0.18, gain: 0.12, slideTo: 620 });
  },
  button(): void {
    tone({ freq: 520, type: 'square', duration: 0.05, gain: 0.09 });
  },
  tick(urgent = false): void {
    tone({ freq: urgent ? 980 : 720, type: 'square', duration: 0.045, gain: urgent ? 0.14 : 0.07 });
  },
  whoosh(): void {
    noise(0.42, 0.11, 320, 0, 2600);
  },
  diceShake(): void {
    for (let i = 0; i < 7; i += 1) noise(0.05, 0.09, 900 + Math.random() * 900, i * 0.075);
  },
  diceHit(): void {
    noise(0.1, 0.16, 550, 0, 220);
    tone({ freq: 150, type: 'sine', duration: 0.13, gain: 0.14, slideTo: 70 });
  },
  /** Đội mình thắng lượt. */
  win(): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', duration: 0.26, gain: 0.16, delay: i * 0.085 }),
    );
  },
  lose(): void {
    [392, 329.63, 261.63].forEach((f, i) =>
      tone({ freq: f, type: 'sawtooth', duration: 0.24, gain: 0.1, delay: i * 0.1 }),
    );
  },
  neutral(): void {
    tone({ freq: 440, type: 'sine', duration: 0.18, gain: 0.11 });
    tone({ freq: 440, type: 'sine', duration: 0.2, gain: 0.09, delay: 0.16 });
  },
  victory(): void {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', duration: 0.36, gain: 0.17, delay: i * 0.1 }),
    );
  },
  elimination(): void {
    tone({ freq: 300, type: 'sawtooth', duration: 0.6, gain: 0.13, slideTo: 60 });
  },
  /** Âm báo khi chuyển phase — design doc §28 (reveal có suspense tăng dần). */
  phase(phase: GamePhase): void {
    switch (phase) {
      case 'ROUND_START':
        tone({ freq: 620, type: 'triangle', duration: 0.16, gain: 0.12 });
        break;
      case 'SELECT_MARBLES':
        tone({ freq: 740, type: 'sine', duration: 0.14, gain: 0.11 });
        break;
      case 'CLOSE_HAND':
        this.handClose();
        break;
      case 'GUESS_TOTAL':
        tone({ freq: 880, type: 'sine', duration: 0.16, gain: 0.12 });
        break;
      case 'REVEAL':
        this.whoosh();
        break;
      case 'GAME_OVER':
        this.victory();
        break;
      default:
        break;
    }
  },
};
