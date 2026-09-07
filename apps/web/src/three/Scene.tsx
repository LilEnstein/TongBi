/**
 * Sân đất trước hiên nhà tranh — art direction §9.4: không có bàn, cả bọn ngồi
 * bệt quanh một vòng tròn vạch bằng que, mỗi đứa là một con vật tranh dân gian.
 *
 * Mỗi phase có một khung hình riêng (§6 hướng A) và ánh sáng đổi theo khung giờ
 * của phase (§2) — đó là cách kể chuyện chính của game. Người chơi kéo được để
 * xoay quanh sân, nhưng đó chỉ là độ lệch cộng thêm lên khung của phase và bị
 * thả lại mỗi lần sang phase mới, nên khung hình vẫn kể được câu chuyện.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3, type Group, type PerspectiveCamera as TPerspectiveCamera } from 'three';
import {
  buildDiceFaces,
  GamePhase,
  revealStepMs,
  type DiceOutcome,
  type PublicRoomState,
} from '@tongbi/game-rules';
import { PlayerSeat } from './PlayerSeat.js';
import { San } from './San.js';
import { Dice } from './Dice.js';
import { seatAngle, seatRadius, SEAT_RADIUS } from './geometry.js';
import { MAU } from './toon.js';
import type { ChiTiet } from './ConVat.js';
import { sfx } from '../audio/sfx.js';
import type { RevealCue } from '../net/store.js';

interface SceneProps {
  room: PublicRoomState;
  localPlayerId: string | null;
  /** Số bi chính mình đã chọn (server chỉ gửi riêng cho mình). */
  mySelection: number | null;
  revealCue: RevealCue | null;
  diceOutcome: DiceOutcome | null;
  diceStartedAt: number | null;
  /**
   * Đổi giá trị này để kéo camera về đúng khung hình của phase. Dùng cho nút
   * "về chỗ cũ" sau khi người chơi tự xoay sân đi.
   */
  veKhungLuc?: number;
  /** Báo lên trên khi người chơi đã tự xoay camera, để hiện nút về chỗ cũ. */
  onTuXoay?: (daXoay: boolean) => void;
}

/** Re-render nhẹ theo nhịp để các mốc thời gian (mở tay, bi bay) được cập nhật. */
function useAnimationTick(active: boolean, hz = 12): void {
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => force((n) => n + 1), 1000 / hz);
    return () => clearInterval(id);
  }, [active, hz]);
}

interface Shot {
  pos: [number, number, number];
  target: [number, number, number];
  /** Tiêu cự: số nhỏ = ống kính dài, nén hậu cảnh lại (§9.4 Player Focus). */
  fov: number;
  /** Nghiêng ngang khung hình, radian. */
  nghieng?: number;
  /** Lùi thêm bao nhiêu lần khi màn hình dọc — khung cận tay gần như không lùi. */
  lui: number;
  /**
   * Hạ tầm nhìn xuống bấy nhiêu radian để chủ thể nổi lên nửa trên màn hình,
   * chừa nửa dưới cho panel giấy dó trong tầm ngón cái (§15).
   */
  lech: number;
  /**
   * Khung này ngắm vào chỗ ngồi của chính mình chứ không phải tâm sân.
   *
   * Với các khung đó, `pos.z` và `target.z` được tính TỪ chỗ ngồi (luôn nằm ở
   * `z = radius` vì `seatAngle` xoay người chơi hiện tại xuống mép gần camera),
   * và không nhân theo `dong`: cỡ một con vật trong khung hình thì không nên
   * đổi theo việc sân có 3 hay 30 đứa. `pos.z` âm là camera đứng trong lòng
   * vòng, ngoảnh lại nhìn chỗ ngồi.
   */
  theoGhe?: boolean;
}

