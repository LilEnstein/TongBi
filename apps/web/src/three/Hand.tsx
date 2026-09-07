/**
 * Bàn tay TRẺ CON có rig khớp ngón — art direction §9.1.
 *
 * Đây là tài sản quan trọng nhất của game: tay ngắn, mũm mĩm, các ngón gần bằng
 * nhau, móng cắt cụt, mu bàn tay lấm đất, một miếng băng dán ở đốt ngón, và
 * vòng chỉ ở cổ tay — chỗ duy nhất mang màu đội (không tô màu cả bàn tay).
 *
 * Không dùng file GLB: bàn tay dựng bằng primitive và các group lồng nhau, mỗi
 * group là một khớp, nên "curl" 0→1 tạo đúng chuỗi xoè tay → nắm tay. Mọi khớp
 * đọc giá trị đã làm mượt từ một ref dùng chung và tự cập nhật trong useFrame —
 * không đi qua React render nên animation chạy 60fps mà không tạo render nào.
 */
import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, type Group } from 'three';
import { damp } from './geometry.js';
import { MAU, toonGradient } from './toon.js';

/** Cử chỉ thêm ngoài chuỗi chính — §9.1 (peek, shake_fist, wipe_dirt). */
export type CuChi = 'yen' | 'nhin-trom' | 'lac-tay' | 'quet-quan';

export interface HandDrive {
  /** 0 = xoè thẳng, 1 = nắm chặt. */
  curl: number;
  /** Vươn tay ra giữa vòng: 0 = để yên, 1 = đưa hẳn ra. */
  reach: number;
  /** Nâng tay lên khi reo hò. */
  lift: number;
  /** Dịch ngang do cử chỉ lắc tay / quệt quần. Con vật đọc để nối cánh tay. */
  x: number;
}

/**
 * `x` bị loại khỏi props: curl/reach/lift là đầu vào người gọi truyền xuống,
 * còn `x` là thứ Hand tự suy ra từ `cuChi` rồi công bố qua `drive` cho con vật
 * đọc. Nó chỉ đi một chiều ra ngoài, không phải một prop.
 */
interface HandProps extends Omit<HandDrive, 'x'> {
  /**
   * Trạng thái đã làm mượt, dùng chung với con vật đang cầm bàn tay này.
   * Bàn tay là nơi duy nhất ghi vào nó; con vật chỉ đọc để nối cánh tay vào
   * cổ tay. Không truyền thì bàn tay tự giữ một bản riêng.
   */
  drive?: HandDrive;
  skin?: string;
  /** Ống tay: vải nâu với người, lông với con vật. */
  ongTay?: string;
  /** Màu đội, buộc ở cổ tay bằng vòng chỉ / dây chun. */
  chiCoTay?: string;
  /** Vẽ viền mực quanh các khối — chỉ bật cho tay của chính mình (§9.1). */
  vien?: boolean;
  cuChi?: CuChi;
  children?: ReactNode;
}

/**
 * Một khối thịt: capsule nằm dọc theo -Z (đúng hướng ngón tay chỉ vào giữa
 * vòng) cộng thêm viền mực bọc ngoài khi được bật.
 */
const NAM: [number, number, number] = [Math.PI / 2, 0, 0];

function Dot({
  args,
  position,
  mau,
  vien,
}: {
  args: [number, number, number, number];
  position: [number, number, number];
  mau: string;
  vien?: boolean;
}) {
  return (
    <>
      <mesh position={position} rotation={NAM} castShadow>
        <capsuleGeometry args={args} />
        <meshToonMaterial color={mau} gradientMap={toonGradient()} />
      </mesh>
      {vien && (
        <mesh position={position} rotation={NAM} scale={1.09}>
          <capsuleGeometry args={args} />
          <meshBasicMaterial color={MAU.muc} side={BackSide} />
        </mesh>
      )}
    </>
  );
}

/**
 * Một ngón gồm 3 đốt lồng nhau — xoay đốt gốc kéo theo cả ngón.
 * Ngón trẻ con: các đốt gần bằng nhau, đầu ngón tù, móng cắt cụt.
 */
