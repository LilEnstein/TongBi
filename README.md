# Tổng Bi

Game party multiplayer realtime mô phỏng trò chơi dân gian "đoán tổng bi": mỗi người
giấu một số bi trong lòng bàn tay, cả bàn đoán tổng số bi đang được giấu, ai đoán
trúng thì ôm bi.

Xây dựng theo bản thiết kế trong [docs/game-design.md](docs/game-design.md); toàn bộ
lớp thẩm mỹ (màu, chất liệu, UI, âm thanh, VFX) theo
[docs/tong_bi_artdirection_dangian.md](docs/tong_bi_artdirection_dangian.md) và bộ
giao diện mẫu [docs/tong-bi-ui-kit.html](docs/tong-bi-ui-kit.html).

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

Muốn chơi thử một mình trước: **Chơi thử một mình** ở trang chủ.

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

## Đồ hoạ — sân đất trước hiên nhà tranh

Game không diễn ra trong một "phòng chơi trực tuyến" mà ở **sân nhà**: ba giờ chiều,
nền đất nện, một vòng tròn vạch bằng que, cả bọn ngồi bệt quanh vòng
(art direction §1, §9.4). Không có bàn, không có nỉ xanh, không có card/panel/modal.

**Mọi thành phần UI mang tên vật liệu, không mang tên component chuẩn** (§7) — đây là
quy ước bắt buộc của repo để không ai vô thức quay về UI generic:

| Vật liệu | Class / component | Dùng cho |
|---|---|---|
| Giấy dó dán vách | `.giay-do` · `<GiayDo>` | mọi vùng chứa chữ |
| Mẹt tre | `.met` · `<Met>` | ô thông báo tròn, tổng thực tế |
| Chiếu cói | `.chieu` | danh sách người chơi |
| Tấm liếp tre | `.liep` | thanh HUD trên đỉnh sân |
| Thẻ tre / lá chuối / gạch nung / mo cau | `.nut` + `<Nut vat="tre\|la\|gach\|mo">` | nút chính / xác nhận / nguy hiểm / phụ |
| Trống ếch | `.trong` · `<TrongEch>` | nút bắt đầu của chủ trò |
| Khung nan tre | `.nan` | ô nhập |
| Nón lá | `.non` · `<Non>` | khung avatar, chóp là màu đội |
| Khăn đội | `.khan` · `<Khan>` | nhãn đội, kèm vật nhận dạng cho người mù màu |
| Túi bi vải nâu | `.tui` · `<TuiBi>` | số bi còn lại, xẹp dần |
| Nén hương | `.huong` · `<NenHuong>` | đồng hồ đếm ngược |
| Vạch trên đất | `.vach` · `<VachDat>` | điểm, đếm bằng que |
| Lá chuối cuốn | `.la-cuon` · `<LaCuonHop>` | báo tin |
| Cánh cửa gỗ | `.cua` · `<CanhCua>` | hộp thoại |
| Dây thừng | `.day-thung` | thanh trượt đoán tổng |

Bảng màu, cỡ chữ và spec nút nằm trong `apps/web/src/styles.css`, lấy đúng token của
§3–§8. Nét viền là mực nho có rung (filter SVG `#nham` khai báo trong `index.html`),
bóng là khối cứng lệch 4px chứ không phải bóng mờ.

**Nhịp ánh sáng (§2).** Mỗi phase là một khung giờ: 8h sảnh chờ → 10h chọn bi → 12h
đoán tổng và mở tay → 15h xúc xắc → 17h tan sân. Chuyển bằng thuộc tính `data-gio` trên
màn hình chơi, đổi tint của lớp `.nang` và hướng/màu mặt trời trong scene 3D — không
phải dựng lại cảnh.

**Khung cảnh theo buổi và mùa (§20).** Tầng bên trên nhịp ánh sáng: cùng một sân ấy nhưng
là sáng hay đêm trăng, mùa xuân hay mùa đông. Mặc định lấy theo đồng hồ và tháng của máy
người chơi, chọn tay được bằng nút ở góc phải dưới. Buổi/mùa **không ghi đè** ánh sáng của
phase, nó chỉ nhân cường độ và pha màu, nên §2 vẫn kể được câu chuyện của nó. Đây cũng là
lựa chọn riêng của từng người, không phải trạng thái phòng — không gửi lên server.

