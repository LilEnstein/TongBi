import { create } from 'zustand';
import type {
  ChatMessage,
  DiceOutcome,
  PrivatePlayerState,
  PublicRoomState,
  RoundResult,
  SessionCredentials,
} from '@tongbi/game-rules';
import { getSocket } from './socket.js';
import { loadSession, saveSession } from '../lib/session.js';
import { sfx } from '../audio/sfx.js';

export interface Toast {
  id: number;
  kind: 'info' | 'error' | 'success';
  text: string;
}

/**
 * Server chỉ gửi event mốc; client tự chạy animation từ mốc đó (design doc §21).
 * `revealAt` là timestamp server bắt đầu REVEAL để mọi máy mở tay cùng nhịp.
 */
export interface RevealCue {
  at: number;
  reveals: Array<{ playerId: string; marbles: number }>;
}

export interface DiceCue {
  playerId: string;
  at: number;
  outcome: DiceOutcome | null;
}

interface GameStore {
  connected: boolean;
  credentials: SessionCredentials | null;
  room: PublicRoomState | null;
  privateState: PrivatePlayerState | null;
  revealCue: RevealCue | null;
  diceCue: DiceCue | null;
  lastResult: RoundResult | null;
  chat: ChatMessage[];
  toasts: Toast[];
  kicked: string | null;

  setCredentials: (c: SessionCredentials | null) => void;
  pushToast: (kind: Toast['kind'], text: string) => void;
  dismissToast: (id: number) => void;
  reset: () => void;
}

let toastSeq = 0;

export const useGame = create<GameStore>((set) => ({
  connected: false,
  credentials: loadSession(),
  room: null,
  privateState: null,
  revealCue: null,
  diceCue: null,
  lastResult: null,
  chat: [],
  toasts: [],
  kicked: null,

  setCredentials: (c) => {
    saveSession(c);
    set({ credentials: c });
  },
  pushToast: (kind, text) => {
    const id = (toastSeq += 1);
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  reset: () =>
    set({
      room: null,
      privateState: null,
      revealCue: null,
      diceCue: null,
      lastResult: null,
      chat: [],
      kicked: null,
    }),
}));

let wired = false;

/** Gắn listener một lần duy nhất cho vòng đời app. */
export function wireSocket(): void {
  if (wired) return;
  wired = true;
  const socket = getSocket();
  const { pushToast } = useGame.getState();

  socket.on('connect', () => useGame.setState({ connected: true }));
  socket.on('disconnect', () => useGame.setState({ connected: false }));
  socket.on('connect_error', () => useGame.setState({ connected: false }));

  socket.on('ROOM_STATE', (state) => {
    const prev = useGame.getState().room;
    const newRound = prev !== null && prev.round !== state.round;
    useGame.setState((s) => ({
      room: state,
      lastResult: state.lastResult,
      // Cue của lượt trước phải bị xoá, nếu không sang lượt mới các bàn tay sẽ
      // mở bung ngay vì mốc mở tay cũ đã nằm trong quá khứ.
      revealCue: newRound ? null : s.revealCue,
      diceCue: newRound ? null : s.diceCue,
    }));
    if (prev && prev.phase !== state.phase) sfx.phase(state.phase);
  });

  socket.on('PRIVATE_STATE', (priv) => useGame.setState({ privateState: priv }));

  socket.on('PLAYER_LOCKED_MARBLES', () => sfx.handClose());

  socket.on('ALL_PLAYERS_READY', () => sfx.whoosh());

  socket.on('START_REVEAL', (cue) => useGame.setState({ revealCue: cue }));

  socket.on('ROUND_RESULT', (result) => {
    useGame.setState({ lastResult: result });
    const me = useGame.getState().credentials?.playerId;
    const room = useGame.getState().room;
    const myTeam = room?.players.find((p) => p.id === me)?.teamId;
    if (myTeam && result.winningTeamIds.includes(myTeam)) sfx.win();
    else if (result.push) sfx.neutral();
    else sfx.lose();
  });

  socket.on('DICE_ROLL_STARTED', ({ playerId, at }) => {
    useGame.setState({ diceCue: { playerId, at, outcome: null } });
    sfx.diceShake();
  });

  socket.on('DICE_ROLL_RESULT', (outcome) => {
    useGame.setState((s) => ({
      diceCue: { playerId: outcome.playerId, at: outcome.at, outcome },
      room: s.room ? { ...s.room, lastDice: outcome } : s.room,
    }));
  });

  socket.on('PLAYER_JOINED', ({ name }) => pushToast('info', `${name} đã vào phòng.`));
  socket.on('PLAYER_LEFT', ({ name }) => pushToast('info', `${name} đã rời phòng.`));
  socket.on('CHAT', (m) => useGame.setState((s) => ({ chat: [...s.chat, m].slice(-50) })));
  socket.on('TOAST', ({ kind, text }) => pushToast(kind, text));
  socket.on('KICKED', ({ reason }) => {
    useGame.setState({ kicked: reason });
    useGame.getState().setCredentials(null);
  });
}

/** Người chơi hiện tại, lấy từ public state. */
export function useMe() {
  return useGame((s) => {
    const id = s.credentials?.playerId;
    if (!id || !s.room) return null;
    return s.room.players.find((p) => p.id === id) ?? null;
  });
}
