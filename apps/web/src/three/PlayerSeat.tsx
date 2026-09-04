/**
 * Một chỗ ngồi bệt quanh vòng tròn: bàn tay, đống bi đặt trên đất, bi bay vào
 * lòng bàn tay và nhãn tên. Đây là nơi ánh xạ phase của server thành animation —
 * client không tự quyết định gì về gameplay, chỉ diễn hoạt theo state nhận được
 * (design doc §21).
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import {
  GamePhase,
  type Player,
  type PlayerRoundPublic,
} from "@tongbi/game-rules";
import { Non } from "../ui/common.js";
import { ConVat, loaiConVat, type ChiTiet, type TuThe } from "./ConVat.js";
import { Hand, type CuChi, type HandDrive } from "./Hand.js";
import { Marble, marbleColor } from "./Marble.js";
import {
  easeOutCubic,
  facingCenter,
  palmCluster,
  pileCluster,
  SEAT_RADIUS,
  seatPosition,
  smoothstep,
} from "./geometry.js";
import { boLong } from "./toon.js";
import { sfx } from "../audio/sfx.js";

/** Đống bi nằm ngay trên nền đất, cạnh đầu gối. */
const PILE_OFFSET: [number, number, number] = [0.44, 0.052, 0.3];
/** Lòng bàn tay nằm khoảng đây khi tay đã vươn ra — dùng để tính đường bay của bi. */
const PALM_IN_SEAT: [number, number, number] = [0, 0.36, -0.66];
const FLY_DURATION = 0.55;
const FLY_STAGGER = 0.075;
/** Bi bay xong rồi tay mới khép lại. */
const CLOSE_DELAY = 0.95;
const MAX_PILE_MESHES = 24;
/**
 * Tỉ lệ bàn tay so với hình học của vòng tròn.
 *
 * Hồi chỗ ngồi chỉ có một bàn tay thì để 1.35 cho đọc rõ trên điện thoại (§9.1).
 * Giờ silhouette đọc được từ xa là con vật, còn bàn tay chỉ là chi tiết, nên
 * phải thu về 0.75 — để 1.1 thì bàn tay to bằng cả cái thân, trông như con vật
 * đang đeo bao tay thợ.
 */
const TY_LE_TAY = 0.75;

interface SeatProps {
  player: Player;
  round: PlayerRoundPublic | undefined;
  phase: GamePhase;
  phaseStartedAt: number;
  angle: number;
  /** Bán kính vòng người ngồi — nới rộng khi sân đông. */
  radius?: number;
  teamColor: string;
  isLocal: boolean;
  /** Số bi thật trong tay: của mình thì biết sớm, của người khác chỉ biết sau REVEAL. */
  knownMarbles: number | null;
  /** Mốc mở tay của riêng người này trong chuỗi reveal; null nếu chưa tới. */
  openHandAt: number | null;
  isWinner: boolean;
  isRolling: boolean;
  /** Vẽ viền mực quanh bàn tay — chỉ bật khi sân vắng, để giữ 60fps (§15). */
  vienMuc?: boolean;
  /** Camera đang ở khung cận (sát tay / sát xúc xắc) — nhãn của chính mình
      sẽ bị phóng to che hết sân nên phải giấu đi. */
  khungGan?: boolean;
  /** Mức chi tiết của con vật, hạ xuống khi sân đông (§15). */
  chiTiet?: ChiTiet;
  /** Người chơi vừa chạm vào con vật này lúc nào — để nó ngẩng lên đáp lại. */
  chamLuc?: number | null;
  /** Chạm vào con vật. Không truyền thì con vật không nhận sự kiện chuột. */
  onCham?: (playerId: string) => void;
}

