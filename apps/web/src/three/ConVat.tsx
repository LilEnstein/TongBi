/**
 * Mười con vật tranh dân gian, dựng bằng primitive — art direction §9.1 mở rộng.
 *
 * Cùng triết lý với `Hand.tsx`: KHÔNG dùng file GLB. Mỗi con vật là một bộ khớp
 * lồng nhau (thân → cổ → đầu → tai/mỏ/đuôi) ghép từ capsule và sphere, khác nhau
 * ở một bảng cấu hình chứ không phải mười file model. Nhờ vậy 30 con cùng ngồi
 * quanh sân mà không tải thêm một byte asset nào, và đổi bảng màu là đổi cả bộ.
 *
 * Mọi animation ghi trực tiếp vào object3D trong `useFrame`, không đi qua React
 * render — giống bàn tay, để 30 con vẫn giữ được framerate trên điện thoại.
 *
 * Con vật KHÔNG biết gì về phase: `PlayerSeat` dịch phase thành một tư thế
 * (`TuThe`) rồi truyền xuống. Nó cũng không bao giờ nhận số bi của người khác,
 * nên xoay camera kiểu gì cũng không lộ thông tin ẩn (§18).
 */
import { useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Vector3, type Group, type Mesh } from 'three';
import { AVATARS } from '@tongbi/game-rules';
import { damp } from './geometry.js';
import { boLong, MAU, toonGradient, type BoLong } from './toon.js';
import type { HandDrive } from './Hand.js';

/* ══════════════════════ Bảng cấu hình mười con ══════════════════════════ */

type KieuTai = 'sung' | 'mao' | 'cup' | 'nhon' | 'tron' | 'khong' | 'chom';
type KieuMom = 'moom' | 'mo' | 'mo-bet' | 'hech' | 'rong' | 'moi-ca';
type KieuDuoi = 'day' | 'xoe' | 'xoan' | 'mem' | 'manh' | 'khong' | 'vay';
type KieuVet = 'khong' | 'van' | 'xoay' | 'vay' | 'uc';
type Quirk =
  | 'vay-duoi'
  | 'mo-thuc'
  | 'hit'
  | 'liem'
  | 'rung-rau'
  | 'phong'
  | 'phap-mang'
  | 'nhun-nhay';

interface CauHinh {
  tai: KieuTai;
  mom: KieuMom;
  duoi: KieuDuoi;
  vet: KieuVet;
  /** Tật riêng lúc ngồi rỗi — thứ làm người chơi nhận ra con vật của mình. */
  quirk: Quirk;
  /** Bán kính đầu. Đầu càng to trông càng non. */
  dau: number;
  /** Bề ngang thân. */
  than: number;
  /** Chiều cao thân, tính từ hông lên cổ. */
  cao: number;
  /** Cỡ mắt và độ đặt rộng của hai mắt. */
  mat: number;
  matRong: number;
}

const CAU_HINH: Record<string, CauHinh> = {
  trau: { tai: 'sung', mom: 'moom', duoi: 'day', vet: 'khong', quirk: 'vay-duoi', dau: 0.2, than: 0.25, cao: 0.4, mat: 0.032, matRong: 0.5 },
  ga: { tai: 'mao', mom: 'mo', duoi: 'xoe', vet: 'uc', quirk: 'mo-thuc', dau: 0.155, than: 0.21, cao: 0.42, mat: 0.03, matRong: 0.55 },
  lon: { tai: 'cup', mom: 'hech', duoi: 'xoan', vet: 'xoay', quirk: 'hit', dau: 0.185, than: 0.27, cao: 0.34, mat: 0.026, matRong: 0.5 },
  meo: { tai: 'nhon', mom: 'moom', duoi: 'mem', vet: 'khong', quirk: 'liem', dau: 0.175, than: 0.2, cao: 0.4, mat: 0.038, matRong: 0.48 },
  chuot: { tai: 'tron', mom: 'moom', duoi: 'manh', vet: 'khong', quirk: 'rung-rau', dau: 0.165, than: 0.185, cao: 0.35, mat: 0.03, matRong: 0.46 },
  coc: { tai: 'khong', mom: 'rong', duoi: 'khong', vet: 'khong', quirk: 'phong', dau: 0.2, than: 0.28, cao: 0.24, mat: 0.042, matRong: 0.62 },
  ca: { tai: 'khong', mom: 'moi-ca', duoi: 'vay', vet: 'vay', quirk: 'phap-mang', dau: 0.185, than: 0.23, cao: 0.36, mat: 0.04, matRong: 0.6 },
  vit: { tai: 'khong', mom: 'mo-bet', duoi: 'xoe', vet: 'khong', quirk: 'mo-thuc', dau: 0.16, than: 0.22, cao: 0.38, mat: 0.028, matRong: 0.52 },
  chim: { tai: 'chom', mom: 'mo', duoi: 'xoe', vet: 'uc', quirk: 'nhun-nhay', dau: 0.14, than: 0.175, cao: 0.32, mat: 0.03, matRong: 0.52 },
  ho: { tai: 'nhon', mom: 'moom', duoi: 'day', vet: 'van', quirk: 'vay-duoi', dau: 0.2, than: 0.26, cao: 0.42, mat: 0.036, matRong: 0.5 },
};

