import { randomBytes, randomUUID } from 'node:crypto';
import { config } from './config.js';
import { Room, type GameNamespace } from './room.js';

/** Bỏ các ký tự dễ đọc nhầm (0/O, 1/I) vì người chơi sẽ gõ tay mã phòng. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** Phòng không còn ai online quá lâu sẽ bị dọn — env ROOM_TTL_MINUTES. */
const SWEEP_INTERVAL_MS = 60 * 1000;

export class RoomManager {
  private rooms = new Map<string, Room>();
  private sweeper: NodeJS.Timeout;

  constructor(private readonly io: GameNamespace) {
    this.sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    this.sweeper.unref?.();
  }

  create(): Room {
    const id = this.generateCode();
    const room = new Room(id, this.io);
    this.rooms.set(id, room);
    return room;
  }

  get(id: string): Room | undefined {
    return this.rooms.get(normalizeCode(id));
  }

  delete(id: string): void {
    const room = this.rooms.get(id);
    if (!room) return;
    room.dispose();
    this.rooms.delete(id);
  }

  get size(): number {
    return this.rooms.size;
  }

  /** Tổng số người đang ở trong mọi phòng — dùng cho /health. */
  get playerCount(): number {
    let total = 0;
    for (const room of this.rooms.values()) total += room.playerCount;
    return total;
  }

  list() {
    return [...this.rooms.values()].map((r) => r.summary());
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const bytes = randomBytes(CODE_LENGTH);
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i += 1) {
        code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
      }
      if (!this.rooms.has(code)) return code;
    }
    return `R${Date.now().toString(36).toUpperCase()}`;
  }

  /** Dọn phòng rỗng hoặc phòng mà tất cả đã offline quá lâu. */
  private sweep(): void {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      const idle = now - room.lastActivity > config.roomTtlMs;
      if (room.isEmpty() || (room.connectedCount === 0 && idle)) {
        room.dispose();
        this.rooms.delete(id);
      }
    }
  }
}

export function normalizeCode(raw: string): string {
  return String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function newPlayerId(): string {
  return randomUUID();
}

/** Token bí mật để reconnect — design doc §36. */
export function newToken(): string {
  return randomBytes(24).toString('hex');
}
