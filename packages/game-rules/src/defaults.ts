import { DEFAULT_PENALTIES } from './dice.js';
import { BrokeRule, PayoutMode, WinRule, type GameSettings } from './types.js';

/** Cấu hình mặc định — design doc §2.1 (10 bi) và §37 (timeout mỗi phase). */
export const DEFAULT_SETTINGS: GameSettings = {
  startingMarbles: 10,
  maxBet: 0,
  totalRounds: 10,
  winRule: WinRule.CLOSEST,
  payout: PayoutMode.STAKE,
  fixedPayout: 2,
  brokeRule: BrokeRule.DICE,
  diceEnabled: true,
  penalties: DEFAULT_PENALTIES,
  selectSeconds: 20,
  guessSeconds: 15,
  revealSeconds: 5,
  lockOnStart: true,
};

export const MIN_PLAYERS = 2;
/**
 * Trần cứng của một phòng — deployment guide "30 người/room".
 * Server có thể hạ xuống bằng env MAX_PLAYERS_PER_ROOM, và giá trị thực tế
 * luôn được gửi kèm trong `PublicRoomState.maxPlayers` để client hiển thị đúng.
 */
export const MAX_PLAYERS = 30;
export const MAX_TEAMS = 4;

/**
 * Nhịp mở tay lúc reveal. Phòng đông thì rút ngắn nhịp để tổng thời gian
 * reveal không kéo dài vô tận (30 người × 1.1s sẽ là hơn 30 giây).
 * Server và client dùng chung hàm này để animation khớp mốc thời gian.
 */
export const REVEAL_STEP_MAX_MS = 1100;
export const REVEAL_STEP_MIN_MS = 260;
export const REVEAL_BUDGET_MS = 14000;
export const REVEAL_TAIL_MS = 1600;

export function revealStepMs(count: number): number {
  if (count <= 0) return REVEAL_STEP_MAX_MS;
  const perPlayer = Math.floor(REVEAL_BUDGET_MS / count);
  return Math.min(REVEAL_STEP_MAX_MS, Math.max(REVEAL_STEP_MIN_MS, perPlayer));
}

/**
 * Màu đội lấy từ vật liệu — art direction §3.2: chàm, đỏ điều, lá chuối, vàng nghệ.
 * Dùng chung cho UI 2D và vòng chỉ ở cổ tay trong scene 3D.
 */
export const TEAM_COLORS = ['#1F3F63', '#C4322A', '#4C7A38', '#E8A72E'] as const;
export const TEAM_NAMES = ['Đội Chàm', 'Đội Điều', 'Đội Lá', 'Đội Nghệ'] as const;

/**
 * Mỗi đội có một vật nhận dạng ngoài màu, để người mù màu vẫn phân biệt được
 * (art direction §3.2). Thứ tự khớp với TEAM_COLORS.
 */
export const TEAM_MARKS = ['khăn mỏ quạ', 'dây chun đỏ', 'tàu lá chuối', 'nón lá'] as const;

export const AVATARS = ['🐯', '🐼', '🦊', '🐸', '🐵', '🐧', '🦁', '🐨', '🐰', '🐮'] as const;

/** Giới hạn để server chặn giá trị settings vô lý từ client. */
export function sanitizeSettings(patch: Partial<GameSettings>, base: GameSettings): GameSettings {
  const clamp = (n: number, lo: number, hi: number, fallback: number) =>
    Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;

  return {
    ...base,
    ...patch,
    startingMarbles: clamp(patch.startingMarbles ?? base.startingMarbles, 1, 99, base.startingMarbles),
    maxBet: clamp(patch.maxBet ?? base.maxBet, 0, 99, base.maxBet),
    totalRounds: clamp(patch.totalRounds ?? base.totalRounds, 1, 50, base.totalRounds),
    fixedPayout: clamp(patch.fixedPayout ?? base.fixedPayout, 1, 20, base.fixedPayout),
    selectSeconds: clamp(patch.selectSeconds ?? base.selectSeconds, 5, 120, base.selectSeconds),
    guessSeconds: clamp(patch.guessSeconds ?? base.guessSeconds, 5, 120, base.guessSeconds),
    revealSeconds: clamp(patch.revealSeconds ?? base.revealSeconds, 2, 30, base.revealSeconds),
    winRule: Object.values(WinRule).includes(patch.winRule as WinRule)
      ? (patch.winRule as WinRule)
      : base.winRule,
    payout: Object.values(PayoutMode).includes(patch.payout as PayoutMode)
      ? (patch.payout as PayoutMode)
      : base.payout,
    brokeRule: Object.values(BrokeRule).includes(patch.brokeRule as BrokeRule)
      ? (patch.brokeRule as BrokeRule)
      : base.brokeRule,
    diceEnabled: typeof patch.diceEnabled === 'boolean' ? patch.diceEnabled : base.diceEnabled,
    lockOnStart: typeof patch.lockOnStart === 'boolean' ? patch.lockOnStart : base.lockOnStart,
    penalties: base.penalties,
  };
}
