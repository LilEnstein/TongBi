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

/**
 * `CORS_ORIGIN` là tên cũ của biến này; giữ lại để deploy hiện có không gãy.
 * `*` nghĩa là cho phép mọi origin — chỉ nên dùng ở local/preview.
 */
function parseOrigins(raw: string | undefined): string[] | '*' {
  const value = (raw ?? '').trim();
  if (!value || value === '*') return '*';
  const list = value
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list.length > 0 ? list : '*';
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
  return [
    `port=${config.port}`,
    `host=${config.host}`,
    `origins=${origins}`,
    `maxPlayersPerRoom=${config.maxPlayersPerRoom}`,
    `roomTtl=${Math.round(config.roomTtlMs / 60_000)}m`,
    `env=${config.nodeEnv}`,
  ].join(' ');
}
