# Tổng Bi — Deployment Guide cho 30 người/room

## Mục tiêu

Bản đầu tiên cần cho phép một người tạo phòng, gửi một link, tối đa 30 người mở link trên điện thoại/máy tính và cùng chơi một room theo thời gian thực.

Ví dụ:

```text
https://tongbi.vercel.app/room/AB12CD
```

## Kiến trúc MVP khuyến nghị

```text
                         INTERNET
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
       Vercel / Frontend              Render / Game Server
       Next.js + R3F                  Node.js + Socket.IO
              │                             │
              │ HTTPS                      │ WSS
              └──────────────►──────────────┘
                                            │
                                            ▼
                                      In-memory Room State
```

Frontend deploy trên Vercel. Game server chạy Node.js + Socket.IO trên Render Web Service. Render hỗ trợ inbound WebSocket cho Web Service; production client nên dùng `wss://`. citeturn115869search0turn115869search1

Ở quy mô 30 người/room, chỉ cần **một game-server instance** và giữ room state trong RAM. Chưa cần Redis/database realtime.

Đổi lại, nếu server restart/deploy thì room trong RAM có thể mất. Đây là chấp nhận được cho MVP nhưng phải được xử lý bằng UI/error state.

## Stack

```text
Frontend
- Next.js
- React
- React Three Fiber
- Three.js
- Socket.IO Client

Backend
- Node.js
- Express
- Socket.IO

Deploy
- Vercel
- Render Web Service
```

## Room model

```ts
Room {
  id: string
  hostId: string
  maxPlayers: number
  status: "LOBBY" | "PLAYING" | "FINISHED"

  settings: {
    initialMarbles: number
    mode: "1V1" | "TEAM"
    totalRule: "EXACT" | "NEAREST"
    enableDice: boolean
  }

  players: Player[]

  game: {
    round: number
    phase: GamePhase
    hiddenMarbles: Record<PlayerId, number>
    guesses: Record<TeamId, number>
    total: number | null
  }
}
```

## Giới hạn room

```ts
MAX_PLAYERS_PER_ROOM = 30
```

Người thứ 31 nhận `ROOM_FULL`.

## Join bằng link

Route frontend:

```text
/room/[roomId]
```

Flow:

```text
Open Link
  ↓
Enter Nickname
  ↓
Connect WebSocket
  ↓
JOIN_ROOM
  ↓
Server validates room
  ↓
ROOM_STATE
  ↓
Player appears in lobby
```

## Server authoritative

Client chỉ được gửi action. Client không được quyết định kết quả.

Ví dụ:

```json
{
  "action": "SUBMIT_GUESS",
  "guess": 10
}
```

Server tự:

- kiểm tra người chơi;
- kiểm tra số bi;
- giữ hidden marble;
- tính tổng;
- quyết định winner;
- random dice;
- cấp bi vay;
- áp dụng penalty.

## Hidden information

Không broadcast số bi bí mật trước reveal.

Trước reveal:

```json
{
  "player": "A",
  "handState": "CLOSED"
}
```

Sau reveal:

```json
{
  "player": "A",
  "revealedMarbles": 4
}
```

## Socket events

Client → Server:

```text
CREATE_ROOM
JOIN_ROOM
LEAVE_ROOM
SET_READY
START_GAME
SELECT_MARBLES
CONFIRM_HAND
SUBMIT_GUESS
REQUEST_DICE
CHOOSE_PENALTY
NEXT_ROUND
END_GAME
```

Server → Client:

```text
ROOM_CREATED
ROOM_STATE
PLAYER_JOINED
PLAYER_LEFT
PLAYER_READY
GAME_STARTED
GUESS_PHASE_STARTED
REVEAL_STARTED
PLAYER_REVEALED
ROUND_RESULT
DICE_ROLLED
PENALTY_ASSIGNED
ROUND_STARTED
GAME_FINISHED
PLAYER_RECONNECTED
ERROR
```

## Reconnect

Lưu ở client:

```text
playerId
sessionToken
roomId
```

State:

```text
CONNECTED
  ↓
DISCONNECTED
  ↓
RECONNECTING
  ↓
RECONNECTED
```

Heartbeat/keepalive và client reconnect với exponential backoff nên được triển khai vì WebSocket có thể bị gián đoạn. Render cũng khuyến nghị các cơ chế này. citeturn115869search0

## Deploy frontend trên Vercel

Environment:

```env
NEXT_PUBLIC_GAME_SERVER_URL=https://tong-bi-server.onrender.com
```

Client:

```ts
const socket = io(process.env.NEXT_PUBLIC_GAME_SERVER_URL)
```

## Deploy game server trên Render

