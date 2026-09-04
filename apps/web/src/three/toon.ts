/**
 * Bảng màu và shader toon dùng chung cho cả scene — art direction §3, §6, §9.
 *
 * Toon 2 bậc: một tông sáng, một tông bóng, không có dải chuyển màu.
 * Đây là thứ giữ cho vật thể 3D nằm cùng một thế giới với nền vẽ tay 2D.
 */
import { DataTexture, NearestFilter, RedFormat, UnsignedByteType } from 'three';

/** Màu lấy thẳng từ §3.1 và §3.2. */
export const MAU = {
  dat: '#B9803F',
  datSang: '#D9A768',
  datToi: '#7A4F26',
  tranh: '#E7C170',
  tranhToi: '#A87C24',
  tre: '#C79B4E',
  treToi: '#8E6626',
  giay: '#F2E5C4',
  muc: '#2A211B',
  phan: '#F6F1E4',
  cham: '#1F3F63',
  dieu: '#C4322A',
  la: '#4C7A38',
  nghe: '#E8A72E',
  /** Gỗ mít của xúc xắc (§9.3). */
  mit: '#C08E52',
  /** Vải nâu của tay áo. */
  vaiNau: '#8B6A46',
} as const;

/** Ba tông da rám nắng — §9.1: không có tông trắng bệch. */
export const DA_RAM = ['#C98A5B', '#B57544', '#A9683C'] as const;
/** Da của người đã ra ngồi ngoài: bạc đi như đất phơi lâu ngày. */
export const DA_MO = '#9A8471';

let gradient: DataTexture | null = null;

/**
 * Gradient map hai bậc cho MeshToonMaterial.
 * Dùng chung một texture cho toàn scene để không tốn thêm bộ nhớ.
 */
export function toonGradient(): DataTexture {
  if (!gradient) {
    // Hai điểm dừng: vùng bóng và vùng sáng. Không có gì ở giữa.
    const data = new Uint8Array([96, 255]);
    gradient = new DataTexture(data, 2, 1, RedFormat, UnsignedByteType);
    gradient.minFilter = NearestFilter;
    gradient.magFilter = NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}

/** Chọn tông da theo id người chơi, để mỗi người một tay khác nhau nhưng ổn định. */
export function tongDa(seed: number): string {
  return DA_RAM[Math.abs(seed) % DA_RAM.length]!;
}

/**
 * Bảng lông của mười con vật tranh dân gian — §3.1 mở rộng cho §9.1.
 *
 * Mỗi con ba tông: lông chính, tông tối (bụng dưới, vệt, trong tai) và tông
 * sáng (ức, mõm, quầng mắt). Màu lấy trong dải đất–nghệ–chàm của bảng gốc để
 * cả sân vẫn nằm trong một bức tranh, không con nào nhảy ra ngoài.
 */
export interface BoLong {
  chinh: string;
  toi: string;
  sang: string;
}

export const LONG: Record<string, BoLong> = {
  trau: { chinh: '#5C5A63', toi: '#3A3941', sang: '#8E8B93' },
  ga: { chinh: '#C4322A', toi: '#8A2019', sang: '#E8A72E' },
  lon: { chinh: '#E0A79C', toi: '#B87A70', sang: '#F4D2C9' },
  meo: { chinh: '#E7C170', toi: '#A87C24', sang: '#F6ECD2' },
  chuot: { chinh: '#9A8E80', toi: '#6E6459', sang: '#D8CDBC' },
  coc: { chinh: '#6E8A3C', toi: '#455825', sang: '#A9BE72' },
  ca: { chinh: '#D9772F', toi: '#9E4E17', sang: '#F2C88A' },
  vit: { chinh: '#F2E5C4', toi: '#BFA97A', sang: '#FFF8E4' },
  chim: { chinh: '#2F6E63', toi: '#1C4740', sang: '#E8A72E' },
  ho: { chinh: '#E09A3C', toi: '#2A211B', sang: '#F6ECD2' },
};

/** Lông của con vật đã ra ngồi ngoài: bạc đi như tranh phơi nắng lâu ngày. */
export const LONG_MO: BoLong = { chinh: '#9A8471', toi: '#75665A', sang: '#C3B6A5' };

export function boLong(loai: string, mo = false): BoLong {
  if (mo) return LONG_MO;
  return LONG[loai] ?? LONG.trau!;
}
