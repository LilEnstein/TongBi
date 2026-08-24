/**
 * Bot filler — mở N client giả vào một phòng để tự mắt kiểm tra giao diện
 * 30 người trên trình duyệt (deployment guide mục "Test 30 người").
 *
 * Dùng:
 *   npm run bots -w @tongbi/server -- <MÃ_PHÒNG> [số_bot]
 *   BOT_URL=https://tong-bi-server.onrender.com npm run bots -w @tongbi/server -- AB12CD 29
 *
 * Bot tự chốt bi và khoá đáp án nên trận vẫn chạy được tới reveal.
 * Ctrl+C để ngắt; bot cũng tự thoát sau 10 phút.
 */
import { io, type Socket } from 'socket.io-client';

const URL = process.env.BOT_URL ?? 'http://127.0.0.1:10000';
const ROOM = process.argv[2];
const COUNT = Number(process.argv[3] ?? 29);

if (!ROOM) {
  console.error('Thiếu mã phòng. Ví dụ: npm run bots -w @tongbi/server -- AB12CD 29');
  process.exit(1);
}

const AVATARS = ['🐼', '🦊', '🐸', '🐵', '🐧', '🦁', '🐨', '🐰', '🐮'];
const NAMES = [
  'Bình', 'Cường', 'Dũng', 'Em', 'Phúc', 'Giang', 'Hà', 'Khoa', 'Linh', 'Minh',
  'Nam', 'Oanh', 'Phương', 'Quân', 'Sơn', 'Trang', 'Uyên', 'Vy', 'Yến', 'An',
  'Bảo', 'Chi', 'Duy', 'Đạt', 'Hải', 'Kiên', 'Lan', 'Mai', 'Ngọc',
];

interface Ack {
  ok: boolean;
  error?: string;
  code?: string;
}

const sockets: Socket[] = [];

async function main(): Promise<void> {
  let joined = 0;
  for (let i = 0; i < COUNT; i += 1) {
    const s = io(URL, { transports: ['websocket'], forceNew: true });
    sockets.push(s);
    await new Promise<void>((resolve) => s.once('connect', () => resolve()));

    const res = await new Promise<Ack>((resolve) =>
      s.emit(
        'JOIN_ROOM',
        { roomId: ROOM, name: NAMES[i % NAMES.length]!, avatar: AVATARS[i % AVATARS.length]! },
        resolve,
      ),
    );
    if (res.ok) joined += 1;
    else console.log(`bot ${i} bị từ chối: ${res.error} (${res.code ?? '-'})`);

    // Bot chơi tự động để trận không bị kẹt chờ người.
    s.on('ROOM_STATE', (state: { phase: string }) => {
      if (state.phase === 'SELECT_MARBLES') {
        s.emit('SUBMIT_MARBLES', { amount: (i % 4) + 1 }, () => {});
      }
      if (state.phase === 'GUESS_TOTAL') {
        s.emit('LOCK_GUESS', { value: 40 + i }, () => {});
      }
    });
  }

  console.log(`${joined}/${COUNT} bot đã vào phòng ${ROOM} tại ${URL}`);

  const shutdown = () => {
    for (const s of sockets) s.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  setTimeout(shutdown, 10 * 60 * 1000);

  await new Promise(() => {});
}

void main();
