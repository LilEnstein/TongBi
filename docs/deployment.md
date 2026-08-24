# Deploy Tổng Bi — 30 người/room

Bản thực thi của [tong_bi_deployment_30_users.md](../tong_bi_deployment_30_users.md).
Tài liệu gốc viết cho stack Next.js; dự án này dùng **Vite + React**, nên chỉ có một
điểm khác biệt về tên biến (xem [Khác biệt so với guide](#khác-biệt-so-với-guide)).

## Kiến trúc

Có hai cách deploy, cùng một codebase:

### A. Một dịch vụ (đơn giản nhất — khuyến nghị cho lần đầu)

```text
        INTERNET
            │ HTTPS + WSS
            ▼
     Render Web Service
  Node.js + Socket.IO + SPA
            │
            ▼
   Room state trong RAM
```

Game server phục vụ luôn bản build của web khi tìm thấy `apps/web/dist`. Một URL duy
nhất, không phải cấu hình CORS, link mời và WebSocket cùng origin.

### B. Tách frontend và game server (như guide mô tả)

```text
        INTERNET
     ┌──────┴──────┐
     ▼             ▼
   Vercel        Render
Vite + R3F   Node + Socket.IO
     └──────►──────┘  WSS
```

Frontend lên CDN của Vercel, game server ở Render. Cần đặt `VITE_SERVER_URL` lúc build
và `CLIENT_ORIGIN` ở server.

Ở mốc 30 người/room chỉ cần **một instance** game server và room state trong RAM. Chưa
cần Redis hay database.

> Server restart hoặc deploy lại thì room trong RAM mất. Đây là đánh đổi có chủ ý của
> MVP; client đã xử lý bằng màn hình "Không vào được phòng".

## Environment variables

### Game server

| Biến | Mặc định | Ghi chú |
|---|---|---|
| `PORT` | `10000` | Render tự cấp; 10000 là mặc định trong tài liệu Render |
| `HOST` | `0.0.0.0` | Bắt buộc bind `0.0.0.0`, không phải `localhost` |
| `CLIENT_ORIGIN` | `*` | Origin của frontend. Nhiều origin ngăn bởi dấu phẩy. `CORS_ORIGIN` là tên cũ, vẫn dùng được |
| `MAX_PLAYERS_PER_ROOM` | `30` | Trần cứng cũng là 30 — đặt cao hơn sẽ bị kẹp lại |
| `ROOM_TTL_MINUTES` | `120` | Phòng không còn ai online quá lâu thì bị dọn khỏi RAM |

Cấu hình thực tế được in ra log lúc khởi động:

```text
[tongbi] game server listening on 0.0.0.0:10000
[tongbi] port=10000 host=0.0.0.0 origins=* maxPlayersPerRoom=30 roomTtl=120m env=production
```

### Web client (build-time)

| Biến | Ghi chú |
|---|---|
| `VITE_SERVER_URL` | URL game server. **Bỏ trống** khi deploy kiểu A (dùng chung origin) |

## Deploy game server lên Render

Repo đã có sẵn [`render.yaml`](../render.yaml) nên có thể dùng Blueprint:

1. Push code lên GitHub/GitLab.
2. Render Dashboard → **New** → **Blueprint** → chọn repo.
3. Render đọc `render.yaml` và tạo Web Service `tong-bi-server`.
4. Điền `CLIENT_ORIGIN` (biến này để `sync: false` nên Render sẽ hỏi):
   - Deploy kiểu A: để trống hoặc `*`.
   - Deploy kiểu B: `https://<tên-app>.vercel.app`.

Hoặc tạo tay:

```text
Type:           Web Service
Runtime:        Node
Build Command:  npm ci && npm run build
Start Command:  npm start
Health Check:   /health
```

Node version được ghim bằng [`.node-version`](../.node-version) (`22.13.0`) và biến
`NODE_VERSION` trong `render.yaml`.

Muốn chạy bằng Docker thì đổi runtime sang Docker — [`Dockerfile`](../Dockerfile) đã
`EXPOSE 10000` và có `HEALTHCHECK`.

> **Free instance** của Render spin down khi không có traffic; lượt chơi đầu tiên sau
> khi ngủ sẽ phải chờ server dậy. Muốn buổi chơi thật mượt thì lên gói trả phí.

## Deploy frontend lên Vercel (chỉ cần cho kiểu B)

Repo đã có [`vercel.json`](../vercel.json):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "apps/web/dist",
  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }]
}
```

Rewrite là bắt buộc, nếu không thì mở thẳng `/room/AB12CD` sẽ ra 404.

1. Vercel → **Add New** → **Project** → chọn repo.
2. Framework Preset: **Other** (vercel.json đã khai báo build).
3. Environment Variables → thêm:
   ```env
   VITE_SERVER_URL=https://tong-bi-server.onrender.com
   ```
4. Deploy, rồi quay lại Render đặt `CLIENT_ORIGIN=https://<tên-app>.vercel.app`.

Thứ tự đúng: deploy Render trước để có URL server, deploy Vercel sau, cuối cùng quay
lại Render điền `CLIENT_ORIGIN`.

## Health check