export const LOAI_MAC_DINH = 'trau';

/** Hồ sơ cũ còn lưu emoji trong localStorage thì lùi về con trâu. */
export function loaiConVat(avatar: string): string {
  return (AVATARS as readonly string[]).includes(avatar) ? avatar : LOAI_MAC_DINH;
}

/* ══════════════════════ Tư thế theo phase ═══════════════════════════════ */

export type TuThe = 'ngoi' | 'chom' | 'ngong' | 'reo' | 'xiu' | 'tung';

interface Dang {
  /** Thân chồm về phía tâm vòng, radian. */
  nghieng: number;
  /** Nhấc cả người lên hoặc xẹp xuống. */
  cao: number;
  /** Biên độ nhún nhảy. */
  nhun: number;
  /** Đầu ngẩng (âm) hay gục (dương). */
  dau: number;
}

const DANG: Record<TuThe, Dang> = {
  // Ngồi bệt, thở, ngó quanh sân.
  ngoi: { nghieng: 0.05, cao: 0, nhun: 0, dau: 0 },
  // Chồm tới bốc bi, mắt dán vào tay mình.
  chom: { nghieng: 0.3, cao: 0.015, nhun: 0, dau: 0.2 },
  // Nghển cổ nhìn vào giữa vòng xem mở tay ra mấy viên.
  ngong: { nghieng: 0.2, cao: 0.05, nhun: 0, dau: -0.16 },
  // Reo hò: ngửa người ra, nhảy tưng tưng.
  reo: { nghieng: -0.14, cao: 0.05, nhun: 1, dau: -0.26 },
  // Trượt: xẹp xuống, gục đầu.
  xiu: { nghieng: 0.32, cao: -0.05, nhun: 0, dau: 0.34 },
  // Tung xúc xắc: rướn người, dồn sức vào tay.
  tung: { nghieng: 0.24, cao: 0.02, nhun: 0.3, dau: 0.12 },
};

/** Mức chi tiết, hạ xuống khi sân đông để giữ 60fps (§15). */
export type ChiTiet = 'cao' | 'vua' | 'thap';

/* ══════════════════════ Bút vẽ hình khối ════════════════════════════════ */

const NAM: [number, number, number] = [Math.PI / 2, 0, 0];
const THANG: [number, number, number] = [0, 0, 0];

