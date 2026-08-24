/**
 * Room — state machine của một phòng chơi (design doc §19).
 * Server là nguồn sự thật duy nhất: client chỉ gửi ý định, mọi validate và
 * random đều nằm ở đây (§17, §47). Thông tin ẩn (số bi đã chọn) không bao giờ
 * lọt vào public state trước REVEAL (§18).
 */
import type { Namespace, Socket } from 'socket.io';
import { config } from './config.js';
import {
  applyRoundResult,
  BrokeRule,
  DEFAULT_SETTINGS,
  finalStandings,
  GamePhase,
  isActive,
  isGameOver,
  ErrorCode,
  MAX_TEAMS,
  MIN_PLAYERS,
  PayoutMode,
  resolveDice,
  REVEAL_TAIL_MS,
  revealStepMs,
  rollDiceFace,
  sanitizeSettings,
  TEAM_COLORS,
  TEAM_NAMES,
  validateGuess,
  validateMarbleChoice,
  type ClientEvents,
  type DiceOutcome,
  type GameSettings,
  type Player,
  type PlayerRoundPublic,
  type PublicRoomState,
  type RoundResult,
  type ServerEvents,
  type Team,
  type TeamGuessPublic,
} from '@tongbi/game-rules';

export interface SocketData {
  roomId?: string;
  playerId?: string;
}

export type GameSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, SocketData>;
export type GameNamespace = Namespace<ClientEvents, ServerEvents, Record<string, never>, SocketData>;

/** Thời lượng animation client cần chạy xong trước khi server sang phase kế tiếp. */
const ROUND_START_MS = 2200;
const CLOSE_HAND_MS = 1800;
const DICE_RESULT_MS = 4200;
const DICE_DECISION_MS = 20000;

interface TeamGuessState {
  pending: number | null;
  locked: boolean;
  value: number | null;
}

interface PlayerRecord extends Player {
  token: string;
  socketId: string | null;
  lastSeen: number;
  /** Đã bỏ cuộc khi hết bi (design doc §8 Option 1). */
  forfeited: boolean;
}

export class Room {
  readonly id: string;
  private readonly io: GameNamespace;

  phase: GamePhase = GamePhase.WAITING;
  hostId = '';
  round = 0;
  settings: GameSettings = { ...DEFAULT_SETTINGS };
  /** 0 = free-for-all. */
  teamMode = 0;

  private players = new Map<string, PlayerRecord>();
  private teams: Team[] = [];

  /** HIDDEN — số bi từng người bỏ vào tay lượt này. Không bao giờ đưa vào public state. */
  private selections = new Map<string, number>();
  private autoSubmitted = new Set<string>();
  private teamGuesses = new Map<string, TeamGuessState>();

  private timer: NodeJS.Timeout | null = null;
  private phaseEndsAt: number | null = null;
  private phaseStartedAt = Date.now();

  lastResult: RoundResult | null = null;
  lastDice: DiceOutcome | null = null;
  private diceQueue: string[] = [];
  private pendingDicePlayerId: string | null = null;
  private diceRolling = false;
  private standings: PublicRoomState['finalStandings'] = null;

  createdAt = Date.now();
  lastActivity = Date.now();

  /** Sức chứa của phòng này — lấy từ env MAX_PLAYERS_PER_ROOM. */
  readonly maxPlayers: number = config.maxPlayersPerRoom;

  get isFull(): boolean {
    return this.players.size >= this.maxPlayers;
  }

  constructor(id: string, io: GameNamespace) {
    this.id = id;
    this.io = io;
  }

  // ─────────────────────────────── Người chơi ───────────────────────────────

  get playerCount(): number {
    return this.players.size;
  }

  get connectedCount(): number {
    return [...this.players.values()].filter((p) => p.connected).length;
  }

