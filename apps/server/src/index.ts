/**
 * Game server — Node.js + Socket.IO (design doc §16 Option A, §17).
 * Server giữ toàn bộ state phòng, validate mọi hành động và là nơi duy nhất
 * sinh random cho xúc xắc.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import {
  AVATAR_MAC_DINH,
  ErrorCode,
  GamePhase,
  type AckError,
  type ClientEvents,
  type ServerEvents,
} from '@tongbi/game-rules';
import { allowedOrigin, config, describeConfig } from './config.js';
import { newPlayerId, newToken, normalizeCode, RoomManager } from './roomManager.js';
import type { GameNamespace, GameSocket, SocketData } from './room.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
/** Khi build production, web/dist được server phục vụ luôn để deploy một dịch vụ duy nhất. */
const WEB_DIST = resolve(__dirname, '../../web/dist');

const httpServer = createServer(handleHttp);

const io = new Server<ClientEvents, ServerEvents, Record<string, never>, SocketData>(httpServer, {
  cors: { origin: config.origins, methods: ['GET', 'POST'] },
  // Heartbeat để phát hiện sớm client rớt mạng — deployment guide "Reconnect".
  pingInterval: 10000,
  pingTimeout: 20000,
});

const nsp = io.of('/') as unknown as GameNamespace;
const rooms = new RoomManager(nsp);

