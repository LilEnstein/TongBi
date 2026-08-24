import { describe, expect, it } from 'vitest';
import {
  applyRoundResult,
  BrokeRule,
  buildDiceFaces,
  calculateTotal,
  DEFAULT_SETTINGS,
  finalStandings,
  guessBounds,
  isGameOver,
  maxAllowedBet,
  PayoutMode,
  resolveDice,
  resolveGuess,
  rollDiceFace,
  validateGuess,
  validateMarbleChoice,
  WinRule,
  type GameSettings,
  type Player,
  type Team,
} from '../src/index.js';

function player(id: string, marbles: number, teamId = id, seat = 0): Player {
  return {
    id,
    name: id.toUpperCase(),
    avatar: '🐯',
    teamId,
    marbleCount: marbles,
    connected: true,
    eliminated: false,
    isHost: false,
    seat,
  };
}

function team(id: string): Team {
  return { id, name: id, color: '#fff', captainId: null, score: 0 };
}

const settings = (over: Partial<GameSettings> = {}): GameSettings => ({
  ...DEFAULT_SETTINGS,
  ...over,
});

describe('validateMarbleChoice — design doc §2.2', () => {
  it('từ chối 0 viên', () => {
    const r = validateMarbleChoice(player('a', 10), 0, settings());
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('ít nhất 1');
  });

  it('từ chối số âm và số thập phân', () => {
    expect(validateMarbleChoice(player('a', 10), -3, settings()).ok).toBe(false);
    expect(validateMarbleChoice(player('a', 10), 2.5, settings()).ok).toBe(false);
  });

  it('từ chối vượt quá số bi đang có', () => {
    expect(validateMarbleChoice(player('a', 4), 5, settings()).ok).toBe(false);
  });

  it('chấp nhận trong khoảng hợp lệ', () => {
    expect(validateMarbleChoice(player('a', 10), 1, settings()).ok).toBe(true);
    expect(validateMarbleChoice(player('a', 10), 10, settings()).ok).toBe(true);
  });

  it('tôn trọng maxBet của phòng', () => {
    const s = settings({ maxBet: 3 });
    expect(maxAllowedBet(player('a', 10), s)).toBe(3);
    expect(validateMarbleChoice(player('a', 10), 4, s).ok).toBe(false);
    expect(validateMarbleChoice(player('a', 10), 3, s).ok).toBe(true);
  });

  it('từ chối người đã bị loại hoặc hết bi', () => {
    const dead = { ...player('a', 0) };
    expect(validateMarbleChoice(dead, 1, settings()).ok).toBe(false);
    const out = { ...player('b', 5), eliminated: true };
    expect(validateMarbleChoice(out, 1, settings()).ok).toBe(false);
  });
});

describe('calculateTotal — design doc §2.2 ví dụ', () => {
  it('cộng đúng tổng bi trong tất cả bàn tay', () => {
    expect(calculateTotal({ a: 4, b: 2, c: 5 })).toBe(11);
  });

  it('bàn trống trả về 0', () => {
    expect(calculateTotal({})).toBe(0);
  });
});

describe('guessBounds / validateGuess', () => {
  it('min = số người chơi (mỗi người ít nhất 1 viên)', () => {
    const players = [player('a', 10), player('b', 10), player('c', 7)];
    expect(guessBounds(players, settings())).toEqual({ min: 3, max: 27 });
  });

  it('max bị giới hạn bởi maxBet', () => {
    const players = [player('a', 10), player('b', 10)];
    expect(guessBounds(players, settings({ maxBet: 3 }))).toEqual({ min: 2, max: 6 });
  });

  it('chặn dự đoán ngoài khoảng', () => {
    const players = [player('a', 10), player('b', 10)];
    expect(validateGuess(1, players, settings()).ok).toBe(false);
    expect(validateGuess(21, players, settings()).ok).toBe(false);
    expect(validateGuess(11, players, settings()).ok).toBe(true);
  });
});

