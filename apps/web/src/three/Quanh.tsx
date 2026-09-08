/**
 * Quanh sân — cánh đồng, bụi tre, nhà mái tranh, bến nước, cây nêu, lá rụng.
 *
 * Sân chỉ có vòng tròn vạch trên đất (§9.4) nên rìa khung hình trống trải, nhất
 * là ở khung toàn cảnh. File này lấp phần trống đó bằng một cái làng dựng hoàn
 * toàn từ primitive — cùng triết lý với `ConVat.tsx` và `Hand.tsx`: KHÔNG tải
 * một byte asset nào, đổi buổi/mùa là đổi cả cảnh chỉ bằng bảng màu và cờ bật.
 *
 * Ba luật bất di bất dịch của file này:
 *
 * 1. **Không một vật ĐỨNG nào được ở trong lòng vòng người, và vật cao thì
 *    tránh luôn khoảng +Z gần camera.** Khung `tay` (§6) đặt camera trong lòng
 *    vòng ngoảnh ra nhìn chỗ ngồi của mình, hậu cảnh là mảng đất trống phía +Z —
 *    dựng bụi tre vào đó là che mất nắm tay. Vì thế mọi vật cao đều đứng ở nửa
 *    xa (sin(góc) < 0) hoặc hai bên, cách tâm ít nhất 1,5 lần bán kính vòng.
 *    Ngoại lệ duy nhất là các hạt bay — mưa xuân, lá rụng, cánh hoa, đom đóm:
 *    chúng ĐƯỢC phép trôi qua sân vì mảnh cỡ centimet, che không nổi cái gì.
 *    Mỗi nhóm hạt bay mang tên bắt đầu bằng `hat-` để test phân biệt được
 *    (xem `test/khungCanh.test.tsx`).
 * 2. **Mọi vị trí đều tất định** (dãy số từ `bam`), để cảnh của 30 người trong
 *    cùng một phòng trông giống nhau, không ai thấy bụi tre ở chỗ khác.
 * 3. **Mọi màu đều đi qua `khi`** (xem `troi.ts`), nên không vật nào phát sáng
 *    lạc ra khỏi đêm hay tươi lạc ra khỏi mùa đông.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, type Group } from 'three';
import type { Buoi, Mua } from '../lib/khungCanh.js';
import { facingCenter, SEAT_RADIUS } from './geometry.js';
import { MAU, toonGradient } from './toon.js';
import { pha, theoKhi, type Khi } from './troi.js';

export interface QuanhProps {
  /** Bán kính vòng người ngồi — mọi thứ quanh sân đo theo nó. */
  radius: number;
  buoi: Buoi;
  mua: Mua;
  khi: Khi;
  /** Sân đông thì bớt chi tiết và bớt hạt (§15). */
  nhe?: boolean;
}

/** Toạ độ một vật đứng ở góc `goc`, cách tâm sân `xa`. */
function noi(goc: number, xa: number): [number, number, number] {
  return [Math.cos(goc) * xa, 0, Math.sin(goc) * xa];
}

/** Dãy số giả ngẫu nhiên nhưng tất định — xem luật 2 ở đầu file. */
function bam(i: number, m = 97): number {
  return ((i * 9301 + 49297) % m) / m;
}

