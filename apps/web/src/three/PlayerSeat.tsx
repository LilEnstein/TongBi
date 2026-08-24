/**
 * Một chỗ ngồi quanh bàn: bàn tay, đống bi, bi bay vào lòng bàn tay và nhãn tên.
 * Đây là nơi ánh xạ phase của server thành animation — client không tự quyết định
 * gì về gameplay, chỉ diễn hoạt theo state nhận được (design doc §21).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { GamePhase, type Player, type PlayerRoundPublic } from '@tongbi/game-rules';
import { Hand } from './Hand.js';
import { Marble, marbleColor } from './Marble.js';
import {
  easeOutCubic,
  facingCenter,
  palmCluster,
  pileCluster,
  SEAT_RADIUS,
  seatPosition,
  smoothstep,
} from './geometry.js';
import { sfx } from '../audio/sfx.js';

/** Vị trí đống bi trong hệ toạ độ của ghế. */
const PILE_OFFSET: [number, number, number] = [0.44, 0.04, 0.34];
/** Lòng bàn tay nằm khoảng đây khi tay đã vươn ra — dùng để tính đường bay của bi. */
const PALM_IN_SEAT: [number, number, number] = [0, 0.38, -0.67];
const FLY_DURATION = 0.55;
const FLY_STAGGER = 0.075;
/** Bi bay xong rồi tay mới khép lại. */
const CLOSE_DELAY = 0.95;
const MAX_PILE_MESHES = 24;

interface SeatProps {
  player: Player;
  round: PlayerRoundPublic | undefined;
  phase: GamePhase;
  phaseStartedAt: number;
  angle: number;
  /** Bán kính vòng ghế — nới rộng khi phòng đông. */
  radius?: number;
  teamColor: string;
  isLocal: boolean;
  /** Số bi thật trong tay: của chính mình thì biết sớm, của người khác chỉ biết sau REVEAL. */
  knownMarbles: number | null;
  /** Mốc mở tay của riêng người này trong chuỗi reveal; null nếu chưa tới. */
  openHandAt: number | null;
  isWinner: boolean;
  isRolling: boolean;
}

/** Bi bay từ đống bi vào lòng bàn tay rồi nằm lại thành cụm. */
function PalmMarbles({
  count,
  seed,
  startAt,
}: {
  count: number;
  seed: number;
  startAt: number | null;
}) {
  const refs = useRef<Array<Group | null>>([]);
  const cluster = useMemo(() => palmCluster(count), [count]);
  const dropped = useRef(new Set<number>());

  useEffect(() => {
    dropped.current.clear();
  }, [startAt, count]);

  useFrame(() => {
    const t = startAt === null ? Infinity : (Date.now() - startAt) / 1000;
    for (let i = 0; i < cluster.length; i += 1) {
      const g = refs.current[i];
      const target = cluster[i];
      if (!g || !target) continue;
      const local = (t - i * FLY_STAGGER) / FLY_DURATION;
      const k = Math.min(1, Math.max(0, local));
      const e = easeOutCubic(k);
      // Điểm xuất phát: đống bi, quy đổi sang hệ toạ độ của lòng bàn tay.
      const fromX = PILE_OFFSET[0] - PALM_IN_SEAT[0];
      const fromY = PILE_OFFSET[1] - PALM_IN_SEAT[1];
      const fromZ = PILE_OFFSET[2] - PALM_IN_SEAT[2];
      g.position.set(
        fromX + (target[0] - fromX) * e,
        fromY + (target[1] - fromY) * e + Math.sin(k * Math.PI) * 0.34,
        fromZ + (target[2] - fromZ) * e,
      );
      g.scale.setScalar(k <= 0 ? 0 : 1);
      if (k >= 1 && !dropped.current.has(i) && startAt !== null) {
        dropped.current.add(i);
        if (i < 6) sfx.marbleDrop(0);
      }
    }
  });

  return (
    <>
      {cluster.map((_, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <Marble position={[0, 0, 0]} color={marbleColor(seed + i)} />
        </group>
      ))}
    </>
  );
}

