# TỔNG BI — Game mô phỏng trò chơi dân gian “đoán tổng bi”

## 1. Tổng quan

**Tên tạm:** Tổng Bi

**Thể loại:** Casual multiplayer / party game / social deduction nhẹ.

**Nền tảng ưu tiên:** Web game chạy trên trình duyệt điện thoại và máy tính.

**Mục tiêu:** Mô phỏng trò chơi “tổng bi” theo phong cách hiện đại nhưng vẫn giữ cảm giác chơi bằng bi thật: người chơi chọn bi, đưa bi vào lòng bàn tay, nắm tay lại, giấu số bi, sau đó cả đội quan sát và đoán tổng số bi của một hoặc nhiều người.

Điểm quan trọng của game không chỉ là phép cộng mà là **trình tự hành động và tương tác trực quan**. Mỗi lượt phải tạo được cảm giác:

`Chọn bi → đưa bi vào tay → nắm tay → giấu số bi → đội đoán → mở tay → tính tổng → xác định người/đội thắng → cập nhật số bi`

Game cần ưu tiên hoạt ảnh và trạng thái phòng chơi để người chơi có cảm giác đang cùng ngồi quanh một bàn chơi.

---

# 2. Luật chơi cốt lõi

## 2.1. Khởi tạo

Khi tạo phòng, chủ phòng có thể cấu hình:

- Số người chơi.
- Số đội.
- Số bi khởi đầu của mỗi người.
- Chế độ 1 vs 1 hoặc nhiều người/nhiều đội.
- Giá trị bi tối đa có thể đặt trong một lượt.
- Số vòng chơi.
- Có cho phép vay bi hay không.
- Có bật xúc xắc hình phạt hay không.
- Bộ hình phạt tùy chỉnh của chủ trò.

**Mặc định:** mỗi người bắt đầu với **10 viên bi**.

---

## 2.2. Đặt bi

Ở đầu lượt, tất cả người tham gia phải chọn số bi mình đang có để đưa vào lòng bàn tay.

Quy tắc bắt buộc:

- Mỗi người phải đặt ít nhất **1 viên**.
- Không được đặt vượt quá số bi hiện tại.
- Số bi đã chọn phải được giữ bí mật với người khác.
- Sau khi xác nhận, người chơi chuyển sang animation “đưa bi vào lòng bàn tay”.
- Sau đó bàn tay đóng lại và số bi trở thành thông tin ẩn.

Ví dụ:

- Người A có 10 bi và chọn 4.
- Người B có 10 bi và chọn 2.
- Người C có 7 bi và chọn 5.
- Tổng thực tế = 11.

---

# 3. Flow của một lượt chơi

## State 1 — ROUND_START

Hiển thị:

- Số vòng hiện tại.
- Số bi của từng người.
- Đội của từng người.
- Người đang tham gia lượt.
- Đồng hồ đếm ngược.

Animation mở đầu:

- Camera nhìn toàn bàn.
- Các viên bi nằm trước từng người.
- UI hiển thị “Chọn bi”.

---

## State 2 — SELECT_MARBLES

Mỗi người có một UI chọn số bi.

Có thể triển khai hai cách:

### Cách A — Kéo thả

Người chơi kéo từng viên bi từ túi/khay vào vùng lòng bàn tay.

### Cách B — Bộ chọn số + animation

Người chơi bấm `+` / `-` hoặc chọn trực tiếp số lượng.

Sau khi xác nhận, hệ thống tự chạy animation:

1. Bi rời khỏi đống bi.
2. Bi chuyển động về phía bàn tay.
3. Bàn tay mở.
4. Bi rơi vào lòng bàn tay.
5. Ngón tay co lại.
6. Bàn tay nắm chặt.

**Khuyến nghị:** dùng cách B làm gameplay chính, nhưng animation vẫn phải mô phỏng đầy đủ quá trình lấy bi.

---

# 4. Animation tay — tính năng bắt buộc

Đây là một trong những phần quan trọng nhất của game.

## 4.1. Asset cần có

Cần tối thiểu:

- Model bàn tay/cẳng tay.
- Rig xương tay.
- Animation bàn tay mở.
- Animation cầm bi.
- Animation đưa tay lên.
- Animation thả bi vào lòng bàn tay.
- Animation nắm tay.
- Animation giữ tay đóng.
- Animation mở tay.
- Animation thắng/thua nếu muốn tăng tính biểu cảm.

## 4.2. Hai hướng art

### Phương án 1 — Low-poly 3D

Ưu tiên cho phiên bản MVP.

Ưu điểm:

- Nhẹ.
- Dễ render trên mobile.
- Dễ đồng bộ animation.
- Dễ tạo nhiều màu/skin.

### Phương án 2 — Stylized 3D

Có nhiều chi tiết hơn, phù hợp phiên bản hoàn thiện.

