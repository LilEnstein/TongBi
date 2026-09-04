/**
 * Nền đất — thay hoàn toàn cái bàn của §13 file gốc (art direction §9.4).
 *
 * Không có bàn tròn, không có nỉ xanh. Chỉ có đất nện, một vòng tròn vạch bằng
 * que, vài vết chân trần và vệt bi lăn. Vòng tròn mờ dần qua từng vòng chơi vì
 * bị chân dẫm lên — chi tiết nhỏ nhưng làm buổi chiều có vẻ trôi đi.
 */
import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { MAU, toonGradient } from './toon.js';
import { VONG_RADIUS } from './geometry.js';

interface SanProps {
  /** Bán kính vòng người ngồi; vòng tròn vẽ nằm trong lòng vòng người. */
  radius?: number;
  /** Vòng chơi thứ mấy — càng về sau vạch càng mờ. */
  round?: number;
}

/** Vết chân trần và vệt bi lăn, rải cố định theo một dãy số tất định. */
function vetTren(radius: number): Array<{ p: [number, number, number]; r: number; xoay: number }> {
  const out: Array<{ p: [number, number, number]; r: number; xoay: number }> = [];
  for (let i = 0; i < 14; i += 1) {
    const goc = i * 2.399;
    const xa = 0.35 + ((i * 37) % 100) / 100;
    const r = radius * (0.25 + xa * 0.7);
    out.push({
      p: [Math.cos(goc) * r, 0.004 + i * 0.0002, Math.sin(goc) * r],
      r: 0.09 + ((i * 13) % 7) * 0.018,
      xoay: goc,
    });
  }
  return out;
}

export function San({ radius = VONG_RADIUS, round = 1 }: SanProps) {
  const vach = Math.max(0.3, 0.82 - (round - 1) * 0.055);
  const vet = useMemo(() => vetTren(radius), [radius]);
  // Vòng tròn vạch bằng que nằm trong lòng vòng người ngồi.
  const vongVe = Math.max(0.9, radius - 0.75);

  return (
    <group>
      {/* Sân đất nện: mặt phẳng lớn, màu bệt, không bóng. */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[Math.max(14, radius * 3), 48]} />
        <meshToonMaterial color={MAU.dat} gradientMap={toonGradient()} />
      </mesh>

      {/* Khoảng đất giữa vòng bị dẫm nhiều nên sáng và nhẵn hơn. */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[vongVe * 0.92, 40]} />
        <meshBasicMaterial color={MAU.datSang} transparent opacity={0.34} />
      </mesh>

      {/* Vòng tròn vạch bằng que — đường kính theo số người ngồi. */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[vongVe - 0.035, vongVe + 0.035, 72]} />
        <meshBasicMaterial color={MAU.datToi} transparent opacity={vach} side={DoubleSide} />
      </mesh>
      {/* Nét vạch thứ hai lệch một chút: que vạch không bao giờ đi trúng một lần. */}
      <mesh position={[0.04, 0.005, -0.03]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[vongVe - 0.02, vongVe + 0.02, 64]} />
        <meshBasicMaterial color={MAU.datToi} transparent opacity={vach * 0.5} side={DoubleSide} />
      </mesh>

      {/* Vết chân trần, vệt bi lăn, chỗ que chọc xuống đất. */}
      {vet.map((v, i) => (
        <mesh key={i} position={v.p} rotation={[-Math.PI / 2, 0, v.xoay]}>
          <circleGeometry args={[v.r, 12]} />
          <meshBasicMaterial color={MAU.datToi} transparent opacity={0.12} />
        </mesh>
      ))}

      {/* Chỗ đặt bi chung và lăn xúc xắc ở chính giữa: đất bị vét lõm xuống. */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.42, 20]} />
        <meshBasicMaterial color={MAU.datToi} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}
