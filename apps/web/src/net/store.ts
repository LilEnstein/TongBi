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
import { nenSan, sfx } from '../audio/sfx.js';
import { nhacNen } from '../audio/nhacNen.js';

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
    // Nhiều nhất ba tàu lá cùng lúc — hơn nữa là che mất mái tranh.
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }].slice(-3) }));
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

/** Độ căng của từng phase, dùng cho tiếng ve nền — §2 và §12. */
const DO_CANG: Record<string, number> = {
  WAITING: 0.08,
  ROUND_START: 0.24,
  SELECT_MARBLES: 0.36,
  CLOSE_HAND: 0.52,
  GUESS_TOTAL: 0.88,
  REVEAL: 0.6,
  ROUND_RESULT: 0.3,
  DICE_ROLL: 0.42,
  GAME_OVER: 0.14,
};

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
    // Ve sầu to dần theo độ căng của phase — art direction §12.
    const cang = DO_CANG[state.phase] ?? 0.3;
    nenSan.cang(cang);
    // Nhạc nền đi ngược lại: sân càng căng thì liên khúc càng lùi ra sau.
    nhacNen.cang(cang);
    // Mở tay có 0.4s im lặng trước khi bi lăn — nhạc phải nhường đúng chỗ đó.
    if (state.phase === 'REVEAL') nhacNen.nep(2200);
  });

  socket.on('PRIVATE_STATE', (priv) => useGame.setState({ privateState: priv }));

  socket.on('PLAYER_LOCKED_MARBLES', () => sfx.namTay());

  socket.on('ALL_PLAYERS_READY', () => sfx.gio());

  socket.on('START_REVEAL', (cue) => useGame.setState({ revealCue: cue }));

  socket.on('ROUND_RESULT', (result) => {
    useGame.setState({ lastResult: result });
    const me = useGame.getState().credentials?.playerId;
    const room = useGame.getState().room;
    const myTeam = room?.players.find((p) => p.id === me)?.teamId;
    if (myTeam && result.winningTeamIds.includes(myTeam)) sfx.trung();
    else if (result.push) sfx.hoa();
    else sfx.trat();
  });

  socket.on('DICE_ROLL_STARTED', ({ playerId, at }) => {
    useGame.setState({ diceCue: { playerId, at, outcome: null } });
    sfx.lacXucXac();
    nhacNen.nep(1400);
  });

  socket.on('DICE_ROLL_RESULT', (outcome) => {
    useGame.setState((s) => ({
      diceCue: { playerId: outcome.playerId, at: outcome.at, outcome },
      room: s.room ? { ...s.room, lastDice: outcome } : s.room,
    }));
  });

  socket.on('PLAYER_JOINED', ({ name }) => pushToast('info', `${name} vừa ngồi xuống`));
  socket.on('PLAYER_LEFT', ({ name }) => pushToast('info', `${name} về nhà rồi`));
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
