/**
 * Nhạc nền — liên khúc sáo trúc & piano đồng dao Việt Nam.
 *
 * Đây là file audio duy nhất của game (mọi tiếng động khác vẫn tổng hợp bằng
 * WebAudio trong `sfx.ts`). Bản gốc dài 2h22 nên đã cắt thành một đoạn 6'30"
 * lặp liền mạch (đuôi đã crossfade sẵn vào đầu) rồi nén 96 kbps ≈ 4,5 MB, đủ
 * nhẹ để 30 người trong phòng tải qua 4G.
 *
 * Dùng <audio> chứ không nạp vào AudioBuffer: 6'30" stereo 44.1kHz giải nén ra
 * gần 140 MB RAM, điện thoại tầm trung không chịu được. Âm lượng điều khiển
 * trực tiếp bằng `element.volume`.
 */
import { setMuted } from './sfx.js';

const DUONG_DAN = `${import.meta.env.BASE_URL}assets/nhac-nen-v1.mp3`;

/** Nhạc chỉ là lớp lót dưới tiếng sáo/trống của game, không được lấn lên. */
const MUC_NEN = 0.32;
/** Vào tiếng bằng cách mở dần, không bật thẳng vào mặt người chơi. */
const VAO_TIENG = 2600;
const KHOA_LUU = 'tongbi.tieng';

let el: HTMLAudioElement | null = null;
let dangBat = docTuyChon();
/** Hệ số của phase (0.55–1) nhân với MUC_NEN. */
let heSoCang = 1;
/** Hệ số nép tạm thời khi có tiếng động quan trọng. */
let heSoNep = 1;
let fade: ReturnType<typeof setInterval> | null = null;
let henNep: ReturnType<typeof setTimeout> | null = null;

function docTuyChon(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(KHOA_LUU) !== 'tat';
  } catch {
    return true;
  }
}

function luuTuyChon(bat: boolean): void {
  try {
    localStorage?.setItem(KHOA_LUU, bat ? 'bat' : 'tat');
  } catch {
    /* Safari private mode — không lưu được thì thôi. */
  }
}

function mucDich(): number {
  return dangBat ? MUC_NEN * heSoCang * heSoNep : 0;
}

/** Trườn `volume` tới đích trong `ms`; 0 là nhảy thẳng. */
function truot(dich: number, ms: number, xong?: () => void): void {
  if (!el) return;
  if (fade) clearInterval(fade);
  fade = null;
  const tu = el.volume;
  if (ms <= 0 || Math.abs(dich - tu) < 0.004) {
    el.volume = dich;
    xong?.();
    return;
  }
  const buoc = 40;
  let t = 0;
  fade = setInterval(() => {
    t += buoc;
    const k = Math.min(1, t / ms);
    if (el) el.volume = tu + (dich - tu) * k;
    if (k >= 1 && fade) {
      clearInterval(fade);
      fade = null;
      xong?.();
    }
  }, buoc);
}

export const nhacNen = {
  /**
   * Bật nhạc. Phải gọi từ trong một thao tác chạm/click, nếu không trình duyệt
   * di động sẽ chặn autoplay.
   */
  batDau(): void {
    if (typeof Audio === 'undefined') return;
    if (!el) {
      el = new Audio(DUONG_DAN);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
      // Không giữ nhạc chạy khi người chơi rời tab — đỡ pin, đỡ 4G.
      document.addEventListener('visibilitychange', theoTab);
    }
    if (!dangBat) return;
    void el.play().then(
      () => truot(mucDich(), VAO_TIENG),
      () => {
        /* Bị chặn autoplay — lần chạm sau sẽ gọi lại batDau(). */
      },
    );
  },

  /** Tắt hẳn, dùng khi App unmount. */
  dung(): void {
    document.removeEventListener('visibilitychange', theoTab);
    if (fade) clearInterval(fade);
    fade = null;
    if (henNep) clearTimeout(henNep);
    henNep = null;
    el?.pause();
    el = null;
  },

  /**
   * Nhạc lùi lại khi sân căng: lúc đoán tổng chỉ còn hơn nửa âm lượng để nghe
   * rõ trống ếch và tiếng đếm ngược. Nhận cùng thang độ căng với tiếng ve (§12).
   */
  cang(muc: number): void {
    heSoCang = 1 - 0.45 * Math.max(0, Math.min(1, muc));
    truot(mucDich(), 1400);
  },

  /** Nép xuống trong `ms` để nhường chỗ cho một tiếng động quan trọng. */
  nep(ms = 1600): void {
    if (henNep) clearTimeout(henNep);
    heSoNep = 0.3;
    truot(mucDich(), 220);
    henNep = setTimeout(() => {
      heSoNep = 1;
      truot(mucDich(), 900);
      henNep = null;
    }, ms);
  },
};

/* ─────────────────── Công tắc tiếng chung cho cả app ─────────────────────── */

export function tiengDangBat(): boolean {
  return dangBat;
}

/** Một công tắc duy nhất cho cả nhạc nền và tiếng động — §12. */
export function datTieng(bat: boolean): void {
  dangBat = bat;
  luuTuyChon(bat);
  setMuted(!bat);
  // Tắt thì dừng luôn stream, đừng để nó chạy im lặng tốn pin với 4G.
  if (bat) nhacNen.batDau();
  else truot(0, 320, () => el?.pause());
}

/** Áp lại lựa chọn đã lưu lúc app khởi động (chưa phát tiếng gì). */
export function apTuyChonDaLuu(): void {
  setMuted(!dangBat);
}

function theoTab(): void {
  if (!el) return;
  if (document.hidden) el.pause();
  else if (dangBat) void el.play().catch(() => undefined);
}
