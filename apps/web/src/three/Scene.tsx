/**
 * Scene 3D chính: một cái bàn, mọi người ngồi quanh — design doc §13, §41.
 * Camera đổi góc theo phase (overview / focus / dice / result).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import {
  buildDiceFaces,
  GamePhase,
  revealStepMs,
  type DiceOutcome,
  type PublicRoomState,
} from '@tongbi/game-rules';
import { PlayerSeat } from './PlayerSeat.js';
import { Table } from './Table.js';
import { Dice } from './Dice.js';
import { seatAngle, seatRadius, SEAT_RADIUS } from './geometry.js';
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

const CAMERA_SHOTS: Record<string, { pos: [number, number, number]; target: [number, number, number] }> = {
  overview: { pos: [0, 3.7, 5.5], target: [0, 0.3, 0.4] },
  select: { pos: [0, 2.75, 4.35], target: [0, 0.45, 1.0] },
  reveal: { pos: [0, 4.0, 4.7], target: [0, 0.35, 0] },
  dice: { pos: [0, 2.15, 3.0], target: [0, 0.5, 0] },
  result: { pos: [0, 4.3, 5.8], target: [0, 0.3, 0] },
};

function shotFor(phase: GamePhase): keyof typeof CAMERA_SHOTS {
  switch (phase) {
    case GamePhase.SELECT_MARBLES:
    case GamePhase.CLOSE_HAND:
      return 'select';
    case GamePhase.GUESS_TOTAL:
      return 'overview';
    case GamePhase.REVEAL:
      return 'reveal';
    case GamePhase.DICE_ROLL:
      return 'dice';
    case GamePhase.ROUND_RESULT:
    case GamePhase.GAME_OVER:
      return 'result';
    default:
      return 'overview';
  }
}

/** Camera bám theo phase, tự lùi ra khi màn hình hẹp (điện thoại dọc). */
function CameraRig({ phase, radius }: { phase: GamePhase; radius: number }) {
  const { camera, size } = useThree();
  const target = useRef(new Vector3(0, 0.3, 0.4));
  const desired = useRef(new Vector3(0, 3.7, 5.5));

  useEffect(() => {
    const shot = CAMERA_SHOTS[shotFor(phase)]!;
    const aspect = size.width / Math.max(1, size.height);
    // Màn dọc thì kéo camera ra xa và lên cao hơn để vẫn thấy cả bàn.
    const pull = aspect < 0.75 ? 1.55 : aspect < 1 ? 1.25 : 1;
    // Phòng đông thì vòng ghế rộng ra, camera phải lùi thêm để thấy hết bàn.
    const crowd = radius / SEAT_RADIUS;
    desired.current.set(
      shot.pos[0],
      shot.pos[1] * (pull > 1 ? 1.1 : 1) * crowd,
      shot.pos[2] * pull * crowd,
    );
    target.current.set(shot.target[0], shot.target[1], shot.target[2]);
  }, [phase, radius, size.width, size.height]);

  useFrame((_, dt) => {
    const k = 1 - Math.exp(-2.4 * Math.min(dt, 0.05));
    camera.position.lerp(desired.current, k);
    camera.lookAt(target.current);
  });

  return null;
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
  const crowd = ringRadius / SEAT_RADIUS;

  const teamColor = useMemo(() => {
    const map = new Map(room.teams.map((t) => [t.id, t.color]));
    return (teamId: string) => map.get(teamId) ?? '#6b7280';
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

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 3.7, 5.5], fov: 46, near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#12131a']} />
      {/* Sương mù đẩy ra xa theo bán kính vòng ghế để phòng đông không bị mờ người ngồi xa. */}
      <fog attach="fog" args={['#12131a', 9 * crowd, 20 * crowd]} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#cfe6ff', '#1a1c26', 0.5]} />
      <directionalLight
        position={[3.2, 6.5, 4]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <pointLight position={[0, 2.6, 0]} intensity={22} distance={7} color="#ffe6bd" />

      <CameraRig phase={room.phase} radius={ringRadius} />
      <Table />

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
          />
        );
      })}

      {room.phase === GamePhase.DICE_ROLL && diceStartedAt !== null && (
        <Dice
          faces={diceFaces}
          resultFace={diceOutcome?.faceIndex ?? null}
          startedAt={diceStartedAt}
          position={[0, 0.35, 0]}
        />
      )}
    </Canvas>
  );
}
