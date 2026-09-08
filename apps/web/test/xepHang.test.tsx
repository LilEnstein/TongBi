/**
 * Xếp hạng các phe cuối vòng — thứ tự, cách chia hạng khi hoà, và việc gắn
 * đúng đáp án / số bi của từng đứa vào dòng của phe nó.
 */
import { describe, expect, it } from 'vitest';
import type { Player, RoundResult, Team } from '@tongbi/game-rules';
import { loiDoan, xepHang, type DongPhe } from '../src/ui/BangXepHang.js';

function phe(id: string, name: string, score: number, color = '#1F3F63'): Team {
  return { id, name, color, captainId: null, score };
}

function nguoi(id: string, name: string, teamId: string, seat: number, marbleCount = 6): Player {
  return {
    id,
    name,
    avatar: 'trau',
    teamId,
    marbleCount,
    connected: true,
    eliminated: false,
    isHost: false,
    seat,
  };
}

function ketQua(patch: Partial<RoundResult> = {}): RoundResult {
  return {
    round: 5,
    actualTotal: 11,
    reveals: [],
    guesses: [],
    winningTeamIds: [],
    marbleDeltas: [],
    push: false,
    ...patch,
  };
}

describe('xepHang', () => {
  it('xếp phe theo điểm giảm dần', () => {
    const teams = [phe('a', 'Đội Chàm', 2), phe('b', 'Đội Điều', 5), phe('c', 'Đội Lá', 3)];
    const players = [nguoi('p1', 'Nam', 'a', 0), nguoi('p2', 'An', 'b', 1), nguoi('p3', 'Huy', 'c', 2)];

    const dong = xepHang(teams, players, ketQua());

    expect(dong.map((d) => d.team.id)).toEqual(['b', 'c', 'a']);
    expect(dong.map((d) => d.hang)).toEqual([1, 2, 3]);
  });

  it('hoà điểm thì chung hạng, hạng sau nhảy đúng số phe đứng trên', () => {
    const teams = [phe('a', 'Đội Chàm', 4), phe('b', 'Đội Điều', 4), phe('c', 'Đội Lá', 1)];
    const players = [nguoi('p1', 'Nam', 'a', 0), nguoi('p2', 'An', 'b', 1), nguoi('p3', 'Huy', 'c', 2)];

    const dong = xepHang(teams, players, ketQua());

    expect(dong.map((d) => d.hang)).toEqual([1, 1, 3]);
    // Bằng điểm thì giữ thứ tự server gửi, để bảng không nhảy giữa hai vòng.
    expect(dong.map((d) => d.team.id)).toEqual(['a', 'b', 'c']);
  });

  it('bỏ phe không còn ai khỏi bảng', () => {
    const teams = [phe('a', 'Đội Chàm', 3), phe('b', 'Đội Điều', 9)];
    const players = [nguoi('p1', 'Nam', 'a', 0)];

    const dong = xepHang(teams, players, ketQua());

    expect(dong.map((d) => d.team.id)).toEqual(['a']);
  });

  it('gắn đáp án, điểm vừa ăn và số bi của từng đứa vào đúng phe', () => {
    const teams = [phe('a', 'Đội Chàm', 3), phe('b', 'Đội Điều', 2)];
    const players = [
      nguoi('p1', 'Nam', 'a', 0, 8),
      nguoi('p2', 'Minh', 'a', 1, 7),
      nguoi('p3', 'An', 'b', 2, 4),
    ];

    const dong = xepHang(
      teams,
      players,
      ketQua({
        guesses: [
          { teamId: 'a', value: 11, delta: 0, disqualified: false },
          { teamId: 'b', value: 9, delta: 2, disqualified: false },
        ],
        winningTeamIds: ['a'],
        reveals: [
          { playerId: 'p1', marbles: 3 },
          { playerId: 'p2', marbles: 4 },
          { playerId: 'p3', marbles: 4 },
        ],
        marbleDeltas: [
          { playerId: 'p1', delta: 2, after: 8 },
          { playerId: 'p2', delta: 2, after: 7 },
          { playerId: 'p3', delta: -4, after: 4 },
        ],
      }),
    );

    const cham = dong[0]!;
    expect(cham.team.id).toBe('a');
    expect(cham.trung).toBe(true);
    expect(cham.doan).toBe(11);
    expect(cham.diemThem).toBe(1);
    expect(cham.nguoi.map((n) => [n.player.name, n.giau, n.chenh])).toEqual([
      ['Nam', 3, 2],
      ['Minh', 4, 2],
    ]);

    const dieu = dong[1]!;
    expect(dieu.trung).toBe(false);
    expect(dieu.diemThem).toBe(0);
    expect(dieu.lech).toBe(2);
    expect(dieu.nguoi[0]!.chenh).toBe(-4);
  });

  it('phe ngồi ngoài lượt: không có đáp án, người trong phe không có bi giấu', () => {
    const teams = [phe('a', 'Đội Chàm', 1)];
    const players = [nguoi('p1', 'Nam', 'a', 0, 5)];

    const dong = xepHang(teams, players, ketQua({ push: true }));

    expect(dong[0]!.doan).toBeNull();
    expect(dong[0]!.nguoi[0]!.giau).toBeNull();
    // Không có marbleDeltas thì lùi về số bi đang có, không hiện 0.
    expect(dong[0]!.nguoi[0]!.conLai).toBe(5);
  });

  it('rule C: phe đoán trùng số bị đánh dấu hỏng', () => {
    const teams = [phe('a', 'Đội Chàm', 0), phe('b', 'Đội Điều', 0)];
    const players = [nguoi('p1', 'Nam', 'a', 0), nguoi('p2', 'An', 'b', 1)];

    const dong = xepHang(
      teams,
      players,
      ketQua({
        guesses: [
          { teamId: 'a', value: 11, delta: 0, disqualified: true },
          { teamId: 'b', value: 11, delta: 0, disqualified: true },
        ],
        push: true,
      }),
    );

    expect(dong.every((d) => d.hong)).toBe(true);
    expect(dong.every((d) => d.trung === false)).toBe(true);
  });
});

describe('loiDoan', () => {
  const nen = (patch: Partial<DongPhe>): DongPhe => ({
    team: phe('a', 'Đội Chàm', 0),
    doi: 'cham',
    hang: 1,
    trung: false,
    hong: false,
    doan: 11,
    lech: 0,
    diemThem: 0,
    nguoi: [],
    ...patch,
  });

  it('chỉ ghi "trúng" khi lệch bằng 0', () => {
    expect(loiDoan(nen({ trung: true, doan: 11, lech: 0 }))).toBe('đoán 11 · trúng');
  });

  it('luật CLOSEST: thắng mà vẫn lệch thì KHÔNG được ghi "trúng"', () => {
    // Đây là chỗ bảng từng tự mâu thuẫn với cái mẹt tổng thật ở ngay phía trên:
    // phe đoán 8 thắng vì gần nhất, trong khi tổng thật là 6.
    const loi = loiDoan(nen({ trung: true, doan: 8, lech: 2 }));
    expect(loi).toBe('đoán 8 · lệch 2');
    expect(loi).not.toContain('trúng');
  });

  it('phe thua ghi đúng độ lệch', () => {
    expect(loiDoan(nen({ doan: 14, lech: 3 }))).toBe('đoán 14 · lệch 3');
  });

  it('rule C bị loại và phe không kịp đoán', () => {
    expect(loiDoan(nen({ hong: true, doan: 11, lech: 0 }))).toBe('đoán 11 · đụng đáp án phe khác');
    expect(loiDoan(nen({ doan: null }))).toBe('không kịp đoán');
  });
});