io.on('connection', (socket) => {
  const s = socket as unknown as GameSocket;

  s.on('CREATE_ROOM', (payload, ack) => {
    const room = rooms.create();
    if (payload?.settings) room.updateSettings(payload.settings);

    const playerId = newPlayerId();
    const token = newToken();
    const added = room.addPlayer(playerId, token, payload?.name ?? '', payload?.avatar ?? AVATAR_MAC_DINH, s.id);
    if (!added.ok) {
      rooms.delete(room.id);
      ack?.({ ok: false, error: added.error, code: added.code });
      return;
    }

    s.data.roomId = room.id;
    s.data.playerId = playerId;
    void s.join(room.id);
    ack?.({ ok: true, credentials: { roomId: room.id, playerId, token } });
    room.broadcastState();
    log(`room ${room.id} created by ${added.player.name}`);
  });

  s.on('JOIN_ROOM', (payload, ack) => {
    const roomId = normalizeCode(payload?.roomId ?? '');
    const room = rooms.get(roomId);
    if (!room) {
      ack?.({
        ok: false,
        error: 'Không tìm thấy phòng. Kiểm tra lại mã phòng.',
        code: ErrorCode.ROOM_NOT_FOUND,
      });
      return;
    }

    // Reconnect — design doc §36: nối lại phiên cũ nếu playerId + token còn hợp lệ.
    if (payload.playerId && payload.token && room.reattach(payload.playerId, payload.token, s.id)) {
      s.data.roomId = room.id;
      s.data.playerId = payload.playerId;
      void s.join(room.id);
      ack?.({
        ok: true,
        credentials: { roomId: room.id, playerId: payload.playerId, token: payload.token },
      });
      room.broadcastState();
      log(`player ${payload.playerId.slice(0, 8)} reconnected to ${room.id}`);
      return;
    }

    const playerId = newPlayerId();
    const token = newToken();
    const added = room.addPlayer(playerId, token, payload?.name ?? '', payload?.avatar ?? AVATAR_MAC_DINH, s.id);
    if (!added.ok) {
      ack?.({ ok: false, error: added.error, code: added.code });
      return;
    }

    s.data.roomId = room.id;
    s.data.playerId = playerId;
    void s.join(room.id);
    ack?.({ ok: true, credentials: { roomId: room.id, playerId, token } });
    s.to(room.id).emit('PLAYER_JOINED', { playerId, name: added.player.name });
    room.broadcastState();
  });

  /** Các hành động cần đang ở trong phòng. */
  const withRoom = <T>(
    ack: ((r: AckError) => void) | undefined,
    fn: (room: NonNullable<ReturnType<typeof rooms.get>>, playerId: string) => T,
  ): T | undefined => {
    const room = s.data.roomId ? rooms.get(s.data.roomId) : undefined;
    if (!room || !s.data.playerId || !room.getPlayer(s.data.playerId)) {
      ack?.({ ok: false, error: 'Bạn không ở trong phòng nào.', code: ErrorCode.NOT_IN_ROOM });
      return undefined;
    }
    return fn(room, s.data.playerId);
  };

  /** Hành động chỉ chủ phòng được làm. */
  const withHost = <T>(
    ack: ((r: AckError) => void) | undefined,
    fn: (room: NonNullable<ReturnType<typeof rooms.get>>, playerId: string) => T,
  ): T | undefined =>
    withRoom(ack, (room, playerId) => {
      if (room.hostId !== playerId) {
        ack?.({
          ok: false,
          error: 'Chỉ chủ phòng mới làm được việc này.',
          code: ErrorCode.NOT_HOST,
        });
        return undefined;
      }
      return fn(room, playerId);
    });

  s.on('UPDATE_SETTINGS', (patch, ack) => {
    withHost(ack, (room) => {
      if (room.hasStarted()) {
        ack?.({ ok: false, error: 'Không đổi được luật khi trận đang diễn ra.' });
        return;
      }
      room.updateSettings(patch ?? {});
      room.broadcastState();
      ack?.({ ok: true });
    });
  });

  s.on('SET_PENALTIES', (payload, ack) => {
    withHost(ack, (room) => {
      room.setPenalties(payload?.penalties ?? []);
      room.broadcastState();
      ack?.({ ok: true });
    });
  });

  s.on('SET_TEAM_COUNT', (payload, ack) => {
    withHost(ack, (room) => {
      if (room.hasStarted()) {
        ack?.({ ok: false, error: 'Không đổi được đội khi trận đang diễn ra.' });
        return;
      }
      room.setTeamMode(payload?.count ?? 0);
      room.broadcastState();
      ack?.({ ok: true });
    });
  });

  s.on('SET_TEAM', (payload, ack) => {
    withRoom(ack, (room, playerId) => {
      if (room.hasStarted()) {
        ack?.({ ok: false, error: 'Không đổi được đội khi trận đang diễn ra.' });
        return;
      }
      const ok = room.setPlayerTeam(playerId, payload?.teamId ?? '');
      if (!ok) {
        ack?.({ ok: false, error: 'Đội không hợp lệ.' });
        return;
      }
      room.broadcastState();
      ack?.({ ok: true });
    });
  });

  s.on('KICK_PLAYER', (payload, ack) => {
    withHost(ack, (room, hostId) => {
      const target = payload?.playerId ?? '';
      if (target === hostId) {
        ack?.({ ok: false, error: 'Không thể tự mời mình ra khỏi phòng.' });
        return;
      }
      const p = room.getPlayer(target);
      if (!p) {
        ack?.({ ok: false, error: 'Không tìm thấy người chơi.' });
        return;
      }
      if (p.socketId) {
        nsp.to(p.socketId).emit('KICKED', { reason: 'Bạn đã bị chủ phòng mời ra khỏi phòng.' });
        nsp.sockets.get(p.socketId)?.leave(room.id);
      }
      room.removePlayer(target);
      room.broadcastState();
      ack?.({ ok: true });
    });
  });

  s.on('START_GAME', (ack) => {
    withHost(ack, (room) => {
      const r = room.startGame();
      if (!r.ok) {
        ack?.({ ok: false, error: r.error ?? 'Không bắt đầu được.' });
        return;
      }
      ack?.({ ok: true });
      log(`room ${room.id} started with ${room.playerCount} players`);
    });
  });

  s.on('SUBMIT_MARBLES', (payload, ack) => {
    withRoom(ack, (room, playerId) => {
      const r = room.submitMarbles(playerId, Number(payload?.amount));
      ack?.(r.ok ? { ok: true } : { ok: false, error: r.error ?? 'Không hợp lệ.' });
    });
  });

  s.on('SET_GUESS', (payload, ack) => {
    withRoom(ack, (room, playerId) => {
      const r = room.setGuess(playerId, Number(payload?.value));
      ack?.(r.ok ? { ok: true } : { ok: false, error: r.error ?? 'Không hợp lệ.' });
    });
  });

  s.on('LOCK_GUESS', (payload, ack) => {
    withRoom(ack, (room, playerId) => {
      const r = room.lockGuess(playerId, Number(payload?.value));
      ack?.(r.ok ? { ok: true } : { ok: false, error: r.error ?? 'Không hợp lệ.' });
    });
  });

  s.on('ROLL_DICE', (ack) => {
    withRoom(ack, (room, playerId) => {
      const r = room.rollDice(playerId);
      ack?.(r.ok ? { ok: true } : { ok: false, error: r.error ?? 'Không tung được.' });
    });
  });

  s.on('FORFEIT', (ack) => {
    withRoom(ack, (room, playerId) => {
      const r = room.forfeit(playerId);
      ack?.(r.ok ? { ok: true } : { ok: false, error: r.error ?? 'Không hợp lệ.' });
    });
  });

  s.on('PLAY_AGAIN', (ack) => {
    withHost(ack, (room) => {
      const r = room.playAgain();
      ack?.(r.ok ? { ok: true } : { ok: false, error: r.error ?? 'Không hợp lệ.' });
    });
  });

  s.on('CHAT', (payload) => {
    withRoom(undefined, (room, playerId) => {
      const text = String(payload?.text ?? '').trim().slice(0, 200);
      if (!text) return;
      const p = room.getPlayer(playerId);
      if (!p) return;
      nsp.to(room.id).emit('CHAT', {
        id: `${Date.now()}-${playerId.slice(0, 6)}`,
        playerId,
        name: p.name,
        text,
        at: Date.now(),
      });
    });
  });

  s.on('LEAVE_ROOM', () => {
    const room = s.data.roomId ? rooms.get(s.data.roomId) : undefined;
    if (!room || !s.data.playerId) return;
    const p = room.getPlayer(s.data.playerId);
    room.removePlayer(s.data.playerId);
    void s.leave(room.id);
    if (p) s.to(room.id).emit('PLAYER_LEFT', { playerId: p.id, name: p.name });
    if (room.isEmpty()) rooms.delete(room.id);
    else room.broadcastState();
    s.data.roomId = undefined;
    s.data.playerId = undefined;
  });

  s.on('disconnect', () => {
    const room = s.data.roomId ? rooms.get(s.data.roomId) : undefined;
    if (!room || !s.data.playerId) return;
    const p = room.getPlayer(s.data.playerId);
    const wasCurrentSocket = p?.socketId === s.id;
    room.markDisconnected(s.data.playerId, s.id);
    if (p && wasCurrentSocket && room.phase === GamePhase.WAITING) {
      s.to(room.id).emit('PLAYER_LEFT', { playerId: p.id, name: p.name });
    }
    if (room.isEmpty()) rooms.delete(room.id);
    else room.broadcastState();
  });
});