---

# 5. State 3 — GUESS_TOTAL

Sau khi tất cả tay đã đóng, hệ thống chuyển sang giai đoạn đoán.

Mỗi đội cần nhập **tổng số bi mà họ dự đoán đang tồn tại trong toàn bộ bàn chơi**.

Ví dụ có 4 người:

- A đặt 2.
- B đặt 3.
- C đặt 1.
- D đặt 4.

Tổng thực tế = 10.

Các đội có thể đoán:

- Đội 1: 8.
- Đội 2: 10.
- Đội 3: 12.

Sau khi khóa đáp án, hệ thống không cho thay đổi.

---

# 6. Quy tắc xác định người thắng lượt

Có thể lựa chọn một trong ba luật.

## Rule A — Đoán đúng tuyệt đối

Đội nào đoán đúng tổng sẽ thắng lượt.

Đây là luật dễ hiểu nhất cho MVP.

## Rule B — Đoán gần nhất

Nếu không ai đoán đúng, đội có dự đoán gần nhất sẽ thắng.

## Rule C — Đoán đúng và không trùng

Nếu nhiều đội cùng đoán một giá trị, các đội bị loại khỏi quyền thắng và xét dự đoán tiếp theo.

**Khuyến nghị MVP:** Rule A hoặc Rule B. Có thể cho chủ phòng chọn luật.

---

# 7. State 4 — REVEAL

Sau khi tất cả đội khóa đáp án:

1. Màn hình chuyển sang suspense.
2. Từng người mở tay.
3. Các viên bi xuất hiện.
4. UI hiển thị số bi từng người.
5. Hệ thống cộng tổng.
6. Hiển thị dự đoán của từng đội.
7. Hiển thị đội thắng.

Ví dụ animation:

`A mở tay → 2 bi`

`B mở tay → 3 bi`

`C mở tay → 1 bi`

`D mở tay → 4 bi`

`TỔNG = 10`

Sau đó hiệu ứng:

`ĐỘI B ĐOÁN ĐÚNG!`

---

# 8. Cơ chế hết bi

Một người có thể về **0 viên bi**.

Người chơi hết bi có ba trạng thái:

### Option 1 — Bỏ cuộc

Người chơi được đánh dấu `OUT`.

### Option 2 — Xin vay bi

Chủ trò cho phép hệ thống tung xúc xắc.

### Option 3 — Luật tùy chỉnh

Chủ phòng có thể tự quyết định số bi được vay.

---

# 9. Xúc xắc vay bi / hình phạt

## 9.1. Mô hình xúc xắc 3D

**Bắt buộc cho gameplay hoàn chỉnh.**

Cần model xúc xắc 3D có 6 mặt.

Ba mặt quy định lượng bi được vay:

- 3 → vay 3 viên.
- 6 → vay 6 viên.
- 9 → vay 9 viên.

Ba mặt còn lại dành cho hình phạt tùy chỉnh.

Lưu ý: vì xúc xắc 6 mặt nhưng kết quả cần chứa giá trị 9, nên **không nhất thiết phải dùng số chấm chuẩn 1–6**. Có thể thiết kế một “challenge die” có sáu mặt nội dung tùy chỉnh.

Ví dụ:

| Mặt | Kết quả |
|---|---|
| 1 | +3 bi |
| 2 | +6 bi |
| 3 | +9 bi |
| 4 | Hít đất |
| 5 | Thụt xì dầu |
| 6 | Cõng đồng đội |

---

# 10. Animation xúc xắc

Chuỗi animation:

1. Người chơi chọn “Xin vay bi”.
2. Camera focus vào bàn.
3. Xúc xắc xuất hiện.
4. Chủ trò/người chơi lắc xúc xắc.
5. Xúc xắc xoay nhanh.
6. Xúc xắc va vào mặt bàn.
7. Vật lý dừng lại.
8. Camera zoom vào mặt trên.
9. Kết quả được hiển thị.
10. Hệ thống áp dụng kết quả.

Ví dụ nếu ra `6`:

`+6 BI`

Nếu ra hình phạt:

`HÌNH PHẠT: HÍT ĐẤT`

---

# 11. Hệ thống hình phạt tùy chỉnh

Chủ phòng được tạo danh sách thử thách.

Ví dụ:

- Hít đất 5 cái.
- Hít đất 10 cái.
- Thụt xì dầu.
- Cõng đồng đội.
- Hát một bài.
- Kể chuyện cười.
- Bị trừ 1 bi.
- Không được đoán lượt tiếp theo.

Mỗi hình phạt cần có:

- Tên.
- Mô tả.
- Icon.
- Mức độ.
- Có hoặc không áp dụng tự động.

**Quan trọng:** game chỉ mô phỏng hình phạt trong game; việc thực hiện ngoài đời phải do người chơi tự quyết định.

