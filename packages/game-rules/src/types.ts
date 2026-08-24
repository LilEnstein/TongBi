/**
 * Kiểu dữ liệu dùng chung giữa game server và web client.
 * Xem docs/game-design.md §19 (state machine) và §25 (cấu trúc dữ liệu phòng).
 */

/** State machine của phòng chơi — design doc §19. */
export const GamePhase = {
  LOBBY: 'LOBBY',
  WAITING: 'WAITING',
  ROUND_START: 'ROUND_START',
  SELECT_MARBLES: 'SELECT_MARBLES',
  CLOSE_HAND: 'CLOSE_HAND',
  GUESS_TOTAL: 'GUESS_TOTAL',
  REVEAL: 'REVEAL',
  ROUND_RESULT: 'ROUND_RESULT',
  DICE_ROLL: 'DICE_ROLL',
  GAME_OVER: 'GAME_OVER',
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

/** Luật xác định đội thắng lượt — design doc §6. */
export const WinRule = {
  /** Rule A — chỉ đoán đúng tuyệt đối mới thắng. */
  EXACT: 'EXACT',
  /** Rule B — không ai đúng thì đội gần nhất thắng. */
  CLOSEST: 'CLOSEST',
  /** Rule C — đoán đúng nhưng trùng giá trị với đội khác thì bị loại. */
  EXACT_UNIQUE: 'EXACT_UNIQUE',
} as const;
export type WinRule = (typeof WinRule)[keyof typeof WinRule];

/**
 * Cách cập nhật số bi sau mỗi lượt.
 * Design doc mô tả "cập nhật số bi" (§52.14) nhưng không chốt công thức,
 * nên game hỗ trợ hai mô hình và host chọn khi tạo phòng.
 */
export const PayoutMode = {
  /** Bi đã bỏ vào tay là tiền cược: đội thắng chia pot, người thua mất phần đã đặt. */
  STAKE: 'STAKE',
  /** Thắng +N bi, thua -N bi (N = settings.fixedPayout), số bi đã đặt được trả lại. */
  FIXED: 'FIXED',
} as const;
export type PayoutMode = (typeof PayoutMode)[keyof typeof PayoutMode];

/** Xử lý khi một người về 0 bi — design doc §8. */
export const BrokeRule = {
  /** Option 1 — bị đánh dấu OUT ngay. */
  ELIMINATE: 'ELIMINATE',
  /** Option 2 — được tung xúc xắc xin vay bi. */
  DICE: 'DICE',
} as const;
export type BrokeRule = (typeof BrokeRule)[keyof typeof BrokeRule];

/** Một mặt của "challenge die" — design doc §9. */
export interface DiceFace {
  /** 1..6 */
  index: number;
  kind: 'BORROW' | 'PENALTY';
  /** Số bi được vay khi kind === 'BORROW' (3 / 6 / 9). */
  marbles?: number;
  /** Nội dung hình phạt khi kind === 'PENALTY'. */
  label: string;
  icon: string;
}

/** Hình phạt tuỳ chỉnh của chủ trò — design doc §11. */
export interface Penalty {
  id: string;
  label: string;
  description: string;
  icon: string;
  severity: 'LIGHT' | 'MEDIUM' | 'HEAVY';
}

export interface GameSettings {
  /** Số bi khởi đầu mỗi người — mặc định 10 (design doc §2.1). */
  startingMarbles: number;
  /** Số bi tối đa được đặt trong một lượt (0 = không giới hạn ngoài số bi đang có). */
  maxBet: number;
  /** Tổng số vòng chơi. */
  totalRounds: number;
  winRule: WinRule;
  payout: PayoutMode;
  /** Số bi thắng/thua mỗi lượt khi payout === 'FIXED'. */
  fixedPayout: number;
  brokeRule: BrokeRule;
  /** Bật xúc xắc vay bi / hình phạt. */
  diceEnabled: boolean;
  penalties: Penalty[];
  /** Timeout mỗi phase (giây) — design doc §37. */
  selectSeconds: number;
  guessSeconds: number;
  revealSeconds: number;
  /** Khoá join sau khi game bắt đầu — design doc §23. */
  lockOnStart: boolean;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  /** Người khoá đáp án của đội — design doc §12. */
  captainId: string | null;
  score: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  teamId: string;
  marbleCount: number;
  connected: boolean;
  eliminated: boolean;
  isHost: boolean;
  /** Ghế quanh bàn (0..n-1) dùng để đặt vị trí trong scene 3D. */
  seat: number;
}

/** Public state của một người trong lượt hiện tại — KHÔNG chứa số bi đã chọn. */
export interface PlayerRoundPublic {
  submitted: boolean;
  /** Chỉ có giá trị sau REVEAL — design doc §18. */
  revealed: number | null;
  /** Đã tự động chọn do hết giờ. */
  autoSubmitted: boolean;
}

export interface TeamGuessPublic {
  teamId: string;
  /** Giá trị đang soạn — chỉ gửi cho đồng đội, null với đội khác. */
  pending: number | null;
  locked: boolean;
  /** Chỉ lộ sau REVEAL. */
  value: number | null;
}

export interface RoundResult {
  round: number;
  actualTotal: number;
  /** Số bi từng người đã bỏ vào tay. */
  reveals: Array<{ playerId: string; marbles: number }>;
  guesses: Array<{ teamId: string; value: number; delta: number; disqualified: boolean }>;
  winningTeamIds: string[];
  /** Thay đổi số bi của từng người sau lượt. */
  marbleDeltas: Array<{ playerId: string; delta: number; after: number }>;
  /** Không đội nào thắng (Rule A/C) — mọi người được hoàn bi. */
  push: boolean;
}

export interface DiceOutcome {
  playerId: string;
  faceIndex: number;
  face: DiceFace;
  marblesGained: number;
  penalty: Penalty | null;
}

/** State phòng gửi cho client — đã lọc bỏ thông tin ẩn. */
export interface PublicRoomState {
  id: string;
  phase: GamePhase;
  hostId: string;
  round: number;
  /** Sức chứa thực tế server đang áp dụng (env MAX_PLAYERS_PER_ROOM). */
  maxPlayers: number;
  settings: GameSettings;
  players: Player[];
  teams: Team[];
  /** 0 = free-for-all (mỗi người một đội), ngược lại là số đội cố định — design doc §12. */
  teamMode: number;
  roundPublic: Record<string, PlayerRoundPublic>;
  guesses: TeamGuessPublic[];
  /** Epoch ms khi phase hiện tại hết giờ; null nếu không đếm ngược. */
  phaseEndsAt: number | null;
  /** Mốc thời gian server bắt đầu phase — client dùng để đồng bộ animation (§21). */
  phaseStartedAt: number;
  lastResult: RoundResult | null;
  lastDice: DiceOutcome | null;
  /** Người đang chờ tung xúc xắc vì hết bi. */
  pendingDicePlayerId: string | null;
  /** Bảng xếp hạng cuối trận. */
  finalStandings: Array<{ playerId: string; marbles: number; rank: number }> | null;
}

/** State riêng của chính người chơi — chỉ gửi cho đúng socket đó (§18). */
export interface PrivatePlayerState {
  playerId: string;
  /** Số bi mình đã bỏ vào tay lượt này. */
  selectedMarbles: number | null;
  /** Đáp án đội mình đang soạn. */
  teamPending: number | null;
}