export function PlayerSeat({
  player,
  round,
  phase,
  phaseStartedAt,
  angle,
  radius = SEAT_RADIUS,
  teamColor,
  isLocal,
  knownMarbles,
  openHandAt,
  isWinner,
  isRolling,
}: SeatProps) {
  const submitted = round?.submitted ?? false;
  const submittedAt = useRef<number | null>(null);

  // Ghi lại thời điểm người này chốt bi để chạy chuỗi "bi bay vào tay → nắm tay".
  useEffect(() => {
    if (submitted && submittedAt.current === null) submittedAt.current = Date.now();
    if (!submitted) submittedAt.current = null;
  }, [submitted]);
  useEffect(() => {
    if (phase === GamePhase.ROUND_START) submittedAt.current = null;
  }, [phase]);

  const pile = useMemo(
    () => pileCluster(Math.min(player.marbleCount, MAX_PILE_MESHES)),
    [player.marbleCount],
  );
  const seed = useMemo(
    () => player.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
    [player.id],
  );

  // ── Ánh xạ phase → tư thế tay ──
  const now = Date.now();
  const sinceSubmit = submittedAt.current === null ? 0 : (now - submittedAt.current) / 1000;
  const opened = openHandAt !== null && now >= openHandAt;

  let curl = 0.14;
  let reach = 0;
  let lift = 0;

  switch (phase) {
    case GamePhase.SELECT_MARBLES:
      if (submitted) {
        reach = 1;
        curl = sinceSubmit > CLOSE_DELAY ? 1 : 0;
      } else {
        reach = 0.2;
        curl = 0.1;
      }
      break;
    case GamePhase.CLOSE_HAND:
    case GamePhase.GUESS_TOTAL:
      reach = 1;
      curl = 1;
      break;
    case GamePhase.REVEAL:
      reach = 1;
      curl = opened ? 0 : 1;
      break;
    case GamePhase.ROUND_RESULT:
      reach = 0.75;
      curl = 0;
      lift = isWinner ? 1 : 0;
      break;
    case GamePhase.DICE_ROLL:
      reach = isRolling ? 0.5 : 0;
      curl = isRolling ? 0.6 : 0.14;
      break;
    case GamePhase.GAME_OVER:
      reach = 0;
      curl = 0.14;
      lift = isWinner ? 1 : 0;
      break;
    default:
      break;
  }

  if (player.eliminated) {
    curl = 0.14;
    reach = 0;
    lift = 0;
  }

  // Bi hiển thị trong lòng bàn tay: chỉ khi thực sự được phép biết con số.
  const palmCount = player.eliminated ? 0 : (knownMarbles ?? 0);
  const flyStart =
    submittedAt.current !== null && palmCount > 0
      ? submittedAt.current
      : phase === GamePhase.REVEAL && palmCount > 0
        ? phaseStartedAt
        : null;

  const pos = seatPosition(angle, radius);
  const dim = player.eliminated || !player.connected;

  return (
    <group position={pos} rotation={[0, facingCenter(angle), 0]}>
      <Hand
        curl={curl}
        reach={reach}
        lift={lift}
        skin={dim ? '#8d7a6e' : '#e8b48c'}
        sleeve={teamColor}
      >
        {palmCount > 0 && <PalmMarbles count={palmCount} seed={seed} startAt={flyStart} />}
      </Hand>

      {/* Đống bi còn lại trước mặt người chơi */}
      <group position={PILE_OFFSET}>
        {pile.map((p, i) => (
          <Marble key={i} position={p} color={marbleColor(seed + i)} scale={dim ? 0.8 : 1} />
        ))}
      </group>

      {/* Nhãn tên + số bi, luôn quay về phía camera */}
      <Html
        position={[0, 0.86, 0.62]}
        center
        distanceFactor={7}
        zIndexRange={[20, 0]}
        pointerEvents="none"
      >
        <div className={`seat-tag${dim ? ' seat-tag--dim' : ''}${isWinner ? ' seat-tag--win' : ''}`}>
          <span className="seat-tag__avatar">{player.avatar}</span>
          <span className="seat-tag__name" style={{ color: teamColor }}>
            {player.name}
            {isLocal ? ' (bạn)' : ''}
          </span>
          <span className="seat-tag__marbles">
            <b>{player.marbleCount}</b> bi
          </span>
          {player.eliminated && <span className="seat-tag__badge">OUT</span>}
          {!player.connected && !player.eliminated && (
            <span className="seat-tag__badge seat-tag__badge--warn">mất kết nối</span>
          )}
          {submitted && phase === GamePhase.SELECT_MARBLES && (
            <span className="seat-tag__badge seat-tag__badge--ok">đã giấu bi</span>
          )}
        </div>
      </Html>

      {/* Số bi thật, hiện lên khi mở tay */}
      {opened && knownMarbles !== null && (
        <Html position={[0, 0.62, -0.5]} center distanceFactor={6.4} pointerEvents="none">
          <div
            className="reveal-pop"
            style={{ opacity: smoothstep(0, 260, now - (openHandAt ?? now)) }}
          >
            {knownMarbles}
          </div>
        </Html>
      )}
    </group>
  );
}