---

# 12. Hệ thống đội

Game hỗ trợ:

### 1 vs 1

2 người đối đầu trực tiếp.

### 2 vs 2

Mỗi người cùng đội chia sẻ một đáp án hoặc đội trưởng là người khóa đáp án.

### Free-for-all

Mỗi người là một đội.

### Team Battle

Nhiều đội, mỗi đội có nhiều người.

---

# 13. Thiết kế bàn chơi

MVP nên có một bàn tròn hoặc bàn vuông ở trung tâm.

Xung quanh bàn là avatar người chơi.

Mỗi vị trí có:

- Avatar.
- Tên.
- Màu đội.
- Số bi còn lại.
- Tay trái/tay phải.
- Animation khi đến lượt.

Camera:

### Overview Camera

Nhìn toàn bộ bàn.

### Player Focus Camera

Zoom vào tay người đang thực hiện hành động.

### Dice Camera

Zoom vào xúc xắc.

### Result Camera

Toàn bàn + hiệu ứng chiến thắng.

---

# 14. UI chính

## Lobby

- Tạo phòng.
- Nhập mã phòng.
- Chia sẻ link.
- Tên người chơi.
- Chọn avatar.
- Chọn đội.

## Waiting Room

Hiển thị:

`MÃ PHÒNG: ABC123`

`https://game-domain.com/room/ABC123`

Nút:

`BẮT ĐẦU`

## Gameplay HUD

- Vòng hiện tại.
- Đồng hồ.
- Số bi của bản thân.
- Số bi của người khác.
- Đội.
- Trạng thái hành động.

## Guess UI

`Tổng bi bạn đoán:`

`[ 10 ]`

`KHÓA ĐÁP ÁN`

## Result UI

`TỔNG THỰC TẾ: 11`

`ĐỘI A: 9`

`ĐỘI B: 11 ✓`

---

# 15. Multiplayer realtime — yêu cầu quan trọng nhất

Mục tiêu là để nhiều người **mở cùng một link và thực sự chơi cùng một phòng tại cùng thời điểm**.

Không nên thiết kế game theo kiểu mỗi người chạy game độc lập rồi tự tính kết quả. Phải có một **authoritative game server** giữ trạng thái phòng.

Kiến trúc đề xuất:

```text
Browser A ─┐
Browser B ─┤
Browser C ─┼── WebSocket / Realtime Server ── Game State
Browser D ─┘                         │
                                     ├── Room
                                     ├── Players
                                     ├── Teams
                                     ├── Round
                                     ├── Hidden Marble Choices
                                     ├── Guesses
                                     └── Dice Result
```

---

# 16. Kiến trúc kỹ thuật đề xuất

## Frontend

Có thể dùng:

- React + TypeScript.
- Next.js.
- Three.js hoặc React Three Fiber cho 3D.
- Framer Motion cho UI.

Nếu game thiên nhiều về 3D realtime, **React + React Three Fiber + Three.js** là lựa chọn phù hợp cho web MVP.

## Realtime backend

Một trong các lựa chọn:

### Option A — Node.js + Socket.IO

Phù hợp để tự xây dựng game server.

```text
Client
  ↓
Socket.IO
  ↓
Node.js Game Server
  ↓
Redis
```

### Option B — Colyseus

Phù hợp hơn nếu muốn xây game multiplayer có room và state synchronization rõ ràng.

### Option C — Supabase Realtime

Có thể dùng cho lobby/chat/trạng thái đơn giản nhưng không phải lựa chọn đầu tiên cho game state phức tạp.

**Khuyến nghị:** Node.js + Colyseus hoặc Node.js + Socket.IO.

---

# 17. Game server phải là nguồn sự thật

Client **không được phép tự quyết định** các dữ liệu quan trọng.

Ví dụ không được làm:

```text
Client:
"Tôi chọn 5 bi"
→ tự cập nhật local
→ tự gửi kết quả cuối
```

Mà phải:

```text
Client
  ↓
SUBMIT_MARBLE_CHOICE(5)
  ↓
Server validate
  ↓
Server ghi 5
  ↓
Server broadcast state
```

Server kiểm tra:

- Người chơi có trong room không.
- Có đúng lượt hay không.
- Số bi có hợp lệ không.
- Có đặt ít nhất 1 viên hay không.
- Có đủ bi để đặt hay không.
- Đáp án đã khóa chưa.
- Xúc xắc có được phép tung không.
.

---

# 18. Hidden information

Đây là phần đặc biệt quan trọng.

Người chơi phải nhìn thấy:

- Người kia đã khóa lựa chọn.
- Nhưng **không được nhìn thấy số bi người kia chọn**.

Server cần phân tách:

```text
Public State
- player status
- team
- marble balance
- ready state
- guess status

Private State
- selected marble amount
```