describe('resolveGuess — design doc §6', () => {
  const guesses = [
    { teamId: 't1', value: 8 },
    { teamId: 't2', value: 10 },
    { teamId: 't3', value: 12 },
  ];

  it('Rule A: chỉ đội đoán đúng tuyệt đối thắng', () => {
    expect(resolveGuess(guesses, 10, WinRule.EXACT).winningTeamIds).toEqual(['t2']);
  });

  it('Rule A: không ai đúng thì không có đội thắng', () => {
    expect(resolveGuess(guesses, 11, WinRule.EXACT).winningTeamIds).toEqual([]);
  });

  it('Rule B: không ai đúng thì đội gần nhất thắng', () => {
    // 8/10/12 so với 13 => lệch 5/3/1, t3 gần nhất.
    expect(resolveGuess(guesses, 13, WinRule.CLOSEST).winningTeamIds).toEqual(['t3']);
  });

  it('Rule B: cách đều hai bên thì cả hai cùng thắng', () => {
    expect(resolveGuess(guesses, 11, WinRule.CLOSEST).winningTeamIds).toEqual(['t2', 't3']);
  });

  it('Rule B: hoà khoảng cách thì cùng thắng', () => {
    expect(resolveGuess(guesses, 9, WinRule.CLOSEST).winningTeamIds).toEqual(['t1', 't2']);
  });

  it('Rule C: các đội trùng giá trị bị loại khỏi quyền thắng', () => {
    const dup = [
      { teamId: 't1', value: 10 },
      { teamId: 't2', value: 10 },
      { teamId: 't3', value: 12 },
    ];
    const r = resolveGuess(dup, 10, WinRule.EXACT_UNIQUE);
    expect(r.winningTeamIds).toEqual([]);
    expect(r.scored.filter((s) => s.disqualified).map((s) => s.teamId)).toEqual(['t1', 't2']);
  });

  it('Rule C: đội đoán đúng và không trùng thì thắng', () => {
    const dup = [
      { teamId: 't1', value: 12 },
      { teamId: 't2', value: 12 },
      { teamId: 't3', value: 10 },
    ];
    expect(resolveGuess(dup, 10, WinRule.EXACT_UNIQUE).winningTeamIds).toEqual(['t3']);
  });

  it('không có đáp án nào thì không có đội thắng', () => {
    expect(resolveGuess([], 10, WinRule.CLOSEST).winningTeamIds).toEqual([]);
  });
});

describe('applyRoundResult — cập nhật số bi', () => {
  const players = [
    player('a', 10, 't1', 0),
    player('b', 10, 't2', 1),
    player('c', 10, 't2', 2),
  ];
  const teams = [team('t1'), team('t2')];

  it('tính đúng tổng thực tế và người thắng', () => {
    const r = applyRoundResult({
      round: 1,
      players,
      teams,
      selections: { a: 4, b: 2, c: 5 },
      guesses: [
        { teamId: 't1', value: 9 },
        { teamId: 't2', value: 11 },
      ],
      settings: settings({ winRule: WinRule.EXACT }),
    });
    expect(r.actualTotal).toBe(11);
    expect(r.winningTeamIds).toEqual(['t2']);
    expect(r.push).toBe(false);
  });

  it('STAKE: đội thắng chia pot của phe thua, phe thua mất phần đã đặt', () => {
    const r = applyRoundResult({
      round: 1,
      players,
      teams,
      selections: { a: 4, b: 2, c: 5 },
      guesses: [
        { teamId: 't1', value: 9 },
        { teamId: 't2', value: 11 },
      ],
      settings: settings({ winRule: WinRule.EXACT, payout: PayoutMode.STAKE }),
    });
    const byId = Object.fromEntries(r.marbleDeltas.map((d) => [d.playerId, d]));
    expect(byId.a!.delta).toBe(-4);
    expect(byId.a!.after).toBe(6);
    // pot = 4, chia cho b và c => 2 mỗi người
    expect(byId.b!.delta).toBe(2);
    expect(byId.c!.delta).toBe(2);
  });

  it('STAKE: bảo toàn tổng số bi trên bàn', () => {
    const before = players.reduce((s, p) => s + p.marbleCount, 0);
    const r = applyRoundResult({
      round: 1,
      players,
      teams,
      selections: { a: 4, b: 2, c: 5 },
      guesses: [
        { teamId: 't1', value: 11 },
        { teamId: 't2', value: 9 },
      ],
      settings: settings({ winRule: WinRule.EXACT }),
    });
    const after = r.marbleDeltas.reduce((s, d) => s + d.after, 0);
    expect(after).toBe(before);
  });

  it('STAKE: phần dư của pot lẻ được trao cho người đặt nhiều bi nhất', () => {
    const r = applyRoundResult({
      round: 1,
      players,
      teams,
      selections: { a: 5, b: 2, c: 4 },
      guesses: [
        { teamId: 't1', value: 99 },
        { teamId: 't2', value: 11 },
      ],
      settings: settings({ winRule: WinRule.CLOSEST }),
    });
    const byId = Object.fromEntries(r.marbleDeltas.map((d) => [d.playerId, d]));
    // pot = 5, hai người thắng => 3 cho c (đặt 4 bi) và 2 cho b
    expect(byId.c!.delta).toBe(3);
    expect(byId.b!.delta).toBe(2);
    expect(byId.a!.delta).toBe(-5);
  });

  it('push: không ai đúng theo Rule A thì hoàn bi cho tất cả', () => {
    const r = applyRoundResult({
      round: 1,
      players,
      teams,
      selections: { a: 4, b: 2, c: 5 },
      guesses: [
        { teamId: 't1', value: 9 },
        { teamId: 't2', value: 20 },
      ],
      settings: settings({ winRule: WinRule.EXACT }),
    });
    expect(r.push).toBe(true);
    expect(r.marbleDeltas.every((d) => d.delta === 0)).toBe(true);
  });

  it('FIXED: thắng +N, thua -N và không âm', () => {
    const poor = [player('a', 1, 't1', 0), player('b', 10, 't2', 1)];
    const r = applyRoundResult({
      round: 1,
      players: poor,
      teams,
      selections: { a: 1, b: 3 },
      guesses: [
        { teamId: 't1', value: 99 },
        { teamId: 't2', value: 4 },
      ],
      settings: settings({ winRule: WinRule.EXACT, payout: PayoutMode.FIXED, fixedPayout: 3 }),
    });
    const byId = Object.fromEntries(r.marbleDeltas.map((d) => [d.playerId, d]));
    expect(byId.a!.delta).toBe(-1); // chỉ mất tối đa số bi đang có
    expect(byId.a!.after).toBe(0);
    expect(byId.b!.delta).toBe(3);
  });

  it('không mutate players đầu vào', () => {
    const snapshot = players.map((p) => p.marbleCount);
    applyRoundResult({
      round: 1,
      players,
      teams,
      selections: { a: 4, b: 2, c: 5 },
      guesses: [{ teamId: 't2', value: 11 }],
      settings: settings({ winRule: WinRule.EXACT }),
    });
    expect(players.map((p) => p.marbleCount)).toEqual(snapshot);
  });

  it('người không tham gia lượt không bị thay đổi số bi', () => {
    const withOut = [...players, { ...player('d', 8, 't1', 3), eliminated: true }];
    const r = applyRoundResult({
      round: 1,
      players: withOut,
      teams,
      selections: { a: 4, b: 2, c: 5 },
      guesses: [{ teamId: 't2', value: 11 }],
      settings: settings({ winRule: WinRule.EXACT }),
    });
    expect(r.marbleDeltas.find((d) => d.playerId === 'd')!.delta).toBe(0);
    expect(r.reveals.some((x) => x.playerId === 'd')).toBe(false);
  });
});

