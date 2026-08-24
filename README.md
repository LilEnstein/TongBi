# Tổng Bi

Game party multiplayer realtime mô phỏng trò chơi dân gian "đoán tổng bi": mỗi người
giấu một số bi trong lòng bàn tay, cả bàn đoán tổng số bi đang được giấu, ai đoán
trúng thì ôm bi.

Xây dựng theo bản thiết kế trong [docs/game-design.md](docs/game-design.md).

```
CHỌN BI → BỎ VÀO TAY → NẮM TAY → ĐOÁN TỔNG → MỞ TAY → TÍNH TỔNG → CẬP NHẬT BI → LƯỢT SAU
```

## Chạy thử

```bash
npm install
npm run dev
```

Mở http://localhost:5173. Tạo phòng, copy link `/room/XXXXXX` rồi gửi cho bạn bè —
`vite` đã bật `host: true` nên điện thoại trong cùng mạng WiFi mở được luôn bằng IP LAN
của máy chạy server.

Muốn chơi thử một mình trước: **Chơi thử một mình (hướng dẫn 60 giây)** ở trang chủ.

## Kiến trúc

```
apps/web          React + TypeScript + React Three Fiber (Vite)
apps/server       Node.js + Socket.IO — authoritative game server
packages/game-rules  Luật chơi thuần TypeScript, không phụ thuộc UI hay network
```

Server là nguồn sự thật duy nhất (design doc §17): client chỉ gửi ý định
(`SUBMIT_MARBLES`, `LOCK_GUESS`, `ROLL_DICE`), server validate rồi broadcast state.
Client không tự tính tổng, không tự quyết định người thắng, không tự tung xúc xắc.

**Thông tin ẩn (§18).** Số bi mỗi người bỏ vào tay nằm trong `Room.selections` phía
server và chỉ đi ra ngoài qua `PRIVATE_STATE` gửi riêng cho đúng socket của người đó.
`PublicRoomState` chỉ chứa cờ `submitted`; trường `revealed` vẫn là `null` cho tới khi
vào phase REVEAL.

**Đồng bộ animation (§21).** Server không gửi từng frame. Server gửi mốc thời gian
(`phaseStartedAt`, `START_REVEAL.at`, `DICE_ROLL_STARTED.at`) và client tự chạy
animation từ mốc đó, nên mọi máy mở tay cùng một nhịp.

## Đồ hoạ

Toàn bộ model 3D được dựng bằng code, không cần file GLB/GLTF nào:

- **Bàn tay có rig** (`apps/web/src/three/Hand.tsx`) — 4 ngón × 3 đốt + ngón cái 2 đốt,
  mỗi đốt là một group lồng nhau nên xoay đốt gốc kéo theo cả ngón. Một giá trị `curl`
  0→1 tạo ra chuỗi xoè tay → nắm tay. Các khớp cập nhật trong `useFrame` chứ không đi
  qua React render.
- **Bi, bàn, xúc xắc** — primitive của three.js; sáu mặt xúc xắc được vẽ bằng Canvas 2D
  thành texture lúc chạy, nên đổi bộ hình phạt là mặt xúc xắc đổi theo.
- **Âm thanh** (`apps/web/src/audio/sfx.ts`) — tổng hợp bằng WebAudio, không có file audio.

Muốn thay bằng asset do artist làm (§45) thì chỉ cần thay `Hand.tsx` / `Dice.tsx` bằng
model đã rig, phần còn lại không đổi.

## Luật chơi

Cấu hình được trong sảnh chờ, tab **Luật chơi**:

| Cài đặt | Mặc định | Ghi chú |
|---|---|---|
| Số bi khởi đầu | 10 | §2.1 |
| Số vòng | 10 | |
| Bi tối đa mỗi lượt | không giới hạn | |
| Luật thắng lượt | Gần nhất | Rule A / B / C của §6 |
| Ăn thua bi | Bi đặt là bi cược | xem bên dưới |
| Khi hết bi | Tung xúc xắc vay bi | §8 |
| Chia đội | Mỗi người một đội | tới 4 đội, §12 |
| Thời gian mỗi bước | 20s / 15s / 5s | §37 |

