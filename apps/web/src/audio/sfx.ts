/**
 * Âm thanh dân gian — art direction §12 (thay hoàn toàn §28 file gốc).
 *
 * Nhạc cụ được phép: sáo trúc, đàn bầu, trống ếch, mõ, song loan.
 * Không synth pad, không trống điện tử, không lofi.
 * Tất cả đều tổng hợp bằng WebAudio nên game vẫn không cần một file audio nào,
 * và mix tập trung ở 300Hz–4kHz để nghe rõ trên loa điện thoại.
 */
import type { GamePhase } from '@tongbi/game-rules';

type Ctx = AudioContext & { _unlocked?: boolean };

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let muted = false;

const MUC_CHUNG = 0.5;

function audio(): Ctx | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC() as Ctx;
    master = ctx.createGain();
    master.gain.value = MUC_CHUNG;
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
  if (master) master.gain.value = value ? 0 : MUC_CHUNG;
}

export function isMuted(): boolean {
  return muted;
}

/* ══════════════════════ Bút vẽ âm thanh ══════════════════════════════════ */

interface ToneOptions {
  freq: number;
  type?: OscillatorType;
  duration?: number;
  gain?: number;
  /** Tần số cuối để tạo hiệu ứng vuốt cao/thấp — nét đặc trưng của đàn bầu. */
  slideTo?: number;
  delay?: number;
  /** Thời gian vào tiếng: sáo trúc vào mềm, mõ vào tức thì. */
  attack?: number;
}