const KHUNG_HINH: Record<string, Shot> = {
  // Cao ngang tầm mắt trẻ con ngồi xổm, nghiêng ~35°, thấy hết vòng tròn.
  toan: { pos: [0, 3.7, 5.4], target: [0, 0.3, 0.3], fov: 46, lui: 1.5, lech: 0.12 },
  // Khung cận của chính mình. Camera đứng TRONG lòng vòng, chếch sang một bên,
  // ngoảnh lại nhìn chỗ ngồi của mình — thấy mặt con vật và nắm tay nó đang
  // chìa vào giữa sân, hậu cảnh là đất trống ngoài vòng nên rất sạch.
  // (Hồi chỗ ngồi chỉ có bàn tay thì khung này đứng ngoài vòng ngắm vào; giờ có
  // thân con vật ngồi phía sau bàn tay, đứng ngoài chỉ thấy cái lưng.)
  tay: {
    pos: [1.3, 1.45, -2.9],
    target: [0, 0.6, 0.6],
    fov: 38,
    lui: 1.2,
    lech: 0.06,
    theoGhe: true,
  },
  // Mở tay: lùi lại một chút cho cả vòng cùng vào khung.
  mo: { pos: [0, 3.2, 4.5], target: [0, 0.3, 0], fov: 44, lui: 1.45, lech: 0.14 },
  // Xúc xắc lăn về phía camera, camera gần sát mặt đất.
  xucXac: { pos: [0, 0.85, 2.7], target: [0, 0.32, 0], fov: 40, lui: 1.3, lech: 0.2 },
  // Kéo ra nhanh, nghiêng nhẹ 4° — bụi đất bay lên bắt sáng.
  ketQua: { pos: [0, 4.0, 5.6], target: [0, 0.28, 0], fov: 50, nghieng: 0.07, lui: 1.45, lech: 0.12 },
};

function khungTheoPhase(phase: GamePhase): keyof typeof KHUNG_HINH {
  switch (phase) {
    case GamePhase.SELECT_MARBLES:
    case GamePhase.CLOSE_HAND:
      return 'tay';
    case GamePhase.GUESS_TOTAL:
      return 'toan';
    case GamePhase.REVEAL:
      return 'mo';
    case GamePhase.DICE_ROLL:
      return 'xucXac';
    case GamePhase.ROUND_RESULT:
    case GamePhase.GAME_OVER:
      return 'ketQua';
    default:
      return 'toan';
  }
}

/** Mặt trời của từng khung giờ — §2. Hướng, màu và độ gắt đều đổi. */
interface Nang {
  huong: [number, number, number];
  mau: string;
  manh: number;
  troi: string;
}

function nangTheoPhase(phase: GamePhase): Nang {
  switch (phase) {
    case GamePhase.WAITING:
    case GamePhase.ROUND_START:
      // 8–10h: nắng nghiêng, còn dịu.
      return { huong: [4.6, 4.2, 3.6], mau: '#FFF6E0', manh: 1.15, troi: '#C08A48' };
    case GamePhase.GUESS_TOTAL:
    case GamePhase.REVEAL:
    case GamePhase.ROUND_RESULT:
      // 12h: nắng gắt nhất, bóng ngắn, tương phản cao.
      return { huong: [0.9, 8.2, 1.5], mau: '#FFF8DC', manh: 1.75, troi: '#C89152' };
    case GamePhase.DICE_ROLL:
      // 15h: nắng chếch, bóng dài.
      return { huong: [-4.8, 4.0, 3.2], mau: '#FFD79A', manh: 1.35, troi: '#B87C3E' };
    case GamePhase.GAME_OVER:
      // 17h30: hoàng hôn, khói bếp.
      return { huong: [-6.2, 2.2, 2.6], mau: '#F2A65A', manh: 1.0, troi: '#9E6430' };
    default:
      // 10h: nắng đứng, rõ ràng, sẵn sàng.
      return { huong: [3.2, 6.5, 4.0], mau: '#FFF1CE', manh: 1.45, troi: '#C08A48' };
  }
}

/**
 * Giới hạn khi người chơi tự xoay sân.
 *
 * `pitch` là góc cực tính từ trục +Y: nhỏ là nhìn từ trên xuống, lớn là sát
 * mặt đất. Chặn ở 1.45 rad (83°) để camera không bao giờ chui xuống dưới đất —
 * nhìn ngược từ dưới lên thì thấy mặt trong của nền đất, vỡ hết cảnh.
 */