Chỉ khi bước REVEAL bắt đầu, server mới broadcast số bi đã chọn.

---

# 19. State Machine

Game nên được xây dựng bằng state machine thay vì một đống boolean.

```text
LOBBY
  ↓
WAITING
  ↓
ROUND_START
  ↓
SELECT_MARBLES
  ↓
CLOSE_HAND
  ↓
GUESS_TOTAL
  ↓
LOCK_GUESSES
  ↓
REVEAL
  ↓
CALCULATE_RESULT
  ↓
UPDATE_MARBLES
  ↓
CHECK_ELIMINATION
  ↓
NEXT_ROUND
```

Nếu có người hết bi:

```text
CHECK_ELIMINATION
      ↓
   HAS_MARBLE?
    /       \
  YES       NO
   |         |
NEXT       OUT / ROLL_DICE
```

---

# 20. Event protocol mẫu

Client gửi:

```json
{
  "type": "SUBMIT_MARBLES",
  "amount": 4
}
```

Server gửi:

```json
{
  "type": "PLAYER_READY",
  "playerId": "p123"
}
```

Khi reveal:

```json
{
  "type": "REVEAL_RESULT",
  "players": [
    {"id": "p1", "marbles": 2},
    {"id": "p2", "marbles": 4},
    {"id": "p3", "marbles": 1}
  ],
  "total": 7
}
```

---

# 21. Đồng bộ animation

Điểm quan trọng: server **không cần gửi từng frame của animation**.

Server chỉ gửi event:

```text
PLAYER_STARTED_PICKING
PLAYER_LOCKED_MARBLES
ALL_PLAYERS_READY
START_REVEAL
DICE_ROLL_STARTED
DICE_ROLL_RESULT
```

Client nhận event và tự chạy animation tương ứng.

Ví dụ:

```text
Server timestamp: T
Event: START_REVEAL
```

Tất cả client bắt đầu animation từ cùng một mốc thời gian.

Đây là cách giảm bandwidth và làm animation ổn định hơn.

---

# 22. Tạo phòng và gửi link

Luồng sử dụng mong muốn:

```text
Người A
↓
Create Room
↓
Server tạo roomId = ABC123
↓
Sinh link
↓
https://tongbi.game/room/ABC123
```

A gửi link qua:

- Messenger.
- Zalo.
- Discord.
- Facebook.
- Telegram.
- QR code.

Người B/C/D chỉ cần bấm link.

---

# 23. Cơ chế join room

Khi mở link:

```text
/room/ABC123
```

Client kết nối WebSocket:

```text
JOIN_ROOM ABC123
```

Server trả về:

```text
ROOM_STATE
```

Nếu room chưa bắt đầu:

```text
WAITING_ROOM
```

Nếu game đã bắt đầu:

- Có thể khóa join.
- Hoặc cho spectator.
- Hoặc cho phép người chơi mới tham gia từ round tiếp theo.

**Khuyến nghị:** khóa join sau khi game bắt đầu.

---

# 24. Deploy để nhiều người chơi cùng lúc

Kiến trúc triển khai đơn giản cho MVP:

```text
                    ┌─────────────────┐
                    │      Vercel     │
                    │    Frontend      │
                    └────────┬────────┘
                             │
                             │ WebSocket
                             ↓
                    ┌─────────────────┐
                    │ Game Server     │
                    │ Node/Colyseus   │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    ↓                 ↓
               Redis/DB          Analytics
```

Frontend có thể deploy trên nền tảng serverless/static hosting.

Game server phải chạy trên hạ tầng hỗ trợ kết nối lâu dài/WebSocket.

Redis hữu ích khi cần:

- nhiều game server instance.
- room state phân tán.
- matchmaking.
- pub/sub.

Ở MVP chỉ vài chục phòng đồng thời, có thể bắt đầu bằng **một game server instance** rồi mở rộng sau.

---

# 25. Cấu trúc dữ liệu phòng

Ví dụ:

```typescript
interface GameRoom {
  id: string;
  status: GameState;
  hostId: string;
  maxPlayers: number;
  currentRound: number;
  settings: GameSettings;
  players: Player[];
  teams: Team[];
  guesses: Record<string, number>;
  round: RoundState;
}
```

Player:

```typescript
interface Player {
  id: string;
  name: string;
  teamId: string;
  marbleCount: number;
  connected: boolean;
  eliminated: boolean;
}
```

Round:

```typescript
interface RoundState {
  selectedMarblesPrivate: Record<string, number>;
  submittedPlayers: string[];
  lockedTeams: string[];
  actualTotal?: number;
  result?: RoundResult;
}
```

---

# 26. Art assets cần chuẩn bị

## Bắt buộc cho MVP