  getPlayer(playerId: string): PlayerRecord | undefined {
    return this.players.get(playerId);
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  hasStarted(): boolean {
    return this.phase !== GamePhase.WAITING;
  }

  addPlayer(
    playerId: string,
    token: string,
    name: string,
    avatar: string,
    socketId: string,
  ): { ok: true; player: PlayerRecord } | { ok: false; error: string; code: ErrorCode } {
    if (this.players.size >= this.maxPlayers) {
      // Deployment guide: người thứ 31 phải nhận đúng mã ROOM_FULL.
      return {
        ok: false,
        error: `Phòng đã đủ ${this.maxPlayers} người.`,
        code: ErrorCode.ROOM_FULL,
      };
    }
    if (this.hasStarted() && this.settings.lockOnStart) {
      return {
        ok: false,
        error: 'Trận đấu đã bắt đầu, phòng đang khoá.',
        code: ErrorCode.ROOM_LOCKED,
      };
    }
    const seat = this.nextFreeSeat();
    const player: PlayerRecord = {
      id: playerId,
      name: sanitizeName(name),
      avatar: avatar || '🐯',
      teamId: '',
      marbleCount: this.settings.startingMarbles,
      connected: true,
      eliminated: false,
      isHost: this.players.size === 0,
      seat,
      token,
      socketId,
      lastSeen: Date.now(),
      forfeited: false,
    };
    if (player.isHost) this.hostId = playerId;
    this.players.set(playerId, player);
    this.rebuildTeams();
    this.touch();
    return { ok: true, player };
  }

  /** Reconnect — design doc §36: nối lại phiên cũ thay vì tạo người chơi mới. */
  reattach(playerId: string, token: string, socketId: string): boolean {
    const p = this.players.get(playerId);
    if (!p || p.token !== token) return false;
    p.connected = true;
    p.socketId = socketId;
    p.lastSeen = Date.now();
    this.touch();
    return true;
  }

  /**
   * `socketId` là socket vừa rớt. Nếu người chơi đã nối lại bằng socket khác thì
   * bỏ qua — nếu không, socket cũ chết muộn sẽ đánh dấu nhầm người đang online.
   */
  markDisconnected(playerId: string, socketId?: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    if (socketId && p.socketId !== null && p.socketId !== socketId) return;
    p.connected = false;
    p.socketId = null;
    p.lastSeen = Date.now();
    // Trong sảnh chờ thì rời hẳn; đang trong trận thì giữ ghế để còn reconnect.
    if (!this.hasStarted()) this.removePlayer(playerId);
    else this.maybeAdvanceFromSelect();
    this.touch();
  }

  removePlayer(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    this.players.delete(playerId);
    this.selections.delete(playerId);
    this.diceQueue = this.diceQueue.filter((id) => id !== playerId);
    if (this.pendingDicePlayerId === playerId) this.pendingDicePlayerId = null;
    if (this.hostId === playerId) {
      const next = [...this.players.values()].sort((a, b) => a.seat - b.seat)[0];
      if (next) {
        next.isHost = true;
        this.hostId = next.id;
      } else {
        this.hostId = '';
      }
    }
    this.rebuildTeams();
    this.touch();
  }

  private nextFreeSeat(): number {
    const taken = new Set([...this.players.values()].map((p) => p.seat));
    for (let i = 0; i < this.maxPlayers; i += 1) if (!taken.has(i)) return i;
    return this.players.size;
  }

  // ──────────────────────────────── Đội ─────────────────────────────────────

  setTeamMode(count: number): void {
    this.teamMode = Math.max(0, Math.min(MAX_TEAMS, Math.round(count)));
    this.rebuildTeams();
    this.touch();
  }

  setPlayerTeam(playerId: string, teamId: string): boolean {
    if (this.teamMode === 0) return false;
    const p = this.players.get(playerId);
    if (!p || !this.teams.some((t) => t.id === teamId)) return false;
    p.teamId = teamId;
    this.syncCaptains();
    this.touch();
    return true;
  }

  /** Free-for-all tạo một đội cho mỗi người; ngược lại giữ N đội cố định. */
  private rebuildTeams(): void {
    const list = [...this.players.values()].sort((a, b) => a.seat - b.seat);
    if (this.teamMode === 0) {
      this.teams = list.map((p, i) => ({
        id: `ffa-${p.id}`,
        name: p.name,
        color: TEAM_COLORS[i % TEAM_COLORS.length]!,
        captainId: p.id,
        score: this.teams.find((t) => t.id === `ffa-${p.id}`)?.score ?? 0,
      }));
      for (const p of list) p.teamId = `ffa-${p.id}`;
      return;
    }

    const wanted = Array.from({ length: this.teamMode }, (_, i) => `team-${i + 1}`);
    this.teams = wanted.map((id, i) => {
      const prev = this.teams.find((t) => t.id === id);
      return {
        id,
        name: TEAM_NAMES[i] ?? `Đội ${i + 1}`,
        color: TEAM_COLORS[i % TEAM_COLORS.length]!,
        captainId: null,
        score: prev?.score ?? 0,
      };
    });

    // Giữ đội cũ nếu vẫn hợp lệ, còn lại chia vào đội ít người nhất.
    for (const p of list) {
      if (!wanted.includes(p.teamId)) p.teamId = '';
    }
    for (const p of list) {
      if (p.teamId) continue;
      const counts = new Map(wanted.map((id) => [id, 0]));
      for (const q of list) if (q.teamId) counts.set(q.teamId, (counts.get(q.teamId) ?? 0) + 1);
      const smallest = [...counts.entries()].sort((a, b) => a[1] - b[1])[0]![0];
      p.teamId = smallest;
    }
    this.syncCaptains();
  }

  private syncCaptains(): void {
    for (const t of this.teams) {
      const members = [...this.players.values()]
        .filter((p) => p.teamId === t.id)
        .sort((a, b) => a.seat - b.seat);
      if (!members.some((m) => m.id === t.captainId)) t.captainId = members[0]?.id ?? null;
    }
  }

  // ───────────────────────────── Cấu hình phòng ─────────────────────────────

  updateSettings(patch: Partial<GameSettings>): void {
    const next = sanitizeSettings(patch, this.settings);
    const startingChanged = next.startingMarbles !== this.settings.startingMarbles;
    this.settings = next;
    if (!this.hasStarted() && startingChanged) {
      for (const p of this.players.values()) p.marbleCount = next.startingMarbles;
    }
    this.touch();
  }

  setPenalties(penalties: GameSettings['penalties']): void {
    const cleaned = penalties
      .slice(0, 12)
      .filter((p) => typeof p?.label === 'string' && p.label.trim().length > 0)
      .map((p, i) => ({
        id: String(p.id ?? `p${i}`).slice(0, 40),
        label: String(p.label).slice(0, 40),
        description: String(p.description ?? '').slice(0, 140),
        icon: String(p.icon ?? '🎲').slice(0, 4),
        severity: (['LIGHT', 'MEDIUM', 'HEAVY'] as const).includes(p.severity) ? p.severity : 'MEDIUM',
      }));
    if (cleaned.length > 0) this.settings = { ...this.settings, penalties: cleaned };
    this.touch();
  }

  // ─────────────────────────── Vòng lặp trận đấu ────────────────────────────

  startGame(): { ok: boolean; error?: string } {
    if (this.hasStarted()) return { ok: false, error: 'Trận đấu đã bắt đầu.' };
    if (this.players.size < MIN_PLAYERS) {
      return { ok: false, error: `Cần ít nhất ${MIN_PLAYERS} người chơi.` };
    }
    if (this.teamMode > 0) {
      const used = new Set([...this.players.values()].map((p) => p.teamId));
      if (used.size < 2) return { ok: false, error: 'Cần ít nhất 2 đội có người chơi.' };
    }
    for (const p of this.players.values()) {
      p.marbleCount = this.settings.startingMarbles;
      p.eliminated = false;
      p.forfeited = false;
    }
    for (const t of this.teams) t.score = 0;
    this.round = 0;
    this.lastResult = null;
    this.lastDice = null;
    this.standings = null;
    this.beginRound();
    return { ok: true };
  }

  playAgain(): { ok: boolean; error?: string } {
    if (this.phase !== GamePhase.GAME_OVER) return { ok: false, error: 'Trận đấu chưa kết thúc.' };
    this.phase = GamePhase.WAITING;
    this.clearTimer();
    this.broadcastState();
    return { ok: true };
  }

  /** Người còn bi và chưa bị loại mới được tham gia lượt. */
  private activePlayers(): PlayerRecord[] {
    return [...this.players.values()].filter(isActive).sort((a, b) => a.seat - b.seat);
  }

  /** Đội có ít nhất một thành viên đang tham gia lượt. */
  private activeTeams(): Team[] {
    const alive = new Set(this.activePlayers().map((p) => p.teamId));
    return this.teams.filter((t) => alive.has(t.id));
  }

  private beginRound(): void {
    this.round += 1;
    this.selections.clear();
    this.autoSubmitted.clear();
    this.teamGuesses.clear();
    this.lastResult = null;
    this.lastDice = null;
    for (const t of this.activeTeams()) {
      this.teamGuesses.set(t.id, { pending: null, locked: false, value: null });
    }
    this.setPhase(GamePhase.ROUND_START, ROUND_START_MS, () => this.beginSelect());
  }

  private beginSelect(): void {
    this.setPhase(GamePhase.SELECT_MARBLES, this.settings.selectSeconds * 1000, () =>
      this.finishSelect(),
    );
  }

  /** Hết giờ chọn bi: tự chọn 1 viên để trận không bị kẹt — design doc §37. */
  private finishSelect(): void {
    for (const p of this.activePlayers()) {
      if (!this.selections.has(p.id)) {
        this.selections.set(p.id, 1);
        this.autoSubmitted.add(p.id);
      }
    }
    this.io.to(this.id).emit('ALL_PLAYERS_READY', { at: Date.now() });
    this.setPhase(GamePhase.CLOSE_HAND, CLOSE_HAND_MS, () => this.beginGuess());
  }

  private beginGuess(): void {
    this.setPhase(GamePhase.GUESS_TOTAL, this.settings.guessSeconds * 1000, () =>
      this.finishGuess(),
    );
  }

  /** Hết giờ đoán: khoá giá trị đang soạn, hoặc mức tối thiểu hợp lệ. */
  private finishGuess(): void {
    const active = this.activePlayers();
    const min = active.length;
    for (const [teamId, g] of this.teamGuesses) {
      if (g.locked) continue;
      const value = g.pending ?? min;
      const check = validateGuess(value, active, this.settings);
      g.value = check.ok ? value : min;
      g.locked = true;
      this.teamGuesses.set(teamId, g);
    }
    this.beginReveal();
  }

  private beginReveal(): void {
    const reveals = [...this.selections.entries()].map(([playerId, marbles]) => ({
      playerId,
      marbles,
    }));
    reveals.sort(
      (a, b) => (this.players.get(a.playerId)?.seat ?? 0) - (this.players.get(b.playerId)?.seat ?? 0),
    );
    const duration = reveals.length * revealStepMs(reveals.length) + REVEAL_TAIL_MS;
    // Gửi cue TRƯỚC khi đổi phase: client phải có mốc mở tay ngay lúc vào REVEAL,
    // nếu không sẽ có một khoảnh khắc ở phase REVEAL mà chưa biết ai mở tay khi nào.
    this.io.to(this.id).emit('START_REVEAL', { at: Date.now(), reveals });
    this.setPhase(GamePhase.REVEAL, duration, () => this.finishRound());
  }

  private finishRound(): void {
    const players = [...this.players.values()];
    const guesses = [...this.teamGuesses.entries()]
      .filter(([, g]) => g.value !== null)
      .map(([teamId, g]) => ({ teamId, value: g.value! }));

    const result = applyRoundResult({
      round: this.round,
      players,
      teams: this.teams,
      selections: Object.fromEntries(this.selections),
      guesses,
      settings: this.settings,
    });

    for (const d of result.marbleDeltas) {
      const p = this.players.get(d.playerId);
      if (p) p.marbleCount = d.after;
    }
    for (const teamId of result.winningTeamIds) {
      const t = this.teams.find((x) => x.id === teamId);
      if (t) t.score += 1;
    }

    this.lastResult = result;
    this.io.to(this.id).emit('ROUND_RESULT', result);
    this.setPhase(GamePhase.ROUND_RESULT, this.settings.revealSeconds * 1000, () =>
      this.checkElimination(),
    );
  }

  /** CHECK_ELIMINATION — design doc §19: hết bi thì tung xúc xắc hoặc bị loại. */
  private checkElimination(): void {
    const broke = [...this.players.values()]
      .filter((p) => !p.eliminated && p.marbleCount <= 0)
      .sort((a, b) => a.seat - b.seat);

    const canBorrow = this.settings.diceEnabled && this.settings.brokeRule === BrokeRule.DICE;
    if (!canBorrow) {
      for (const p of broke) p.eliminated = true;
      this.afterElimination();
      return;
    }

    this.diceQueue = broke.filter((p) => !p.forfeited).map((p) => p.id);
    for (const p of broke) if (p.forfeited) p.eliminated = true;
    this.nextDicePlayer();
  }

  private nextDicePlayer(): void {
    const nextId = this.diceQueue.shift();
    if (!nextId) {
      this.pendingDicePlayerId = null;
      this.afterElimination();
      return;
    }
    const p = this.players.get(nextId);
    if (!p || p.marbleCount > 0 || p.eliminated) {
      this.nextDicePlayer();
      return;
    }
    this.pendingDicePlayerId = nextId;
    this.diceRolling = false;
    this.setPhase(GamePhase.DICE_ROLL, DICE_DECISION_MS, () => {
      // Hết giờ mà chưa quyết định thì tự tung hộ.
      if (this.pendingDicePlayerId === nextId && !this.diceRolling) this.rollDice(nextId, true);
    });
  }

  /** Xúc xắc: RNG chạy ở server, client chỉ chạy animation cho ra đúng mặt (§46, §47). */
  rollDice(playerId: string, auto = false): { ok: boolean; error?: string } {
    if (this.phase !== GamePhase.DICE_ROLL) return { ok: false, error: 'Chưa tới lượt tung xúc xắc.' };
    if (this.pendingDicePlayerId !== playerId) return { ok: false, error: 'Không phải lượt của bạn.' };
    if (this.diceRolling) return { ok: false, error: 'Xúc xắc đang lăn.' };
    const p = this.players.get(playerId);
    if (!p) return { ok: false, error: 'Không tìm thấy người chơi.' };

    this.diceRolling = true;
    const at = Date.now();
    this.io.to(this.id).emit('DICE_ROLL_STARTED', { playerId, at });

    const faceIndex = rollDiceFace();
    const outcome = resolveDice(playerId, faceIndex, this.settings.penalties);
    p.marbleCount += outcome.marblesGained;
    if (outcome.marblesGained === 0 && p.marbleCount <= 0) {
      // Ra mặt hình phạt mà vẫn trắng tay: cho vay tối thiểu để còn chơi tiếp.
      p.marbleCount = Math.max(1, Math.ceil(this.settings.startingMarbles / 5));
    }
    this.lastDice = outcome;

    this.io.to(this.id).emit('DICE_ROLL_RESULT', { ...outcome, at });
    if (auto) {
      this.toast(playerId, 'info', 'Hết giờ — hệ thống đã tung xúc xắc giúp bạn.');
    }
    this.setPhase(GamePhase.DICE_ROLL, DICE_RESULT_MS, () => this.nextDicePlayer());
    return { ok: true };
  }

  forfeit(playerId: string): { ok: boolean; error?: string } {
    const p = this.players.get(playerId);
    if (!p) return { ok: false, error: 'Không tìm thấy người chơi.' };
    p.forfeited = true;
    if (p.marbleCount <= 0) p.eliminated = true;
    if (this.pendingDicePlayerId === playerId && !this.diceRolling) {
      this.pendingDicePlayerId = null;
      this.nextDicePlayer();
    } else {
      this.broadcastState();
    }
    return { ok: true };
  }

  private afterElimination(): void {
    const players = [...this.players.values()];
    if (isGameOver(players, this.round, this.settings)) {
      this.standings = finalStandings(players);
      this.setPhase(GamePhase.GAME_OVER, null, null);
      return;
    }
    this.beginRound();
  }

  // ────────────────────────── Hành động của client ──────────────────────────

  submitMarbles(playerId: string, amount: number): { ok: boolean; error?: string } {
    if (this.phase !== GamePhase.SELECT_MARBLES) {
      return { ok: false, error: 'Chưa tới lúc chọn bi.' };
    }
    const p = this.players.get(playerId);
    if (!p) return { ok: false, error: 'Bạn không ở trong phòng này.' };
    if (this.selections.has(playerId)) return { ok: false, error: 'Bạn đã chốt số bi rồi.' };
    const check = validateMarbleChoice(p, amount, this.settings);
    if (!check.ok) return { ok: false, error: check.reason ?? 'Lựa chọn không hợp lệ.' };

    this.selections.set(playerId, amount);
    this.io.to(this.id).emit('PLAYER_LOCKED_MARBLES', { playerId, at: Date.now() });
    this.touch();
    this.maybeAdvanceFromSelect();
    return { ok: true };
  }

  /** Tất cả người đang online đã chốt thì đi tiếp luôn, không chờ hết giờ. */
  private maybeAdvanceFromSelect(): void {
    if (this.phase !== GamePhase.SELECT_MARBLES) {
      this.broadcastState();
      return;
    }
    const waiting = this.activePlayers().filter(
      (p) => p.connected && !this.selections.has(p.id),
    );
    if (waiting.length === 0) {
      this.clearTimer();
      this.finishSelect();
    } else {
      this.broadcastState();
    }
  }

  setGuess(playerId: string, value: number): { ok: boolean; error?: string } {
    if (this.phase !== GamePhase.GUESS_TOTAL) return { ok: false, error: 'Chưa tới lúc đoán.' };
    const p = this.players.get(playerId);
    if (!p) return { ok: false, error: 'Bạn không ở trong phòng này.' };
    const g = this.teamGuesses.get(p.teamId);
    if (!g) return { ok: false, error: 'Đội của bạn không tham gia lượt này.' };
    if (g.locked) return { ok: false, error: 'Đội bạn đã khoá đáp án.' };
    g.pending = Math.round(value);
    this.teamGuesses.set(p.teamId, g);
    this.broadcastState();
    return { ok: true };
  }

  lockGuess(playerId: string, value: number): { ok: boolean; error?: string } {
    if (this.phase !== GamePhase.GUESS_TOTAL) return { ok: false, error: 'Chưa tới lúc đoán.' };
    const p = this.players.get(playerId);
    if (!p) return { ok: false, error: 'Bạn không ở trong phòng này.' };
    const g = this.teamGuesses.get(p.teamId);
    if (!g) return { ok: false, error: 'Đội của bạn không tham gia lượt này.' };
    if (g.locked) return { ok: false, error: 'Đội bạn đã khoá đáp án.' };
    const check = validateGuess(Math.round(value), this.activePlayers(), this.settings);
    if (!check.ok) return { ok: false, error: check.reason ?? 'Dự đoán không hợp lệ.' };

    g.value = Math.round(value);
    g.pending = g.value;
    g.locked = true;
    this.teamGuesses.set(p.teamId, g);
    this.touch();

    const allLocked = [...this.teamGuesses.values()].every((x) => x.locked);
    if (allLocked) {
      this.clearTimer();
      this.beginReveal();
    } else {
      this.broadcastState();
    }
    return { ok: true };
  }

  // ───────────────────────────── Phase & broadcast ──────────────────────────

  private setPhase(phase: GamePhase, durationMs: number | null, onEnd: (() => void) | null): void {
    this.clearTimer();
    this.phase = phase;
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = durationMs === null ? null : this.phaseStartedAt + durationMs;
    this.broadcastState();
    if (durationMs !== null && onEnd) {
      this.timer = setTimeout(() => {
        this.timer = null;
        onEnd();
      }, durationMs);
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  dispose(): void {
    this.clearTimer();
  }

  private touch(): void {
    this.lastActivity = Date.now();
  }

  /** Public state đã lọc bỏ thông tin ẩn — design doc §18. */
  toPublic(): PublicRoomState {
    const revealing =
      this.phase === GamePhase.REVEAL ||
      this.phase === GamePhase.ROUND_RESULT ||
      this.phase === GamePhase.DICE_ROLL ||
      this.phase === GamePhase.GAME_OVER;

    const roundPublic: Record<string, PlayerRoundPublic> = {};
    for (const p of this.players.values()) {
      roundPublic[p.id] = {
        submitted: this.selections.has(p.id),
        revealed: revealing ? (this.selections.get(p.id) ?? null) : null,
        autoSubmitted: this.autoSubmitted.has(p.id),
      };
    }

    const guesses: TeamGuessPublic[] = [...this.teamGuesses.entries()].map(([teamId, g]) => ({
      teamId,
      pending: null, // giá trị đang soạn chỉ gửi riêng cho đồng đội qua PRIVATE_STATE
      locked: g.locked,
      value: revealing ? g.value : null,
    }));

    return {
      id: this.id,
      phase: this.phase,
      hostId: this.hostId,
      round: this.round,
      maxPlayers: this.maxPlayers,
      settings: this.settings,
      players: [...this.players.values()]
        .sort((a, b) => a.seat - b.seat)
        .map(stripPrivateFields),
      teams: this.teams,
      teamMode: this.teamMode,
      roundPublic,
      guesses,
      phaseEndsAt: this.phaseEndsAt,
      phaseStartedAt: this.phaseStartedAt,
      lastResult: this.lastResult,
      lastDice: this.lastDice,
      pendingDicePlayerId: this.pendingDicePlayerId,
      finalStandings: this.standings,
    };
  }

  broadcastState(): void {
    const state = this.toPublic();
    this.io.to(this.id).emit('ROOM_STATE', state);
    for (const p of this.players.values()) {
      if (p.socketId) this.sendPrivate(p.socketId, p.id);
    }
  }

  sendPrivate(socketId: string, playerId: string): void {
    const p = this.players.get(playerId);
    if (!p) return;
    const g = this.teamGuesses.get(p.teamId);
    this.io.to(socketId).emit('PRIVATE_STATE', {
      playerId,
      selectedMarbles: this.selections.get(playerId) ?? null,
      teamPending: g?.pending ?? null,
    });
  }

  toast(playerId: string, kind: 'info' | 'error' | 'success', text: string): void {
    const p = this.players.get(playerId);
    if (p?.socketId) this.io.to(p.socketId).emit('TOAST', { kind, text });
  }

  /** Tóm tắt cho endpoint /health và trang lobby. */
  summary() {
    return {
      id: this.id,
      phase: this.phase,
      players: this.players.size,
      maxPlayers: this.maxPlayers,
      connected: this.connectedCount,
      round: this.round,
      payout: this.settings.payout === PayoutMode.STAKE ? 'STAKE' : 'FIXED',
    };
  }
}

function stripPrivateFields(p: PlayerRecord): Player {
  const { token: _token, socketId: _socketId, lastSeen: _lastSeen, forfeited: _f, ...rest } = p;
  return rest;
}

function sanitizeName(raw: string): string {
  const trimmed = String(raw ?? '').trim().replace(/\s+/g, ' ').slice(0, 16);
  return trimmed.length > 0 ? trimmed : 'Người chơi';
}
