/**
 * Bàn tay low-poly có rig khớp ngón — design doc §4.
 * Không dùng file GLB: bàn tay được dựng bằng primitive và các group lồng nhau,
 * mỗi group là một khớp, nên "curl" 0→1 tạo đúng chuỗi xoè tay → nắm tay.
 *
 * Mọi khớp đọc giá trị đã làm mượt từ một ref dùng chung và tự cập nhật trong
 * useFrame — không đi qua React render nên animation chạy ở 60fps mà không
 * tạo ra render nào.
 */
import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { damp } from './geometry.js';

export interface HandDrive {
  /** 0 = xoè thẳng, 1 = nắm chặt. */
  curl: number;
  /** Vươn tay ra giữa bàn: 0 = để yên, 1 = đưa hẳn ra. */
  reach: number;
  /** Nâng tay lên khi ăn mừng. */
  lift: number;
}

interface HandProps extends HandDrive {
  skin?: string;
  sleeve?: string;
  children?: ReactNode;
}

/** Một ngón gồm 3 đốt lồng nhau — xoay đốt gốc kéo theo cả ngón. */
function Finger({
  drive,
  length,
  width,
  skin,
}: {
  drive: { curl: number };
  length: number;
  width: number;
  skin: string;
}) {
  const j1 = useRef<Group>(null);
  const j2 = useRef<Group>(null);
  const j3 = useRef<Group>(null);
  const seg = length / 3;

  useFrame(() => {
    const c = drive.curl;
    // Đốt gốc gập nhiều nhất, đốt ngọn gập ít hơn — giống chuyển động tay thật.
    if (j1.current) j1.current.rotation.x = c * 1.45;
    if (j2.current) j2.current.rotation.x = c * 1.62;
    if (j3.current) j3.current.rotation.x = c * 1.25;
  });

  return (
    <group ref={j1}>
      <mesh position={[0, 0, -seg / 2]} castShadow>
        <capsuleGeometry args={[width, seg * 0.72, 3, 8]} />
        <meshStandardMaterial color={skin} roughness={0.75} />
      </mesh>
      <group ref={j2} position={[0, 0, -seg]}>
        <mesh position={[0, 0, -seg / 2]} castShadow>
          <capsuleGeometry args={[width * 0.93, seg * 0.68, 3, 8]} />
          <meshStandardMaterial color={skin} roughness={0.75} />
        </mesh>
        <group ref={j3} position={[0, 0, -seg]}>
          <mesh position={[0, 0, -seg / 2]} castShadow>
            <capsuleGeometry args={[width * 0.85, seg * 0.6, 3, 8]} />
            <meshStandardMaterial color={skin} roughness={0.75} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

const FINGERS = [
  { x: -0.105, len: 0.3, w: 0.032, z: -0.005 }, // trỏ
  { x: -0.036, len: 0.33, w: 0.033, z: 0 }, // giữa
  { x: 0.033, len: 0.31, w: 0.031, z: -0.004 }, // áp út
  { x: 0.097, len: 0.25, w: 0.028, z: -0.016 }, // út
];

/**
 * Hệ toạ độ: bàn tay hướng về -Z (vào giữa bàn), lòng bàn tay ngửa lên +Y.
 * Bi được đặt trong group con nên tự động đi theo tay khi tay di chuyển.
 */
export function Hand({
  curl,
  reach,
  lift = 0,
  skin = '#e8b48c',
  sleeve = '#3a4256',
  children,
}: HandProps) {
  const root = useRef<Group>(null);
  const thumbBase = useRef<Group>(null);
  const thumbJ1 = useRef<Group>(null);
  const thumbJ2 = useRef<Group>(null);
  const palmContent = useRef<Group>(null);
  // Đối tượng dùng chung, được Hand làm mượt mỗi frame và mọi khớp đọc lại.
  const drive = useMemo(() => ({ curl, reach, lift }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    drive.curl = damp(drive.curl, curl, 9, step);
    drive.reach = damp(drive.reach, reach, 7, step);
    drive.lift = damp(drive.lift, lift, 6, step);

    if (root.current) {
      root.current.position.z = -drive.reach * 0.62;
      root.current.position.y = 0.32 + drive.lift * 0.45;
      // Nắm tay thì hơi ngửa cổ tay để người xem thấy rõ nắm đấm.
      root.current.rotation.x = -0.18 - drive.curl * 0.22 + drive.lift * 0.5;
    }
    if (thumbBase.current) thumbBase.current.rotation.z = -0.55 - drive.curl * 0.45;
    if (thumbJ1.current) thumbJ1.current.rotation.x = drive.curl * 0.75;
    if (thumbJ2.current) thumbJ2.current.rotation.x = drive.curl * 0.85;
    // Bi biến mất dần khi các ngón khép lại che kín lòng bàn tay.
    if (palmContent.current) palmContent.current.visible = drive.curl < 0.82;
  });

  return (
    <group ref={root}>
      {/* Cẳng tay + ống tay áo */}
      <mesh position={[0, -0.02, 0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.088, 0.42, 4, 10]} />
        <meshStandardMaterial color={sleeve} roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.01, 0.17]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.072, 0.14, 4, 10]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>

      {/* Lòng bàn tay */}
      <mesh position={[0, 0, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.26, 0.085, 0.28]} />
        <meshStandardMaterial color={skin} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.03, -0.05]} receiveShadow>
        <boxGeometry args={[0.2, 0.03, 0.22]} />
        <meshStandardMaterial color={skin} roughness={0.9} />
      </mesh>

      {/* Bi nằm trong lòng bàn tay */}
      <group ref={palmContent} position={[0, 0.06, -0.05]}>
        {children}
      </group>

      {/* Bốn ngón ở mép trước lòng bàn tay */}
      {FINGERS.map((f, i) => (
        <group key={i} position={[f.x, 0.005, -0.19 + f.z]}>
          <Finger drive={drive} length={f.len} width={f.w} skin={skin} />
        </group>
      ))}

      {/* Ngón cái gập chéo vào lòng bàn tay */}
      <group ref={thumbBase} position={[-0.13, 0, 0.02]} rotation={[0.15, 0, -0.55]}>
        <group ref={thumbJ1}>
          <mesh position={[0, 0, -0.075]} castShadow>
            <capsuleGeometry args={[0.038, 0.1, 3, 8]} />
            <meshStandardMaterial color={skin} roughness={0.75} />
          </mesh>
          <group ref={thumbJ2} position={[0, 0, -0.15]}>
            <mesh position={[0, 0, -0.06]} castShadow>
              <capsuleGeometry args={[0.034, 0.08, 3, 8]} />
              <meshStandardMaterial color={skin} roughness={0.75} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