- [ ] 3D marble model.
- [ ] 3D table.
- [ ] 3D hand/forearm.
- [ ] Hand rig.
- [ ] Pick marble animation.
- [ ] Put marble in palm animation.
- [ ] Close fist animation.
- [ ] Open fist animation.
- [ ] Dice 3D model.
- [ ] Dice rolling animation.
- [ ] Simple player avatar.
- [ ] Room UI.
- [ ] Guess UI.
- [ ] Result UI.

## Nên có

- [ ] Multiple marble colors.
- [ ] Multiple table skins.
- [ ] Character skins.
- [ ] Hand skins.
- [ ] Particle effect.
- [ ] Victory effect.
- [ ] Lose effect.
- [ ] Sound effect.

---

# 27. Nếu không tự tạo 3D asset

Có thể chia asset thành ba mức.

## MVP

Dùng asset low-poly hoặc stylized có license phù hợp.

## Beta

Thay hand + dice bằng model custom.

## Production

Thiết kế bộ asset nhận diện riêng:

- Hand.
- Marble.
- Dice.
- Table.
- Avatar.

Mục tiêu là khi nhìn game người chơi nhận ra đây là “Tổng Bi”, không phải một template multiplayer generic.

---

# 28. Sound design

Âm thanh rất quan trọng vì game có yếu tố suspense.

Cần tối thiểu:

- Marble click.
- Marble drop.
- Hand close.
- Hand open.
- Button click.
- Timer tick.
- Dice shake.
- Dice hit table.
- Correct guess.
- Wrong guess.
- Victory.
- Elimination.

Ở màn hình reveal có thể sử dụng âm thanh tăng dần:

```text
whoosh
→ silence
→ hand opens
→ marble sounds
→ total reveal
→ result sound
```

---

# 29. UX quan trọng nhất

Game phải cực kỳ dễ hiểu.

Người mới vào lần đầu chỉ cần thấy:

```text
Bạn có 10 viên bi.
Chọn số bi muốn bỏ vào tay.
```

Sau đó:

```text
Tất cả đã giấu bi.
Đoán tổng số bi!
```

Cuối cùng:

```text
Mở tay!
Tổng = 11
```

Không nên bắt người chơi đọc một trang luật dài trước khi chơi.

Có thể đưa luật thành tutorial 30–60 giây bằng animation.

---

# 30. Tutorial mode

Tutorial nên là một phòng giả lập một mình.

Luồng:

```text
1. Chọn 3 bi
2. Animation bỏ bi vào tay
3. AI chọn 4 bi
4. Người chơi đoán
5. Mở tay
6. AI giải thích tổng
7. Chuyển sang lobby
```

---

# 31. MVP đề xuất

Không nên xây toàn bộ tính năng ngay từ đầu.

## MVP Phase 1 — Local prototype

Mục tiêu: chứng minh gameplay.

Cần:

- Một bàn.
- Một người chơi.
- Một AI.
- Marble model.
- Hand animation.
- Guess UI.
- Reveal.
- Tính tổng.

Chưa cần multiplayer.

---

# 32. MVP Phase 2 — Multiplayer

Thêm:

- Create room.
- Join room bằng code.
- Share link.
- WebSocket.
- 2–4 players.
- Hidden choices.
- Synchronized rounds.
- Realtime result.

Đây là phiên bản có thể gửi cho nhóm bạn chơi.

---

# 33. MVP Phase 3 — Dice

Thêm:

- Dice 3D.
- Roll animation.
- 3 / 6 / 9 marble result.
- Custom penalties.
- Elimination handling.

---

# 34. Phase 4 — Polish

Thêm:

- Avatar customization.
- Better hand rig.
- Better camera.
- Sound.
- Particle effects.
- Match history.
- Leaderboard.
- Mobile optimization.
- Reconnect.
- Spectator.

---

# 35. Mobile-first

Vì đây là party game, khả năng cao người chơi sẽ sử dụng điện thoại.

Do đó:

- UI phải ưu tiên touch.
- Nút lớn.
- Chữ lớn.
- Không phụ thuộc hover.
- Animation ngắn.
- 3D model tối ưu polygon.
- Texture nhỏ.
- Hạn chế post-processing nặng.

Gameplay phải chạy ổn định trên điện thoại tầm trung.

---

# 36. Reconnect

Người chơi có thể:

- mất Wi-Fi.
- chuyển app.
- reload browser.
- khóa màn hình.

Server cần lưu:

```text
roomId
playerId
session/token
current game state
```

Khi reconnect:

```text
Client reconnect
↓
AUTHENTICATE PLAYER
↓
GET ROOM STATE
↓
RESUME GAME
```

Không để một người reload trang khiến cả phòng bị reset.

---

# 37. Đồng hồ và timeout

Mỗi phase nên có timeout.

Ví dụ:

```text
SELECT_MARBLES = 20s
GUESS_TOTAL = 15s
REVEAL = 5s
```

