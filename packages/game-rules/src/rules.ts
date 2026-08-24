/**
 * Rules engine thuần TypeScript — không phụ thuộc React / Three.js / socket.
 * Design doc §43. Mọi quyết định gameplay đều chạy qua đây trên server.
 */
import {
  type GameSettings,
  type Player,
  type RoundResult,
  type Team,
  WinRule,
  PayoutMode,
} from './types.js';

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

/** Số bi tối đa một người được đặt trong lượt này. */
export function maxAllowedBet(player: Player, settings: GameSettings): number {
  const cap =
    settings.maxBet > 0 ? Math.min(settings.maxBet, player.marbleCount) : player.marbleCount;
  return Math.max(0, cap);
}

/**
 * Kiểm tra lựa chọn bi — design doc §2.2 + §17.
 * Bắt buộc: ít nhất 1 viên, không vượt số bi hiện có, không vượt maxBet.
 */
export function validateMarbleChoice(
  player: Player,
  amount: number,
  settings: GameSettings,
): ValidationResult {
  if (!Number.isInteger(amount)) return { ok: false, reason: 'Số bi phải là số nguyên.' };
  if (player.eliminated) return { ok: false, reason: 'Bạn đã bị loại khỏi trận.' };
  if (player.marbleCount <= 0) return { ok: false, reason: 'Bạn không còn bi để đặt.' };
  if (amount < 1) return { ok: false, reason: 'Phải đặt ít nhất 1 viên bi.' };
  if (amount > player.marbleCount) return { ok: false, reason: 'Bạn không có đủ bi.' };
  const cap = maxAllowedBet(player, settings);
  if (amount > cap) return { ok: false, reason: `Mỗi lượt chỉ được đặt tối đa ${cap} viên.` };
  return { ok: true };
}

/** Tổng số bi thực tế đang nằm trong tất cả bàn tay — design doc §5. */
export function calculateTotal(selections: Record<string, number>): number {
  return Object.values(selections).reduce((sum, n) => sum + n, 0);
}

/** Khoảng đoán hợp lệ: mỗi người đang tham gia đặt từ 1 tới maxAllowedBet. */
export function guessBounds(
  activePlayers: Player[],
  settings: GameSettings,
): { min: number; max: number } {
  if (activePlayers.length === 0) return { min: 0, max: 0 };
  const min = activePlayers.length;
  const max = activePlayers.reduce((sum, p) => sum + maxAllowedBet(p, settings), 0);
  return { min, max: Math.max(min, max) };
}

export function validateGuess(
  value: number,
  activePlayers: Player[],
  settings: GameSettings,
): ValidationResult {
  if (!Number.isInteger(value)) return { ok: false, reason: 'Dự đoán phải là số nguyên.' };
  const { min, max } = guessBounds(activePlayers, settings);
  if (value < min || value > max) {
    return { ok: false, reason: `Dự đoán phải nằm trong khoảng ${min}–${max}.` };
  }
  return { ok: true };
}

export interface GuessEntry {
  teamId: string;
  value: number;
}

export interface GuessResolution {
  winningTeamIds: string[];
  scored: Array<{ teamId: string; value: number; delta: number; disqualified: boolean }>;
}

/**
 * Xác định đội thắng lượt — design doc §6 (Rule A / B / C).
 * Trả về danh sách đội thắng (có thể rỗng, hoặc nhiều đội khi hoà).
 */
export function resolveGuess(
  guesses: GuessEntry[],
  actualTotal: number,
  rule: WinRule,
): GuessResolution {
  const scored = guesses.map((g) => ({
    teamId: g.teamId,
    value: g.value,
    delta: Math.abs(g.value - actualTotal),
    disqualified: false,
  }));
  if (scored.length === 0) return { winningTeamIds: [], scored };

  if (rule === WinRule.EXACT) {
    return { winningTeamIds: scored.filter((s) => s.delta === 0).map((s) => s.teamId), scored };
  }

  if (rule === WinRule.CLOSEST) {
    const best = Math.min(...scored.map((s) => s.delta));
    return { winningTeamIds: scored.filter((s) => s.delta === best).map((s) => s.teamId), scored };
  }

  // Rule C — nhiều đội cùng đoán một giá trị thì các đội đó bị loại khỏi quyền thắng.
  // Nếu sau khi loại không còn ai đoán đúng, lượt hoà (push).
  const counts = new Map<number, number>();
  for (const s of scored) counts.set(s.value, (counts.get(s.value) ?? 0) + 1);
  for (const s of scored) {
    if ((counts.get(s.value) ?? 0) > 1) s.disqualified = true;
  }
  const winners = scored.filter((s) => !s.disqualified && s.delta === 0);
  return { winningTeamIds: winners.map((s) => s.teamId), scored };
}

