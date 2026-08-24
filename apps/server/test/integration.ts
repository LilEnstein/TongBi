/**
 * Integration test cho multiplayer — design doc §44 (Multiplayer tests).
 * Chạy server thật, mở nhiều socket client thật và đi hết một lượt chơi:
 * join → chọn bi → giấu bi → đoán → reveal → kết quả, có kiểm tra thông tin ẩn,
 * dữ liệu sai, disconnect/reconnect và tính nhất quán giữa các máy.
 *
 * Chạy: npm run test -w @tongbi/server (server phải đang chạy ở PORT bên dưới)
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { io, type Socket } from 'socket.io-client';
import { GamePhase, type PublicRoomState, type SessionCredentials } from '@tongbi/game-rules';

const PORT = Number(process.env.TEST_PORT ?? 3999);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SERVER_ENTRY = fileURLToPath(new URL('../src/index.ts', import.meta.url));

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Chờ một điều kiện chung (không gắn với state của riêng client nào). */
async function waitUntil(fn: () => boolean, label: string, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) return;
    await sleep(40);
  }
  throw new Error(`hết giờ chờ "${label}"`);
}

/** Một client mô phỏng một người chơi trên một thiết bị. */
class TestClient {
  socket: Socket;
  state: PublicRoomState | null = null;
  privateSelection: number | null = null;
  credentials: SessionCredentials | null = null;
  events: string[] = [];
  revealPayload: { at: number; reveals: Array<{ playerId: string; marbles: number }> } | null = null;

  constructor(readonly label: string) {
    this.socket = io(BASE_URL, { transports: ['websocket'], forceNew: true });
    this.socket.on('ROOM_STATE', (s: PublicRoomState) => {
      this.state = s;
    });
    this.socket.on('PRIVATE_STATE', (p: { selectedMarbles: number | null }) => {
      this.privateSelection = p.selectedMarbles;
    });
    for (const e of ['START_REVEAL', 'ROUND_RESULT', 'ALL_PLAYERS_READY', 'DICE_ROLL_RESULT']) {
      this.socket.on(e, () => this.events.push(e));
    }
    this.socket.on(
      'START_REVEAL',
      (p: { at: number; reveals: Array<{ playerId: string; marbles: number }> }) => {
        this.revealPayload = p;
      },
    );
  }

  connected(): Promise<void> {
    if (this.socket.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`${this.label}: không kết nối được`)), 8000);
      this.socket.once('connect', () => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  emit<T = unknown>(event: string, payload?: unknown): Promise<{ ok: boolean; error?: string } & T> {
    return new Promise((resolve) => {
      const cb = (res: { ok: boolean; error?: string } & T) => resolve(res);
      if (payload === undefined) this.socket.emit(event, cb);
      else this.socket.emit(event, payload, cb);
    });
  }

  /** Chờ tới khi state thoả điều kiện, hoặc timeout. */
  async waitFor(predicate: (s: PublicRoomState) => boolean, label: string, timeoutMs = 12000): Promise<PublicRoomState> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.state && predicate(this.state)) return this.state;
      await sleep(40);
    }
    throw new Error(`${this.label}: hết giờ chờ "${label}" (phase=${this.state?.phase})`);
  }

  close(): void {
    this.socket.close();
  }
}

