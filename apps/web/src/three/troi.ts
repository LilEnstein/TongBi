/**
 * Khí trời của cảnh 3D theo buổi và mùa — tầng trên của art direction §2.
 *
 * §2 giao cho mỗi phase một khung giờ (hướng nắng, độ gắt, màu sương). Bảng ở
 * đây KHÔNG ghi đè cái đó: nó chỉ nhân cường độ, pha màu và đổi bảng màu đất/lá
 * quanh sân. Nhờ vậy sang mùa đông hay sang đêm thì bóng vẫn đổ đúng hướng của
 * phase, câu chuyện "một buổi chiều trôi qua" của §2 không bị mất.
 *
 * Mọi màu đều đứng trong bảng màu §3.1 (đất – rơm – tre – chàm – nghệ – lá) chỉ
 * kéo sáng/tối đi, để cảnh mùa nào cũng còn là cùng một bức tranh.
 */
import { Color } from 'three';
import type { Buoi, Mua } from '../lib/khungCanh.js';

export interface DatMau {
  chinh: string;
  sang: string;
  toi: string;
}

export interface Khi {
  /** Màu nền canvas và màu sương — thực chất là màu không khí của cảnh. */
  troi: string;
  /** Sương bắt đầu và tắt hẳn ở bao nhiêu đơn vị (nhân thêm theo sân đông). */
  suong: [number, number];
  /** Nhân lên `intensity` của nắng theo phase. Đêm chỉ còn ánh trăng. */
  nangHeSo: number;
  /** Màu nắng của mùa, pha vào màu nắng của phase theo `nangPha`. */
  nangMau: string;
  nangPha: number;
  ambient: { mau: string; manh: number };
  hemi: { tren: string; duoi: string; manh: number };
  /** Bảng màu nền đất — đất ẩm mùa xuân khác đất bạc mùa đông. */
  dat: DatMau;
  /** Màu lá tre và lá cây quanh sân. */
  la: { chinh: string; toi: string };
  /** Bụi đất trong không khí: mùa xuân đất ẩm gần như không bốc bụi. */
  buiHeSo: number;
  /** Gió: biên độ lay của tre, lúa, cờ nêu. */
  gio: number;
}

/** Pha hai màu theo tỉ lệ `t` (0 = a, 1 = b). */
export function pha(a: string, b: string, t: number): string {
  return new Color(a).lerp(new Color(b), t).getStyle();
}

/** Kéo một màu tối đi `k` lần, giữ nguyên tông. */
function nhan(mau: string, k: number): string {
  return new Color(mau).multiplyScalar(k).getStyle();
}

/** Nhúng một màu vào ánh trăng: tối đi rồi ngả sang chàm. */
function trangHoa(mau: string, toi: number, ngaCham = 0.36): string {
  return pha(nhan(mau, toi), '#2E4166', ngaCham);
}

/* ───────────────────────── Bốn mùa lúc ban ngày ────────────────────────── */

