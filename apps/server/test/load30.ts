/**
 * Load test 30 người/room — deployment guide mục "Test 30 người".
 *
 * Chạy server thật rồi mở 30 socket client thật vào cùng một phòng, đi hết một
 * lượt chơi và kiểm tra đủ 10 kịch bản bắt buộc trong guide:
 *
 *   1. 30 người join thành công          6. Guess đồng bộ
 *   2. Người thứ 31 bị reject            7. Reveal đồng bộ
 *   3. Lobby đồng bộ                     8. Dice được random ở server
 *   4. Host Start đổi phase mọi client   9. Một client mất mạng rồi reconnect
 *   5. Hidden marble không leak         10. Host disconnect được xử lý
 *
 * Ramp theo guide: 1 → 5 → 10 → 20 → 30 client.
 *
 * Chạy: npm run test:load -w @tongbi/server
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { io, type Socket } from 'socket.io-client';
import { GamePhase, type PublicRoomState, type SessionCredentials } from '@tongbi/game-rules';

const PORT = Number(process.env.TEST_PORT ?? 3998);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SERVER_ENTRY = fileURLToPath(new URL('../src/index.ts', import.meta.url));

/** Guide: MAX_PLAYERS_PER_ROOM = 30. */
const ROOM_SIZE = 30;
/** Các mốc client theo guide. */
const RAMP = [1, 5, 10, 20, 30];

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail = ''): void {
  checks += 1;
  if (condition) {
    console.log(`  \u001b[32m✓\u001b[0m ${label}`);
  } else {
    failures += 1;
    console.log(`  \u001b[31m✗ ${label}\u001b[0m${detail ? ` — ${detail}` : ''}`);
  }
}

function info(label: string, value: string): void {
  console.log(`  \u001b[36m·\u001b[0m ${label}: ${value}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  return (await res.json()) as T;
}

async function waitUntil(fn: () => boolean, label: string, timeoutMs = 20000): Promise<number> {
  const started = Date.now();
  const deadline = started + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) return Date.now() - started;
    await sleep(25);
  }
  throw new Error(`hết giờ chờ "${label}"`);
}

interface AckResult {
  ok: boolean;
  error?: string;
  code?: string;
  credentials?: SessionCredentials;
}

/** Một client mô phỏng một người chơi trên một thiết bị. */
class LoadClient {
  socket!: Socket;
  state: PublicRoomState | null = null;
  privateSelection: number | null = null;
  credentials: SessionCredentials | null = null;
  revealPayload: { at: number; reveals: Array<{ playerId: string; marbles: number }> } | null = null;
  diceFace: number | null = null;
  phaseSeenAt = new Map<GamePhase, number>();

  constructor(readonly label: string) {
    this.open();
  }

  private open(): void {
    this.socket = io(BASE_URL, { transports: ['websocket'], forceNew: true });
    this.socket.on('ROOM_STATE', (s: PublicRoomState) => {
      this.state = s;
      if (!this.phaseSeenAt.has(s.phase)) this.phaseSeenAt.set(s.phase, Date.now());
    });
    this.socket.on('PRIVATE_STATE', (p: { selectedMarbles: number | null }) => {
      this.privateSelection = p.selectedMarbles;
    });
    this.socket.on(
      'START_REVEAL',
      (p: { at: number; reveals: Array<{ playerId: string; marbles: number }> }) => {
        this.revealPayload = p;
      },
    );
    this.socket.on('DICE_ROLL_RESULT', (o: { faceIndex: number }) => {
      this.diceFace = o.faceIndex;
    });
  }

  connected(): Promise<void> {
    if (this.socket.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.label} không kết nối được`)), 20000);
      this.socket.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  emit(event: string, payload?: unknown): Promise<AckResult> {
    return new Promise((resolve) => {
      const timer = setTimeout(
        () => resolve({ ok: false, error: `${event} không có phản hồi` }),
        15000,
      );
      const done = (res: AckResult) => {
        clearTimeout(timer);
        resolve(res ?? { ok: false, error: 'ack rỗng' });
      };
      if (payload === undefined) this.socket.emit(event, done);
      else this.socket.emit(event, payload, done);
    });
  }

  get playerId(): string {
    return this.credentials?.playerId ?? '';
  }

  me() {
    return this.state?.players.find((p) => p.id === this.playerId) ?? null;
  }

  /** Giả lập mất mạng: cắt socket rồi mở socket hoàn toàn mới. */
  async dropAndReopen(): Promise<void> {
    this.socket.close();
    await sleep(400);
    this.state = null;
    this.privateSelection = null;
    this.open();
    await this.connected();
  }

  close(): void {
    this.socket.close();
  }
}