Nếu người chơi không hành động:

- tự động chọn 1 viên.
- hoặc đánh dấu AFK.
- hoặc host có quyền bỏ qua.

**Khuyến nghị:** auto-select 1 viên để game không bị kẹt.

---

# 38. Chống gian lận

Do đây là game party không cạnh tranh tiền thật, anti-cheat không cần quá phức tạp.

Tuy nhiên phải đảm bảo:

- Client không biết lựa chọn bi của người khác trước reveal.
- Client không được tự đổi marble count.
- Client không tự quyết định dice result.
- Client không tự quyết định winner.

Tất cả logic quan trọng nằm trên server.

---

# 39. Chiến lược link chơi cùng nhau

Mục tiêu cuối cùng:

```text
Người tạo phòng
       ↓
   TẠO PHÒNG
       ↓
  AB12CD
       ↓
 https://tongbi.game/room/AB12CD
       ↓
 ┌────────┬────────┬────────┐
 │ Player │ Player │ Player │
 │   A    │   B    │   C    │
 └────────┴────────┴────────┘
       ↓
   START GAME
       ↓
 Realtime WebSocket
       ↓
 Tất cả nhìn cùng trạng thái
```

Một người có thể copy link vào nhóm chat. Mỗi người mở link trên điện thoại hoặc máy tính và nhập tên.

---

# 40. Tên miền và URL

Khi deploy production có thể dùng domain dạng:

```text
https://tongbi.game
```

hoặc:

```text
https://tongbi.vercel.app
```

Room:

```text
https://tongbi.game/room/ABC123
```

Có thể tạo thêm QR:

```text
████████████
██ QR CODE ██
████████████

Scan để vào phòng
```

---

# 41. Thiết kế trải nghiệm “ngồi cùng một bàn”

Đây là hướng UX nên ưu tiên hơn việc xây quá nhiều menu.

Khi vào room, tất cả người chơi nhìn thấy cùng một bàn.

Ví dụ:

```text
             [PLAYER B]
                  ✋

 [PLAYER A]   TABLE      [PLAYER C]
     ✋                    ✋

             [PLAYER D]
                  ✋
```

Tất cả animation quan trọng đều diễn ra trên cùng một scene.

Mục tiêu là người chơi cảm thấy:

> “Tất cả đang ở chung một bàn chơi.”

chứ không phải:

> “Mỗi người đang chơi một phiên bản riêng.”

---

# 42. Cấu trúc repository đề xuất

```text
long-bi/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   └── components/
│   │
│   └── game-server/
│       ├── src/
│       │   ├── rooms/
│       │   ├── game/
│       │   ├── state/
│       │   └── events/
│       └── tests/
│
├── packages/
│   ├── shared-types/
│   ├── game-rules/
│   └── protocol/
│
├── assets/
│   ├── marble/
│   ├── hand/
│   ├── dice/
│   ├── table/
│   └── audio/
│
├── docs/
│   └── game-design.md
│
└── README.md
```

---

# 43. Tách game rules khỏi UI

Logic luật nên là pure TypeScript package.

Ví dụ:

```typescript
calculateTotal(players)
validateMarbleChoice(player, amount)
resolveGuess(guesses, total)
applyRoundResult(players, result)
resolveDice(diceFace, settings)
```

Lợi ích:

- Dễ test.
- Không phụ thuộc React.
- Không phụ thuộc Three.js.
- Có thể dùng chung giữa server và test simulator.

---

# 44. Test bắt buộc

## Rule tests

- Người chơi không được chọn 0.
- Không được chọn quá số bi.
- Tổng được tính chính xác.
- Winner đúng.
- Hết bi xử lý đúng.
- Xúc xắc xử lý đúng.

## Multiplayer tests

- Hai người join cùng room.
- Ba người join cùng room.
- Disconnect/reconnect.
- Hai người submit gần như cùng lúc.
- Một người submit sai dữ liệu.
- Game đang reveal nhưng client reload.

---

# 45. Checklist asset cần yêu cầu nếu thuê artist

## Hand

Yêu cầu:

- GLB/GLTF.
- Rigged.
- Low-poly.
- PBR texture.
- Animation clips tách riêng.

Animation clips:

```text
idle
reach
open_palm
pick_marble
place_marble
close_fist
hold_fist
open_fist
celebrate
```

## Dice

Yêu cầu:

- GLB/GLTF.
- 6 mặt custom.
- Collider.
- Pivot đúng tâm.
- Vật liệu có khả năng đổi texture.

Animation không bắt buộc phải bake vì có thể dùng physics engine.

---

# 46. Physics cho xúc xắc

Xúc xắc nên dùng physics thật ở mức đơn giản.

```text
RigidBody
Collider
Mass
Friction
Bounce
Angular Velocity
```

