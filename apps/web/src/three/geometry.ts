/** Toạ độ chỗ ngồi quanh bàn — design doc §13, §41. */

export const TABLE_RADIUS = 2.15;
export const SEAT_RADIUS = 3.05;

/** Khoảng cách tối thiểu giữa hai chỗ ngồi để tay và đống bi không chồng nhau. */
const MIN_SEAT_ARC = 0.78;

/**
 * Bán kính vòng ghế. Phòng ít người dùng bán kính mặc định; phòng đông
 * (tới 30 người) thì nới vòng ra để mỗi người vẫn có đủ chỗ.
 */
export function seatRadius(count: number): number {
  if (count <= 0) return SEAT_RADIUS;
  return Math.max(SEAT_RADIUS, (count * MIN_SEAT_ARC) / (Math.PI * 2));
}

/**
 * Góc của một ghế. Người chơi hiện tại luôn được xoay xuống phía trước camera
 * để ai cũng có cảm giác "mình đang ngồi ở đầu bàn", nhưng vẫn là cùng một bàn.
 */
export function seatAngle(index: number, count: number, localIndex: number): number {
  const offset = ((index - localIndex) % count + count) % count;
  return (offset / count) * Math.PI * 2 + Math.PI / 2;
}

export function seatPosition(angle: number, radius = SEAT_RADIUS): [number, number, number] {
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

/** Xoay model quanh trục Y để mặt trước (-Z) hướng vào tâm bàn. */
export function facingCenter(angle: number): number {
  return Math.PI / 2 - angle;
}

/** Nội suy mượt (ease in-out) cho các animation ngắn. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Tiến dần giá trị hiện tại về đích, không phụ thuộc framerate. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Vị trí các viên bi xếp thành cụm trong lòng bàn tay. */
export function palmCluster(count: number): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  const rings = [
    { r: 0, n: 1 },
    { r: 0.055, n: 5 },
    { r: 0.098, n: 8 },
    { r: 0.135, n: 10 },
  ];
  let placed = 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.n && placed < count; i += 1, placed += 1) {
      const a = (i / ring.n) * Math.PI * 2 + ring.r * 7;
      const layer = Math.floor(placed / 12) * 0.045;
      out.push([Math.cos(a) * ring.r, layer, Math.sin(a) * ring.r * 0.85]);
    }
    if (placed >= count) break;
  }
  while (placed < count) {
    const a = placed * 2.399;
    const r = 0.14 + (placed - 24) * 0.004;
    out.push([Math.cos(a) * r, 0.09, Math.sin(a) * r * 0.85]);
    placed += 1;
  }
  return out;
}

/** Vị trí đống bi trước mặt mỗi người. */
export function pileCluster(count: number): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < count; i += 1) {
    const a = i * 2.399;
    const r = 0.052 * Math.sqrt(i);
    out.push([Math.cos(a) * r, 0, Math.sin(a) * r * 0.7]);
  }
  return out;
}