Service:

```text
Type: Web Service
Runtime: Node hoặc Docker
```

Ví dụ:

```text
Build Command: npm ci && npm run build
Start Command: npm start
```

Server phải bind `0.0.0.0` và lấy port từ environment. Render documentation hiện ghi Web Service mặc định sử dụng port `10000`. citeturn115869search1

```ts
const port = Number(process.env.PORT || 10000)
server.listen(port, "0.0.0.0")
```

Render có thể tự build/deploy từ Git repo và hỗ trợ Docker. citeturn115869search1turn115869search2

## Environment variables

Server:

```env
PORT=10000
CLIENT_ORIGIN=https://tongbi.vercel.app
MAX_PLAYERS_PER_ROOM=30
ROOM_TTL_MINUTES=120
```

Frontend:

```env
NEXT_PUBLIC_GAME_SERVER_URL=https://tong-bi-server.onrender.com
```

Không commit `.env` thật.

## Dockerfile

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production

EXPOSE 10000

CMD ["npm", "start"]
```

Pin Node version rõ ràng; Render hỗ trợ `.node-version`, `.nvmrc`, `NODE_VERSION` hoặc `package.json` để kiểm soát version. citeturn115869search7

## Health check

```text
GET /health
```

Ví dụ response:

```json
{
  "status": "ok",
  "rooms": 3,
  "players": 42
}
```

## Share link + QR

Trong lobby nên có:

```text
ROOM: AB12CD
17 / 30 players

[ Copy Link ]
[ Show QR ]
```

Link:

```text
https://tongbi.vercel.app/room/AB12CD
```

## Test 30 người

Phải test:

```text
1 client
5 clients
10 clients
20 clients
30 clients
```

Scenario bắt buộc:

1. 30 người join thành công.
2. Người thứ 31 bị reject.
3. Lobby đồng bộ.
4. Host Start làm tất cả client đổi phase.
5. Hidden marble không leak.
6. Guess đồng bộ.
7. Reveal đồng bộ.
8. Dice được random ở server.
9. Một client mất mạng rồi reconnect.
10. Host disconnect được xử lý.

## MVP không cần

```text
❌ Kubernetes
❌ Redis Cluster
❌ Microservices
❌ Complex authentication
❌ Database cho từng animation
```

## Khi nào nâng cấp Redis

Khi có nhiều game-server instance:

```text
Load Balancer
   ├── Server A
   ├── Server B
   └── Server C
          │
        Redis
          │
      PostgreSQL
```

Khi đó Redis có thể dùng cho pub/sub, shared room metadata, presence và reconnect state.

## Kiến trúc scale sau này

```text
CDN
 │
Frontend
 │
Load Balancer
 │
 ├── Game Server 1
 ├── Game Server 2
 └── Game Server 3
        │
      Redis
        │
   PostgreSQL
```

## Definition of Done — 30 người/room

- [ ] Tạo room.
- [ ] Sinh share link.
- [ ] Tối đa 30 người join.
- [ ] Room đầy trả `ROOM_FULL`.
- [ ] Lobby realtime.
- [ ] Host Start.
- [ ] Game phase đồng bộ.
- [ ] Hidden marble không leak.
- [ ] Guess hoạt động.
- [ ] Reveal hoạt động.
- [ ] Server tự tính tổng.
- [ ] Dice server-side.
- [ ] Reconnect.
- [ ] Health check.
- [ ] Production HTTPS.
- [ ] Production WSS.
- [ ] 30-client load test pass.

## Lộ trình deploy

### Phase A — Local

```text
Next.js :3000
Node.js :10000
```

### Phase B — Public prototype

```text
Frontend → Vercel
Backend → Render
```

Mục tiêu: 30 người/room.

### Phase C — Private beta

Thêm QR code, reconnect, logs, health check và load test.

### Phase D — Scale

Thêm Redis, PostgreSQL, nhiều game-server instance, load balancer, metrics và error tracking.

## Kết luận

Với mốc 30 người, kiến trúc nên giữ đơn giản:

```text
Vercel
  ↓ HTTPS
Next.js + React Three Fiber
  ↓ WSS
Render
  ↓
Node.js + Socket.IO
  ↓
1 Room State trong RAM
```

Điều quan trọng nhất là **server-authoritative state + hidden information + reconnect**. Sau khi phiên bản này ổn định mới mở rộng Redis và horizontal scaling.

> Lưu ý: Render có free resources cho thử nghiệm nhưng tài liệu của Render nêu rõ free instances có giới hạn và không nên dùng cho production; web service miễn phí có thể spin down sau thời gian không hoạt động. citeturn115869search4turn115869search8