```bash
curl https://tong-bi-server.onrender.com/health
```

```json
{ "status": "ok", "rooms": 1, "players": 30, "maxPlayersPerRoom": 30, "uptime": 166 }
```

Endpoint phụ để client kiểm tra mã phòng trước khi vào:

```bash
curl "https://tong-bi-server.onrender.com/api/room?id=AB12CD"
```

```json
{
  "ok": true,
  "room": { "id": "AB12CD", "phase": "WAITING", "players": 30, "maxPlayers": 30, "connected": 30 },
  "joinable": false,
  "full": true
}
```

## Room đầy

Người thứ 31 nhận ack lỗi kèm mã ổn định:

```json
{ "ok": false, "error": "Phòng đã đủ 30 người.", "code": "ROOM_FULL" }
```

Client hiển thị màn hình riêng "Phòng đã đầy" thay vì lỗi chung chung.
Các mã khác: `ROOM_NOT_FOUND`, `ROOM_LOCKED`, `NOT_IN_ROOM`, `NOT_HOST`, `INVALID`.

## Test trước khi mở cho người thật

```bash
npm run typecheck        # toàn workspace
npm test                 # luật chơi (38 test)
npm run test:integration # multiplayer end-to-end (~64 kiểm tra)
npm run test:load        # 30 người/room (67 kiểm tra)
```

`npm run test:load` tự khởi động server, ramp **1 → 5 → 10 → 20 → 30** client socket
thật và chạy đủ 10 kịch bản bắt buộc trong guide:

| # | Kịch bản | Kiểm tra |
|---|---|---|
| 1 | 30 người join | ramp theo từng mốc, ghế không trùng |
| 2 | Người thứ 31 bị reject | ack trả `code: "ROOM_FULL"` |
| 3 | Lobby đồng bộ | **mọi** client thấy đủ số người, không chỉ host |
| 4 | Host Start đổi phase | đo độ trễ lan tới client chậm nhất |
| 5 | Hidden marble không leak | `revealed` là `null` với mọi client trước reveal |
| 6 | Guess đồng bộ | khoá 29 người rồi kiểm tra giá trị chưa lộ, người thứ 30 khoá sau |
| 7 | Reveal đồng bộ | 30 client cùng mốc thời gian và cùng danh sách bi |
| 8 | Dice random ở server | người khác không tung hộ được, 30 client cùng một mặt |
| 9 | Client mất mạng rồi reconnect | giữ nguyên playerId, ghế, số bi, bi bí mật |
| 10 | Host disconnect | quyền chủ phòng chuyển sang người khác |

### Xem giao diện 30 người bằng mắt

```bash
npm start
```

Mở http://localhost:10000, tạo phòng, rồi đổ bot vào cho đủ 30:

```bash
npm run bots -w @tongbi/server -- AB12CD 29
```

Bot tự chốt bi và khoá đáp án nên trận chạy được tới reveal. Trỏ sang server đã deploy
bằng `BOT_URL`:

```bash
BOT_URL=https://tong-bi-server.onrender.com npm run bots -w @tongbi/server -- AB12CD 29
```

## Chạy local đúng như production

```bash
npm ci
npm run build
npm start           # 0.0.0.0:10000, phục vụ luôn apps/web/dist
```

Docker:

```bash
docker build -t tongbi .
docker run -p 10000:10000 -e CLIENT_ORIGIN=* tongbi
```

## Khác biệt so với guide

| Guide | Dự án này | Lý do |
|---|---|---|
| `NEXT_PUBLIC_GAME_SERVER_URL` | `VITE_SERVER_URL` | Frontend là Vite chứ không phải Next.js; Vite chỉ đưa biến có tiền tố `VITE_` vào bundle |
| Frontend bắt buộc ở Vercel | Vercel **hoặc** chính game server | Server đã phục vụ được SPA nên deploy kiểu A chỉ cần một dịch vụ |
| Event `CREATE_ROOM` / `SUBMIT_GUESS`… | `CREATE_ROOM` / `LOCK_GUESS`… | Protocol đã có sẵn từ trước theo game design doc §20; tên khác nhưng vai trò tương đương |

## Định nghĩa hoàn thành

- [x] Tạo room
- [x] Sinh share link (+ QR trong tab **Mời bạn**)
- [x] Tối đa 30 người join
- [x] Room đầy trả `ROOM_FULL`
- [x] Lobby realtime
- [x] Host Start
- [x] Game phase đồng bộ
- [x] Hidden marble không leak
- [x] Guess hoạt động
- [x] Reveal hoạt động
- [x] Server tự tính tổng
- [x] Dice server-side
- [x] Reconnect
- [x] Health check
- [x] 30-client load test pass
- [ ] Production HTTPS — do Render/Vercel cấp, cần tài khoản để bật
- [ ] Production WSS — đi kèm HTTPS ở trên

## Khi nào cần nâng cấp

Kiến trúc hiện tại là **một instance, room trong RAM**. Cần nâng cấp khi:

- nhiều hơn một game-server instance → Socket.IO Redis adapter cho pub/sub;
- muốn room sống sót qua deploy → Redis cho room state;
- muốn lịch sử trận, leaderboard → PostgreSQL.