Toàn bộ model 3D vẫn được dựng bằng code, không cần file GLB/GLTF nào:

- **Bàn tay trẻ con có rig** (`apps/web/src/three/Hand.tsx`) — 4 ngón × 3 đốt + ngón cái
  2 đốt, mỗi đốt là một group lồng nhau nên xoay đốt gốc kéo theo cả ngón. Một giá trị
  `curl` 0→1 tạo ra chuỗi xoè tay → nắm tay. Tay ngắn mũm mĩm, móng cắt cụt, mu bàn tay
  lấm đất, băng dán ở đốt ngón, và **vòng chỉ ở cổ tay là chỗ duy nhất mang màu đội**
  (§9.1). Có thêm cử chỉ `nhìn trộm`, `lắc tay`, `quệt quần`. Các khớp cập nhật trong
  `useFrame` chứ không đi qua React render.
- **Sân đất** (`San.tsx`) — nền đất nện, vòng tròn vạch bằng que mờ dần qua từng vòng
  chơi vì bị chân dẫm, vệt chân trần và vệt bi lăn.
- **Bi ve thuỷ tinh** (`Marble.tsx`) — vỏ trong đục, dải xoáy màu bên trong.
- **Xúc xắc gỗ mít** (`Dice.tsx`) — mặt khắc chìm bôi mực vẽ bằng Canvas 2D lúc chạy
  (đổi bộ hình phạt là mặt xúc xắc đổi theo), lăn trên đất nên nảy rất ít và tung bụi.
- **Toon shader 2 bậc + viền mực** (`toon.ts`) — viền chỉ bật khi sân ≤ 10 người để giữ
  60fps trên máy tầm trung.
- **Âm thanh dân gian** (`apps/web/src/audio/sfx.ts`) — sáo trúc, đàn bầu, trống ếch,
  mõ, que tre, bi thuỷ tinh, chuông chùa; cộng lớp nền ve sầu to dần theo độ căng của
  phase, gió lùa mái tranh và tiếng gà/chó/chổi tre ngẫu nhiên. Tất cả tổng hợp bằng
  WebAudio, không có file audio nào.

Ảnh nền 2D (16 trang, sinh bằng Gemini theo
[docs/tong_bi_prompt_nen_gemini.md](docs/tong_bi_prompt_nen_gemini.md)) chưa có; các màn
hình đã mang sẵn mã trang `man-p01` / `man-p02` / `man-p03` và `styles.css` có sẵn khối
hướng dẫn gắn ảnh. Chưa có ảnh thì gradient tông đất đã đúng màu (§17.3).

Bộ prompt sinh nền cho tám khung cảnh (sáng/đêm × bốn mùa) và sprite tre/cây/bến nước nằm ở
[docs/tong_bi_prompt_khungcanh_mua.md](docs/tong_bi_prompt_khungcanh_mua.md). Cảnh 3D hiện tại
dựng hoàn toàn bằng primitive nên chưa cần ảnh nào để chạy.

Muốn thay bằng asset do artist làm (§18 art direction) thì chỉ cần thay `Hand.tsx` /
`Dice.tsx` bằng model đã rig, phần còn lại không đổi.

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
hình phạt tuỳ chỉnh, loại người chơi, xếp hạng cuối trận, tutorial một mình, âm thanh
dân gian, mobile-first UI theo art direction dân gian (vật liệu, nhịp ánh sáng theo
phase, giọng văn trẻ con, icon hình que, bụi đất và tia nắng lúc mở tay).

Chưa có (phần "nên có" của §17.2 art direction và Phase 4 §34): 32 ảnh nền vẽ tay từ
Gemini, bốn vật nhận dạng đội dạng 3D, skin bối cảnh theo mùa/vùng miền (§17.4),
lịch sử trận, leaderboard, spectator, lưu trữ Postgres/Redis. Room hiện nằm trong bộ
nhớ của một server instance — đủ cho 30 người/room như deployment guide mô tả cho MVP;
muốn scale nhiều instance thì cần Redis adapter cho Socket.IO.