const NGAY: Record<Mua, Khi> = {
  // Mưa xuân: trời xám ẩm, nắng lọt qua mây nên dịu, đất nồm không bốc bụi.
  xuan: {
    troi: '#A99A7E',
    suong: [9, 22],
    nangHeSo: 0.78,
    nangMau: '#EFE6CE',
    nangPha: 0.55,
    ambient: { mau: '#E8E0CA', manh: 0.82 },
    hemi: { tren: '#DCD6BE', duoi: '#6B4520', manh: 0.62 },
    dat: { chinh: '#A9743A', sang: '#C99A5E', toi: '#6B4520' },
    la: { chinh: '#5E8F3E', toi: '#3B5F24' },
    buiHeSo: 0.3,
    gio: 0.7,
  },
  // Mùa hè là khung cảnh gốc của §2: nắng gắt, trời cao, bụi đất mù mịt.
  ha: {
    troi: '#C08A48',
    suong: [10, 24],
    nangHeSo: 1.12,
    nangMau: '#FFF8DC',
    nangPha: 0.2,
    ambient: { mau: '#FFEAC4', manh: 0.72 },
    hemi: { tren: '#FFE9BE', duoi: '#7A4F26', manh: 0.65 },
    dat: { chinh: '#B9803F', sang: '#D9A768', toi: '#7A4F26' },
    la: { chinh: '#4C7A38', toi: '#335624' },
    buiHeSo: 1,
    gio: 0.55,
  },
  // Thu hanh: trời xanh và cao nên sương ngả xanh, đất khô, lá bắt đầu úa.
  thu: {
    troi: '#A6B9BC',
    suong: [11, 26],
    nangHeSo: 0.96,
    nangMau: '#FFE7AE',
    nangPha: 0.35,
    ambient: { mau: '#FFF1D6', manh: 0.7 },
    hemi: { tren: '#DCE9EC', duoi: '#7A5426', manh: 0.6 },
    dat: { chinh: '#B98A46', sang: '#D9B071', toi: '#7A5426' },
    la: { chinh: '#8A7A2E', toi: '#5E5220' },
    buiHeSo: 1.15,
    gio: 1,
  },
  // Rét: nắng nhạt gần như không có màu, sương gần hơn, đất bạc, cây trụi lá.
  dong: {
    troi: '#A6A79C',
    suong: [7, 19],
    nangHeSo: 0.68,
    nangMau: '#E6E6D6',
    nangPha: 0.62,
    ambient: { mau: '#E4E8E4', manh: 0.66 },
    hemi: { tren: '#D8DDDA', duoi: '#6E5A3C', manh: 0.56 },
    dat: { chinh: '#A9885F', sang: '#C3A67E', toi: '#6E5A3C' },
    la: { chinh: '#6F7A46', toi: '#4A5230' },
    buiHeSo: 0.75,
    gio: 0.85,
  },
};

/** Màu không khí của đêm từng mùa — cùng một mặt trăng, khác cái lạnh. */
const TROI_DEM: Record<Mua, string> = {
  xuan: '#1E3350',
  ha: '#1F3F63',
  thu: '#1B3A54',
  dong: '#232F3D',
};

/**
 * Ban đêm: giữ nguyên hướng nắng của phase (giờ là hướng trăng) nhưng hạ hẳn
 * cường độ và đổi sang màu trăng, rồi nhúng cả bảng màu đất/lá vào tông chàm.
 * Sương kéo gần lại để rìa sân chìm vào tối — đó là thứ làm đêm ra đêm.
 */
function dem(mua: Mua): Khi {
  const ngay = NGAY[mua];
  const lanh = mua === 'dong' ? 0.86 : 1;
  return {
    troi: TROI_DEM[mua],
    suong: [ngay.suong[0] * 0.66, ngay.suong[1] * 0.78],
    nangHeSo: 0.26 * lanh,
    nangMau: '#AEC6EE',
    nangPha: 0.92,
    ambient: { mau: '#7189B8', manh: 0.34 },
    hemi: { tren: '#5C77A8', duoi: '#252A34', manh: 0.42 },
    dat: {
      chinh: trangHoa(ngay.dat.chinh, 0.44, 0.46),
      sang: trangHoa(ngay.dat.sang, 0.48, 0.44),
      toi: trangHoa(ngay.dat.toi, 0.4, 0.48),
    },
    la: {
      chinh: trangHoa(ngay.la.chinh, 0.5, 0.3),
      toi: trangHoa(ngay.la.toi, 0.46, 0.3),
    },
    buiHeSo: ngay.buiHeSo * 0.45,
    // Đêm gió nhẹ nhưng thấy rõ hơn, vì cả sân im nên cái gì lay là thấy.
    gio: ngay.gio * 1.25,
  };
}

const DEM: Record<Mua, Khi> = {
  xuan: dem('xuan'),
  ha: dem('ha'),
  thu: dem('thu'),
  dong: dem('dong'),
};

export function khiTroi(buoi: Buoi, mua: Mua): Khi {
  return buoi === 'toi' ? DEM[mua] : NGAY[mua];
}

/**
 * Nhúng màu của một vật quanh sân (hoa đào, cờ nêu, xác pháo…) vào khí trời.
 * Ban ngày trả về đúng màu vẽ; ban đêm tối đi và ngả chàm như mọi thứ khác,
 * để không có vật nào phát sáng lạc ra khỏi đêm.
 */
export function theoKhi(mau: string, buoi: Buoi): string {
  return buoi === 'toi' ? trangHoa(mau, 0.52, 0.32) : mau;
}