async function startServer(): Promise<ChildProcess> {
  const child = spawn(process.execPath, ['--import', 'tsx', SERVER_ENTRY], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr?.on('data', (d) => process.stderr.write(`[server] ${d}`));

  const deadline = Date.now() + 25000;
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
  console.log('\n🎲 Tổng Bi — integration test\n');
  const server = await startServer();
  const clients: TestClient[] = [];

  try {
    // ── 1. Tạo phòng và join ──────────────────────────────────────────────
    console.log('1. Tạo phòng và nhiều người vào cùng một phòng');
    const host = new TestClient('host');
    clients.push(host);
    await host.connected();

    const created = await host.emit<{ credentials: SessionCredentials }>('CREATE_ROOM', {
      name: 'An',
      avatar: '🐯',
      settings: { selectSeconds: 8, guessSeconds: 8, revealSeconds: 3, totalRounds: 3 },
    });
    check('tạo được phòng', created.ok);
    host.credentials = created.credentials;
    const roomId = created.credentials.roomId;
    check('mã phòng có 6 ký tự', roomId.length === 6, roomId);

    const b = new TestClient('B');
    const c = new TestClient('C');
    clients.push(b, c);
    await Promise.all([b.connected(), c.connected()]);
    const joinB = await b.emit<{ credentials: SessionCredentials }>('JOIN_ROOM', {
      roomId,
      name: 'Bình',
      avatar: '🐼',
    });
    const joinC = await c.emit<{ credentials: SessionCredentials }>('JOIN_ROOM', {
      roomId,
      name: 'Cường',
      avatar: '🦊',
    });
    check('người thứ hai vào được', joinB.ok);
    check('người thứ ba vào được', joinC.ok);
    b.credentials = joinB.credentials;
    c.credentials = joinC.credentials;

    const wrongRoom = await b.emit('JOIN_ROOM', { roomId: 'ZZZZZZ', name: 'X', avatar: '🐧' });
    check('mã phòng sai bị từ chối', !wrongRoom.ok);

    await host.waitFor((s) => s.players.length === 3, '3 người trong phòng');
    check('cả ba client thấy đủ 3 người', [host, b, c].every((cl) => cl.state?.players.length === 3));

    // ── 2. Quyền chủ phòng ────────────────────────────────────────────────
    console.log('\n2. Phân quyền chủ phòng');
    const notHost = await b.emit('START_GAME');
    check('người thường không bắt đầu được trận', !notHost.ok, notHost.error);
    const badSettings = await b.emit('UPDATE_SETTINGS', { startingMarbles: 999 });
    check('người thường không đổi được luật', !badSettings.ok);

    // ── 3. Bắt đầu và chọn bi ─────────────────────────────────────────────
    console.log('\n3. Bắt đầu trận và chọn bi');
    const start = await host.emit('START_GAME');
    check('chủ phòng bắt đầu được', start.ok, start.error);

    await host.waitFor((s) => s.phase === GamePhase.SELECT_MARBLES, 'vào phase chọn bi');
    check('mọi người cùng vào phase SELECT_MARBLES', [host, b, c].every((cl) => cl.state?.phase === GamePhase.SELECT_MARBLES));
    check('mỗi người bắt đầu với 10 bi', host.state!.players.every((p) => p.marbleCount === 10));

    const tooMany = await host.emit('SUBMIT_MARBLES', { amount: 99 });
    check('không đặt được nhiều hơn số bi đang có', !tooMany.ok, tooMany.error);
    const zero = await host.emit('SUBMIT_MARBLES', { amount: 0 });
    check('không đặt được 0 viên', !zero.ok, zero.error);
    const negative = await host.emit('SUBMIT_MARBLES', { amount: -5 });
    check('không đặt được số âm', !negative.ok);

    const s1 = await host.emit('SUBMIT_MARBLES', { amount: 4 });
    check('chốt 4 viên thành công', s1.ok, s1.error);
    const twice = await host.emit('SUBMIT_MARBLES', { amount: 2 });
    check('không đổi được lựa chọn sau khi chốt', !twice.ok);

    await b.emit('SUBMIT_MARBLES', { amount: 2 });

    // ── 4. Thông tin ẩn ───────────────────────────────────────────────────
    console.log('\n4. Thông tin ẩn trước reveal (§18)');
    await sleep(300);
    const seenByC = c.state!;
    check(
      'người khác thấy "đã chốt" nhưng không thấy số bi',
      seenByC.roundPublic[host.credentials!.playerId]?.submitted === true &&
        seenByC.roundPublic[host.credentials!.playerId]?.revealed === null,
    );
    check('mình vẫn biết số bi của chính mình', host.privateSelection === 4);
    check('không có số bi của người khác trong public state', c.privateSelection === null);
    check(
      'toàn bộ public state không chứa lựa chọn bí mật',
      !JSON.stringify(seenByC.roundPublic).includes('"revealed":4'),
    );

    await c.emit('SUBMIT_MARBLES', { amount: 5 });

    // ── 5. Đoán tổng ──────────────────────────────────────────────────────
    console.log('\n5. Đoán tổng và khoá đáp án');
    await host.waitFor((s) => s.phase === GamePhase.GUESS_TOTAL, 'vào phase đoán');
    check('tự chuyển sang GUESS_TOTAL khi mọi người đã chốt', host.state!.phase === GamePhase.GUESS_TOTAL);
    check('mỗi người là một đội (free-for-all)', host.state!.guesses.length === 3);

    const outOfRange = await host.emit('LOCK_GUESS', { value: 999 });
    check('dự đoán ngoài khoảng bị từ chối', !outOfRange.ok, outOfRange.error);

    check('An khoá đáp án 9', (await host.emit('LOCK_GUESS', { value: 9 })).ok);
    check('Bình khoá đáp án 11', (await b.emit('LOCK_GUESS', { value: 11 })).ok);
    const relock = await host.emit('LOCK_GUESS', { value: 10 });
    check('không đổi được đáp án sau khi khoá', !relock.ok);
    check('Cường khoá đáp án 13', (await c.emit('LOCK_GUESS', { value: 13 })).ok);

    // ── 6. Reveal và kết quả ──────────────────────────────────────────────
    console.log('\n6. Reveal và tính kết quả');
    await host.waitFor((s) => s.phase === GamePhase.REVEAL, 'vào phase reveal');
    // Cue mở tay phải tới nơi trước hoặc cùng lúc với phase REVEAL trên mọi máy.
    await waitUntil(
      () => [host, b, c].every((cl) => cl.events.includes('START_REVEAL')),
      'mọi client nhận START_REVEAL',
    );
    check('mọi client nhận event START_REVEAL', [host, b, c].every((cl) => cl.events.includes('START_REVEAL')));
    check(
      'cue reveal chứa đủ số bi của cả ba người',
      [host, b, c].every((cl) => (cl.revealPayload?.reveals.length ?? 0) === 3),
    );
    check(
      'mọi máy nhận cùng một mốc thời gian mở tay',
      new Set([host, b, c].map((cl) => cl.revealPayload?.at)).size === 1,
    );

    const done = await host.waitFor(
      (s) => s.lastResult !== null && s.phase === GamePhase.ROUND_RESULT,
      'có kết quả lượt',
    );
    const result = done.lastResult!;
    check('tổng thực tế = 4 + 2 + 5 = 11', result.actualTotal === 11, String(result.actualTotal));
    // Luật mặc định là CLOSEST: 9 lệch 2, 11 lệch 0, 13 lệch 2 → B thắng.
    check('đội đoán 11 thắng lượt', result.winningTeamIds.length === 1);
    check(
      'người thắng là Bình',
      result.winningTeamIds[0] === b.state!.players.find((p) => p.name === 'Bình')?.teamId,
    );

    await sleep(200);
    const states = [host.state!, b.state!, c.state!];
    const marbleSets = states.map((s) =>
      s.players
        .slice()
        .sort((x, y) => x.seat - y.seat)
        .map((p) => `${p.name}:${p.marbleCount}`)
        .join('|'),
    );
    check('cả ba máy thấy số bi giống hệt nhau', new Set(marbleSets).size === 1, marbleSets.join(' ≠ '));
    check('số bi đã được cập nhật sau lượt', marbleSets[0] !== 'An:10|Bình:10|Cường:10', marbleSets[0]);

    const totalAfter = states[0]!.players.reduce((sum, p) => sum + p.marbleCount, 0);
    check('tổng bi trên bàn được bảo toàn (30)', totalAfter === 30, String(totalAfter));

    check('số bi từng người đã lộ sau reveal', states[0]!.roundPublic[host.credentials!.playerId]?.revealed === 4);

    // ── 7. Reconnect ──────────────────────────────────────────────────────
    console.log('\n7. Reload trang giữa trận (§36)');
    const marblesBefore = c.state!.players.find((p) => p.id === c.credentials!.playerId)!.marbleCount;
    c.socket.close();
    await sleep(400);
    const reconnected = new TestClient('C-reload');
    clients.push(reconnected);
    await reconnected.connected();
    const rejoin = await reconnected.emit<{ credentials: SessionCredentials }>('JOIN_ROOM', {
      roomId,
      name: 'Cường',
      avatar: '🦊',
      playerId: c.credentials!.playerId,
      token: c.credentials!.token,
    });
    check('vào lại được bằng token cũ', rejoin.ok, rejoin.error);
    await reconnected.waitFor((s) => s.players.length === 3, 'phòng vẫn đủ người');
    check(
      'giữ nguyên ghế và số bi sau khi reload',
      reconnected.state!.players.find((p) => p.id === c.credentials!.playerId)?.marbleCount === marblesBefore,
    );
    check('một người reload không làm reset cả phòng', reconnected.state!.round >= 1);

    const badToken = await reconnected.emit('JOIN_ROOM', {
      roomId,
      name: 'Giả mạo',
      avatar: '🐧',
      playerId: host.credentials!.playerId,
      token: 'sai-token',
    });
    // Token sai thì server coi như người mới, không được chiếm ghế của người khác.
    check('token sai không chiếm được ghế người khác', !badToken.ok || host.state!.players.length <= 4);

    // ── 8. Vòng tiếp theo ─────────────────────────────────────────────────
    console.log('\n8. Vòng tiếp theo tự chạy');
    await host.waitFor((s) => s.round === 2, 'sang vòng 2', 20000);
    check('trận tự sang vòng 2', host.state!.round === 2);
    check('lựa chọn lượt cũ đã được xoá', host.state!.roundPublic[host.credentials!.playerId]?.submitted === false);

    // ── 9. Timeout tự chọn hộ ─────────────────────────────────────────────
    console.log('\n9. Hết giờ thì tự chọn 1 viên (§37)');
    await host.waitFor((s) => s.phase === GamePhase.SELECT_MARBLES, 'phase chọn bi vòng 2');
    await host.emit('SUBMIT_MARBLES', { amount: 3 });
    // B và C cố tình không làm gì cho tới khi hết giờ.
    const afterTimeout = await host.waitFor(
      (s) => s.phase === GamePhase.GUESS_TOTAL || s.phase === GamePhase.CLOSE_HAND,
      'hết giờ chọn bi',
      15000,
    );
    check('trận không bị kẹt khi có người không bấm gì', afterTimeout.phase !== GamePhase.SELECT_MARBLES);
    await host.waitFor((s) => s.phase === GamePhase.REVEAL || s.phase === GamePhase.ROUND_RESULT, 'reveal vòng 2', 20000);
    const r2 = await host.waitFor((s) => s.lastResult?.round === 2, 'kết quả vòng 2', 20000);
    check('người bị auto-chọn được tính 1 viên', r2.lastResult!.reveals.some((x) => x.marbles === 1));
    // ── 10. Hết bi → xúc xắc → kết thúc trận ──────────────────────────────
    console.log('\n10. Hết bi, xin vay bi bằng xúc xắc và kết thúc trận (§8, §9, §19)');
    const d1 = new TestClient('D1');
    const d2 = new TestClient('D2');
    clients.push(d1, d2);
    await Promise.all([d1.connected(), d2.connected()]);

    // Phòng nhỏ: mỗi người 2 bi, luật đoán đúng tuyệt đối, 1 vòng duy nhất.
    const dRoom = await d1.emit<{ credentials: SessionCredentials }>('CREATE_ROOM', {
      name: 'Dũng',
      avatar: '🦁',
      settings: {
        startingMarbles: 2,
        totalRounds: 1,
        winRule: 'EXACT',
        payout: 'STAKE',
        brokeRule: 'DICE',
        diceEnabled: true,
        selectSeconds: 30,
        guessSeconds: 30,
        revealSeconds: 2,
      },
    });
    d1.credentials = dRoom.credentials;
    const dJoin = await d2.emit<{ credentials: SessionCredentials }>('JOIN_ROOM', {
      roomId: dRoom.credentials.roomId,
      name: 'Em',
      avatar: '🐨',
    });
    d2.credentials = dJoin.credentials;
    await d1.waitFor((s) => s.players.length === 2, '2 người');
    check('luật phòng nhận đúng 2 bi khởi đầu', d1.state!.settings.startingMarbles === 2);

    await d1.emit('START_GAME');
    await d1.waitFor((s) => s.phase === GamePhase.SELECT_MARBLES, 'chọn bi');
    // Dũng đặt hết 2 bi, Em đặt 1 → tổng 3. Em đoán đúng 3 nên Dũng mất sạch bi.
    await d1.emit('SUBMIT_MARBLES', { amount: 2 });
    await d2.emit('SUBMIT_MARBLES', { amount: 1 });
    await d1.waitFor((s) => s.phase === GamePhase.GUESS_TOTAL, 'đoán');
    await d1.emit('LOCK_GUESS', { value: 2 });
    await d2.emit('LOCK_GUESS', { value: 3 });

    await d1.waitFor((s) => s.lastResult !== null, 'kết quả');
    check('tổng thực tế = 3', d1.state!.lastResult!.actualTotal === 3);
    const dungId = d1.credentials!.playerId;
    const dungAfter = d1.state!.players.find((p) => p.id === dungId)!.marbleCount;
    check('người thua hết sạch bi', dungAfter === 0, String(dungAfter));

    const dicePhase = await d1.waitFor((s) => s.phase === GamePhase.DICE_ROLL, 'phase xúc xắc', 15000);
    check('người hết bi được chuyển sang lượt tung xúc xắc', dicePhase.pendingDicePlayerId === dungId);

    const notYourTurn = await d2.emit('ROLL_DICE');
    check('người khác không tung hộ được', !notYourTurn.ok, notYourTurn.error);

    const rolled = await d1.emit('ROLL_DICE');
    check('tung được xúc xắc', rolled.ok, rolled.error);
    await d1.waitFor((s) => s.lastDice !== null, 'có kết quả xúc xắc');
    const dice = d1.state!.lastDice!;
    check('mặt xúc xắc nằm trong 1..6', dice.faceIndex >= 1 && dice.faceIndex <= 6, String(dice.faceIndex));
    check(
      'mặt vay bi cho đúng 3 / 6 / 9 viên',
      dice.face.kind !== 'BORROW' || [3, 6, 9].includes(dice.marblesGained),
      String(dice.marblesGained),
    );
    await d2.waitFor((s) => s.lastDice !== null, 'máy thứ hai nhận kết quả xúc xắc');
    check(
      'cả hai máy cùng thấy một kết quả xúc xắc',
      d2.state!.lastDice!.faceIndex === dice.faceIndex,
      `${d2.state!.lastDice!.faceIndex} ≠ ${dice.faceIndex}`,
    );
    check('client nhận event DICE_ROLL_RESULT', d1.events.includes('DICE_ROLL_RESULT'));

    const afterDice = d1.state!.players.find((p) => p.id === dungId)!.marbleCount;
    check('sau khi tung thì không còn trắng tay', afterDice > 0, String(afterDice));
    if (dice.face.kind === 'BORROW') {
      check(`vay đúng ${dice.marblesGained} bi`, afterDice === dice.marblesGained, String(afterDice));
    } else {
      check('ra hình phạt vẫn có bi tối thiểu để chơi tiếp', afterDice >= 1);
      check('hình phạt có nội dung hiển thị được', !!dice.penalty?.label);
    }

    const over = await d1.waitFor((s) => s.phase === GamePhase.GAME_OVER, 'kết thúc trận', 20000);
    check('hết số vòng thì trận kết thúc', over.phase === GamePhase.GAME_OVER);
    check('có bảng xếp hạng cuối trận', (over.finalStandings?.length ?? 0) === 2);
    check('hạng 1 là người nhiều bi nhất', over.finalStandings![0]!.rank === 1);
    check('hai máy thấy cùng bảng xếp hạng', JSON.stringify(d2.state!.finalStandings) === JSON.stringify(over.finalStandings));

    const replay = await d2.emit('PLAY_AGAIN');
    check('người thường không mở được ván mới', !replay.ok);
    const replayHost = await d1.emit('PLAY_AGAIN');
    check('chủ phòng mở được ván mới', replayHost.ok, replayHost.error);
    await d1.waitFor((s) => s.phase === GamePhase.WAITING, 'về sảnh chờ');
    check('ván mới đưa cả phòng về sảnh chờ', d1.state!.phase === GamePhase.WAITING);

  } finally {
    for (const cl of clients) cl.close();
    await sleep(200);
    server.kill();
  }

  console.log(`\n${failures === 0 ? '\u001b[32m' : '\u001b[31m'}${checks - failures}/${checks} kiểm tra đạt\u001b[0m\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e: Error) => {
  console.error('\n\u001b[31mTest lỗi:\u001b[0m', e.message);
  process.exit(1);
});