// ───────────────────────────────── HTTP ─────────────────────────────────────

function handleHttp(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const origin = allowedOrigin(req.headers.origin);

  // Preflight cho các endpoint /api khi frontend nằm ở domain khác (Vercel).
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  /** Health check — deployment guide: { status, rooms, players }. */
  if (url.pathname === '/health') {
    return json(res, 200, {
      status: 'ok',
      rooms: rooms.size,
      players: rooms.playerCount,
      maxPlayersPerRoom: config.maxPlayersPerRoom,
      uptime: Math.round(process.uptime()),
    }, origin);
  }

  if (url.pathname === '/api/rooms') {
    return json(res, 200, { rooms: rooms.list() }, origin);
  }

  // Kiểm tra mã phòng trước khi client mở màn hình join.
  if (url.pathname === '/api/room' && url.searchParams.has('id')) {
    const room = rooms.get(url.searchParams.get('id') ?? '');
    if (!room) {
      return json(
        res,
        404,
        { ok: false, error: 'Không tìm thấy phòng.', code: ErrorCode.ROOM_NOT_FOUND },
        origin,
      );
    }
    const locked = room.hasStarted() && room.settings.lockOnStart;
    return json(res, 200, {
      ok: true,
      room: room.summary(),
      joinable: !locked && !room.isFull,
      full: room.isFull,
    }, origin);
  }

  if (existsSync(WEB_DIST)) return serveStatic(url.pathname, res);

  json(res, 404, { ok: false, error: 'Not found' }, origin);
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
};

/** Phục vụ SPA đã build; mọi route không phải file đều trả về index.html. */
function serveStatic(pathname: string, res: ServerResponse): void {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  let file = join(WEB_DIST, rel);
  if (!file.startsWith(WEB_DIST)) file = join(WEB_DIST, 'index.html');
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(WEB_DIST, 'index.html');
  if (!existsSync(file)) return json(res, 404, { ok: false, error: 'Not found' });

  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': file.includes('assets') ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

function json(res: ServerResponse, status: number, body: unknown, origin = '*'): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  });
  res.end(payload);
}

function log(msg: string): void {
  process.stdout.write(`[tongbi] ${new Date().toISOString()} ${msg}\n`);
}

// Render (và mọi PaaS khác) yêu cầu bind 0.0.0.0 chứ không phải localhost.
httpServer.listen(config.port, config.host, () => {
  log(`game server listening on ${config.host}:${config.port}`);
  log(describeConfig());
  if (existsSync(WEB_DIST)) log(`serving web build from ${WEB_DIST}`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    log('shutting down');
    io.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