function tone({
  freq,
  type = 'sine',
  duration = 0.15,
  gain = 0.2,
  slideTo,
  delay = 0,
  attack = 0.012,
}: ToneOptions): void {
  const c = audio();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Nhiễu lọc — dùng cho gỗ va, vải siết, bụi đất, tiếng ve. */
function noise(
  duration: number,
  gainValue: number,
  filterFreq: number,
  delay = 0,
  sweepTo?: number,
  q = 1.2,
): void {
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
  filter.Q.value = q;

  const g = c.createGain();
  g.gain.setValueAtTime(gainValue, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(filter).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

/* ══════════════════════ Nhạc cụ ══════════════════════════════════════════ */

/** Sáo trúc: hơi thổi vào mềm, có rung nhẹ ở đuôi nốt. */
function saoTruc(freq: number, duration = 0.42, gain = 0.15, delay = 0): void {
  const c = audio();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;

  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t0);

  // Rung (vibrato) — dấu hiệu nhận biết của sáo.
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.setValueAtTime(5.4, t0);
  lfoGain.gain.setValueAtTime(freq * 0.011, t0);
  lfo.connect(lfoGain).connect(osc.frequency);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.07);
  g.gain.setValueAtTime(gain, t0 + duration * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(g).connect(master);
  osc.start(t0);
  lfo.start(t0);
  osc.stop(t0 + duration + 0.05);
  lfo.stop(t0 + duration + 0.05);

  // Hơi thở trên miệng sáo.
  noise(duration * 0.5, gain * 0.16, 2600, delay, 3400, 0.9);
}

/** Đàn bầu: một dây, tiếng vuốt cong đặc trưng, tắt dần rất chậm. */
function danBau(freq: number, slideTo: number, duration = 0.9, gain = 0.16, delay = 0): void {
  tone({ freq, slideTo, type: 'sine', duration, gain, delay, attack: 0.03 });
  tone({ freq: freq * 2, slideTo: slideTo * 2, type: 'sine', duration: duration * 0.6, gain: gain * 0.28, delay });
}

/**
 * Trống ếch: mặt trống nhỏ, tiếng "tùng" gọn, không ngân.
 * Cơ bản đặt ở ~300Hz chứ không xuống sâu, để loa điện thoại vẫn kêu ra tiếng (§12).
 */
function trongEch(gain = 0.22, cao = 1, delay = 0): void {
  tone({ freq: 300 * cao, type: 'sine', duration: 0.15, gain, slideTo: 120 * cao, delay, attack: 0.004 });
  // Tiếng gõ ở dải giữa để nghe rõ ngay cả khi loa không có bass.
  noise(0.05, gain * 0.5, 1100, delay, 520, 2.2);
}

/** Mõ: khối gỗ rỗng, tiếng "cốc" khô. */
function mo(gain = 0.16, cao = 1, delay = 0): void {
  noise(0.045, gain, 1500 * cao, delay, 700 * cao, 3.2);
  tone({ freq: 780 * cao, type: 'square', duration: 0.045, gain: gain * 0.5, delay, attack: 0.002 });
}

/** Song loan / gõ hai thanh tre vào nhau: sắc, cao hơn mõ. */
function queTre(gain = 0.13): void {
  noise(0.035, gain, 2400, 0, 1500, 3.6);
  tone({ freq: 1350, type: 'square', duration: 0.03, gain: gain * 0.35, attack: 0.002 });
}

/** Bi ve thuỷ tinh chạm nhau: lách cách, cao và rất ngắn. */
function thuyTinh(freq = 2100, gain = 0.11, delay = 0): void {
  tone({ freq, type: 'sine', duration: 0.055, gain, delay, attack: 0.003 });
  tone({ freq: freq * 1.48, type: 'sine', duration: 0.035, gain: gain * 0.45, delay, attack: 0.002 });
}

/** Chuông chùa xa: ngân dài, các bồi âm không hài hoà. */
function chuongChua(gain = 0.1): void {
  [1, 2.76, 5.4].forEach((k, i) =>
    tone({ freq: 320 * k, type: 'sine', duration: 2.4 - i * 0.5, gain: gain / (i + 1.4), attack: 0.02 }),
  );
}

/* ══════════════════════ Sự kiện trong game — §12 ═════════════════════════ */

export const sfx = {
  /** Chạm nút: gõ que tre vào nhau. */
  que(): void {
    queTre();
  },
  /** Trống ếch của chủ trò — cả sân nghe thấy cùng lúc. */
  trong(): void {
    trongEch(0.28);
    trongEch(0.16, 1.15, 0.14);
  },
  /** Chọn bi: bi thuỷ tinh chạm nhau. */
  bi(): void {
    thuyTinh(1900 + Math.random() * 500);
  },
  /** Bi rơi vào lòng bàn tay: tiếng "cạch" trầm, có tiếng da. */
  biRoi(index = 0): void {
    const d = index * 0.07;
    thuyTinh(1500 + Math.random() * 300, 0.09, d);
    tone({ freq: 240, type: 'sine', duration: 0.1, gain: 0.1, slideTo: 130, delay: d, attack: 0.004 });
    noise(0.05, 0.045, 700, d, 300);
  },
  /** Nắm tay: tiếng vải/da siết, rất khẽ. */
  namTay(): void {
    noise(0.19, 0.075, 520, 0, 210, 0.8);
  },
  /** Mở tay: im lặng 0.4s rồi bi lăn trên đất. */
  moTay(): void {
    noise(0.34, 0.06, 640, 0.4, 320, 0.7);
    for (let i = 0; i < 3; i += 1) thuyTinh(1300 + Math.random() * 500, 0.06, 0.42 + i * 0.09);
  },
  /** Đếm ngược: nhịp trống ếch, nhanh dần. */
  demNguoc(gap = false): void {
    trongEch(gap ? 0.2 : 0.12, gap ? 1.25 : 1);
  },
  /** Hết giờ: một tiếng trống ếch dứt khoát. */
  hetGio(): void {
    trongEch(0.3, 0.9);
  },
  /** Đoán đúng: tiếng reo trẻ con + sáo trúc một nốt cao. */
  trung(): void {
    // "ê ê ê" — ba nốt hô ngắn ở quãng giọng trẻ con.
    [660, 700, 760].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', duration: 0.13, gain: 0.11, delay: i * 0.12, attack: 0.02 }),
    );
    saoTruc(1046.5, 0.5, 0.15, 0.34);
  },
  /** Đoán sai: tiếng "ơ…" hụt hẫng + đàn bầu một nốt trầm. */
  trat(): void {
    tone({ freq: 400, type: 'triangle', duration: 0.26, gain: 0.1, slideTo: 300, attack: 0.03 });
    danBau(196, 165, 1.1, 0.14, 0.16);
  },
  /** Không ai trúng: hai tiếng mõ đều đều. */
  hoa(): void {
    mo(0.15);
    mo(0.13, 1, 0.22);
  },
  /** Gió lùa qua mái tranh — dùng khi cả sân vừa giấu bi xong. */
  gio(): void {
    noise(0.7, 0.06, 420, 0, 1300, 0.6);
  },
  /** Lắc xúc xắc: gỗ va trong lòng bàn tay. */
  lacXucXac(): void {
    for (let i = 0; i < 7; i += 1) mo(0.08, 0.9 + Math.random() * 0.5, i * 0.075);
  },
  /** Xúc xắc dừng: "cốc" trên đất, không vang, kèm bụi tung lên. */
  xucXacDung(): void {
    mo(0.2, 0.7);
    noise(0.16, 0.06, 380, 0.02, 180, 0.7);
  },
  /** Thắng trận: trống ếch + sáo trúc, khoảng 3 giây. */
  thangTran(): void {
    [0, 0.22, 0.44].forEach((d) => trongEch(0.24, 1, d));
    [783.99, 880, 1046.5, 1174.7].forEach((f, i) => saoTruc(f, 0.5, 0.15, 0.66 + i * 0.34));
  },
  /** Chạm vào một con vật: hai nốt sáo hỏi "ơ?" rất ngắn. */
  goiConVat(): void {
    saoTruc(880, 0.16, 0.1);
    saoTruc(1174.7, 0.2, 0.09, 0.13);
  },
  /** Bị loại: một tiếng chuông chùa xa, rất nhẹ. */
  biLoai(): void {
    chuongChua(0.09);
  },

  /** Âm báo khi chuyển phase — mỗi phase một khung giờ, một tâm trạng (§2). */
  phase(phase: GamePhase): void {
    switch (phase) {
      case 'ROUND_START':
        mo(0.16);
        break;
      case 'SELECT_MARBLES':
        thuyTinh(1700, 0.1);
        break;
      case 'CLOSE_HAND':
        this.namTay();
        break;
      case 'GUESS_TOTAL':
        trongEch(0.16, 1.1);
        break;
      case 'REVEAL':
        this.moTay();
        break;
      case 'DICE_ROLL':
        mo(0.13, 0.8);
        break;
      case 'GAME_OVER':
        this.thangTran();
        break;
      default:
        break;
    }
  },
};

/* ══════════════════════ Lớp nền: sân nhà buổi trưa — §12 ═════════════════ */

interface NenNode {
  ve: GainNode;
  gio: GainNode;
  dung: () => void;
}

let nen: NenNode | null = null;
let hen: ReturnType<typeof setTimeout> | null = null;
/**
 * Khi có nhạc nền (liên khúc sáo trúc), lớp ve sầu/gió phải lùi xuống nếu không
 * hai lớp cùng dải trung sẽ đục vào nhau.
 */
let heSoNhuong = 1;
/** Độ căng đang áp dụng, giữ lại để áp lại khi hệ số nhường thay đổi. */
let dichHienTai = 0.3;

function buffer2s(c: AudioContext): AudioBuffer {
  const frames = c.sampleRate * 2;
  const b = c.createBuffer(1, frames, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < frames; i += 1) d[i] = Math.random() * 2 - 1;
  return b;
}

/** Gà gáy xa, chó sủa, tiếng chổi tre quét sân — random 20–40 giây một lần. */
function tiengSanRandom(): void {
  if (!nen || muted) return;
  const chon = Math.floor(Math.random() * 3);
  if (chon === 0) {
    // gà gáy: "ò ó o o" — bốn nốt vuốt lên rồi buông.
    [
      [520, 620, 0],
      [700, 760, 0.22],
      [640, 600, 0.46],
      [560, 430, 0.66],
    ].forEach(([f, to, d]) =>
      tone({ freq: f!, slideTo: to, type: 'sawtooth', duration: 0.2, gain: 0.032, delay: d, attack: 0.03 }),
    );
  } else if (chon === 1) {
    // chó sủa hai tiếng
    [0, 0.24].forEach((d) => {
      tone({ freq: 340, slideTo: 180, type: 'sawtooth', duration: 0.13, gain: 0.04, delay: d, attack: 0.005 });
      noise(0.1, 0.03, 900, d, 400);
    });
  } else {
    // chổi tre quét sân: ba nhát rào rào
    [0, 0.5, 1.0].forEach((d) => noise(0.34, 0.028, 2200, d, 900, 0.7));
  }
  hen = setTimeout(tiengSanRandom, 20000 + Math.random() * 20000);
}

export const nenSan = {
  /** Bật lớp nền. Chỉ gọi sau khi người chơi đã chạm màn hình (§ unlock). */
  batDau(): void {
    const c = audio();
    if (!c || !master || nen) return;

    // Ve sầu: nhiễu băng hẹp quanh 4.5kHz, biên độ rung theo nhịp cánh.
    const ve = c.createGain();
    ve.gain.value = 0;
    ve.connect(master);
    const veSrc = c.createBufferSource();
    veSrc.buffer = buffer2s(c);
    veSrc.loop = true;
    const veLoc = c.createBiquadFilter();
    veLoc.type = 'bandpass';
    veLoc.frequency.value = 4600;
    veLoc.Q.value = 7;
    const veRung = c.createGain();
    veRung.gain.value = 0.55;
    const lfo = c.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.value = 58;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.45;
    lfo.connect(lfoGain).connect(veRung.gain);
    veSrc.connect(veLoc).connect(veRung).connect(ve);

    // Gió lùa qua mái tranh: nhiễu trầm, lọc chậm qua lại.
    const gio = c.createGain();
    gio.gain.value = 0.02;
    gio.connect(master);
    const gioSrc = c.createBufferSource();
    gioSrc.buffer = buffer2s(c);
    gioSrc.loop = true;
    const gioLoc = c.createBiquadFilter();
    gioLoc.type = 'lowpass';
    gioLoc.frequency.value = 620;
    const gioLfo = c.createOscillator();
    gioLfo.frequency.value = 0.08;
    const gioLfoGain = c.createGain();
    gioLfoGain.gain.value = 240;
    gioLfo.connect(gioLfoGain).connect(gioLoc.frequency);
    gioSrc.connect(gioLoc).connect(gio);

    veSrc.start();
    gioSrc.start();
    lfo.start();
    gioLfo.start();

    nen = {
      ve,
      gio,
      dung: () => {
        veSrc.stop();
        gioSrc.stop();
        lfo.stop();
        gioLfo.stop();
        ve.disconnect();
        gio.disconnect();
      },
    };

    hen = setTimeout(tiengSanRandom, 12000 + Math.random() * 12000);
  },

  /**
   * Độ căng của phase, 0–1. Ve kêu to dần khi tới lúc đoán tổng (§12),
   * im hẳn khi ngồi trong hiên chờ.
   */
  cang(muc: number): void {
    const c = audio();
    if (!c || !nen) return;
    const dich = Math.max(0, Math.min(1, muc));
    nen.ve.gain.setTargetAtTime((0.012 + dich * 0.055) * heSoNhuong, c.currentTime, 1.2);
    nen.gio.gain.setTargetAtTime((0.026 - dich * 0.014) * heSoNhuong, c.currentTime, 1.2);
    dichHienTai = dich;
  },

  /** Nhường dải trung cho nhạc nền. */
  nhuongNhac(bat: boolean): void {
    heSoNhuong = bat ? 0.42 : 1;
    this.cang(dichHienTai);
  },

  dung(): void {
    if (hen) clearTimeout(hen);
    hen = null;
    nen?.dung();
    nen = null;
  },
};