Khi server quyết định kết quả, có hai cách:

### Cách 1 — Physics visual + server result

Server chọn mặt đích.

Client tạo animation vật lý sao cho cuối cùng ra đúng mặt.

### Cách 2 — Random physics và server đọc kết quả

Phức tạp hơn và khó đồng bộ.

**Khuyến nghị:** server quyết định kết quả trước; physics chỉ là presentation.

---

# 47. Randomness và fairness

Tất cả random quan trọng phải được tạo ở server.

Ví dụ:

```typescript
const result = serverRandomDice();
```

Không dùng:

```typescript
Math.random();
```

ở client để quyết định gameplay.

Nếu sau này cần audit, có thể log:

```text
roomId
roundId
randomEvent
result
timestamp
```

---

# 48. Analytics nên thu thập

MVP không cần quá nhiều nhưng nên có:

- Số room được tạo.
- Số người/room.
- Số lượt/room.
- Tỷ lệ người bỏ game giữa chừng.
- Thời gian trung bình mỗi lượt.
- Tỷ lệ reconnect.
- Dice usage.

Điều này giúp biết điểm nào làm người chơi chán hoặc game bị kẹt.

---

# 49. Monetization — chưa cần ở MVP

Sau này có thể thêm:

- Skin bàn.
- Skin bi.
- Skin tay.
- Avatar.
- Hiệu ứng thắng.
- Dice skin.

Không nên đưa quảng cáo hoặc payment vào phiên bản đầu tiên.

Mục tiêu đầu tiên là chứng minh:

**“Một nhóm bạn mở link và chơi với nhau vui.”**

---

# 50. Đặc tả MVP cuối cùng

## Gameplay

- [ ] Create room.
- [ ] Join room by link.
- [ ] 2–8 players.
- [ ] 1–4 teams.
- [ ] 10 marbles default.
- [ ] Marble selection.
- [ ] Hand animation.
- [ ] Hidden marble choice.
- [ ] Guess total.
- [ ] Reveal.
- [ ] Calculate winner.
- [ ] Update marble count.
- [ ] Elimination.
- [ ] Dice borrowing.
- [ ] Custom penalties.

## Realtime

- [ ] WebSocket.
- [ ] Server-authoritative state.
- [ ] Room state synchronization.
- [ ] Private state for marble choices.
- [ ] Reconnect.
- [ ] Timeout.

## Graphics

- [ ] 3D marbles.
- [ ] 3D hand.
- [ ] Hand rig.
- [ ] Hand animations.
- [ ] 3D dice.
- [ ] Table.
- [ ] Avatar.

## Deployment

- [ ] Frontend deployed publicly.
- [ ] Game server deployed publicly.
- [ ] HTTPS.
- [ ] WebSocket/WSS.
- [ ] Public room URL.
- [ ] QR code sharing.

---

# 51. Roadmap triển khai thực tế

## Sprint 1 — Gameplay prototype

Mục tiêu:

> Chơi được một lượt hoàn chỉnh trên một máy.

Làm:

1. Scene 3D.
2. Marble.
3. Hand.
4. Select marble.
5. Close/open hand.
6. Guess.
7. Reveal.
8. Result.

---

## Sprint 2 — Multiplayer core

Mục tiêu:

> Hai trình duyệt nhìn thấy cùng một trận.

Làm:

1. Room.
2. Join.
3. WebSocket.
4. Game state.
5. Server validation.
6. Synchronize phase.
7. Hidden choice.

---

## Sprint 3 — Party gameplay

Mục tiêu:

> 4–8 người có thể chơi ổn định qua link.

Làm:

1. Teams.
2. Multiple players.
3. Round loop.
4. Elimination.
5. Reconnect.
6. Timer.

---

## Sprint 4 — Dice + punishment

Làm:

1. 3D dice.
2. Roll animation.
3. Borrow marble.
4. Custom penalty.
5. Result effects.

---

## Sprint 5 — Polish + deploy

Làm:

1. Mobile UI.
2. Audio.
3. VFX.
4. Compression.
5. Performance.
6. Production deployment.
7. QR share.
8. Basic monitoring.

---

# 52. Definition of Done

Game được xem là MVP hoàn thành khi:

1. Người A tạo phòng.
2. Hệ thống sinh link.
3. A gửi link cho B, C, D.
4. B/C/D mở link trên điện thoại.
5. Tất cả xuất hiện cùng một bàn.
6. Host bấm bắt đầu.
7. Tất cả chọn số bi.
8. Tất cả nhìn thấy animation người khác bỏ bi vào tay.
9. Không ai biết số bi của người khác trước reveal.
10. Tất cả đoán tổng.
11. Server xác định tổng thực tế.
12. Tất cả cùng thấy animation mở tay.
13. Tất cả cùng thấy kết quả giống nhau.
14. Số bi được cập nhật giống nhau trên mọi thiết bị.
15. Người hết bi có thể xin tung xúc xắc.
16. Xúc xắc cho kết quả vay bi hoặc hình phạt.
17. Trận đấu có thể tiếp tục đến khi kết thúc.