### Một điểm bản thiết kế chưa chốt

Bản thiết kế yêu cầu "cập nhật số bi" sau mỗi lượt (§52.14) nhưng không nói rõ **bi
chuyển từ ai sang ai**. Game này cài hai mô hình và để chủ phòng chọn:

- **Bi đặt là bi cược** (mặc định): số bi đã bỏ vào tay là tiền cược. Đội thắng chia đều
  số bi của phe thua, phe thua mất phần đã đặt. Không đội nào thắng thì hoàn bi cho tất
  cả. Mô hình này bảo toàn tổng số bi trên bàn (có test kiểm tra) và làm người chơi thật
  sự về 0 để cơ chế vay bi bằng xúc xắc có ý nghĩa.
- **Thắng/thua cố định**: thắng +N, thua −N, phần bi đã đặt được trả lại.

Nếu luật gốc của nhóm bạn khác, chỉnh trong `applyRoundResult()` ở
`packages/game-rules/src/rules.ts` — đây là hàm thuần, sửa xong chỉ cần cập nhật test.

## Kiểm thử

```bash
npm test                  # luật chơi — 38 test (vitest)
npm run test:integration  # multiplayer end-to-end — ~64 kiểm tra, socket thật
npm run test:load         # 30 người/room — 67 kiểm tra, ramp 1→5→10→20→30 client
npm run test -w @tongbi/web  # scene 3D headless — 8 test
npm run typecheck         # toàn bộ workspace
```

Integration test tự khởi động server thật, mở nhiều socket client rồi đi hết một trận:
join nhiều máy, chặn dữ liệu sai, thông tin ẩn không rò rỉ, reload giữa trận, hết giờ
tự chọn hộ, hết bi thì tung xúc xắc, kết thúc và xếp hạng — đúng danh mục §44.

Load test làm điều tương tự ở quy mô 30 người và kiểm đủ 10 kịch bản bắt buộc của
deployment guide — chi tiết trong [docs/deployment.md](docs/deployment.md).

## Deploy

Hướng dẫn đầy đủ: **[docs/deployment.md](docs/deployment.md)** (Render + Vercel, 30 người/room).

Server phục vụ luôn bản build của web nếu tìm thấy `apps/web/dist`, nên chỉ cần một
dịch vụ duy nhất:

```bash
npm run build     # build web
npm start         # server + web trên cùng cổng 10000
```

Hoặc dùng Docker:

```bash
docker build -t tongbi .
docker run -p 10000:10000 tongbi
```

Repo có sẵn [`render.yaml`](render.yaml) (Render Blueprint) và [`vercel.json`](vercel.json).
Muốn tách frontend khỏi game server thì build web với
`VITE_SERVER_URL=https://<game-server>` và đặt `CLIENT_ORIGIN` ở server cho đúng domain.
Game server phải chạy trên hạ tầng giữ được kết nối WebSocket lâu dài.

Biến môi trường: xem `.env.example`.

## Trạng thái so với bản thiết kế

Đã có: vòng chơi đầy đủ, phòng + link + QR, 2–30 người, 1–4 đội, thông tin ẩn,
state machine server-authoritative, reconnect, timeout, xúc xắc 3D vay bi 3/6/9,
hình phạt tuỳ chỉnh, loại người chơi, xếp hạng cuối trận, tutorial một mình, âm thanh,
mobile-first UI.

Chưa có (phần "nên có" của §26 và Phase 4 §34): skin/avatar tuỳ biến, particle effect,
lịch sử trận, leaderboard, spectator, lưu trữ Postgres/Redis. Room hiện nằm trong bộ
nhớ của một server instance — đủ cho 30 người/room như deployment guide mô tả cho MVP;
muốn scale nhiều instance thì cần Redis adapter cho Socket.IO.
