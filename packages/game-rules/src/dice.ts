/**
 * "Challenge die" 6 mặt — design doc §9.
 * Ba mặt cho vay bi (3 / 6 / 9), ba mặt còn lại là hình phạt tuỳ chỉnh của chủ trò.
 */
import type { DiceFace, DiceOutcome, Penalty } from './types.js';

export const DEFAULT_PENALTIES: Penalty[] = [
  {
    id: 'pushup',
    label: 'Hít đất',
    description: 'Hít đất 10 cái tại chỗ.',
    icon: '💪',
    severity: 'MEDIUM',
  },
  {
    id: 'squat',
    label: 'Thụt xì dầu',
    description: 'Thụt xì dầu 15 cái.',
    icon: '🏋️',
    severity: 'MEDIUM',
  },
  {
    id: 'carry',
    label: 'Cõng đồng đội',
    description: 'Cõng một đồng đội đi một vòng.',
    icon: '🤝',
    severity: 'HEAVY',
  },
  {
    id: 'sing',
    label: 'Hát một bài',
    description: 'Hát trọn một đoạn điệp khúc.',
    icon: '🎤',
    severity: 'LIGHT',
  },
  {
    id: 'joke',
    label: 'Kể chuyện cười',
    description: 'Kể một chuyện cười, không ai cười thì kể tiếp.',
    icon: '😂',
    severity: 'LIGHT',
  },
];

/** Số bi vay ứng với ba mặt BORROW. */
export const BORROW_VALUES = [3, 6, 9] as const;

/**
 * Dựng 6 mặt xúc xắc từ bộ hình phạt của phòng.
 * Mặt 1–3 luôn là vay 3/6/9 bi; mặt 4–6 lấy từ danh sách hình phạt (lặp lại nếu thiếu).
 */
export function buildDiceFaces(penalties: Penalty[]): DiceFace[] {
  const pool = penalties.length > 0 ? penalties : DEFAULT_PENALTIES;
  const faces: DiceFace[] = BORROW_VALUES.map((marbles, i) => ({
    index: i + 1,
    kind: 'BORROW' as const,
    marbles,
    label: `+${marbles} bi`,
    icon: '🔵',
  }));
  for (let i = 0; i < 3; i += 1) {
    const p = pool[i % pool.length]!;
    faces.push({
      index: 4 + i,
      kind: 'PENALTY',
      label: p.label,
      icon: p.icon,
    });
  }
  return faces;
}

/**
 * Áp dụng kết quả một mặt xúc xắc.
 * `faceIndex` phải do server sinh (design doc §47) — hàm này chỉ diễn giải kết quả.
 */
export function resolveDice(
  playerId: string,
  faceIndex: number,
  penalties: Penalty[],
): DiceOutcome {
  const faces = buildDiceFaces(penalties);
  const face = faces[faceIndex - 1] ?? faces[0]!;
  const pool = penalties.length > 0 ? penalties : DEFAULT_PENALTIES;
  const penalty =
    face.kind === 'PENALTY' ? (pool[(face.index - 4) % pool.length] ?? null) : null;
  return {
    playerId,
    faceIndex: face.index,
    face,
    marblesGained: face.kind === 'BORROW' ? (face.marbles ?? 0) : 0,
    penalty,
  };
}

/**
 * RNG của server — design doc §47: mọi random quan trọng phải sinh ở server.
 * Dùng crypto khi có để tránh Math.random dự đoán được.
 */
export function rollDiceFace(random: () => number = defaultRandom): number {
  return 1 + Math.floor(random() * 6);
}

function defaultRandom(): number {
  // Khai báo cấu trúc thay vì dùng type `Crypto` của DOM để package chạy được
  // cả trên Node (lib ES2022) lẫn trình duyệt.
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) {
    const buf = new Uint32Array(1);
    c.getRandomValues(buf);
    return buf[0]! / 2 ** 32;
  }
  return Math.random();
}
