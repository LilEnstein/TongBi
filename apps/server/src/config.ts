/**
 * Cấu hình runtime đọc từ environment — deployment guide "Environment variables".
 *
 *   PORT=10000                 cổng Render cấp cho Web Service
 *   CLIENT_ORIGIN=...          origin được phép gọi WebSocket (nhiều origin ngăn bởi dấu phẩy)
 *   MAX_PLAYERS_PER_ROOM=30    sức chứa một phòng
 *   ROOM_TTL_MINUTES=120       phòng không còn ai online quá lâu thì bị dọn
 *
 * Mọi giá trị đều có mặc định chạy được ngay để `npm run dev` không cần .env.
 */
import { MAX_PLAYERS, MIN_PLAYERS } from '@tongbi/game-rules';

/** Render mặc định cấp PORT; 10000 là cổng mặc định trong tài liệu của Render. */
const DEFAULT_PORT = 10000;
const DEFAULT_ROOM_TTL_MINUTES = 120;

function int(raw: string | undefined, fallback: number, lo: number, hi: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/** Các giá trị trong CLIENT_ORIGIN bị bỏ vì không phải origin hợp lệ. */
const originsBoQua: string[] = [];

/** Một origin hợp lệ trông như `https://abc.xyz` hoặc `http://localhost:5173`. */
function laOrigin(value: string): boolean {
  try {
    const u = new URL(value);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.host !== '';
  } catch {
    return false;
  }
}

/**
 * `CORS_ORIGIN` là tên cũ của biến này; giữ lại để deploy hiện có không gãy.
 * `*` nghĩa là cho phép mọi origin — chỉ nên dùng ở local/preview.
 *
 * Giá trị không phải origin (ví dụ ai đó gõ nhầm một dãy số vào ô env trên
 * dashboard) bị BỎ chứ không được nhận. Trước đây một giá trị rác sẽ thành
 * origin duy nhất được phép, tức là socket.io từ chối mọi trình duyệt thật và
 * cả sân im lặng không vào được — sập production mà log vẫn báo "listening".
 * Bỏ hết thì lùi về `*` (đúng như render.yaml ghi cho trường hợp để trống) và
 * `describeConfig()` in ra cảnh báo để người deploy biết mà sửa.
 */
function parseOrigins(raw: string | undefined): string[] | '*' {
  const value = (raw ?? '').trim();
  if (!value || value === '*') return '*';
  const list = value
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const hopLe = list.filter((o) => {
    if (laOrigin(o)) return true;
    originsBoQua.push(o);
    return false;
  });
  return hopLe.length > 0 ? hopLe : '*';
}

export const config = {
  port: int(process.env.PORT, DEFAULT_PORT, 1, 65535),
  /** Render yêu cầu bind 0.0.0.0 thay vì localhost. */
  host: process.env.HOST ?? '0.0.0.0',
  origins: parseOrigins(process.env.CLIENT_ORIGIN ?? process.env.CORS_ORIGIN),
  maxPlayersPerRoom: int(
    process.env.MAX_PLAYERS_PER_ROOM,
    MAX_PLAYERS,
    MIN_PLAYERS,
    MAX_PLAYERS,
  ),
  roomTtlMs: int(process.env.ROOM_TTL_MINUTES, DEFAULT_ROOM_TTL_MINUTES, 1, 24 * 60) * 60_000,
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;

/** Origin cho header CORS của các response HTTP thường. */
export function allowedOrigin(requestOrigin: string | undefined): string {
  if (config.origins === '*') return '*';
  const normalized = (requestOrigin ?? '').replace(/\/+$/, '');
  return config.origins.includes(normalized) ? normalized : config.origins[0]!;
}

export function describeConfig(): string {
  const origins = config.origins === '*' ? '*' : config.origins.join(', ');
  const dong = [
    `port=${config.port}`,
    `host=${config.host}`,
    `origins=${origins}`,
    `maxPlayersPerRoom=${config.maxPlayersPerRoom}`,
    `roomTtl=${Math.round(config.roomTtlMs / 60_000)}m`,
    `env=${config.nodeEnv}`,
  ];
  if (originsBoQua.length > 0) {
    dong.push(
      `CANH-BAO=CLIENT_ORIGIN có giá trị không phải origin, đã bỏ: ${originsBoQua.join(', ')}`,
    );
  }
  return dong.join(' ');
}