export interface RoundInput {
  round: number;
  players: Player[];
  teams: Team[];
  /** playerId -> số bi đã bỏ vào tay. Chỉ chứa người thực sự tham gia lượt. */
  selections: Record<string, number>;
  /** Đáp án đã khoá của từng đội. */
  guesses: GuessEntry[];
  settings: GameSettings;
}

/**
 * Tính kết quả một lượt và số bi thay đổi của từng người.
 * Hàm thuần: KHÔNG mutate `players` đầu vào.
 *
 * Mô hình STAKE (mặc định): số bi bỏ vào tay là tiền cược góp thành pot.
 * Người thuộc đội thắng giữ nguyên phần cược và chia đều pot của phe thua.
 * Không đội nào thắng thì hoàn bi cho tất cả (push).
 *
 * Mô hình FIXED: thắng +fixedPayout, thua -fixedPayout (không vượt số bi đang có).
 */
export function applyRoundResult(input: RoundInput): RoundResult {
  const { players, selections, guesses, settings, round } = input;
  const actualTotal = calculateTotal(selections);
  const { winningTeamIds, scored } = resolveGuess(guesses, actualTotal, settings.winRule);
  const winners = new Set(winningTeamIds);
  const push = winners.size === 0;

  const participants = players.filter((p) => selections[p.id] !== undefined);
  const deltas = new Map<string, number>();
  for (const p of players) deltas.set(p.id, 0);

  if (!push) {
    if (settings.payout === PayoutMode.STAKE) {
      const losers = participants.filter((p) => !winners.has(p.teamId));
      const winnersList = participants.filter((p) => winners.has(p.teamId));
      const pot = losers.reduce((sum, p) => sum + (selections[p.id] ?? 0), 0);

      for (const p of losers) deltas.set(p.id, -(selections[p.id] ?? 0));

      if (winnersList.length > 0 && pot > 0) {
        // Chia đều pot; phần dư ưu tiên người đặt nhiều bi nhất (tie-break theo ghế cho ổn định).
        const share = Math.floor(pot / winnersList.length);
        let remainder = pot - share * winnersList.length;
        const ordered = [...winnersList].sort(
          (a, b) => (selections[b.id] ?? 0) - (selections[a.id] ?? 0) || a.seat - b.seat,
        );
        for (const p of ordered) {
          let gain = share;
          if (remainder > 0) {
            gain += 1;
            remainder -= 1;
          }
          deltas.set(p.id, gain);
        }
      }
    } else {
      const n = settings.fixedPayout;
      for (const p of participants) {
        if (winners.has(p.teamId)) deltas.set(p.id, n);
        else deltas.set(p.id, -Math.min(n, p.marbleCount));
      }
    }
  }

  const marbleDeltas = players.map((p) => {
    const delta = deltas.get(p.id) ?? 0;
    return { playerId: p.id, delta, after: Math.max(0, p.marbleCount + delta) };
  });

  return {
    round,
    actualTotal,
    reveals: participants.map((p) => ({ playerId: p.id, marbles: selections[p.id] ?? 0 })),
    guesses: scored,
    winningTeamIds,
    marbleDeltas,
    push,
  };
}

/** Người chơi còn khả năng tham gia lượt tiếp theo. */
export function isActive(player: Player): boolean {
  return !player.eliminated && player.marbleCount > 0;
}

/**
 * Điều kiện kết thúc trận — design doc §19 (CHECK_ELIMINATION → NEXT_ROUND).
 * Hết số vòng, hoặc chỉ còn tối đa 1 người còn bi, hoặc mọi người còn bi cùng một đội.
 */
export function isGameOver(players: Player[], round: number, settings: GameSettings): boolean {
  if (round >= settings.totalRounds) return true;
  const alive = players.filter(isActive);
  if (alive.length <= 1) return true;
  return new Set(alive.map((p) => p.teamId)).size <= 1;
}

/** Xếp hạng cuối trận theo số bi. */
export function finalStandings(
  players: Player[],
): Array<{ playerId: string; marbles: number; rank: number }> {
  const sorted = [...players].sort((a, b) => b.marbleCount - a.marbleCount || a.seat - b.seat);
  let rank = 0;
  let prev: number | null = null;
  return sorted.map((p, i) => {
    if (prev === null || p.marbleCount !== prev) rank = i + 1;
    prev = p.marbleCount;
    return { playerId: p.id, marbles: p.marbleCount, rank };
  });
}
