/**
 * Event protocol giữa client và server — design doc §20.
 * Client chỉ gửi ý định; server validate rồi broadcast state (§17).
 */
import type {
  DiceOutcome,
  GameSettings,
  Penalty,
  PrivatePlayerState,
  PublicRoomState,
  RoundResult,
} from './types.js';

/** Thông tin phiên lưu ở localStorage để reconnect — design doc §36. */
export interface SessionCredentials {
  roomId: string;
  playerId: string;
  token: string;
}

export interface JoinPayload {
  roomId: string;
  name: string;
  avatar: string;
  /** Có sẵn khi reconnect. */
  playerId?: string;
  token?: string;
}

export interface CreateRoomPayload {
  name: string;
  avatar: string;
  settings?: Partial<GameSettings>;
}

/** Mã lỗi ổn định để client xử lý theo case — deployment guide (ROOM_FULL). */
export const ErrorCode = {
  ROOM_FULL: 'ROOM_FULL',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_LOCKED: 'ROOM_LOCKED',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  NOT_HOST: 'NOT_HOST',
  INVALID: 'INVALID',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type AckError = { ok: false; error: string; code?: ErrorCode };
export type AckOk<T> = { ok: true } & T;
export type Ack<T> = AckOk<T> | AckError;

/** Client → Server. */
export interface ClientEvents {
  CREATE_ROOM: (p: CreateRoomPayload, ack: (r: Ack<{ credentials: SessionCredentials }>) => void) => void;
  JOIN_ROOM: (p: JoinPayload, ack: (r: Ack<{ credentials: SessionCredentials }>) => void) => void;
  LEAVE_ROOM: () => void;

  UPDATE_SETTINGS: (p: Partial<GameSettings>, ack?: (r: Ack<object>) => void) => void;
  SET_PENALTIES: (p: { penalties: Penalty[] }, ack?: (r: Ack<object>) => void) => void;
  SET_TEAM: (p: { teamId: string }, ack?: (r: Ack<object>) => void) => void;
  SET_TEAM_COUNT: (p: { count: number }, ack?: (r: Ack<object>) => void) => void;
  KICK_PLAYER: (p: { playerId: string }, ack?: (r: Ack<object>) => void) => void;
  START_GAME: (ack?: (r: Ack<object>) => void) => void;

  /** Design doc §20 — SUBMIT_MARBLES. */
  SUBMIT_MARBLES: (p: { amount: number }, ack?: (r: Ack<object>) => void) => void;
  /** Đồng bộ giá trị đang soạn cho đồng đội (chưa khoá). */
  SET_GUESS: (p: { value: number }, ack?: (r: Ack<object>) => void) => void;
  LOCK_GUESS: (p: { value: number }, ack?: (r: Ack<object>) => void) => void;

  ROLL_DICE: (ack?: (r: Ack<object>) => void) => void;
  /** Người hết bi chọn bỏ cuộc thay vì tung xúc xắc — design doc §8 Option 1. */
  FORFEIT: (ack?: (r: Ack<object>) => void) => void;

  PLAY_AGAIN: (ack?: (r: Ack<object>) => void) => void;
  CHAT: (p: { text: string }) => void;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  text: string;
  at: number;
}

/** Server → Client. */
export interface ServerEvents {
  ROOM_STATE: (s: PublicRoomState) => void;
  PRIVATE_STATE: (s: PrivatePlayerState) => void;

  /** Các event chỉ để kích hoạt animation phía client — design doc §21. */
  PLAYER_LOCKED_MARBLES: (p: { playerId: string; at: number }) => void;
  ALL_PLAYERS_READY: (p: { at: number }) => void;
  START_REVEAL: (p: { at: number; reveals: Array<{ playerId: string; marbles: number }> }) => void;
  ROUND_RESULT: (p: RoundResult) => void;
  DICE_ROLL_STARTED: (p: { playerId: string; at: number }) => void;
  DICE_ROLL_RESULT: (p: DiceOutcome & { at: number }) => void;

  PLAYER_JOINED: (p: { playerId: string; name: string }) => void;
  PLAYER_LEFT: (p: { playerId: string; name: string }) => void;
  KICKED: (p: { reason: string }) => void;
  CHAT: (m: ChatMessage) => void;
  TOAST: (p: { kind: 'info' | 'error' | 'success'; text: string }) => void;
}
