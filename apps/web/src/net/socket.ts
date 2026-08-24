import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ErrorCode, ServerEvents } from '@tongbi/game-rules';

export type ClientSocket = Socket<ServerEvents, ClientEvents>;

/** Lỗi từ server, giữ nguyên mã để UI xử lý riêng (ví dụ ROOM_FULL). */
export class ServerError extends Error {
  constructor(message: string, readonly code?: ErrorCode) {
    super(message);
    this.name = 'ServerError';
  }
}

/**
 * Dev: web chạy ở :5173, game server ở :10000 (deployment guide Phase A).
 * Production: server phục vụ luôn bản build nên dùng chung origin, trừ khi
 * frontend deploy riêng (Vercel) thì đặt VITE_SERVER_URL lúc build.
 */
const DEV_SERVER_PORT = 10000;

export const SERVER_URL: string =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ??
  (import.meta.env.DEV
    ? `http://${window.location.hostname}:${DEV_SERVER_PORT}`
    : window.location.origin);

let socket: ClientSocket | null = null;

export function getSocket(): ClientSocket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      reconnectionAttempts: Infinity,
      autoConnect: true,
    });
  }
  return socket;
}

/** Bọc emit có ack thành Promise cho dễ dùng trong React. */
export function emitAck<T extends object = object>(
  event: string,
  payload?: unknown,
): Promise<{ ok: true } & T> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timeout = setTimeout(() => reject(new Error('Máy chủ không phản hồi.')), 10000);
    const handle = (res: { ok: boolean; error?: string; code?: ErrorCode } & Partial<T>) => {
      clearTimeout(timeout);
      if (res?.ok) resolve(res as { ok: true } & T);
      else reject(new ServerError(res?.error ?? 'Thao tác thất bại.', res?.code));
    };
    if (payload === undefined) (s as unknown as SocketEmit).emit(event, handle);
    else (s as unknown as SocketEmit).emit(event, payload, handle);
  });
}

interface SocketEmit {
  emit(event: string, ...args: unknown[]): void;
}