describe('hết bi và kết thúc trận — design doc §8, §19', () => {
  it('game over khi hết số vòng', () => {
    const p = [player('a', 5, 't1'), player('b', 5, 't2')];
    expect(isGameOver(p, 10, settings({ totalRounds: 10 }))).toBe(true);
    expect(isGameOver(p, 9, settings({ totalRounds: 10 }))).toBe(false);
  });

  it('game over khi chỉ còn một người còn bi', () => {
    const p = [player('a', 20, 't1'), player('b', 0, 't2')];
    expect(isGameOver(p, 1, settings())).toBe(true);
  });

  it('game over khi mọi người còn bi đều cùng một đội', () => {
    const p = [player('a', 5, 't1'), player('b', 5, 't1'), player('c', 0, 't2')];
    expect(isGameOver(p, 1, settings())).toBe(true);
  });

  it('xếp hạng cuối trận theo số bi, đồng hạng khi bằng nhau', () => {
    const p = [player('a', 4, 't1', 0), player('b', 9, 't2', 1), player('c', 4, 't3', 2)];
    const st = finalStandings(p);
    expect(st[0]).toEqual({ playerId: 'b', marbles: 9, rank: 1 });
    expect(st[1]!.rank).toBe(2);
    expect(st[2]!.rank).toBe(2);
  });
});

describe('xúc xắc — design doc §9, §47', () => {
  it('ba mặt đầu là vay 3 / 6 / 9 bi', () => {
    const faces = buildDiceFaces(DEFAULT_SETTINGS.penalties);
    expect(faces).toHaveLength(6);
    expect(faces.slice(0, 3).map((f) => f.marbles)).toEqual([3, 6, 9]);
    expect(faces.slice(3).every((f) => f.kind === 'PENALTY')).toBe(true);
  });

  it('resolveDice trả về số bi vay đúng', () => {
    const r = resolveDice('p1', 2, DEFAULT_SETTINGS.penalties);
    expect(r.marblesGained).toBe(6);
    expect(r.penalty).toBeNull();
  });

  it('resolveDice trả về hình phạt cho mặt 4-6', () => {
    const r = resolveDice('p1', 4, DEFAULT_SETTINGS.penalties);
    expect(r.marblesGained).toBe(0);
    expect(r.penalty).not.toBeNull();
    expect(r.face.kind).toBe('PENALTY');
  });

  it('mặt ngoài 1-6 không làm sập server', () => {
    expect(resolveDice('p1', 99, DEFAULT_SETTINGS.penalties).faceIndex).toBe(1);
  });

  it('rollDiceFace luôn nằm trong 1..6', () => {
    for (let i = 0; i < 500; i += 1) {
      const f = rollDiceFace();
      expect(f).toBeGreaterThanOrEqual(1);
      expect(f).toBeLessThanOrEqual(6);
    }
  });

  it('rollDiceFace phủ hết 6 mặt', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) seen.add(rollDiceFace());
    expect(seen.size).toBe(6);
  });

  it('phòng tắt xúc xắc dùng luật loại thẳng', () => {
    expect(settings({ diceEnabled: false, brokeRule: BrokeRule.ELIMINATE }).brokeRule).toBe('ELIMINATE');
  });
});