function Ngon({
  drive,
  length,
  width,
  skin,
  vien,
  vetMuc,
}: {
  drive: { curl: number };
  length: number;
  width: number;
  skin: string;
  vien?: boolean;
  /** Vệt mực bút bi ở ngón trỏ — §9.1. */
  vetMuc?: boolean;
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
      <Dot args={[width, seg * 0.72, 3, 8]} position={[0, 0, -seg / 2]} mau={skin} vien={vien} />
      {vetMuc && (
        <mesh position={[0, width * 0.85, -seg * 0.55]}>
          <boxGeometry args={[width * 0.9, 0.004, seg * 0.3]} />
          <meshBasicMaterial color={MAU.cham} />
        </mesh>
      )}
      <group ref={j2} position={[0, 0, -seg]}>
        <Dot
          args={[width * 0.95, seg * 0.68, 3, 8]}
          position={[0, 0, -seg / 2]}
          mau={skin}
          vien={vien}
        />
        <group ref={j3} position={[0, 0, -seg]}>
          <Dot
            args={[width * 0.92, seg * 0.58, 3, 8]}
            position={[0, 0, -seg / 2]}
            mau={skin}
            vien={vien}
          />
          {/* Móng cắt cụt, có đất đen dưới móng. */}
          <mesh position={[0, width * 0.62, -seg * 0.82]} rotation={[-0.5, 0, 0]}>
            <boxGeometry args={[width * 1.15, 0.006, width * 1.1]} />
            <meshToonMaterial color="#E3BFA0" gradientMap={toonGradient()} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Biên độ và pha của một cử chỉ tuần hoàn. Giữ ngoài React, một bản mỗi tay. */
export interface NhipCuChi {
  bien: number;
  pha: number;
}

/**
 * Một cử chỉ lặp (lắc tay, quệt quần) bật/tắt mà không pop.
 *
 * Trước đây cử chỉ là `Math.sin(Date.now()/1000 * 13) * 0.09` — pha tuyệt đối,
 * không liên quan tới lúc cử chỉ bắt đầu. Đúng frame server đổi phase, hàm sin
 * đang ở pha bất kỳ nên nắm tay nhảy ngang tới 0,0675 đơn vị (~37% bề ngang
 * lòng bàn tay) rồi mới bắt đầu lắc, và giật ngược về giữa khi cử chỉ tắt.
 *
 * Cách sửa: biên độ đi qua damp còn pha tự tích luỹ từ 0. Bật thì biên bò từ 0
 * lên nên xuất phát đúng ở giữa; tắt thì biên tụt về 0 còn sin vẫn chạy, lắc
 * nhỏ dần rồi hết. Tần số và biên độ đỉnh không đổi — chỉ cái bao ngoài mềm đi.
 * Tắt dùng λ lớn hơn bật để dư âm không kéo sang phase sau.
 */
export function nhipCuChi(s: NhipCuChi, bat: boolean, tanSo: number, step: number): number {
  // Tắt hẳn thì về đúng 0 và ĐỨNG pha lại. Nếu để pha tự tiến trong lúc tắt
  // thì lần bật sau xuất phát ở một pha bất kỳ — vẫn còn 6% biên, tức vẫn còn
  // một cú nhảy nhỏ. Đứng pha thì frame đầu của lần bật là sin(0) = 0 tuyệt đối.
  if (!bat && s.bien < 0.002) {
    s.bien = 0;
    s.pha = 0;
    return 0;
  }
  s.bien = damp(s.bien, bat ? 1 : 0, bat ? 10 : 13, step);
  // Lấy mẫu ở pha hiện tại rồi mới tiến, để frame đầu tiên đọc đúng pha 0.
  const ra = Math.sin(s.pha) * s.bien;
  s.pha += step * tanSo;
  return ra;
}

/** Ngón trẻ con gần bằng nhau, không thon dài như tay người lớn. */
const NGON = [
  { x: -0.096, len: 0.25, w: 0.035, z: -0.004, muc: true }, // trỏ
  { x: -0.032, len: 0.265, w: 0.036, z: 0 }, // giữa
  { x: 0.031, len: 0.253, w: 0.034, z: -0.004 }, // áp út
  { x: 0.09, len: 0.215, w: 0.031, z: -0.014 }, // út
];

/**
 * Hệ toạ độ: bàn tay hướng về -Z (vào giữa vòng), lòng bàn tay ngửa lên +Y.
 * Bi được đặt trong group con nên tự đi theo tay khi tay di chuyển.
 */
export function Hand({
  curl,
  reach,
  lift = 0,
  drive: driveNgoai,
  skin = '#C98A5B',
  ongTay = MAU.vaiNau,
  chiCoTay = MAU.dieu,
  vien = false,
  cuChi = 'yen',
  children,
}: HandProps) {
  const root = useRef<Group>(null);
  const thumbBase = useRef<Group>(null);
  const thumbJ1 = useRef<Group>(null);
  const thumbJ2 = useRef<Group>(null);
  const palmContent = useRef<Group>(null);
  // Đối tượng dùng chung, được Hand làm mượt mỗi frame và mọi khớp đọc lại.
  const driveRieng = useMemo(() => ({ curl, reach, lift, x: 0 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const nhip = useMemo(() => ({ lac: { bien: 0, pha: 0 }, quet: { bien: 0, pha: 0 } }), []);
  const drive = driveNgoai ?? driveRieng;

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    const t = Date.now() / 1000;

    // Hé nắm tay tự nhìn trộm bi của chính mình — clip `peek` (§9.1).
    const homNay = cuChi === 'nhin-trom' ? Math.max(0, Math.sin(t * 0.9)) * 0.22 : 0;
    // Lắc nắm tay trêu đối thủ — clip `shake_fist`.
    const lac = nhipCuChi(nhip.lac, cuChi === 'lac-tay', 13, step) * 0.09;
    // Quệt tay vào quần trước khi bốc bi — clip `wipe_dirt`.
    const quet = nhipCuChi(nhip.quet, cuChi === 'quet-quan', 6, step) * 0.06;

    // Ghi vào drive rồi mới đọc lại, không tính `lac + quet` ở hai nơi: con vật
    // đọc chính giá trị này để nối cánh tay, hai biểu thức song song sẽ trôi
    // khỏi nhau ngay lần đầu có ai sửa cử chỉ.
    drive.x = lac + quet;
    drive.curl = damp(drive.curl, Math.max(0, curl - homNay), 9, step);
    drive.reach = damp(drive.reach, reach, 7, step);
    drive.lift = damp(drive.lift, lift, 6, step);

    if (root.current) {
      root.current.position.x = drive.x;
      root.current.position.z = -drive.reach * 0.62;
      root.current.position.y = 0.3 + drive.lift * 0.45;
      // Nắm tay thì hơi ngửa cổ tay để cả vòng thấy rõ nắm đấm.
      root.current.rotation.x = -0.18 - drive.curl * 0.22 + drive.lift * 0.5;
      root.current.rotation.z = lac * 1.4;
    }
    if (thumbBase.current) thumbBase.current.rotation.z = -0.55 - drive.curl * 0.45;
    if (thumbJ1.current) thumbJ1.current.rotation.x = drive.curl * 0.75;
    if (thumbJ2.current) thumbJ2.current.rotation.x = drive.curl * 0.85;
    // Bi khuất dần khi các ngón khép lại che kín lòng bàn tay.
    if (palmContent.current) palmContent.current.visible = drive.curl < 0.82;
  });

  return (
    <group ref={root}>
      {/* Cẳng tay trong ống tay áo vải nâu, rồi tới cổ tay */}
      <Dot args={[0.086, 0.4, 4, 10]} position={[0, -0.02, 0.42]} mau={ongTay} vien={vien} />
      <Dot args={[0.07, 0.14, 4, 10]} position={[0, -0.01, 0.17]} mau={skin} vien={vien} />

      {/* Vòng chỉ đỏ / dây chun màu đội ở cổ tay — chỗ duy nhất mang màu đội. */}
      <mesh position={[0, -0.012, 0.235]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.077, 0.011, 6, 16]} />
        <meshToonMaterial color={chiCoTay} gradientMap={toonGradient()} />
      </mesh>

      {/* Lòng bàn tay: ngắn và dày, kiểu tay trẻ con */}
      <mesh position={[0, 0, -0.04]} castShadow receiveShadow>
        <boxGeometry args={[0.245, 0.088, 0.25]} />
        <meshToonMaterial color={skin} gradientMap={toonGradient()} />
      </mesh>
      <mesh position={[0, 0.032, -0.04]} receiveShadow>
        <boxGeometry args={[0.19, 0.03, 0.2]} />
        <meshToonMaterial color={skin} gradientMap={toonGradient()} />
      </mesh>
      {vien && (
        <mesh position={[0, 0, -0.04]} scale={1.045}>
          <boxGeometry args={[0.245, 0.088, 0.25]} />
          <meshBasicMaterial color={MAU.muc} side={BackSide} />
        </mesh>
      )}

      {/* Bụi đất trên mu bàn tay và một miếng băng dán ở đốt ngón — §9.1 */}
      <mesh position={[0.04, -0.046, -0.02]} rotation={[Math.PI / 2, 0, 0.4]}>
        <circleGeometry args={[0.055, 8]} />
        <meshBasicMaterial color={MAU.datToi} transparent opacity={0.22} />
      </mesh>
      <mesh position={[-0.062, 0.05, -0.13]} rotation={[0.1, 0, 0.2]}>
        <boxGeometry args={[0.05, 0.004, 0.032]} />
        <meshToonMaterial color={MAU.giay} gradientMap={toonGradient()} />
      </mesh>

      {/* Bi nằm trong lòng bàn tay */}
      <group ref={palmContent} position={[0, 0.058, -0.04]}>
        {children}
      </group>

      {/* Bốn ngón ở mép trước lòng bàn tay */}
      {NGON.map((f, i) => (
        <group key={i} position={[f.x, 0.005, -0.17 + f.z]}>
          <Ngon
            drive={drive}
            length={f.len}
            width={f.w}
            skin={skin}
            vien={vien}
            vetMuc={f.muc}
          />
        </group>
      ))}

      {/* Ngón cái gập chéo vào lòng bàn tay */}
      <group ref={thumbBase} position={[-0.125, 0, 0.02]} rotation={[0.15, 0, -0.55]}>
        <group ref={thumbJ1}>
          <Dot args={[0.04, 0.1, 3, 8]} position={[0, 0, -0.075]} mau={skin} vien={vien} />
          <group ref={thumbJ2} position={[0, 0, -0.15]}>
            <Dot args={[0.037, 0.08, 3, 8]} position={[0, 0, -0.06]} mau={skin} vien={vien} />
          </group>
        </group>
      </group>
    </group>
  );
}
