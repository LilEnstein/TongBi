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
