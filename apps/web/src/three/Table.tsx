/** Bàn chơi ở trung tâm scene — design doc §13. */
import { TABLE_RADIUS } from './geometry.js';

export function Table() {
  return (
    <group>
      {/* Mặt bàn */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, 0.12, 48]} />
        <meshStandardMaterial color="#2f5d4b" roughness={0.95} />
      </mesh>
      {/* Viền bàn */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <torusGeometry args={[TABLE_RADIUS, 0.075, 10, 48]} />
        <meshStandardMaterial color="#6b4a2f" roughness={0.7} />
      </mesh>
      {/* Vòng tròn giữa bàn cho người chơi biết đâu là "vùng đặt bi" */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.78, 48]} />
        <meshBasicMaterial color="#57a883" transparent opacity={0.5} />
      </mesh>
      {/* Chân bàn */}
      <mesh position={[0, -0.75, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.34, 1.35, 16]} />
        <meshStandardMaterial color="#5b3f28" roughness={0.85} />
      </mesh>
      {/* Sàn nhận bóng đổ */}
      <mesh position={[0, -1.42, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 40]} />
        <meshStandardMaterial color="#171a24" roughness={1} />
      </mesh>
    </group>
  );
}