async function startServer(): Promise<ChildProcess> {
  const child = spawn(process.execPath, ['--import', 'tsx', SERVER_ENTRY], {
    env: {
      ...process.env,
      PORT: String(PORT),
      MAX_PLAYERS_PER_ROOM: String(ROOM_SIZE),
      ROOM_TTL_MINUTES: '120',
      CLIENT_ORIGIN: '*',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr?.on('data', (d) => process.stderr.write(`[server] ${d}`));

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return child;
    } catch {
      /* chưa sẵn sàng */
    }
    await sleep(200);
  }
  throw new Error('Server không khởi động được');
}

async function main(): Promise<void> {
  console.log(`\n🎲 Tổng Bi — load test ${ROOM_SIZE} người/room\n`);
  const server = await startServer();
  const clients: LoadClient[] = [];
  const extra: LoadClient[] = [];

  try {
    // ── 1 & 3. Ramp 1 → 5 → 10 → 20 → 30 người vào cùng một phòng ──────────
    console.log(`1. Ramp ${RAMP.join(' → ')} client vào một phòng`);

    const host = new LoadClient('P00');
    clients.push(host);
    await host.connected();

    const created = await host.emit('CREATE_ROOM', {
      name: 'P00',
      avatar: '🐯',
      settings: {
        startingMarbles: 2,
        totalRounds: 2,
        winRule: 'EXACT',
        payout: 'STAKE',
        brokeRule: 'DICE',
        diceEnabled: true,
        selectSeconds: 60,
        guessSeconds: 60,
        revealSeconds: 2,
        lockOnStart: true,
      },
    });
    check('host tạo được phòng', created.ok, created.error);
    host.credentials = created.credentials!;
    const roomId = host.credentials.roomId;
    info('mã phòng', roomId);
    check(
      `server báo sức chứa ${ROOM_SIZE}`,
      host.state?.maxPlayers === ROOM_SIZE || created.ok,
      String(host.state?.maxPlayers),
    );

    for (const target of RAMP) {
      if (target <= clients.length) {
        check(`${target} client trong phòng`, clients.length >= target);
        continue;
      }
      const batchStart = Date.now();
      const batch: LoadClient[] = [];
      for (let i = clients.length; i < target; i += 1) {
        batch.push(new LoadClient(`P${String(i).padStart(2, '0')}`));
      }
      await Promise.all(batch.map((c) => c.connected()));

      const joins = await Promise.all(
        batch.map((c) => c.emit('JOIN_ROOM', { roomId, name: c.label, avatar: '🐼' })),
      );
      joins.forEach((r, i) => {
        if (r.ok) batch[i]!.credentials = r.credentials!;
      });
      clients.push(...batch);

      const allOk = joins.every((r) => r.ok);
      const elapsed = Date.now() - batchStart;
      check(
        `lên ${target} client — tất cả join được`,
        allOk,
        joins.find((r) => !r.ok)?.error ?? '',
      );

      // Lobby đồng bộ: MỌI client phải thấy đủ số người, không chỉ host.
      const syncMs = await waitUntil(
        () => clients.every((c) => c.state?.players.length === target),
        `mọi client thấy ${target} người`,
      );
      check(`lobby đồng bộ ở mốc ${target} người`, true);
      info(`mốc ${target}`, `join ${elapsed}ms, đồng bộ thêm ${syncMs}ms`);
    }

    check(`đủ ${ROOM_SIZE} người trong phòng`, clients.length === ROOM_SIZE, String(clients.length));
    check(
      `mọi client đều thấy ${ROOM_SIZE} người`,
      clients.every((c) => c.state?.players.length === ROOM_SIZE),
    );
    check(
      'không có playerId trùng nhau',
      new Set(clients.map((c) => c.playerId)).size === ROOM_SIZE,
    );
    check(
      'mỗi người một ghế riêng',
      new Set(host.state!.players.map((p) => p.seat)).size === ROOM_SIZE,
    );
    check(
      'client nào cũng thấy maxPlayers = 30',
      clients.every((c) => c.state?.maxPlayers === ROOM_SIZE),
      String(host.state?.maxPlayers),
    );

    // ── 2. Người thứ 31 bị từ chối bằng mã ROOM_FULL ───────────────────────
    console.log('\n2. Người thứ 31 bị từ chối');
    const overflow = new LoadClient('P30');
    extra.push(overflow);
    await overflow.connected();
    const rejected = await overflow.emit('JOIN_ROOM', {
      roomId,
      name: 'P30',
      avatar: '🦊',
    });
    check('người thứ 31 không vào được', !rejected.ok, JSON.stringify(rejected));
    check('trả đúng mã ROOM_FULL', rejected.code === 'ROOM_FULL', String(rejected.code));
    check('phòng vẫn đúng 30 người', host.state!.players.length === ROOM_SIZE);

    const probe = await getJson<{ full?: boolean; joinable?: boolean }>(`/api/room?id=${roomId}`);
    check('API báo phòng đã đầy', probe.full === true && probe.joinable === false, JSON.stringify(probe));

    // ── 4. Host bấm Start → mọi client đổi phase ───────────────────────────
    console.log('\n4. Host Start làm tất cả client đổi phase');
    const startedAt = Date.now();
    const start = await host.emit('START_GAME');
    check('host bắt đầu được trận', start.ok, start.error);

    const nonHost = await host.emit('START_GAME');
    check('gọi Start lần nữa không tạo trận mới', !nonHost.ok || host.state!.round === 1);

    await waitUntil(
      () => clients.every((c) => c.state?.phase === GamePhase.SELECT_MARBLES),
      'mọi client vào phase chọn bi',
      25000,
    );
    const fanout = Math.max(
      ...clients.map((c) => (c.phaseSeenAt.get(GamePhase.SELECT_MARBLES) ?? Date.now()) - startedAt),
    );
    check(`cả ${ROOM_SIZE} client cùng vào phase chọn bi`, true);
    info('độ trễ lan phase tới client chậm nhất', `${fanout}ms`);
    check('phase lan tới mọi client dưới 3 giây', fanout < 3000, `${fanout}ms`);

    // ── 5. Chọn bi + kiểm tra thông tin ẩn không lọt ───────────────────────
    console.log('\n5. Hidden marble không leak');
    // P00 đặt cả 2 bi, những người còn lại đặt 1 → tổng = 31.
    const submits = await Promise.all(
      clients.map((c, i) => c.emit('SUBMIT_MARBLES', { amount: i === 0 ? 2 : 1 })),
    );
    check('cả 30 người chốt bi được', submits.every((r) => r.ok), submits.find((r) => !r.ok)?.error);

    await waitUntil(
      () =>
        clients.every((c) =>
          Object.values(c.state?.roundPublic ?? {}).every((r) => r.submitted),
        ),
      'mọi người đã chốt bi',
    );

    const leaked = clients.filter((c) =>
      Object.values(c.state!.roundPublic).some((r) => r.revealed !== null),
    );
    check('không client nào thấy số bi người khác trước reveal', leaked.length === 0,
      leaked.map((c) => c.label).join(','));

    const wrongPrivate = clients.filter((c, i) => c.privateSelection !== (i === 0 ? 2 : 1));
    check(
      'mỗi người chỉ thấy đúng số bi của chính mình',
      wrongPrivate.length === 0,
      wrongPrivate.map((c) => `${c.label}=${c.privateSelection}`).join(','),
    );

    // ── 9. Một client mất mạng rồi reconnect (giữa trận) ───────────────────
    console.log('\n9. Một client mất mạng rồi reconnect');
    const victim = clients[17]!;
    const beforeSeat = victim.me()!.seat;
    const beforeMarbles = victim.me()!.marbleCount;
    await victim.dropAndReopen();
    const rejoin = await victim.emit('JOIN_ROOM', {
      roomId,
      name: victim.label,
      avatar: '🐼',
      playerId: victim.credentials!.playerId,
      token: victim.credentials!.token,
    });
    check('client reconnect được', rejoin.ok, rejoin.error);
    check(
      'reconnect giữ nguyên playerId',
      rejoin.credentials?.playerId === victim.credentials!.playerId,
    );
    await waitUntil(() => victim.state !== null, 'client nhận lại state');
    check('reconnect giữ nguyên ghế', victim.me()?.seat === beforeSeat);
    check('reconnect giữ nguyên số bi', victim.me()?.marbleCount === beforeMarbles);
    check('reconnect lấy lại được số bi bí mật của mình', victim.privateSelection === 1,
      String(victim.privateSelection));
    check('phòng vẫn đủ 30 người sau reconnect', host.state!.players.length === ROOM_SIZE,
      String(host.state!.players.length));
    check(
      'người reconnect được đánh dấu online trở lại',
      host.state!.players.find((p) => p.id === victim.playerId)?.connected === true,
    );

    // ── 6. Guess đồng bộ ───────────────────────────────────────────────────
    console.log('\n6. Guess đồng bộ');
    await waitUntil(
      () => clients.every((c) => c.state?.phase === GamePhase.GUESS_TOTAL),
      'mọi client vào phase đoán',
      25000,
    );
    check(`cả ${ROOM_SIZE} client vào phase đoán`, true);

    // Tổng thật = 31. Chỉ P01 đoán đúng; những người khác đoán trong khoảng hợp lệ 30..60.
    const ACTUAL_TOTAL = 2 + (ROOM_SIZE - 1);
    const guessOf = (i: number) => (i === 1 ? ACTUAL_TOTAL : i === 0 ? 30 : 32 + (i - 2));
    // Khoá 29 người trước: phòng vẫn ở phase đoán nên đây là lúc kiểm tra
    // đáp án của người khác có bị lộ sớm không. Người thứ 30 khoá sau cùng
    // sẽ đẩy phòng sang reveal.
    const early = clients.slice(0, ROOM_SIZE - 1);
    const last = clients[ROOM_SIZE - 1]!;
    const locks = await Promise.all(
      early.map((c, i) => c.emit('LOCK_GUESS', { value: guessOf(i) })),
    );
    check('29 người đầu khoá đáp án được', locks.every((r) => r.ok), locks.find((r) => !r.ok)?.error);

    await waitUntil(
      () =>
        clients.every(
          (c) => (c.state?.guesses.filter((g) => g.locked).length ?? 0) === ROOM_SIZE - 1,
        ),
      'mọi client thấy 29 đáp án đã khoá',
    );
    check('mọi client thấy cùng số đáp án đã khoá', true);
    check(
      'phòng vẫn đang ở phase đoán',
      clients.every((c) => c.state!.phase === GamePhase.GUESS_TOTAL),
    );
    const leakedGuess = clients.filter((c) => c.state!.guesses.some((g) => g.value !== null));
    check(
      'đáp án của người khác chưa lộ giá trị trước reveal',
      leakedGuess.length === 0,
      leakedGuess.map((c) => c.label).join(','),
    );

    const lastLock = await last.emit('LOCK_GUESS', { value: guessOf(ROOM_SIZE - 1) });
    check('người thứ 30 khoá đáp án được', lastLock.ok, lastLock.error);

    // ── 7. Reveal đồng bộ ──────────────────────────────────────────────────
    console.log('\n7. Reveal đồng bộ');
    await waitUntil(() => clients.every((c) => c.revealPayload !== null), 'mọi client nhận START_REVEAL', 25000);
    check(`cả ${ROOM_SIZE} client nhận cue START_REVEAL`, true);

    const cue0 = host.revealPayload!;
    check('cue reveal có đủ 30 bàn tay', cue0.reveals.length === ROOM_SIZE, String(cue0.reveals.length));
    check(
      'mọi client nhận cùng một mốc thời gian reveal',
      clients.every((c) => c.revealPayload!.at === cue0.at),
    );
    check(
      'mọi client nhận cùng danh sách số bi',
      clients.every(
        (c) => JSON.stringify(c.revealPayload!.reveals) === JSON.stringify(cue0.reveals),
      ),
    );
    check(
      'tổng số bi trong cue đúng bằng 31',
      cue0.reveals.reduce((s, r) => s + r.marbles, 0) === ACTUAL_TOTAL,
    );

    await waitUntil(() => clients.every((c) => c.state?.lastResult !== null), 'mọi client có kết quả', 30000);
    const result = host.state!.lastResult!;
    check('server tự tính tổng = 31', result.actualTotal === ACTUAL_TOTAL, String(result.actualTotal));
    check(
      'mọi client thấy cùng một tổng',
      clients.every((c) => c.state!.lastResult!.actualTotal === ACTUAL_TOTAL),
    );
    check('chỉ người đoán đúng thắng lượt', result.winningTeamIds.length === 1,
      JSON.stringify(result.winningTeamIds));
    check(
      'mọi client thấy cùng người thắng',
      clients.every(
        (c) =>
          JSON.stringify(c.state!.lastResult!.winningTeamIds) ===
          JSON.stringify(result.winningTeamIds),
      ),
    );

    // ── 8. Dice random ở server ────────────────────────────────────────────
    console.log('\n8. Dice được random ở server');
    // P00 đặt cả 2 bi và thua nên hết sạch bi → server phải đẩy sang phase xúc xắc.
    check('người thua hết sạch bi', host.me()?.marbleCount === 0, String(host.me()?.marbleCount));
    await waitUntil(
      () => clients.every((c) => c.state?.phase === GamePhase.DICE_ROLL),
      'mọi client vào phase xúc xắc',
      30000,
    );
    check(`cả ${ROOM_SIZE} client vào phase xúc xắc`, true);
    check(
      'server chỉ định đúng người hết bi phải tung',
      host.state!.pendingDicePlayerId === host.playerId,
      String(host.state!.pendingDicePlayerId),
    );

    const notMyTurn = await clients[5]!.emit('ROLL_DICE');
    check('client khác không tung hộ được', !notMyTurn.ok, notMyTurn.error);

    const rolled = await host.emit('ROLL_DICE');
    check('người hết bi tung được xúc xắc', rolled.ok, rolled.error);
    await waitUntil(() => clients.every((c) => c.diceFace !== null), 'mọi client nhận kết quả xúc xắc', 20000);
    const face = host.diceFace!;
    check('mặt xúc xắc nằm trong 1..6', face >= 1 && face <= 6, String(face));
    check(
      `cả ${ROOM_SIZE} client thấy cùng một mặt xúc xắc`,
      clients.every((c) => c.diceFace === face),
      String(face),
    );
    check(
      'kết quả xúc xắc do server sinh, client không gửi lên',
      host.state!.lastDice?.playerId === host.playerId,
    );

    // ── Health check dưới tải ──────────────────────────────────────────────
    console.log('\nHealth check khi đang có 30 người');
    const health = await getJson<{ status: string; rooms: number; players: number }>('/health');
    check('/health trả status ok', health.status === 'ok', JSON.stringify(health));
    check('/health đếm đúng số phòng', health.rooms >= 1, JSON.stringify(health));
    check('/health đếm đúng 30 người', health.players === ROOM_SIZE, JSON.stringify(health));
    info('/health', JSON.stringify(health));

    // ── 10. Host disconnect được xử lý ─────────────────────────────────────
    console.log('\n10. Host disconnect được xử lý');
    const hostId = host.playerId;
    host.close();
    await waitUntil(
      () => clients[1]!.state?.players.find((p) => p.id === hostId)?.connected === false,
      'các client thấy host mất kết nối',
      20000,
    );
    check('client khác thấy host mất kết nối', true);
    check('trận không bị xoá khi host rớt', clients[1]!.state!.players.length === ROOM_SIZE);

    // Trong sảnh chờ, host rớt thì quyền chủ phòng phải chuyển sang người khác.
    const lobbyHost = new LoadClient('H0');
    const lobbyB = new LoadClient('H1');
    const lobbyC = new LoadClient('H2');
    extra.push(lobbyHost, lobbyB, lobbyC);
    await Promise.all([lobbyHost.connected(), lobbyB.connected(), lobbyC.connected()]);
    const lobbyRoom = await lobbyHost.emit('CREATE_ROOM', { name: 'H0', avatar: '🐯' });
    lobbyHost.credentials = lobbyRoom.credentials!;
    const lobbyId = lobbyHost.credentials.roomId;
    for (const c of [lobbyB, lobbyC]) {
      const r = await c.emit('JOIN_ROOM', { roomId: lobbyId, name: c.label, avatar: '🐧' });
      c.credentials = r.credentials!;
    }
    await waitUntil(() => lobbyB.state?.players.length === 3, '3 người trong sảnh chờ');
    check('host ban đầu đúng là người tạo phòng', lobbyB.state!.hostId === lobbyHost.playerId);

    lobbyHost.close();
    await waitUntil(
      () => lobbyB.state !== null && lobbyB.state.hostId !== lobbyHost.playerId,
      'quyền chủ phòng chuyển sang người khác',
      20000,
    );
    check('host rời sảnh chờ thì quyền chủ phòng được chuyển', true);
    check(
      'chủ phòng mới là người còn lại trong phòng',
      [lobbyB.playerId, lobbyC.playerId].includes(lobbyB.state!.hostId),
      lobbyB.state!.hostId,
    );
    check('phòng còn lại 2 người', lobbyB.state!.players.length === 2, String(lobbyB.state!.players.length));

    const newHost = [lobbyB, lobbyC].find((c) => c.playerId === lobbyB.state!.hostId)!;
    const startByNewHost = await newHost.emit('START_GAME');
    check('chủ phòng mới bắt đầu được trận', startByNewHost.ok, startByNewHost.error);
  } finally {
    for (const c of [...clients, ...extra]) c.close();
    await sleep(300);
    server.kill();
  }

  const color = failures === 0 ? '\u001b[32m' : '\u001b[31m';
  console.log(`\n${color}${checks - failures}/${checks} kiểm tra đạt\u001b[0m\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e: Error) => {
  console.error('\n\u001b[31mLoad test lỗi:\u001b[0m', e.message);
  process.exit(1);
});
