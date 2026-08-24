/** Viên bi thuỷ tinh — dùng chung cho đống bi, bi bay và bi trong lòng bàn tay. */
import { useMemo } from 'react';
import { Color } from 'three';

export const MARBLE_RADIUS = 0.052;

export const MARBLE_COLORS = [
  '#4aa3ff',
  '#ff6b6b',
  '#5ad18d',
  '#ffd166',
  '#c77dff',
  '#4ecdc4',
  '#ff9f45',
  '#9bb4ff',
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
  // Lõi sáng hơn vỏ để viên bi trông có chiều sâu như bi thuỷ tinh thật.
  const core = useMemo(() => new Color(color).lerp(new Color('#ffffff'), 0.45), [color]);
  return (
    <group position={position} scale={scale}>
      <mesh castShadow>
        <sphereGeometry args={[MARBLE_RADIUS, 16, 12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.08}
          metalness={0.05}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh scale={0.55}>
        <sphereGeometry args={[MARBLE_RADIUS, 10, 8]} />
        <meshStandardMaterial color={core} roughness={0.25} emissive={core} emissiveIntensity={0.28} />
      </mesh>
    </group>
  );
}