/** Người chơi đã xin bớt chuyển động thì gió lặng, không mưa, không lá rơi (§11). */
function itChuyenDong(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ═════════════════════════════ Bụi tre ═════════════════════════════════ */

/**
 * Một bụi tre đầu làng: mấy cây thẳng mọc chụm gốc, ngọn lay theo gió.
 * Lay cả bụi bằng cách nghiêng group quanh gốc chứ không lay từng cây — rẻ hơn
 * và đúng hơn, vì tre trong một bụi thì lay cùng nhau.
 */
function BuiTre({
  goc,
  xa,
  cao,
  mauThan,
  mauLa,
  mauLaToi,
  gio,
  seed,
  thua = false,
  nhe = false,
}: {
  goc: number;
  xa: number;
  cao: number;
  mauThan: string;
  mauLa: string;
  mauLaToi: string;
  gio: number;
  seed: number;
  /** Mùa đông: lá thưa và xác xơ đi. */
  thua?: boolean;
  nhe?: boolean;
}) {
  const g = useRef<Group>(null);
  const than = useMemo(() => {
    const n = nhe ? 4 : 6;
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + seed;
      const r = 0.14 + bam(i + seed * 7, 11) * 0.26;
      return {
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        h: cao * (0.7 + bam(i * 3 + 1, 13) * 0.45),
        nghieng: (bam(i * 5 + 2, 17) - 0.5) * 0.26,
        xoay: a,
      };
    });
  }, [cao, nhe, seed]);

  useFrame(() => {
    if (!g.current) return;
    const t = Date.now() / 1000;
    // Hai nhịp lệch nhau: một cơn gió dài và một cái rung nhỏ trên ngọn.
    g.current.rotation.z =
      (Math.sin(t * 0.42 + seed) * 0.026 + Math.sin(t * 1.7 + seed) * 0.008) * gio;
    g.current.rotation.x = Math.sin(t * 0.31 + seed * 2) * 0.014 * gio;
  });

  return (
    <group ref={g} position={noi(goc, xa)}>
      {than.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[c.nghieng * 0.5, c.xoay, c.nghieng]}>
          <mesh position={[0, c.h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.085, c.h, 5]} />
            <meshToonMaterial color={mauThan} gradientMap={toonGradient()} />
          </mesh>
          {/* Hai chùm lá lệch nhau, đặt thấp xuống dưới ngọn một chút. Nón lá phải to
              hơn thân nhiều lần, không thì cả bụi trông như mấy cái cọc cắm xuống đất.
              Mùa đông tre không trụi hẳn, chỉ vàng đi và thưa lại (`thua`). */}
          <mesh position={[0.07, c.h * 0.86, 0]} rotation={[0, i * 1.1, 0.34]}>
            <coneGeometry args={[thua ? 0.32 : 0.5, thua ? 0.8 : 1.25, 4]} />
            <meshToonMaterial color={mauLa} gradientMap={toonGradient()} />
          </mesh>
          <mesh position={[-0.09, c.h * 0.66, 0.05]} rotation={[0.18, i * 0.7, -0.42]}>
            <coneGeometry args={[thua ? 0.24 : 0.4, thua ? 0.6 : 0.95, 4]} />
            <meshToonMaterial color={mauLaToi} gradientMap={toonGradient()} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════ Cánh đồng ═════════════════════════════════ */

/**
 * Cánh đồng bao quanh sân: một vành màu phẳng ngoài mép sân đất, cộng mấy khóm
 * lúa thấp ở rìa trong cho thấy đó là đồng chứ không phải một vòng sơn.
 *
 * Khóm lúa cố tình thấp (≤ 0,46) để dù người chơi kéo camera sát mặt đất thì
 * cũng không khóm nào che được nắm tay của ai.
 */
function CanhDong({
  radius,
  mauDong,
  mauLua,
  mauBo,
  gat,
  gio,
  nhe,
}: {
  radius: number;
  mauDong: string;
  mauLua: string;
  mauBo: string;
  /** Mùa đông: đồng đã gặt, chỉ còn gốc rạ. */
  gat: boolean;
  gio: number;
  nhe: boolean;
}) {
  const g = useRef<Group>(null);
  const khom = useMemo(() => {
    const n = nhe ? 14 : 26;
    return Array.from({ length: n }, (_, i) => {
      const goc = i * 2.399;
      const xa = radius * (1.55 + bam(i * 11, 23) * 1.6);
      return {
        p: noi(goc, xa),
        cao: gat ? 0.12 + bam(i * 5, 7) * 0.05 : 0.3 + bam(i * 5, 7) * 0.16,
        rong: gat ? 0.09 : 0.075,
        lech: bam(i * 3, 29) * 6.28,
      };
    });
  }, [gat, nhe, radius]);

  useFrame(() => {
    if (!g.current || gat) return;
    const t = Date.now() / 1000;
    // Sóng lúa: cùng một cơn gió chạy qua đồng, mỗi khóm lệch pha một chút.
    g.current.children.forEach((c, i) => {
      c.rotation.z = Math.sin(t * 1.15 + khom[i]!.lech) * 0.16 * gio;
    });
  });

  return (
    <group>
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 1.45, Math.max(17, radius * 4.8), 56, 1]} />
        <meshToonMaterial color={mauDong} gradientMap={toonGradient()} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 1.42, radius * 1.5, 56, 1]} />
        <meshBasicMaterial color={mauBo} transparent opacity={0.5} side={DoubleSide} />
      </mesh>
      <group ref={g}>
        {khom.map((k, i) => (
          <mesh key={i} position={[k.p[0], k.cao / 2, k.p[2]]}>
            <coneGeometry args={[k.rong, k.cao, 4]} />
            <meshToonMaterial color={mauLua} gradientMap={toonGradient()} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ═════════════════════════ Nhà mái tranh ═══════════════════════════════ */

/** Nhà tranh cuối sân: vách đất, mái rơm bốn dốc, một khoảng cửa tối. */
function NhaTranh({
  goc,
  xa,
  mauVach,
  mauTranh,
  mauToi,
}: {
  goc: number;
  xa: number;
  mauVach: string;
  mauTranh: string;
  mauToi: string;
}) {
  return (
    <group position={noi(goc, xa)} rotation={[0, facingCenter(goc), 0]}>
      <mesh position={[0, 0.66, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 1.32, 2.3]} />
        <meshToonMaterial color={mauVach} gradientMap={toonGradient()} />
      </mesh>
      <mesh position={[0, 1.98, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.1, 1.36, 4]} />
        <meshToonMaterial color={mauTranh} gradientMap={toonGradient()} />
      </mesh>
      {/* Khoảng cửa để trống: nhìn vào trong nhà thì tối. */}
      <mesh position={[0, 0.52, -1.17]}>
        <boxGeometry args={[0.78, 1.04, 0.06]} />
        <meshBasicMaterial color={mauToi} />
      </mesh>
      {/* Hai cột hiên bằng tre. */}
      {[-1.3, 1.3].map((x) => (
        <mesh key={x} position={[x, 0.62, -1.32]}>
          <cylinderGeometry args={[0.06, 0.07, 1.24, 5]} />
          <meshToonMaterial color={mauTranh} gradientMap={toonGradient()} />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════ Đêm: trăng, sao ════════════════════════════ */

/**
 * Trăng và sao. Cả hai đều tắt sương (`fog={false}`): sương của cảnh chỉ dày
 * tới khoảng 20 đơn vị, còn trăng đứng xa hơn thế nhiều nên nếu ăn sương thì nó
 * tan hẳn vào màu trời và mất luôn.
 *
 * Trăng treo thấp, ngay trên rặng tre chứ không giữa đỉnh trọi: khung hình của mọi
 * phase (§6) đều chúc xuống nhìn vòng tròn, nên dải trời trong khung chỉ còn một vệt
 * mỏng sát chân trời. Treo trăng cao lên là không ai thấy nó nữa, trừ lúc tự kéo
 * camera ngửa hẳn lên.
 */
function TrangSao({ dong, nhe }: { dong: number; nhe: boolean }) {
  const sao = useMemo(() => {
    const n = nhe ? 9 : 16;
    return Array.from({ length: n }, (_, i) => {
      const goc = i * 2.399 + 0.6;
      const cao = 5 + bam(i * 7, 19) * 8;
      const xa = 15 + bam(i * 13, 11) * 7;
      return {
        p: [Math.cos(goc) * xa, cao, Math.sin(goc) * xa - 4] as [number, number, number],
        r: 0.06 + bam(i * 3, 5) * 0.05,
        mo: 0.4 + bam(i * 5, 7) * 0.5,
      };
    });
  }, [nhe]);

  return (
    <group scale={dong}>
      <mesh position={[-6.5, 6.4, -15]}>
        <sphereGeometry args={[0.95, 14, 10]} />
        <meshBasicMaterial color="#F6F1E4" fog={false} />
      </mesh>
      {/* Quầng trăng: một quả cầu to hơn, mờ, cũng không ăn sáng. */}
      <mesh position={[-6.5, 6.4, -15]}>
        <sphereGeometry args={[1.85, 12, 8]} />
        <meshBasicMaterial color="#DCE6FF" transparent opacity={0.13} fog={false} />
      </mesh>
      {sao.map((s, i) => (
        <mesh key={i} position={s.p}>
          <sphereGeometry args={[s.r, 5, 4]} />
          <meshBasicMaterial color="#F6F1E4" transparent opacity={s.mo} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════ Đêm: bến nước ═════════════════════════════ */

/** Bến nước đầu làng: mặt ao soi trăng, ba bậc đá, một tấm cầu ao. */
function BenNuoc({
  goc,
  xa,
  mauNuoc,
  mauDa,
  lang,
}: {
  goc: number;
  xa: number;
  mauNuoc: string;
  mauDa: string;
  /** Lặng gió thì mặt nước không gợn. */
  lang: boolean;
}) {
  const g = useRef<Group>(null);

  useFrame(() => {
    if (!g.current || lang) return;
    const t = Date.now() / 1000;
    /* Vệt trăng trên mặt nước tãi ra rồi co lại theo gió. Đây là chuyển động
       duy nhất của bến nước, và là thứ nói cho người chơi biết đó là nước chứ
       không phải một mảng đá đen. */
    g.current.children.forEach((c, i) => {
      c.scale.x = 1 + Math.sin(t * 0.9 + i * 1.7) * 0.28;
      c.position.z = i * 0.42 + Math.sin(t * 0.6 + i) * 0.06;
    });
  });

  return (
    <group position={noi(goc, xa)} rotation={[0, facingCenter(goc), 0]}>
      <mesh position={[0, 0.012, -0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.1, 28]} />
        <meshBasicMaterial color={mauNuoc} />
      </mesh>
      <group ref={g} position={[0, 0.02, -1.4]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0, i * 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.1 - i * 0.18, 0.07]} />
            <meshBasicMaterial color="#DCE6FF" transparent opacity={0.3 - i * 0.06} fog={false} />
          </mesh>
        ))}
      </group>
      {/* Ba bậc đá xuống bến, bậc dưới thấp gần ngang mặt nước. */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.1 - i * 0.07, -1.6 - i * 0.34]} receiveShadow>
          <boxGeometry args={[1.5 - i * 0.16, 0.14, 0.32]} />
          <meshToonMaterial color={mauDa} gradientMap={toonGradient()} />
        </mesh>
      ))}
      {/* Cầu ao: một tấm gỗ gác ra mặt nước. */}
      <mesh position={[0.9, 0.14, -0.9]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[0.42, 0.07, 1.8]} />
        <meshToonMaterial color={mauDa} gradientMap={toonGradient()} />
      </mesh>
    </group>
  );
}

/** Đom đóm lập lờ ngoài vòng sáng — chỉ có ở đêm hè và đêm thu. */
function DomDom({ radius, nhe }: { radius: number; nhe: boolean }) {
  const g = useRef<Group>(null);
  const hat = useMemo(() => {
    const n = nhe ? 7 : 13;
    return Array.from({ length: n }, (_, i) => {
      const goc = i * 2.399 + 1.1;
      const xa = radius * (1.5 + bam(i * 7, 13) * 1.3);
      return {
        p: [Math.cos(goc) * xa, 0.4 + bam(i * 5, 11) * 1.1, Math.sin(goc) * xa] as [
          number,
          number,
          number,
        ],
        nhip: 0.7 + bam(i * 3, 7) * 1.3,
        lech: bam(i * 11, 29) * 6.28,
      };
    });
  }, [nhe, radius]);

  useFrame(() => {
    if (!g.current) return;
    const t = Date.now() / 1000;
    g.current.children.forEach((c, i) => {
      const h = hat[i]!;
      c.position.y = h.p[1] + Math.sin(t * h.nhip + h.lech) * 0.22;
      c.position.x = h.p[0] + Math.cos(t * h.nhip * 0.6 + h.lech) * 0.3;
      const m = (c as unknown as { material: { opacity: number } }).material;
      // Nhấp nháy: sáng bùng lên rồi tắt hẳn, không mờ dần đều.
      m.opacity = Math.max(0, Math.sin(t * 2.1 + h.lech)) ** 3;
    });
  });

  return (
    <group ref={g} name="hat-dom-dom">
      {hat.map((h, i) => (
        <mesh key={i} position={h.p}>
          <sphereGeometry args={[0.035, 6, 5]} />
          <meshBasicMaterial color={MAU.nghe} transparent opacity={0.6} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════ Mùa xuân ══════════════════════════════════ */

/** Mưa xuân: hạt nhỏ, rơi chậm, chếch theo gió, không đủ nặng để ai phải chạy. */
function MuaXuan({ radius, mau, nhe }: { radius: number; mau: string; nhe: boolean }) {
  const g = useRef<Group>(null);
  const cao = 5;
  const hat = useMemo(() => {
    const n = nhe ? 22 : 44;
    return Array.from({ length: n }, (_, i) => {
      const goc = i * 2.399;
      /* Ngoài vòng ngưỡi, y như mọi hạt khác: khung `tay` đặt camera trong lòng
         vòng, hạt nào rơi trong đó là rơi ngay trước ống kính — một hạt mưa
         8mm ở cách 30cm thì to bằng cả cái nhà tranh ở xa. */
      const xa = radius * (1.15 + bam(i * 13, 31) * 2.1);
      return {
        p: [Math.cos(goc) * xa, bam(i * 7, 41) * cao, Math.sin(goc) * xa] as [
          number,
          number,
          number,
        ],
        nhanh: 1.5 + bam(i * 5, 11) * 1.1,
      };
    });
  }, [nhe, radius]);

  useFrame((_, dt) => {
    if (!g.current) return;
    const b = Math.min(dt, 0.05);
    g.current.children.forEach((c, i) => {
      c.position.y -= hat[i]!.nhanh * b;
      if (c.position.y < 0.05) c.position.y = cao;
    });
  });

  return (
    <group ref={g} name="hat-mua">
      {hat.map((h, i) => (
        <mesh key={i} position={h.p} rotation={[0, 0, 0.16]}>
          <boxGeometry args={[0.008, 0.22, 0.008]} />
          <meshBasicMaterial color={mau} transparent opacity={0.34} />
        </mesh>
      ))}
    </group>
  );
}

/** Cây đào: gốc khẳng khiu, hoa chấm hồng, cánh rụng lả tả xuống đất. */
function HoaDao({
  goc,
  xa,
  mauGo,
  mauHoa,
  gio,
  lang,
}: {
  goc: number;
  xa: number;
  mauGo: string;
  mauHoa: string;
  gio: number;
  lang: boolean;
}) {
  const canh = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        return {
          xoay: a,
          nghieng: 0.5 + bam(i * 7, 11) * 0.35,
          dai: 0.85 + bam(i * 3, 13) * 0.4,
          cao: 1 + bam(i * 5, 7) * 0.5,
        };
      }),
    [],
  );
  const canhHoa = useRef<Group>(null);

  useFrame((_, dt) => {
    if (!canhHoa.current || lang) return;
    const t = Date.now() / 1000;
    const b = Math.min(dt, 0.05);
    canhHoa.current.children.forEach((c, i) => {
      c.position.y -= (0.24 + (i % 3) * 0.06) * b;
      c.position.x += Math.sin(t * 0.8 + i) * 0.004 * gio;
      c.rotation.z += 0.8 * b;
      if (c.position.y < 0.03) c.position.y = 2.4;
    });
  });

  return (
    <group position={noi(goc, xa)}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.16, 1.7, 6]} />
        <meshToonMaterial color={mauGo} gradientMap={toonGradient()} />
      </mesh>
      {canh.map((c, i) => (
        <group key={i} rotation={[0, c.xoay, 0]}>
          <mesh position={[c.dai * 0.4, c.cao + 0.45, 0]} rotation={[0, 0, -c.nghieng]}>
            <cylinderGeometry args={[0.03, 0.06, c.dai, 5]} />
            <meshToonMaterial color={mauGo} gradientMap={toonGradient()} />
          </mesh>
          {/* Hai chùm hoa mỗi cành — hoa đào nở thành chùm, không rải đều. */}
          <mesh position={[c.dai * 0.78, c.cao + 0.72, 0]}>
            <sphereGeometry args={[0.26, 7, 5]} />
            <meshToonMaterial color={mauHoa} gradientMap={toonGradient()} />
          </mesh>
          <mesh position={[c.dai * 0.5, c.cao + 0.95, 0.12]}>
            <sphereGeometry args={[0.18, 6, 5]} />
            <meshToonMaterial color={mauHoa} gradientMap={toonGradient()} />
          </mesh>
        </group>
      ))}
      <group ref={canhHoa} name="hat-canh-hoa">
        {Array.from({ length: 7 }, (_, i) => (
          <mesh
            key={i}
            position={[
              (bam(i * 7, 19) - 0.5) * 1.8,
              0.2 + bam(i * 5, 23) * 2.2,
              (bam(i * 11, 17) - 0.5) * 1.8,
            ]}
            rotation={[1.2, 0, bam(i * 3, 13) * 6.28]}
          >
            <planeGeometry args={[0.09, 0.06]} />
            <meshBasicMaterial color={mauHoa} side={DoubleSide} transparent opacity={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Cây nêu dựng Tết: một cây tre cao vống, ngọn treo giỏ tre và cờ đỏ, thân treo
 * dây pháo. Cờ lật theo gió. Đây là vật cao nhất của cả cảnh nên cố ý dựng lệch
 * hẳn sang một bên, không cắt ngang khung hình nào.
 */
function CayNeu({
  goc,
  xa,
  mauTre,
  mauDo,
  mauLa,
  gio,
  lang,
}: {
  goc: number;
  xa: number;
  mauTre: string;
  mauDo: string;
  mauLa: string;
  gio: number;
  lang: boolean;
}) {
  const co = useRef<Group>(null);

  useFrame(() => {
    if (!co.current || lang) return;
    const t = Date.now() / 1000;
    co.current.rotation.y = Math.sin(t * 1.3) * 0.5 * gio;
    co.current.rotation.z = Math.sin(t * 0.9 + 1) * 0.12 * gio;
  });

  return (
    <group position={noi(goc, xa)}>
      <mesh position={[0, 2.3, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.09, 4.6, 6]} />
        <meshToonMaterial color={mauTre} gradientMap={toonGradient()} />
      </mesh>
      {/* Túm lá chừa lại trên ngọn theo lệ dựng nêu. */}
      <mesh position={[0, 4.66, 0]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.3, 0.75, 4]} />
        <meshToonMaterial color={mauLa} gradientMap={toonGradient()} />
      </mesh>
      {/* Giỏ tre treo dưới ngọn. */}
      <mesh position={[0, 4.02, 0]}>
        <cylinderGeometry args={[0.16, 0.12, 0.24, 8]} />
        <meshToonMaterial color={mauTre} gradientMap={toonGradient()} />
      </mesh>
      <group ref={co} position={[0, 3.86, 0]}>
        <mesh position={[0.3, -0.1, 0]}>
          <planeGeometry args={[0.56, 0.38]} />
          <meshBasicMaterial color={mauDo} side={DoubleSide} />
        </mesh>
      </group>
      {/* Dây pháo treo dọc thân. */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0.13, 3.5 - i * 0.19, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.14, 5]} />
          <meshToonMaterial color={mauDo} gradientMap={toonGradient()} />
        </mesh>
      ))}
    </group>
  );
}

/** Xác pháo rải trên đất sau đêm giao thừa — vệt màu duy nhất của mùa xuân. */
function XacPhao({ radius, mau }: { radius: number; mau: string }) {
  const manh = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const goc = i * 2.399 + 0.3;
        const xa = radius * (1.12 + bam(i * 13, 19) * 0.7);
        return {
          p: [Math.cos(goc) * xa, 0.007 + i * 0.0001, Math.sin(goc) * xa] as [
            number,
            number,
            number,
          ],
          r: 0.03 + bam(i * 5, 7) * 0.045,
          xoay: bam(i * 3, 11) * 6.28,
        };
      }),
    [radius],
  );

  return (
    <group>
      {manh.map((m, i) => (
        <mesh key={i} position={m.p} rotation={[-Math.PI / 2, 0, m.xoay]}>
          <circleGeometry args={[m.r, 5]} />
          <meshBasicMaterial color={mau} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════ Mùa hè & mùa thu ══════════════════════════ */

/** Mây trắng trôi rất chậm trên trời cao. Tắt sương như trăng, và cùng lý do. */
function MayTrang({ dong, cao, nhe }: { dong: number; cao: number; nhe: boolean }) {
  const g = useRef<Group>(null);
  const dam = useMemo(() => {
    const n = nhe ? 2 : 3;
    return Array.from({ length: n }, (_, i) => ({
      p: [-10 + i * 9, cao + bam(i * 7, 11) * 2.4, -13 - bam(i * 5, 13) * 6] as [
        number,
        number,
        number,
      ],
      to: 1.5 + bam(i * 3, 7) * 0.9,
      nhanh: 0.14 + bam(i * 11, 17) * 0.12,
    }));
  }, [cao, nhe]);

  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.children.forEach((c, i) => {
      c.position.x += dam[i]!.nhanh * Math.min(dt, 0.05);
      if (c.position.x > 22) c.position.x = -22;
    });
  });

  return (
    <group ref={g} scale={dong}>
      {dam.map((d, i) => (
        <group key={i} position={d.p} scale={d.to}>
          {[
            [0, 0, 0, 1],
            [1.1, 0.16, 0.2, 0.78],
            [-1.05, 0.1, -0.15, 0.7],
            [0.5, 0.45, 0, 0.6],
          ].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x!, y!, z!]}>
              <sphereGeometry args={[r!, 8, 6]} />
              <meshBasicMaterial color="#F6F1E4" transparent opacity={0.9} fog={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Lá rụng mùa thu: mấy chiếc còn xoay trong không khí, số còn lại đã nằm đất. */
function LaRung({
  radius,
  mau,
  gio,
  lang,
  nhe,
}: {
  radius: number;
  mau: readonly string[];
  gio: number;
  lang: boolean;
  nhe: boolean;
}) {
  const bay = useRef<Group>(null);
  const cao = 3.4;
  const dangBay = useMemo(() => {
    const n = nhe ? 8 : 15;
    return Array.from({ length: n }, (_, i) => {
      const goc = i * 2.399;
      // Ngoài vòng ngưỡi — cùng lý do như mưa xuân.
      const xa = radius * (1.15 + bam(i * 13, 29) * 1.9);
      return {
        p: [Math.cos(goc) * xa, bam(i * 7, 37) * cao, Math.sin(goc) * xa] as [
          number,
          number,
          number,
        ],
        roi: 0.3 + bam(i * 5, 11) * 0.28,
        xoay: 0.9 + bam(i * 3, 7) * 1.4,
        mau: mau[i % mau.length]!,
      };
    });
  }, [mau, nhe, radius]);

  const daRoi = useMemo(
    () =>
      Array.from({ length: nhe ? 8 : 16 }, (_, i) => {
        const goc = i * 2.399 + 0.9;
        const xa = radius * (1.1 + bam(i * 11, 23) * 1.1);
        return {
          p: [Math.cos(goc) * xa, 0.007 + i * 0.0001, Math.sin(goc) * xa] as [
            number,
            number,
            number,
          ],
          xoay: bam(i * 5, 13) * 6.28,
          mau: mau[(i + 1) % mau.length]!,
        };
      }),
    [mau, nhe, radius],
  );

  useFrame((_, dt) => {
    if (!bay.current || lang) return;
    const t = Date.now() / 1000;
    const b = Math.min(dt, 0.05);
    bay.current.children.forEach((c, i) => {
      const l = dangBay[i]!;
      c.position.y -= l.roi * b;
      // Lá không rơi thẳng: nó chao qua chao lại, càng gió càng chao rộng.
      c.position.x = l.p[0] + Math.sin(t * 0.9 + i) * 0.42 * gio;
      c.position.z = l.p[2] + Math.cos(t * 0.7 + i) * 0.3 * gio;
      c.rotation.x += l.xoay * b;
      c.rotation.z += l.xoay * 0.7 * b;
      if (c.position.y < 0.04) c.position.y = cao;
    });
  });

  return (
    <group name="hat-la">
      <group ref={bay}>
        {dangBay.map((l, i) => (
          <mesh key={i} position={l.p} rotation={[bam(i, 7) * 3, 0, bam(i * 3, 11) * 3]}>
            <planeGeometry args={[0.17, 0.1]} />
            <meshBasicMaterial color={l.mau} side={DoubleSide} />
          </mesh>
        ))}
      </group>
      {daRoi.map((l, i) => (
        <mesh key={i} position={l.p} rotation={[-Math.PI / 2, 0, l.xoay]}>
          <planeGeometry args={[0.17, 0.1]} />
          <meshBasicMaterial color={l.mau} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════ Mùa đông ══════════════════════════════════ */

/** Cây trụi lá: chỉ còn gốc và cành khô chĩa lên trời. */
function CayTrui({ goc, xa, mauGo, cao }: { goc: number; xa: number; mauGo: string; cao: number }) {
  const canh = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        return {
          xoay: a,
          nghieng: 0.42 + bam(i * 7, 13) * 0.4,
          dai: cao * (0.32 + bam(i * 3, 11) * 0.24),
          cao: cao * (0.55 + bam(i * 5, 7) * 0.4),
        };
      }),
    [cao],
  );

  return (
    <group position={noi(goc, xa)}>
      <mesh position={[0, cao * 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.2, cao * 0.85, 6]} />
        <meshToonMaterial color={mauGo} gradientMap={toonGradient()} />
      </mesh>
      {canh.map((c, i) => (
        <group key={i} rotation={[0, c.xoay, 0]}>
          <mesh position={[c.dai * 0.42, c.cao, 0]} rotation={[0, 0, -c.nghieng]}>
            <cylinderGeometry args={[0.02, 0.055, c.dai, 4]} />
            <meshToonMaterial color={mauGo} gradientMap={toonGradient()} />
          </mesh>
          <mesh
            position={[c.dai * 0.78, c.cao + c.dai * 0.32, 0]}
            rotation={[0, 0, -c.nghieng - 0.5]}
          >
            <cylinderGeometry args={[0.012, 0.028, c.dai * 0.6, 4]} />
            <meshToonMaterial color={mauGo} gradientMap={toonGradient()} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Sương lạnh đọng thấp trên mặt đất, quay rất chậm — cái rét của mùa đông. */
function SuongLanh({ radius, mau, lang }: { radius: number; mau: string; lang: boolean }) {
  const g = useRef<Group>(null);

  useFrame(() => {
    if (!g.current || lang) return;
    const t = Date.now() / 1000;
    g.current.rotation.y = t * 0.014;
    g.current.children.forEach((c, i) => {
      c.position.y = 0.22 + i * 0.16 + Math.sin(t * 0.3 + i) * 0.05;
    });
  });

  return (
    <group ref={g}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.22 + i * 0.16, 0]} rotation={[-Math.PI / 2, 0, i * 0.7]}>
          <ringGeometry args={[radius * (1.3 + i * 0.35), radius * (3 + i * 0.5), 40, 1]} />
          <meshBasicMaterial
            color={mau}
            transparent
            opacity={0.16 - i * 0.035}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════════ Cả cái làng ════════════════════════════ */

export function Quanh({ radius, buoi, mua, khi, nhe = false }: QuanhProps) {
  const dong = radius / SEAT_RADIUS;
  const lang = itChuyenDong();
  const gio = lang ? 0 : khi.gio;
  const dem = buoi === 'toi';

  // Màu vật thể đều lấy từ bảng màu của khí trời, nên đổi mùa hay đổi buổi là
  // cả cái làng đổi theo, không phải sửa từng chỗ.
  const mauTre = pha(khi.la.chinh, MAU.tre, 0.42);
  const mauGo = pha(khi.dat.toi, MAU.muc, 0.25);
  const mauDong =
    mua === 'thu'
      ? pha(khi.la.chinh, theoKhi(MAU.nghe, buoi), 0.5)
      : mua === 'dong'
        ? pha(khi.dat.sang, khi.la.toi, 0.42)
        : khi.la.chinh;
  const mauLua = pha(mauDong, khi.nangMau, 0.22);
  const laThu = useMemo(
    () => [theoKhi(MAU.nghe, buoi), theoKhi(MAU.dieu, buoi), khi.la.chinh] as const,
    [buoi, khi.la.chinh],
  );

  return (
    <group>
      <CanhDong
        radius={radius}
        mauDong={mauDong}
        mauLua={mauLua}
        mauBo={khi.dat.toi}
        gat={mua === 'dong'}
        gio={gio}
        nhe={nhe}
      />

      {/* Bụi tre và nhà tranh đứng ở nửa xa của sân — luật 1 ở đầu file. */}
      <BuiTre
        goc={4.35}
        xa={radius * 1.62}
        cao={2.7}
        mauThan={mauTre}
        mauLa={khi.la.chinh}
        mauLaToi={khi.la.toi}
        gio={gio}
        seed={1}
        thua={mua === 'dong'}
        nhe={nhe}
      />
      <BuiTre
        goc={5.55}
        xa={radius * 1.78}
        cao={2.3}
        mauThan={mauTre}
        mauLa={khi.la.chinh}
        mauLaToi={khi.la.toi}
        gio={gio}
        seed={2}
        thua={mua === 'dong'}
        nhe={nhe}
      />
      {!nhe && (
        <BuiTre
          goc={2.72}
          xa={radius * 1.7}
          cao={2.5}
          mauThan={mauTre}
          mauLa={khi.la.chinh}
          mauLaToi={khi.la.toi}
          gio={gio}
          seed={3}
          thua={mua === 'dong'}
        />
      )}

      <NhaTranh
        goc={4.95}
        xa={radius * 2.15}
        mauVach={pha(khi.dat.chinh, MAU.tre, 0.3)}
        mauTranh={theoKhi(MAU.tranh, buoi)}
        mauToi={pha(khi.dat.toi, MAU.muc, 0.55)}
      />

      {dem && <TrangSao dong={dong} nhe={nhe} />}
      {dem && (
        <BenNuoc
          goc={5.15}
          xa={radius * 2.5}
          mauNuoc={pha(khi.troi, MAU.cham, 0.55)}
          mauDa={pha(khi.dat.toi, khi.troi, 0.35)}
          lang={lang}
        />
      )}
      {dem && (mua === 'ha' || mua === 'thu') && <DomDom radius={radius} nhe={nhe} />}

      {mua === 'xuan' && (
        <>
          {!lang && <MuaXuan radius={radius} mau={pha(MAU.giay, khi.troi, 0.35)} nhe={nhe} />}
          <HoaDao
            goc={0.28}
            xa={radius * 1.55}
            mauGo={mauGo}
            mauHoa={theoKhi('#EDA9B6', buoi)}
            gio={gio}
            lang={lang}
          />
          <CayNeu
            goc={3.28}
            xa={radius * 1.5}
            mauTre={mauTre}
            mauDo={theoKhi(MAU.dieu, buoi)}
            mauLa={khi.la.chinh}
            gio={gio}
            lang={lang}
          />
          <XacPhao radius={radius} mau={theoKhi(MAU.dieu, buoi)} />
        </>
      )}

      {!dem && mua === 'ha' && <MayTrang dong={dong} cao={4.6} nhe={nhe} />}
      {/* Thu: trời cao hơn nên mây mỏng và dạt lên cao hẳn. */}
      {!dem && mua === 'thu' && <MayTrang dong={dong} cao={6.8} nhe={nhe} />}
      {mua === 'thu' && <LaRung radius={radius} mau={laThu} gio={gio} lang={lang} nhe={nhe} />}

      {mua === 'dong' && (
        <>
          <CayTrui goc={4.6} xa={radius * 1.52} mauGo={mauGo} cao={3.2} />
          {!nhe && <CayTrui goc={2.95} xa={radius * 1.66} mauGo={mauGo} cao={2.6} />}
          <SuongLanh radius={radius} mau={pha(khi.troi, MAU.giay, 0.3)} lang={lang} />
        </>
      )}
    </group>
  );
}