const GIOI_HAN = {
  pitchMin: 0.14,
  pitchMax: 1.45,
  zoomMin: 0.5,
  zoomMax: 2.1,
} as const;

const KEO_NGANG = 0.006;
const KEO_DOC = 0.005;

function ket(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Camera bám theo phase, tự lùi ra khi màn hình hẹp (điện thoại dọc), và cho
 * người chơi xoay quanh sân bằng cách kéo.
 *
 * Art direction §6 hướng A vẫn được giữ: mỗi phase có một khung hình riêng và
 * mỗi lần đổi phase camera tự về đúng khung đó. Phần tự xoay chỉ là một độ lệch
 * cộng thêm bên trên khung ấy, nên câu chuyện của phase không bị mất.
 *
 * Tự viết thay vì dùng OrbitControls: OrbitControls giành quyền ghi vào camera
 * nên đánh nhau với khung hình theo phase, và nó cũng không biết tới độ nghiêng
 * bù cho panel giấy dó ở nửa dưới màn hình (§15).
 */
function CameraRig({
  phase,
  radius,
  veKhungLuc,
  onXoay,
}: {
  phase: GamePhase;
  radius: number;
  veKhungLuc: number;
  onXoay: (daXoay: boolean) => void;
}) {
  const { camera, size, gl } = useThree();
  const target = useRef(new Vector3(0, 0.3, 0.3));
  const dich = useRef(new Vector3(0, 3.7, 5.4));
  /** Khung hình của phase, quy về toạ độ cầu quanh `target`. */
  const khung = useRef({ yaw: 0, pitch: 0.6, xa: 6 });
  /** Độ lệch do người chơi kéo, cộng lên trên khung của phase. */
  const nguoi = useRef({ yaw: 0, pitch: 0, zoom: 1 });
  const dangKeo = useRef(false);
  const fov = useRef(46);
  const nghieng = useRef(0);
  /* Độ nghiêng đã làm mượt, phải giữ ngoài camera. `lookAt` ghi lại toàn bộ
     rotation mỗi frame nên không thể dùng chính `camera.rotation.z` làm trạng
     thái tích luỹ — xem chú thích ở chỗ áp roll bên dưới. */
  const roll = useRef(0);
  const lechKhung = useRef(0.12);
  const bao = useRef(onXoay);
  bao.current = onXoay;

  useEffect(() => {
    const shot = KHUNG_HINH[khungTheoPhase(phase)]!;
    const aspect = size.width / Math.max(1, size.height);
    // Màn dọc thì kéo camera ra xa và lên cao hơn để vẫn thấy cả vòng tròn.
    const doc = aspect < 0.75 ? 1 : aspect < 1 ? 0.6 : 0;
    const lui = 1 + (shot.lui - 1) * doc;
    // Sân đông thì vòng tròn rộng ra, camera phải lùi thêm.
    const dong = radius / SEAT_RADIUS;
    const px = shot.pos[0];
    // Khung ngắm chỗ ngồi thì đo từ chỗ ngồi (z = radius) và không giãn theo
    // sân đông; khung ngắm cả sân thì giãn theo bán kính vòng người.
    const py = shot.theoGhe
      ? shot.pos[1] * (1 + 0.1 * doc)
      : shot.pos[1] * (1 + 0.1 * doc) * dong;
    const pz = shot.theoGhe ? radius + shot.pos[2] * lui : shot.pos[2] * lui * dong;
    const tz = shot.theoGhe ? radius + shot.target[2] : shot.target[2];
    target.current.set(shot.target[0], shot.target[1], tz);

    // Quy khung hình về toạ độ cầu, để phần tự xoay chỉ là cộng thêm góc.
    const ox = px - shot.target[0];
    const oy = py - shot.target[1];
    const oz = pz - tz;
    const xa = Math.max(0.4, Math.hypot(ox, oy, oz));
    khung.current.xa = xa;
    khung.current.yaw = Math.atan2(ox, oz);
    khung.current.pitch = Math.acos(ket(oy / xa, -1, 1));

    fov.current = shot.fov;
    nghieng.current = shot.nghieng ?? 0;
    lechKhung.current = shot.lech * (0.45 + 0.55 * doc);
  }, [phase, radius, size.width, size.height]);

  // Đổi phase (hoặc bấm nút về chỗ cũ) thì thả lại độ lệch — trừ lúc đang kéo,
  // vì giật camera ra khỏi tay người chơi thì rất khó chịu.
  useEffect(() => {
    if (dangKeo.current) return;
    nguoi.current.yaw = 0;
    nguoi.current.pitch = 0;
    nguoi.current.zoom = 1;
    bao.current(false);
  }, [phase, veKhungLuc]);

  // ── Kéo để xoay, chụm hai ngón hoặc cuộn chuột để phóng ──
  useEffect(() => {
    const el = gl.domElement;
    const diem = new Map<number, { x: number; y: number }>();
    let khoangCu = 0;

    const khoangHaiDiem = (): number => {
      const hai = [...diem.values()];
      const a = hai[0];
      const b = hai[1];
      if (!a || !b) return 0;
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const batDau = (e: PointerEvent) => {
      diem.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dangKeo.current = true;
      if (diem.size === 2) khoangCu = khoangHaiDiem();
    };

    const di = (e: PointerEvent) => {
      const cu = diem.get(e.pointerId);
      if (!cu) return;
      const dx = e.clientX - cu.x;
      const dy = e.clientY - cu.y;
      diem.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (diem.size >= 2) {
        // Chụm vào là lùi ra, xoè ra là tiến vào.
        const moi = khoangHaiDiem();
        if (khoangCu > 0 && moi > 0) {
          nguoi.current.zoom = ket(
            nguoi.current.zoom * (khoangCu / moi),
            GIOI_HAN.zoomMin,
            GIOI_HAN.zoomMax,
          );
        }
        khoangCu = moi;
        bao.current(true);
        return;
      }

      nguoi.current.yaw -= dx * KEO_NGANG;
      nguoi.current.pitch = ket(nguoi.current.pitch - dy * KEO_DOC, -1.4, 1.4);
      if (Math.abs(dx) + Math.abs(dy) > 1) bao.current(true);
    };

    const het = (e: PointerEvent) => {
      diem.delete(e.pointerId);
      if (diem.size === 0) dangKeo.current = false;
      if (diem.size < 2) khoangCu = 0;
    };

    const cuon = (e: WheelEvent) => {
      e.preventDefault();
      nguoi.current.zoom = ket(
        nguoi.current.zoom * (1 + Math.sign(e.deltaY) * 0.08),
        GIOI_HAN.zoomMin,
        GIOI_HAN.zoomMax,
      );
      bao.current(true);
    };

    el.addEventListener('pointerdown', batDau);
    el.addEventListener('pointermove', di);
    el.addEventListener('pointerup', het);
    el.addEventListener('pointercancel', het);
    el.addEventListener('pointerleave', het);
    el.addEventListener('wheel', cuon, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', batDau);
      el.removeEventListener('pointermove', di);
      el.removeEventListener('pointerup', het);
      el.removeEventListener('pointercancel', het);
      el.removeEventListener('pointerleave', het);
      el.removeEventListener('wheel', cuon);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-2.4 * Math.min(dt, 0.05));
    const yaw = khung.current.yaw + nguoi.current.yaw;
    const pitch = ket(
      khung.current.pitch + nguoi.current.pitch,
      GIOI_HAN.pitchMin,
      GIOI_HAN.pitchMax,
    );
    const xa = khung.current.xa * nguoi.current.zoom;
    const ngang = Math.sin(pitch) * xa;

    dich.current.set(
      target.current.x + ngang * Math.sin(yaw),
      // Chặn cứng ở 0.45: xoay kiểu gì camera cũng không lọt xuống dưới đất.
      Math.max(0.45, target.current.y + Math.cos(pitch) * xa),
      target.current.z + ngang * Math.cos(yaw),
    );

    camera.position.lerp(dich.current, k);
    camera.lookAt(target.current);
    // Panel giấy dó chiếm nửa dưới màn hình (§15), nên hạ tầm nhìn xuống một
    // chút để vòng tròn và các nắm tay nằm gọn trong khoảng còn nhìn thấy.
    camera.rotateX(-lechKhung.current);
    /* Roll (nghiêng khung kiểu dutch tilt) phải tích luỹ trong ref rồi áp một
       lần, KHÔNG được viết `camera.rotation.z += (đích - camera.rotation.z) * k`.
       Lý do: `lookAt` ngay trên đã ghi lại rotation, nên `camera.rotation.z`
       luôn xấp xỉ 0 khi đọc ở đây — phép "+=" đó không tiến dần qua các frame mà
       chỉ ra `đích * k` mỗi frame. Với k = 1 − exp(−2.4·dt), ở 60fps là 3,9% độ
       nghiêng mong muốn, ở 30fps là 7,7% — vừa gần như mất hẳn hiệu ứng vừa
       thay đổi theo framerate. `rotateZ` cũng đúng hơn `rotation.z` vì nó xoay
       quanh trục nhìn thật, không ghi đè một thành phần Euler. */
    roll.current += (nghieng.current - roll.current) * k;
    camera.rotateZ(roll.current);
    const cam = camera as TPerspectiveCamera;
    if (Math.abs(cam.fov - fov.current) > 0.05) {
      cam.fov += (fov.current - cam.fov) * k;
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

/**
 * Bụi đất lơ lửng trong nắng — VFX §10.
 * Đây là chuyển động duy nhất không do người chơi kích hoạt của scene.
 */
function BuiDat({ dam }: { dam: number }) {
  const group = useRef<Group>(null);
  const hat = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const a = i * 2.399;
        const r = 0.6 + ((i * 17) % 40) / 10;
        return {
          p: [Math.cos(a) * r, 0.12 + ((i * 7) % 9) * 0.12, Math.sin(a) * r] as [
            number,
            number,
            number,
          ],
          s: 0.012 + ((i * 5) % 4) * 0.006,
          nhip: 0.4 + ((i * 3) % 7) * 0.12,
        };
      }),
    [],
  );

  useFrame(() => {
    if (!group.current) return;
    const t = Date.now() / 1000;
    group.current.rotation.y = t * 0.02;
    group.current.children.forEach((c, i) => {
      c.position.y = hat[i]!.p[1] + Math.sin(t * hat[i]!.nhip + i) * 0.06;
    });
  });

  return (
    <group ref={group}>
      {hat.map((h, i) => (
        <mesh key={i} position={h.p}>
          <sphereGeometry args={[h.s, 5, 4]} />
          <meshBasicMaterial color={MAU.datSang} transparent opacity={dam} />
        </mesh>
      ))}
    </group>
  );
}

export function Scene({
  room,
  localPlayerId,
  mySelection,
  revealCue,
  diceOutcome,
  diceStartedAt,
  veKhungLuc = 0,
  onTuXoay,
}: SceneProps) {
  const animating =
    room.phase === GamePhase.SELECT_MARBLES ||
    room.phase === GamePhase.REVEAL ||
    room.phase === GamePhase.CLOSE_HAND;
  useAnimationTick(animating);

  const players = room.players;
  const localIndex = Math.max(
    0,
    players.findIndex((p) => p.id === localPlayerId),
  );

  const ringRadius = seatRadius(players.length);
  const dong = ringRadius / SEAT_RADIUS;
  const nang = nangTheoPhase(room.phase);

  const teamColor = useMemo(() => {
    const map = new Map(room.teams.map((t) => [t.id, t.color]));
    return (teamId: string) => map.get(teamId) ?? MAU.dieu;
  }, [room.teams]);

  /** Thời điểm mở tay của từng người trong chuỗi reveal. */
  const openTimes = useMemo(() => {
    const map = new Map<string, number>();
    if (!revealCue) return map;
    const step = revealStepMs(revealCue.reveals.length);
    revealCue.reveals.forEach((r, i) => map.set(r.playerId, revealCue.at + i * step));
    return map;
  }, [revealCue]);

  const diceFaces = useMemo(() => buildDiceFaces(room.settings.penalties), [room.settings.penalties]);
  const winners = new Set(room.lastResult?.winningTeamIds ?? []);
  // Viền mực chỉ vẽ khi sân chưa quá đông, để giữ 60fps trên máy tầm trung (§15).
  const veVien = players.length <= 10;

  // ── Người chơi tự xoay sân ──
  const [daXoay, setDaXoay] = useState(false);
  const xoay = useCallback(
    (v: boolean) => {
      setDaXoay(v);
      onTuXoay?.(v);
    },
    [onTuXoay],
  );

  // ── Chạm vào một con vật thì nó ngẩng lên đáp lại ──
  const [cham, setCham] = useState<{ id: string; luc: number } | null>(null);
  const chamVao = useCallback((playerId: string) => {
    setCham({ id: playerId, luc: Date.now() });
    sfx.goiConVat();
  }, []);

  /**
   * Mức chi tiết của con vật. Sân đông thì bỏ vệt lông, lòng tai, chân sau và
   * hạ số cạnh của khối tròn — 30 con dựng đủ chi tiết là khoảng 800 mesh, máy
   * tầm trung không kham nổi (§15).
   */
  const chiTiet: ChiTiet = players.length <= 8 ? 'cao' : players.length <= 18 ? 'vua' : 'thap';

  // Khung cận: camera nằm ngay trước nắm tay của mình. Người chơi đã tự xoay đi
  // thì không còn cận nữa, nhãn tên phải hiện lại.
  const khungGan = !daXoay && ['tay', 'xucXac'].includes(khungTheoPhase(room.phase));
  // Bụi bốc lên nhiều nhất lúc reo hò và lúc xúc xắc dừng.
  const buiDam =
    room.phase === GamePhase.ROUND_RESULT || room.phase === GamePhase.DICE_ROLL ? 0.4 : 0.16;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 3.7, 5.4], fov: 46, near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[nang.troi]} />
      {/* Sương nắng đẩy ra xa theo bán kính vòng người, để sân đông không bị mờ. */}
      <fog attach="fog" args={[nang.troi, 10 * dong, 24 * dong]} />

      {/* Ánh sáng của khung giờ — §2. Đất hắt ngược lên nên bóng không bao giờ đen. */}
      <ambientLight intensity={0.72} color="#FFEAC4" />
      <hemisphereLight args={['#FFE9BE', MAU.datToi, 0.65]} />
      <directionalLight
        position={nang.huong}
        intensity={nang.manh}
        color={nang.mau}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />

      <CameraRig
        phase={room.phase}
        radius={ringRadius}
        veKhungLuc={veKhungLuc}
        onXoay={xoay}
      />
      <San radius={ringRadius} round={room.round} />
      <BuiDat dam={buiDam} />

      {players.map((p, i) => {
        const isLocal = p.id === localPlayerId;
        const publicRound = room.roundPublic[p.id];
        // Thông tin ẩn: chỉ biết số bi của mình, hoặc của mọi người sau REVEAL (§18).
        const known = publicRound?.revealed ?? (isLocal ? mySelection : null);
        return (
          <PlayerSeat
            key={p.id}
            player={p}
            round={publicRound}
            phase={room.phase}
            phaseStartedAt={room.phaseStartedAt}
            angle={seatAngle(i, players.length, localIndex)}
            radius={ringRadius}
            teamColor={teamColor(p.teamId)}
            isLocal={isLocal}
            knownMarbles={known}
            openHandAt={openTimes.get(p.id) ?? null}
            isWinner={winners.has(p.teamId)}
            isRolling={room.pendingDicePlayerId === p.id}
            vienMuc={veVien}
            khungGan={khungGan}
            chiTiet={isLocal ? 'cao' : chiTiet}
            chamLuc={cham?.id === p.id ? cham.luc : null}
            onCham={chamVao}
          />
        );
      })}

      {room.phase === GamePhase.DICE_ROLL && diceStartedAt !== null && (
        <Dice
          faces={diceFaces}
          resultFace={diceOutcome?.faceIndex ?? null}
          startedAt={diceStartedAt}
          position={[0, 0.28, 0]}
        />
      )}
    </Canvas>
  );
}