/** Một khối lông hình capsule, kèm viền mực khi được bật. */
function Khoi({
  args,
  position,
  rotation = NAM,
  mau,
  vien,
}: {
  args: [number, number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  mau: string;
  vien?: boolean;
}) {
  return (
    <>
      <mesh position={position} rotation={rotation} castShadow>
        <capsuleGeometry args={args} />
        <meshToonMaterial color={mau} gradientMap={toonGradient()} />
      </mesh>
      {vien && (
        <mesh position={position} rotation={rotation} scale={1.07}>
          <capsuleGeometry args={args} />
          <meshBasicMaterial color={MAU.muc} side={BackSide} />
        </mesh>
      )}
    </>
  );
}

/** Một khối tròn, bóp dẹt được theo ba trục. */
function Tron({
  r,
  position,
  scale = [1, 1, 1],
  mau,
  seg = 12,
  vien,
}: {
  r: number;
  position: [number, number, number];
  scale?: [number, number, number];
  mau: string;
  seg?: number;
  vien?: boolean;
}) {
  const doc = Math.max(6, Math.round(seg * 0.75));
  return (
    <>
      <mesh position={position} scale={scale} castShadow>
        <sphereGeometry args={[r, seg, doc]} />
        <meshToonMaterial color={mau} gradientMap={toonGradient()} />
      </mesh>
      {vien && (
        <mesh position={position} scale={[scale[0] * 1.06, scale[1] * 1.06, scale[2] * 1.06]}>
          <sphereGeometry args={[r, seg, doc]} />
          <meshBasicMaterial color={MAU.muc} side={BackSide} />
        </mesh>
      )}
    </>
  );
}

/* ══════════════════════ Bộ phận theo loài ═══════════════════════════════ */

/** Tai / sừng / mào — thứ phân biệt loài rõ nhất khi nhìn từ bên kia sân. */
function Tai({
  kieu,
  long,
  dau,
  ben,
  chiTiet,
}: {
  kieu: KieuTai;
  long: BoLong;
  dau: number;
  /** -1 là bên trái, 1 là bên phải. */
  ben: -1 | 1;
  chiTiet: ChiTiet;
}) {
  const x = ben * dau * 0.72;
  const seg = chiTiet === 'cao' ? 10 : 6;

  switch (kieu) {
    case 'sung':
      // Sừng trâu vòng ra hai bên rồi vểnh lên.
      return (
        <group position={[x, dau * 0.5, dau * 0.1]} rotation={[0, 0, ben * -0.5]}>
          <mesh rotation={[0, 0, ben * 0.9]} castShadow>
            <torusGeometry args={[dau * 0.44, dau * 0.1, 5, 10, Math.PI * 0.95]} />
            <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
          </mesh>
        </group>
      );
    case 'mao':
      // Mào gà: ba múi đỏ dựng giữa đỉnh đầu — chỉ vẽ một lần, không đôi.
      if (ben === -1) return null;
      return (
        <group position={[0, dau * 0.92, 0]}>
          {[-0.6, 0, 0.6].map((k, i) => (
            <mesh
              key={i}
              position={[0, dau * (0.1 - Math.abs(k) * 0.06), k * dau * 0.5]}
              castShadow
            >
              <sphereGeometry args={[dau * (0.3 - Math.abs(k) * 0.08), seg, seg]} />
              <meshToonMaterial color={MAU.dieu} gradientMap={toonGradient()} />
            </mesh>
          ))}
        </group>
      );
    case 'cup':
      // Tai lợn cụp về phía trước, một tấm mỏng.
      return (
        <mesh
          position={[x, dau * 0.52, -dau * 0.1]}
          rotation={[0.5, 0, ben * 0.4]}
          scale={[0.7, 1, 0.35]}
          castShadow
        >
          <sphereGeometry args={[dau * 0.5, seg, seg]} />
          <meshToonMaterial color={long.toi} gradientMap={toonGradient()} />
        </mesh>
      );
    case 'nhon':
      // Tai mèo / hổ: tam giác dựng, có lòng tai màu đậm.
      return (
        <group position={[x, dau * 0.78, dau * 0.05]} rotation={[0, 0, ben * 0.28]}>
          <mesh castShadow>
            <coneGeometry args={[dau * 0.3, dau * 0.6, chiTiet === 'cao' ? 8 : 4]} />
            <meshToonMaterial color={long.chinh} gradientMap={toonGradient()} />
          </mesh>
          {chiTiet !== 'thap' && (
            <mesh position={[0, -dau * 0.02, -dau * 0.12]} scale={0.62}>
              <coneGeometry args={[dau * 0.3, dau * 0.6, 6]} />
              <meshToonMaterial color={long.toi} gradientMap={toonGradient()} />
            </mesh>
          )}
        </group>
      );
    case 'tron':
      // Tai chuột: hai đĩa tròn gần bằng nửa đầu.
      return (
        <group position={[x * 1.05, dau * 0.66, 0]} rotation={[0, ben * 0.5, 0]}>
          <mesh scale={[1, 1, 0.4]} castShadow>
            <sphereGeometry args={[dau * 0.46, seg, seg]} />
            <meshToonMaterial color={long.chinh} gradientMap={toonGradient()} />
          </mesh>
          {chiTiet !== 'thap' && (
            <mesh position={[0, 0, -dau * 0.1]} scale={[0.72, 0.72, 0.2]}>
              <sphereGeometry args={[dau * 0.46, seg, seg]} />
              <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
            </mesh>
          )}
        </group>
      );
    case 'chom':
      // Chỏm lông trên đầu chim chào mào.
      if (ben === -1) return null;
      return (
        <mesh position={[0, dau * 1.0, dau * 0.16]} rotation={[-0.45, 0, 0]} castShadow>
          <coneGeometry args={[dau * 0.22, dau * 0.72, chiTiet === 'cao' ? 7 : 4]} />
          <meshToonMaterial color={long.toi} gradientMap={toonGradient()} />
        </mesh>
      );
    default:
      return null;
  }
}

/** Mõm / mỏ / môi — đặt ở mặt trước của đầu (-Z). */
function Mom({
  kieu,
  long,
  dau,
  chiTiet,
}: {
  kieu: KieuMom;
  long: BoLong;
  dau: number;
  chiTiet: ChiTiet;
}) {
  const seg = chiTiet === 'cao' ? 10 : 6;
  const z = -dau * 0.78;

  switch (kieu) {
    case 'mo':
      // Mỏ gà / chim: nón vàng nghệ chỉa ra trước.
      return (
        <mesh position={[0, -dau * 0.1, z - dau * 0.14]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[dau * 0.24, dau * 0.5, seg]} />
          <meshToonMaterial color={MAU.nghe} gradientMap={toonGradient()} />
        </mesh>
      );
    case 'mo-bet':
      // Mỏ vịt: bẹt, dài, hơi cụp xuống.
      return (
        <mesh
          position={[0, -dau * 0.16, z - dau * 0.24]}
          rotation={[0.1, 0, 0]}
          scale={[1, 0.36, 1.5]}
          castShadow
        >
          <sphereGeometry args={[dau * 0.36, seg, seg]} />
          <meshToonMaterial color={MAU.nghe} gradientMap={toonGradient()} />
        </mesh>
      );
    case 'hech':
      // Mũi lợn: cái đĩa tròn hếch lên, có hai lỗ.
      return (
        <group position={[0, -dau * 0.12, z - dau * 0.06]} rotation={[0.25, 0, 0]}>
          <mesh rotation={NAM} castShadow>
            <cylinderGeometry args={[dau * 0.3, dau * 0.32, dau * 0.16, seg]} />
            <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
          </mesh>
          {chiTiet !== 'thap' &&
            ([-1, 1] as const).map((b) => (
              <mesh key={b} position={[b * dau * 0.12, 0, -dau * 0.09]} rotation={NAM}>
                <cylinderGeometry args={[dau * 0.06, dau * 0.06, dau * 0.03, 6]} />
                <meshBasicMaterial color={long.toi} />
              </mesh>
            ))}
        </group>
      );
    case 'rong':
      // Miệng cóc: rộng hết bề ngang đầu, một nét mực cong.
      return (
        <mesh position={[0, -dau * 0.3, z + dau * 0.1]} scale={[1.1, 0.16, 0.3]}>
          <sphereGeometry args={[dau * 0.72, seg, seg]} />
          <meshToonMaterial color={long.toi} gradientMap={toonGradient()} />
        </mesh>
      );
    case 'moi-ca':
      // Môi cá chép: một vành tròn chìa ra.
      return (
        <mesh position={[0, -dau * 0.14, z - dau * 0.04]} rotation={NAM} castShadow>
          <torusGeometry args={[dau * 0.22, dau * 0.09, 5, seg]} />
          <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
        </mesh>
      );
    default:
      // Mõm trâu / mèo / chuột / hổ: khối tròn nhạt kèm cái mũi đậm.
      return (
        <group position={[0, -dau * 0.22, z + dau * 0.12]}>
          <mesh scale={[1, 0.8, 0.9]} castShadow>
            <sphereGeometry args={[dau * 0.4, seg, seg]} />
            <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
          </mesh>
          <mesh position={[0, dau * 0.1, -dau * 0.32]} scale={[1.2, 0.7, 0.8]}>
            <sphereGeometry args={[dau * 0.12, 8, 6]} />
            <meshToonMaterial color={long.toi} gradientMap={toonGradient()} />
          </mesh>
        </group>
      );
  }
}

/** Đuôi — mọc sau lưng (+Z), có ref riêng để đánh qua đánh lại. */
function Duoi({
  kieu,
  long,
  than,
  chiTiet,
  refDuoi,
}: {
  kieu: KieuDuoi;
  long: BoLong;
  than: number;
  chiTiet: ChiTiet;
  refDuoi: RefObject<Group | null>;
}) {
  const seg = chiTiet === 'cao' ? 8 : 5;
  if (kieu === 'khong') return null;

  return (
    <group ref={refDuoi} position={[0, than * 0.5, than * 0.92]}>
      {kieu === 'day' && (
        <>
          <Khoi
            args={[than * 0.11, than * 1.0, 3, seg]}
            position={[0, -than * 0.1, than * 0.5]}
            rotation={[1.15, 0, 0]}
            mau={long.chinh}
          />
          {/* Chùm lông ở chót đuôi. */}
          <mesh position={[0, -than * 0.62, than * 0.86]} castShadow>
            <sphereGeometry args={[than * 0.2, seg, seg]} />
            <meshToonMaterial color={long.toi} gradientMap={toonGradient()} />
          </mesh>
        </>
      )}
      {kieu === 'mem' && (
        <Khoi
          args={[than * 0.1, than * 1.15, 4, seg]}
          position={[0, than * 0.34, than * 0.3]}
          rotation={[-0.5, 0, 0]}
          mau={long.chinh}
        />
      )}
      {kieu === 'manh' && (
        <Khoi
          args={[than * 0.05, than * 1.25, 3, 5]}
          position={[0, -than * 0.16, than * 0.6]}
          rotation={[1.25, 0, 0]}
          mau={long.sang}
        />
      )}
      {kieu === 'xoan' && (
        <mesh position={[0, than * 0.1, than * 0.2]} rotation={[0, 0.4, 0]} castShadow>
          <torusGeometry args={[than * 0.22, than * 0.07, 5, seg + 4, Math.PI * 1.7]} />
          <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
        </mesh>
      )}
      {kieu === 'xoe' && (
        // Đuôi gà / vịt / chim: mấy cái lông xoè lên như nan quạt.
        <group position={[0, than * 0.1, than * 0.1]}>
          {(chiTiet === 'thap' ? [0] : [-0.5, 0, 0.5]).map((k, i) => (
            <mesh
              key={i}
              position={[k * than * 0.3, than * 0.3, than * 0.2]}
              rotation={[-1.05, 0, k * 0.5]}
              castShadow
            >
              <capsuleGeometry args={[than * 0.075, than * 0.8, 3, seg]} />
              <meshToonMaterial color={k === 0 ? long.toi : long.chinh} gradientMap={toonGradient()} />
            </mesh>
          ))}
        </group>
      )}
      {kieu === 'vay' && (
        // Vây đuôi cá chép: hai tấm mỏng chẻ đôi.
        <group position={[0, than * 0.05, than * 0.25]}>
          {([-1, 1] as const).map((b) => (
            <mesh
              key={b}
              position={[0, b * than * 0.3, than * 0.35]}
              rotation={[b * 0.5, 0, 0]}
              scale={[0.28, 1, 1]}
              castShadow
            >
              <sphereGeometry args={[than * 0.55, seg, seg]} />
              <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/** Vệt trên thân: vằn hổ, xoáy âm dương của lợn, vảy cá, ức gà. */
function Vet({
  kieu,
  long,
  than,
  cao,
}: {
  kieu: KieuVet;
  long: BoLong;
  than: number;
  cao: number;
}) {
  switch (kieu) {
    case 'van':
      return (
        <>
          {[0.25, 0.5, 0.75].map((k, i) => (
            <mesh
              key={i}
              position={[0, cao * k, -than * 0.9]}
              rotation={[0, 0, i % 2 ? 0.3 : -0.3]}
            >
              <boxGeometry args={[than * 0.16, cao * 0.1, than * 0.08]} />
              <meshBasicMaterial color={long.toi} />
            </mesh>
          ))}
        </>
      );
    case 'xoay':
      // Xoáy âm dương trên má lợn — asset list §1.2.
      return (
        <mesh position={[than * 0.66, cao * 0.62, -than * 0.5]} rotation={[0, -0.6, 0]}>
          <torusGeometry args={[than * 0.2, than * 0.05, 5, 12, Math.PI * 1.5]} />
          <meshToonMaterial color={long.toi} gradientMap={toonGradient()} />
        </mesh>
      );
    case 'vay':
      return (
        <>
          {[0.3, 0.55, 0.8].map((k, i) => (
            <mesh key={i} position={[0, cao * k, -than * 0.84]} rotation={NAM}>
              <torusGeometry args={[than * (0.5 - i * 0.08), than * 0.035, 4, 10, Math.PI]} />
              <meshBasicMaterial color={long.toi} />
            </mesh>
          ))}
        </>
      );
    case 'uc':
      return (
        <mesh position={[0, cao * 0.55, -than * 0.7]} scale={[0.7, 1.1, 0.3]}>
          <sphereGeometry args={[than * 0.6, 10, 8]} />
          <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
        </mesh>
      );
    default:
      return null;
  }
}

/* ══════════════════════ Con vật ═════════════════════════════════════════ */

export interface ConVatProps {
  /** id avatar; giá trị lạ (emoji của hồ sơ cũ) sẽ lùi về con mặc định. */
  loai: string;
  /** Dùng chung với bàn tay, để cánh tay nối đúng vào cổ tay từng frame. */
  drive: HandDrive;
  tuThe: TuThe;
  /** Số ổn định theo người chơi, để mỗi con thở và nháy mắt lệch nhịp nhau. */
  seed: number;
  /** Màu đội, buộc thành khăn ở cổ — chỗ duy nhất mang màu đội (§3.2). */
  doi: string;
  /** Ngồi ngoài hoặc rớt mạng: lông bạc đi. */
  mo?: boolean;
  chiTiet?: ChiTiet;
  vien?: boolean;
  /** Mốc thời gian vừa bị người chơi chạm vào; null nếu chưa ai chạm. */
  chamLuc?: number | null;
  /** Tỉ lệ mà `PlayerSeat` phóng bàn tay lên — cần để nối cánh tay đúng chỗ. */
  tyLeTay?: number;
  /** Bàn tay — giữ nguyên hệ toạ độ cũ của chỗ ngồi. */
  children?: ReactNode;
}

/**
 * Cổ tay của `Hand.tsx` nằm đâu trong hệ toạ độ chỗ ngồi.
 *
 * Bốn hằng số này ĐỌC RA TỪ `Hand.tsx`: `root.position` của bàn tay là
 * `(0, 0.3 + lift*0.45, -reach*0.62)`, và cẳng tay là một capsule ở z = 0.42.
 * Lấy z = 0.55 để cánh tay của con vật cắm vào giữa cẳng tay chứ không hở khớp.
 * Tất cả nhân thêm `tyLeTay` — tỉ lệ mà `PlayerSeat` phóng bàn tay lên.
 */
const TAY_Y = 0.28;
const TAY_Z = 0.55;
const TAY_LIFT = 0.45;
const TAY_REACH = 0.62;
/** Chiều dài capsule cánh tay lúc chưa kéo giãn. */
const CANH_TAY_GOC = 0.3;

const tmp = new Vector3();

export function ConVat({
  loai,
  drive,
  tuThe,
  seed,
  doi,
  mo = false,
  chiTiet = 'cao',
  vien = false,
  chamLuc = null,
  tyLeTay = 1,
  children,
}: ConVatProps) {
  const id = loaiConVat(loai);
  const ch = CAU_HINH[id] ?? CAU_HINH[LOAI_MAC_DINH]!;
  const long = boLong(id, mo);

  const goc = useRef<Group>(null);
  const than = useRef<Group>(null);
  const co = useRef<Group>(null);
  const dau = useRef<Group>(null);
  const taiTrai = useRef<Group>(null);
  const taiPhai = useRef<Group>(null);
  const duoi = useRef<Group>(null);
  const matTrai = useRef<Mesh>(null);
  const matPhai = useRef<Mesh>(null);
  const canhTay = useRef<Group>(null);
  const xuongTay = useRef<Mesh>(null);
  const momRef = useRef<Group>(null);

  // Trạng thái đã làm mượt, giữ ngoài React để không tạo render nào.
  const d = useMemo(() => ({ nghieng: 0.05, cao: 0, nhun: 0, dau: 0 }), []);
  // Lệch pha theo người chơi: cả sân thở cùng nhịp thì trông như đồ chơi dây.
  const lech = useMemo(() => ((Math.abs(seed) % 100) / 100) * 6.28, [seed]);
  const nhipQuirk = useMemo(() => 5.5 + (Math.abs(seed) % 7) * 0.9, [seed]);

  const dongTai = chiTiet !== 'thap';
  /**
   * Sân đông thì con vật ở xa chỉ cần cập nhật 20 lần/giây thay vì mỗi frame.
   * 30 con nhân với hơi thở, tai, đuôi, nháy mắt và một phép `lookAt` để nối
   * cánh tay là khá nhiều việc cho mỗi frame; mắt thường không thấy khác, mà
   * cả sân lại nhẹ đi hẳn (§15).
   */
  const donDt = useRef(0);
  // Vai mọc ở mép trái thân, ngang tầm hai phần ba chiều cao thân.
  const vai = useMemo<[number, number, number]>(
    () => [-ch.than * 0.46, 0.16 + ch.cao * 0.74, 0.72 - ch.than * 0.34],
    [ch.than, ch.cao],
  );

  useFrame((_, dt) => {
    if (chiTiet === 'thap') {
      donDt.current += dt;
      if (donDt.current < 0.05) return;
    }
    // Bỏ frame thì phải làm mượt bằng đúng khoảng thời gian đã dồn lại, nếu
    // không animation sẽ chậm đi theo tỉ lệ số frame bị bỏ.
    const step = Math.min(donDt.current || dt, 0.1);
    donDt.current = 0;
    const t = Date.now() / 1000;
    const dich = DANG[tuThe];

    d.nghieng = damp(d.nghieng, dich.nghieng, 5, step);
    d.cao = damp(d.cao, dich.cao, 5, step);
    d.nhun = damp(d.nhun, dich.nhun, 6, step);
    d.dau = damp(d.dau, dich.dau, 6, step);

    // Vừa bị chạm vào thì ngẩng lên, nhún một cái rồi trở lại (§ tương tác).
    const cham = chamLuc === null ? 9 : (Date.now() - chamLuc) / 1000;
    const dapLai = cham < 1.2 ? Math.max(0, 1 - cham / 1.2) : 0;

    // Hơi thở — biên độ rất nhỏ nhưng là thứ làm con vật trông còn sống.
    const tho = Math.sin(t * 1.55 + lech);
    // Nhịp tật riêng: chạy 0.7s trong mỗi chu kỳ `nhipQuirk` giây.
    const chuKy = (t + lech) % nhipQuirk;
    const q = chuKy < 0.7 ? Math.sin((chuKy / 0.7) * Math.PI) : 0;

    if (goc.current) {
      goc.current.position.y =
        d.cao + Math.abs(Math.sin(t * 7.5)) * d.nhun * 0.09 + dapLai * 0.05;
    }
    if (than.current) {
      than.current.rotation.x = d.nghieng + tho * 0.018 - dapLai * 0.18;
      than.current.scale.set(1 + tho * 0.015, 1 + tho * 0.022, 1 + tho * 0.015);
      than.current.rotation.z = ch.quirk === 'nhun-nhay' ? q * 0.12 : 0;
    }
    if (dau.current) {
      // Đầu trễ hơn thân một nhịp, nên chồm tới là đầu ngật ra sau rồi mới theo.
      dau.current.rotation.x =
        d.dau + tho * 0.03 - dapLai * 0.42 + (ch.quirk === 'mo-thuc' ? q * 0.7 : 0);
      dau.current.rotation.y =
        Math.sin(t * 0.42 + lech) * 0.14 +
        (ch.quirk === 'rung-rau' ? Math.sin(t * 22) * q * 0.05 : 0);
      dau.current.rotation.z = ch.quirk === 'liem' ? q * 0.5 : 0;
    }
    if (co.current) {
      // Cổ cóc phồng lên xẹp xuống; các con khác chỉ nhô nhẹ theo hơi thở.
      const phong = ch.quirk === 'phong' ? 1 + q * 0.45 : 1 + tho * 0.03;
      co.current.scale.set(phong, phong, phong);
    }
    if (momRef.current) {
      const hit = ch.quirk === 'hit' ? 1 + q * 0.18 : 1;
      momRef.current.scale.set(hit, hit, hit);
    }
    if (dongTai) {
      const vay = Math.sin(t * 2.1 + lech) * 0.1 + dapLai * 0.4;
      if (taiTrai.current) taiTrai.current.rotation.z = vay;
      if (taiPhai.current) taiPhai.current.rotation.z = -vay;
    }
    if (duoi.current) {
      const manh = ch.quirk === 'vay-duoi' ? 0.42 + q * 0.5 : 0.2;
      duoi.current.rotation.y = Math.sin(t * 1.7 + lech) * manh;
      duoi.current.rotation.x = ch.quirk === 'phap-mang' ? q * 0.2 : 0;
    }
    // Nháy mắt: khép rất nhanh, chu kỳ lệch nhau giữa các con.
    const nhay = (t * 0.24 + lech) % 1 > 0.972 ? 0.12 : 1;
    if (matTrai.current) matTrai.current.scale.y = nhay;
    if (matPhai.current) matPhai.current.scale.y = nhay;

    // ── Cánh tay nối vai với cổ tay của bàn tay ──
    // Đọc chính `drive` mà bàn tay đang làm mượt, nên vai và tay không rời nhau.
    if (canhTay.current && xuongTay.current) {
      const wx = 0;
      const wy = (TAY_Y + drive.lift * TAY_LIFT) * tyLeTay;
      const wz = (TAY_Z - drive.reach * TAY_REACH) * tyLeTay;
      const dx = wx - vai[0];
      const dy = wy - vai[1];
      const dz = wz - vai[2];
      const len = Math.max(0.08, Math.hypot(dx, dy, dz));
      canhTay.current.position.set(vai[0] + dx / 2, vai[1] + dy / 2, vai[2] + dz / 2);
      // Ma trận world phải cập nhật trước khi lookAt, vì position vừa đổi.
      canhTay.current.updateWorldMatrix(true, false);
      const parent = canhTay.current.parent;
      if (parent) {
        tmp.set(wx, wy, wz);
        parent.localToWorld(tmp);
        canhTay.current.lookAt(tmp);
      }
      xuongTay.current.scale.y = len / CANH_TAY_GOC;
    }
  });

  const seg = chiTiet === 'cao' ? 12 : chiTiet === 'vua' ? 9 : 6;
  const vienKhoi = vien && chiTiet === 'cao';

  return (
    <group ref={goc}>
      {/* ── Thân: ngồi bệt, hông sát đất ── */}
      <group ref={than} position={[0, 0.16, 0.72]}>
        <Tron
          r={ch.than}
          position={[0, ch.cao * 0.5, 0]}
          scale={[1, (ch.cao * 0.5 + ch.than) / ch.than, 0.92]}
          mau={long.chinh}
          seg={seg}
          vien={vienKhoi}
        />
        {/* Ức sáng hơn, để thân không bẹt thành một khối màu duy nhất. */}
        {chiTiet !== 'thap' && (
          <mesh position={[0, ch.cao * 0.42, -ch.than * 0.6]} scale={[0.66, 0.9, 0.4]}>
            <sphereGeometry args={[ch.than, seg, seg]} />
            <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
          </mesh>
        )}
        {chiTiet === 'cao' && <Vet kieu={ch.vet} long={long} than={ch.than} cao={ch.cao} />}

        {/* ── Cổ và đầu ── */}
        <group ref={co} position={[0, ch.cao + ch.than * 0.34, -ch.than * 0.12]}>
          <Khoi
            args={[ch.dau * 0.42, ch.dau * 0.3, 3, seg]}
            position={THANG}
            rotation={THANG}
            mau={long.chinh}
          />
          <group ref={dau} position={[0, ch.dau * 0.72, -ch.dau * 0.08]}>
            <Tron
              r={ch.dau}
              position={THANG}
              scale={[1, 0.96, 1.02]}
              mau={long.chinh}
              seg={seg}
              vien={vienKhoi}
            />
            <group ref={momRef}>
              <Mom kieu={ch.mom} long={long} dau={ch.dau} chiTiet={chiTiet} />
            </group>
            <group ref={taiTrai}>
              <Tai kieu={ch.tai} long={long} dau={ch.dau} ben={-1} chiTiet={chiTiet} />
            </group>
            <group ref={taiPhai}>
              <Tai kieu={ch.tai} long={long} dau={ch.dau} ben={1} chiTiet={chiTiet} />
            </group>

            {/* Mắt tranh dân gian: tròng đen to, một điểm sáng, không vẽ mí. */}
            {([-1, 1] as const).map((b) => (
              <group
                key={b}
                position={[b * ch.dau * ch.matRong, ch.dau * 0.18, -ch.dau * 0.82]}
              >
                <mesh ref={b === -1 ? matTrai : matPhai}>
                  <sphereGeometry args={[ch.mat, 10, 8]} />
                  <meshBasicMaterial color={MAU.muc} />
                </mesh>
                {chiTiet !== 'thap' && (
                  <mesh position={[-ch.mat * 0.3, ch.mat * 0.34, -ch.mat * 0.7]}>
                    <sphereGeometry args={[ch.mat * 0.34, 6, 5]} />
                    <meshBasicMaterial color={MAU.phan} />
                  </mesh>
                )}
              </group>
            ))}
          </group>
        </group>

        {/* ── Khăn buộc cổ: chỗ duy nhất mang màu đội (§3.2) ── */}
        <mesh
          position={[0, ch.cao + ch.than * 0.24, -ch.than * 0.1]}
          rotation={[0.12, 0, 0]}
        >
          <torusGeometry args={[ch.than * 0.52, ch.than * 0.09, 5, seg]} />
          <meshToonMaterial color={doi} gradientMap={toonGradient()} />
        </mesh>

        <Duoi kieu={ch.duoi} long={long} than={ch.than} chiTiet={chiTiet} refDuoi={duoi} />
      </group>

      {/* ── Hai chân gập kiểu ngồi bệt, đầu gối chìa ra hai bên ── */}
      {([-1, 1] as const).map((b) => (
        <group key={b} position={[b * ch.than * 0.72, 0.11, 0.42]} rotation={[0, b * -0.5, 0]}>
          <Khoi
            args={[ch.than * 0.3, ch.than * 0.5, 3, seg]}
            position={THANG}
            mau={long.chinh}
            vien={vienKhoi}
          />
          {chiTiet !== 'thap' && (
            <mesh position={[0, -ch.than * 0.04, -ch.than * 0.46]} scale={[1, 0.6, 1.15]} castShadow>
              <sphereGeometry args={[ch.than * 0.28, seg, seg]} />
              <meshToonMaterial color={long.toi} gradientMap={toonGradient()} />
            </mesh>
          )}
        </group>
      ))}

      {/* ── Tay trái chống xuống đất ── */}
      {chiTiet !== 'thap' && (
        <group position={[ch.than * 0.92, 0.3, 0.6]} rotation={[0.3, 0, 0.34]}>
          <Khoi
            args={[ch.than * 0.16, 0.3, 3, seg]}
            position={[0, -0.1, 0]}
            rotation={THANG}
            mau={long.chinh}
          />
          <mesh position={[0, -0.26, -0.02]} scale={[1, 0.7, 1.1]} castShadow>
            <sphereGeometry args={[ch.than * 0.22, seg, seg]} />
            <meshToonMaterial color={long.sang} gradientMap={toonGradient()} />
          </mesh>
        </group>
      )}

      {/* ── Cánh tay phải: nối vai với cổ tay, dài ra theo `reach` ── */}
      <group ref={canhTay}>
        <group rotation={NAM}>
          <mesh ref={xuongTay} castShadow>
            <capsuleGeometry args={[ch.than * 0.19, CANH_TAY_GOC, 3, seg]} />
            <meshToonMaterial color={long.chinh} gradientMap={toonGradient()} />
          </mesh>
        </group>
      </group>

      {children}
    </group>
  );
}