/** Bi bay từ đống bi vào lòng bàn tay rồi nằm lại thành cụm. */
function BiTrongTay({
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
  const daRoi = useRef(new Set<number>());

  useEffect(() => {
    daRoi.current.clear();
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
      // Điểm xuất phát: đống bi trên đất, quy đổi sang hệ toạ độ của lòng bàn tay.
      const fromX = PILE_OFFSET[0] - PALM_IN_SEAT[0];
      const fromY = PILE_OFFSET[1] - PALM_IN_SEAT[1];
      const fromZ = PILE_OFFSET[2] - PALM_IN_SEAT[2];
      g.position.set(
        fromX + (target[0] - fromX) * e,
        fromY + (target[1] - fromY) * e + Math.sin(k * Math.PI) * 0.34,
        fromZ + (target[2] - fromZ) * e,
      );
      g.scale.setScalar(k <= 0 ? 0 : 1);
      if (k >= 1 && !daRoi.current.has(i) && startAt !== null) {
        daRoi.current.add(i);
        if (i < 6) sfx.biRoi(0);
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
          <Marble position={[0, 0, 0]} color={marbleColor(seed + i)} ten="bi-trong-tay" />
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
  vienMuc = false,
  khungGan = false,
  chiTiet = "cao",
  chamLuc = null,
  onCham,
}: SeatProps) {
  const submitted = round?.submitted ?? false;
  const submittedAt = useRef<number | null>(null);

  // Ghi lại thời điểm người này chốt bi để chạy chuỗi "bi bay vào tay → nắm tay".
  useEffect(() => {
    if (submitted && submittedAt.current === null)
      submittedAt.current = Date.now();
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
    () => player.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
    [player.id],
  );

  // ── Ánh xạ phase → tư thế tay ──
  const now = Date.now();
  const sinceSubmit =
    submittedAt.current === null ? 0 : (now - submittedAt.current) / 1000;
  const opened = openHandAt !== null && now >= openHandAt;

  let curl = 0.14;
  let reach = 0;
  let lift = 0;
  let cuChi: CuChi = "yen";
  let tuThe: TuThe = "ngoi";

  switch (phase) {
    case GamePhase.SELECT_MARBLES:
      if (submitted) {
        reach = 1;
        curl = sinceSubmit > CLOSE_DELAY ? 1 : 0;
        tuThe = "ngoi";
      } else {
        reach = 0.2;
        curl = 0.1;
        // Quệt tay vào quần trước khi bốc bi — clip wipe_dirt (§9.1).
        cuChi = "quet-quan";
        tuThe = "chom";
      }
      break;
    case GamePhase.CLOSE_HAND:
    case GamePhase.GUESS_TOTAL:
      reach = 1;
      curl = 1;
      // Mình thì hé tay nhìn trộm bi của chính mình; vài đứa khác thì lắc tay trêu.
      cuChi = isLocal ? "nhin-trom" : seed % 4 === 0 ? "lac-tay" : "yen";
      tuThe = "chom";
      break;
    case GamePhase.REVEAL:
      reach = 1;
      curl = opened ? 0 : 1;
      // Cả sân nghển cổ nhìn vào giữa vòng.
      tuThe = "ngong";
      break;
    case GamePhase.ROUND_RESULT:
      reach = 0.75;
      curl = 0;
      lift = isWinner ? 1 : 0;
      tuThe = isWinner ? "reo" : "xiu";
      break;
    case GamePhase.DICE_ROLL:
      reach = isRolling ? 0.5 : 0;
      curl = isRolling ? 0.6 : 0.14;
      tuThe = isRolling ? "tung" : "ngong";
      break;
    case GamePhase.GAME_OVER:
      reach = 0;
      curl = 0.14;
      lift = isWinner ? 1 : 0;
      tuThe = isWinner ? "reo" : "xiu";
      break;
    default:
      break;
  }

  if (player.eliminated) {
    curl = 0.14;
    reach = 0;
    lift = 0;
    cuChi = "yen";
    tuThe = "xiu";
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
  const mo = player.eliminated || !player.connected;
  const doi = doiTuMau(teamColor);
  const long = boLong(loaiConVat(player.avatar), mo);
  /**
   * Trạng thái tay đã làm mượt. Bàn tay ghi vào nó, con vật đọc ra để nối cánh
   * tay vào cổ tay — nhờ vậy vai và tay không bao giờ rời nhau dù ai chậm frame.
   */
  const drive = useMemo<HandDrive>(() => ({ curl, reach, lift }), []); // eslint-disable-line react-hooks/exhaustive-deps
  /**
   * Khung cận đứng trong lòng vòng nên chỗ ngồi nào cũng có thể chỉ cách camera
   * một đơn vị; `distanceFactor` của Html khi đó phóng nhãn lên gấp mấy lần,
   * một cái tên che kín nửa màn hình. Ở khung cận thì giấu hết nhãn đi — lúc ấy
   * người chơi đang nhìn nắm tay của mình, không cần đọc tên ai.
   */
  const nhanQuaGan = khungGan;
  // Số bi chỉ được đóng dấu xuống đất trong lúc mở tay và lúc đếm bi.
  const hienDauMuc =
    opened &&
    knownMarbles !== null &&
    !nhanQuaGan &&
    (phase === GamePhase.REVEAL || phase === GamePhase.ROUND_RESULT);

  return (
    <group position={pos} rotation={[0, facingCenter(angle), 0]}>
      {/* Con vật ngồi bệt, bàn tay là cánh tay phải của nó vươn vào giữa vòng.
          Chạm vào thì nó ngẩng lên đáp lại — `e.delta` để phân biệt cái chạm
          với động tác kéo xoay camera. */}
      <group
        onClick={
          onCham &&
          ((e) => {
            if (e.delta > 6) return;
            e.stopPropagation();
            onCham(player.id);
          })
        }
      >
        <ConVat
          loai={player.avatar}
          drive={drive}
          tuThe={tuThe}
          seed={seed}
          doi={teamColor}
          mo={mo}
          chiTiet={chiTiet}
          vien={vienMuc}
          chamLuc={chamLuc}
          tyLeTay={TY_LE_TAY}
        >
          {/* Tay và bi phóng to hơn tỉ lệ hình học của vòng tròn: bàn tay là
              nhân vật chính của khung hình, phải đọc được cả khi ngồi bên kia
              sân (§9.1). */}
          <group scale={TY_LE_TAY}>
            <Hand
              curl={curl}
              reach={reach}
              lift={lift}
              drive={drive}
              skin={long.chinh}
              ongTay={long.chinh}
              chiCoTay={teamColor}
              vien={vienMuc}
              cuChi={cuChi}
            >
              {palmCount > 0 && (
                <BiTrongTay count={palmCount} seed={seed} startAt={flyStart} />
              )}
            </Hand>
          </group>
        </ConVat>
      </group>

      {/* Đống bi còn lại nằm trên đất trước mặt — không nhún theo con vật. */}
      <group scale={TY_LE_TAY}>
        <group position={PILE_OFFSET}>
          {pile.map((p, i) => (
            <Marble
              key={i}
              position={p}
              color={marbleColor(seed + i)}
              // Bi giữ nguyên cỡ thật dù bàn tay đã thu nhỏ: bi ve 16mm mà
              // vẽ bé hơn nữa thì đống bi thành một vệt mờ trên đất.
              scale={(mo ? 0.8 : 1) / TY_LE_TAY}
              ten="bi-tren-dat"
            />
          ))}
        </group>
      </group>

      {/* Nhãn tên viết trên mẩu giấy dó, luôn quay về phía camera.
          Ở khung cận tay (SELECT/CLOSE_HAND) camera nằm ngay trước mặt mình nên
          nhãn của chính mình bị phóng to che hết sân — lúc đó giấu nó đi. */}
      {!nhanQuaGan && (
        <Html
          position={[0, 1, 0.62]}
          center
          distanceFactor={7}
          /* Nhãn luôn nằm dưới panel giấy dó ở nửa dưới màn hình. */
          zIndexRange={[3, 0]}
          pointerEvents="none"
        >
          <div
            className={`nhan-ghe${mo ? " mo" : ""}${isWinner ? " thang" : ""}`}
          >
            <span
              className="day-doi"
              style={{ background: teamColor }}
              title={doi}
            />
            <span>
              <Non avatar={player.avatar} nho /> {player.name}
              {isLocal ? " (bạn)" : ""}
            </span>
            <span className="may-bi so">{player.marbleCount}</span>
            {player.eliminated && <span className="co">ngồi ngoài</span>}
            {!player.connected && !player.eliminated && (
              <span className="co">rớt mạng</span>
            )}
            {submitted && phase === GamePhase.SELECT_MARBLES && (
              <span className="co xong">giấu rồi</span>
            )}
          </div>
        </Html>
      )}

      {/* Số bi thật, đóng dấu mực xuống đất khi mở tay */}
      {hienDauMuc && (
        <Html
          position={[0, 0.62, -0.5]}
          center
          distanceFactor={5}
          zIndexRange={[3, 0]}
          pointerEvents="none"
        >
          <div
            className="dau-muc so"
            style={{ opacity: smoothstep(0, 260, now - (openHandAt ?? now)) }}
          >
            {knownMarbles}
          </div>
        </Html>
      )}
    </group>
  );
}

/** Tên vật nhận dạng của đội, dùng làm tooltip cho dải màu ở nhãn ghế (§3.2). */
function doiTuMau(color: string): string {
  switch (color.toUpperCase()) {
    case "#1F3F63":
      return "khăn mỏ quạ";
    case "#C4322A":
      return "dây chun đỏ";
    case "#4C7A38":
      return "tàu lá chuối";
    default:
      return "nón lá";
  }
}
