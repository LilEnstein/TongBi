/**
 * Sân đất trước hiên nhà tranh — art direction §9.4: không có bàn, cả bọn ngồi
 * bệt quanh một vòng tròn vạch bằng que.
 *
 * Camera khoá ở một góc cố định cho mỗi phase (§6 hướng A) và ánh sáng đổi theo
 * khung giờ của phase (§2) — đó là cách kể chuyện chính của game.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
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
import type { RevealCue } from '../net/store.js';

interface SceneProps {
  room: PublicRoomState;
  localPlayerId: string | null;
  /** Số bi chính mình đã chọn (server chỉ gửi riêng cho mình). */
  mySelection: number | null;
  revealCue: RevealCue | null;
  diceOutcome: DiceOutcome | null;
  diceStartedAt: number | null;
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
}

const KHUNG_HINH: Record<string, Shot> = {
  // Cao ngang tầm mắt trẻ con ngồi xổm, nghiêng ~35°, thấy hết vòng tròn.
  toan: { pos: [0, 3.7, 5.4], target: [0, 0.3, 0.3], fov: 46, lui: 1.5, lech: 0.12 },
  // Sát đất, ống kính dài, chếch sang một bên để thấy rõ nắm tay của chính mình
  // trên nền đất mờ phía sau.
  tay: { pos: [1.3, 1.2, 4.9], target: [0.22, 0.36, 2.75], fov: 34, lui: 1.15, lech: 0.14 },
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

/** Camera bám theo phase, tự lùi ra khi màn hình hẹp (điện thoại dọc). */
function CameraRig({ phase, radius }: { phase: GamePhase; radius: number }) {
  const { camera, size } = useThree();
  const target = useRef(new Vector3(0, 0.3, 0.3));
  const desired = useRef(new Vector3(0, 3.7, 5.4));
  const fov = useRef(46);
  const nghieng = useRef(0);
  const lechKhung = useRef(0.12);

  useEffect(() => {
    const shot = KHUNG_HINH[khungTheoPhase(phase)]!;
    const aspect = size.width / Math.max(1, size.height);
    // Màn dọc thì kéo camera ra xa và lên cao hơn để vẫn thấy cả vòng tròn.
    const doc = aspect < 0.75 ? 1 : aspect < 1 ? 0.6 : 0;
    const lui = 1 + (shot.lui - 1) * doc;
    // Sân đông thì vòng tròn rộng ra, camera phải lùi thêm.
    const dong = radius / SEAT_RADIUS;
    desired.current.set(shot.pos[0], shot.pos[1] * (1 + 0.1 * doc) * dong, shot.pos[2] * lui * dong);
    target.current.set(shot.target[0], shot.target[1], shot.target[2]);
    fov.current = shot.fov;
    nghieng.current = shot.nghieng ?? 0;
    lechKhung.current = shot.lech * (0.45 + 0.55 * doc);
  }, [phase, radius, size.width, size.height]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-2.4 * Math.min(dt, 0.05));
    camera.position.lerp(desired.current, k);
    camera.lookAt(target.current);
    // Panel giấy dó chiếm nửa dưới màn hình (§15), nên hạ tầm nhìn xuống một
    // chút để vòng tròn và các nắm tay nằm gọn trong khoảng còn nhìn thấy.
    camera.rotateX(-lechKhung.current);
    camera.rotation.z += (nghieng.current - camera.rotation.z) * k;
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
  // Khung cận: camera nằm ngay trước nắm tay của mình.
  const khungGan = ['tay', 'xucXac'].includes(khungTheoPhase(room.phase));
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

      <CameraRig phase={room.phase} radius={ringRadius} />
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
