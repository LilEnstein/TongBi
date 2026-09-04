/**
 * Bi ve thuỷ tinh — art direction §9.2.
 * Không phải cầu kim loại phản chiếu HDRI: vỏ thuỷ tinh trong đục, bên trong
 * có một dải xoáy màu. Kích thước cỡ 16mm, bi đã chơi nhiều rồi.
 */
import { useMemo } from 'react';
import { MAU, toonGradient } from './toon.js';

export const MARBLE_RADIUS = 0.052;

/** Màu dải xoáy trong ruột bi — lấy từ bảng màu vật liệu (§3). */
export const MARBLE_COLORS = [
  MAU.cham,
  MAU.dieu,
  MAU.la,
  MAU.nghe,
  '#2F6E63', // xanh ngọc
  '#8A3A6B', // tím bầm
] as const;

export function marbleColor(seed: number): string {
  return MARBLE_COLORS[Math.abs(seed) % MARBLE_COLORS.length]!;
}

interface MarbleProps {
  position: [number, number, number];
  color: string;
  scale?: number;
}

export function Marble({ position, color, scale = 1 }: MarbleProps) {
  // Dải xoáy nằm nghiêng một góc khác nhau ở mỗi viên, như bi thật.
  const nghieng = useMemo(() => (position[0] + position[2]) * 9, [position]);

  return (
    <group position={position} scale={scale}>
      {/* Vỏ thuỷ tinh: trong đục, hơi ngả vàng như bi để lâu trong túi vải. */}
      <mesh castShadow>
        <sphereGeometry args={[MARBLE_RADIUS, 12, 9]} />
        <meshToonMaterial
          color={MAU.giay}
          gradientMap={toonGradient()}
          transparent
          opacity={0.72}
        />
      </mesh>
      {/* Dải xoáy màu bên trong — dẹt và nghiêng nên nhìn hướng nào cũng thấy. */}
      <mesh rotation={[nghieng, nghieng * 0.6, 0.5]} scale={[0.94, 0.34, 0.6]}>
        <sphereGeometry args={[MARBLE_RADIUS, 10, 8]} />
        <meshToonMaterial color={color} gradientMap={toonGradient()} />
      </mesh>
    </group>
  );
}