---

# 53. Tầm nhìn sản phẩm

“Tổng Bi” nên được xây như một **party game multiplayer realtime**, không phải một ứng dụng tính điểm có hình ảnh minh họa.

Ba yếu tố tạo nên game:

### 1. Physical illusion

Animation bàn tay, bi, bàn và xúc xắc phải tạo cảm giác vật thể thật.

### 2. Hidden information

Người chơi biết người khác đã chọn nhưng không biết họ chọn bao nhiêu.

### 3. Shared realtime room

Tất cả người chơi cùng tồn tại trong một room và nhìn thấy cùng một diễn biến.

Nếu ba phần này làm tốt, gameplay cơ bản rất đơn giản nhưng vẫn có thể tạo cảm giác vui, hồi hộp và cạnh tranh đúng tinh thần trò chơi trẻ em.

---

# 54. Kiến trúc mục tiêu cuối cùng

```text
                         INTERNET
                             │
             ┌───────────────┴───────────────┐
             │                               │
         Player A                         Player B
        Mobile/Web                       Mobile/Web
             │                               │
             └───────────────┬───────────────┘
                             │
                         WSS/WebSocket
                             │
                   ┌─────────▼─────────┐
                   │   GAME SERVER     │
                   │                   │
                   │ Room Manager      │
                   │ Game State        │
                   │ Rules Engine      │
                   │ Dice RNG           │
                   │ Validation         │
                   └─────────┬─────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                 Redis             Database
                    │
              Presence / PubSub
```

Frontend:

```text
Next.js / React
      +
React Three Fiber
      +
Three.js
```

Backend:

```text
Node.js
  +
Colyseus / Socket.IO
```

Storage:

```text
PostgreSQL
  +
Redis
```

Deploy:

```text
Frontend → Vercel / static hosting
Game server → WebSocket-capable server/container
Database → Managed PostgreSQL
Redis → Managed Redis
```

---

# 55. Thứ tự ưu tiên khi bắt đầu code

Không bắt đầu bằng lobby, database hay leaderboard.

Thứ tự tốt nhất là:

```text
1. Hand animation
2. Marble interaction
3. Round state machine
4. Guess logic
5. Reveal animation
6. Local playable prototype
7. Multiplayer room
8. Realtime synchronization
9. Dice
10. Polish
11. Deploy
```

Lý do: phần khó và đặc trưng nhất của sản phẩm là **animation + state synchronization**. Nếu hai phần này chưa ổn thì việc xây thêm tính năng sẽ chỉ làm dự án phình to.

---

# 56. Brief để gửi cho designer / 3D artist

> Tôi cần xây một web game multiplayer mô phỏng trò chơi tổng bi. Người chơi ngồi quanh một bàn, mỗi người có một lượng bi, chọn một số viên, đưa bi vào lòng bàn tay, nắm lại và bí mật giữ số bi. Sau đó các đội đoán tổng số bi của tất cả người chơi. Khi reveal, từng người mở tay và hệ thống hiển thị tổng thực tế. Người hết bi có thể dùng một xúc xắc 3D để vay 3/6/9 bi hoặc nhận hình phạt tùy chỉnh.
>
> Asset bắt buộc gồm: bàn 3D, marble 3D, bàn tay/cẳng tay có rig, animation mở tay, lấy bi, bỏ bi vào lòng bàn tay, nắm tay, giữ tay và mở tay; ngoài ra cần một xúc xắc 3D có sáu mặt tùy chỉnh và có thể chạy physics animation.
>
> Phong cách mong muốn: casual, vui, rõ ràng, low-poly/stylized, tối ưu cho web/mobile.

---

# 57. Kết luận

Phiên bản đầu tiên không cần quá nhiều nội dung. Chỉ cần làm thật tốt vòng lặp:

```text
CHỌN BI
   ↓
BỎ VÀO TAY
   ↓
NẮM TAY
   ↓
ĐOÁN TỔNG
   ↓
MỞ TAY
   ↓
TÍNH TỔNG
   ↓
THẮNG / THUA
   ↓
CẬP NHẬT BI
   ↓
LƯỢT TIẾP THEO
```

Sau khi loop này chạy realtime giữa nhiều thiết bị, game mới mở rộng thêm xúc xắc, hình phạt, skin, âm thanh, leaderboard và các chế độ chơi khác.

**Mục tiêu cuối:** một người tạo phòng → gửi một link → 4–8 người mở link trên điện thoại → tất cả cùng nhìn thấy một bàn chơi và cùng diễn ra một lượt Tổng Bi theo thời gian thực.
