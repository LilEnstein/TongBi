# TỔNG BI — ART DIRECTION: DÂN GIAN VIỆT NAM

> Tài liệu này **không thay đổi luật chơi, state machine, netcode hay kiến trúc** trong `tong_bi_game_design.md`.
> Nó thay thế toàn bộ lớp thẩm mỹ (art, UI, âm thanh, VFX, brief artist).

## 0. Bảng thay thế — mục nào trong file gốc bị ghi đè

| Mục gốc | Nội dung cũ | Thay bằng |
|---|---|---|
| §4.2 Hai hướng art | Low-poly / Stylized chung chung | §6 + §9 tài liệu này |
| §13 Thiết kế bàn chơi | Bàn tròn/vuông, avatar quanh bàn | §9.4 "Không có bàn — chỉ có nền đất" |
| §14 UI chính | Lobby/HUD/Guess/Result generic | §7 + §8 (hệ vật liệu) |
| §26 Art assets MVP | Danh sách 3D generic | §17 Checklist asset |
| §27 Nếu không tự tạo asset | Mua asset low-poly | §17.3 |
| §28 Sound design | Marble click, button click… | §12 Âm thanh dân gian |
| §45 Checklist thuê artist | GLB/rig/PBR | §17 (giữ yêu cầu kỹ thuật, đổi mô tả art) |
| §49 Monetization skin | Skin bàn/bi/tay | §17.4 Skin theo mùa & vùng miền |
| §56 Brief designer | Casual, low-poly, vui | §18 Brief mới |

---

## 1. High concept

> **"Ba giờ chiều, sân đất trước hiên nhà tranh, một lũ trẻ ngồi bệt thành vòng tròn, nắm chặt tay giấu bi."**

Game không diễn ra trong một "phòng chơi trực tuyến". Nó diễn ra ở **sân nhà**. Người chơi mở link trên điện thoại và có cảm giác vừa ngồi thụp xuống nền đất, giữa vòng tròn.

Ba nguyên tắc chi phối mọi quyết định hình ảnh:

1. **Mọi thứ đều là vật thật, làm bằng vật liệu thật.** Không có "card", không có "panel", không có "modal". Có mẹt tre, giấy dó, tấm liếp, cánh cửa gỗ. Nếu một thành phần UI không tìm được vật liệu tương ứng ngoài đời, hãy thiết kế lại thành phần đó.
2. **Camera luôn ở tầm mắt trẻ con ngồi xổm.** Cao khoảng 70–90 cm so với mặt đất. Không bao giờ có góc nhìn "God view" từ trần nhà.
3. **Nền đất là bề mặt chính của game.** Không phải bàn, không phải nỉ xanh. Đất nện có vết chân, vết que vẽ, vết bi lăn.

**Tham chiếu thị giác:** truyện tranh thiếu nhi Việt Nam thập niên 1990–2000 — nét mực đen đều tay, màu bệt, nhân vật trẻ con đầu to, bối cảnh làng Bắc Bộ.

> ⚠️ Tham chiếu này chỉ dùng để định hướng nội bộ. **Không đặt tên bộ truyện, không dùng tên/tạo hình nhân vật của bộ truyện nào** trong prompt sinh ảnh, trong asset, hay trong marketing. Nhân vật của Tổng Bi phải là thiết kế gốc. Xem thêm §19.

---

## 2. Nhịp ánh sáng — mỗi phase một khung giờ

Đây là công cụ kể chuyện mạnh nhất và gần như miễn phí. Trạng thái game được phân biệt bằng **ánh sáng**, không phải bằng màu viền UI.

| State | Khung giờ | Ánh sáng | Cảm giác |
|---|---|---|---|
| LOBBY / WAITING | 8h sáng | Nắng nghiêng, sương còn trên lá | Háo hức, mới bắt đầu |
| ROUND_START | 10h | Nắng đứng, bóng ngắn | Rõ ràng, sẵn sàng |
| SELECT_MARBLES | 10h | Như trên, ống kính hạ thấp sát đất | Tập trung, riêng tư |
| CLOSE_HAND | — | Bóng đổ đậm hơn 15% | Bí mật |
| GUESS_TOTAL | 12h trưa | Nắng gắt nhất, tương phản cao, ve kêu | Căng, nín thở |
| REVEAL | 12h | Một tia nắng xuyên qua khe mái tranh rọi vào nắm tay | Sân khấu |
| RESULT | 12h | Bụi đất tung lên bắt sáng | Reo hò |
| DICE | 15h | Nắng chếch, bóng dài | Cầu may |
| PENALTY | 15h | Như trên | Hài hước |
| ELIMINATED | 17h | Chiều tà, ám vàng cam | Tiếc nuối, không bi thảm |
| MATCH END | 17h30 | Hoàng hôn, khói bếp | Kết thúc một buổi chiều |

Chuyển giữa các khung giờ bằng cách đổi tint của lớp overlay toàn màn hình, **không cần đổi ảnh nền**. Một ảnh nền + 3 lớp tint = 3 tâm trạng.

---

## 3. Bảng màu

Palette lấy trực tiếp từ vật liệu, không lấy từ lý thuyết màu.

### 3.1. Màu nền tảng

| Token | Tên | Hex | Dùng ở đâu |
|---|---|---|---|
| `--dat-sang` | Đất nện phơi nắng | `#D9A768` | Vùng sáng của nền, highlight |
| `--dat` | Đất nện | `#B9803F` | Nền chính toàn app |
| `--dat-toi` | Đất trong bóng râm | `#7A4F26` | Bóng đổ, vùng chìm, chữ phụ trên nền sáng |
| `--tranh` | Rơm rạ mái tranh | `#E7C170` | Header/eaves, viền trang trí |
| `--tranh-toi` | Rạ ngả màu | `#A87C24` | Bóng của mái, đường phân tầng |
| `--tre` | Nan tre khô | `#C79B4E` | Mặt nút chính, khung viền |
| `--tre-toi` | Cật tre | `#8E6626` | Bóng cứng dưới nút, mắt tre |
| `--giay-do` | Giấy dó | `#F2E5C4` | Mặt mọi panel chứa chữ |
| `--muc` | Mực nho | `#2A211B` | Nét viền, chữ chính |
| `--phan` | Phấn trắng | `#F6F1E4` | Chữ viết trên đất/vách, vạch đếm |

### 3.2. Màu đội & màu ngữ nghĩa

| Token | Tên | Hex | Vai trò |
|---|---|---|---|
| `--cham` | Chàm | `#1F3F63` | Đội 1 · màu thông tin |
| `--dieu` | Đỏ điều | `#C4322A` | Đội 2 · cảnh báo, hết giờ |
| `--la` | Lá chuối | `#4C7A38` | Đội 3 · xác nhận, đúng |
| `--nghe` | Vàng nghệ | `#E8A72E` | Đội 4 · thắng, focus ring |

Bốn màu đội khớp đúng với "1–4 teams" trong MVP (§50 file gốc). Mỗi đội có thêm một **vật nhận dạng** ngoài màu, để người mù màu vẫn phân biệt được:

- Chàm → khăn mỏ quạ
- Điều → dây chun đỏ buộc cổ tay
- Lá → tàu lá chuối cài sau lưng
- Nghệ → nón lá

### 3.3. Quy tắc màu bắt buộc

- **Không bao giờ đặt chữ thân trực tiếp lên nền đất.** Luôn phải có lớp giấy dó, lá chuối hoặc mẹt tre phía sau. Nền đất `#B9803F` với chữ trắng chỉ đạt ~3.2:1 — không đủ.
- Tối đa **2 màu đội** xuất hiện cùng lúc trong một khung hình cận cảnh, tránh loạn.
- Vàng nghệ chỉ dùng cho **một** thứ tại một thời điểm: hoặc là focus ring, hoặc là hiệu ứng thắng. Không dùng song song.
- Không dùng gradient nhiều hơn 2 điểm dừng. Màu bệt là mặc định.

---

## 4. Chất liệu

Mỗi vật liệu có một "chữ ký" riêng để nhận ra ngay cả khi ảnh bị thu nhỏ.

| Vật liệu | Chữ ký thị giác | Cách làm trong code |
|---|---|---|
| Đất nện | Hạt mịn + vết nứt chân chim + vết chân trần | `feTurbulence` baseFrequency 0.8, opacity 0.22 |
| Mái tranh | Sợi rạ song song, mép dưới lởm chởm không đều | Repeating gradient + mask răng cưa 2 tầng |
| Nan tre | Thớ dọc, mắt tre cách nhau ~40px, mép hơi vàng | Linear gradient dọc + 2 vạch đậm |
| Giấy dó | Sợi giấy lẫn trong nền, mép rách xơ | Noise nhẹ opacity 0.08 + `clip-path` mép không đều |
| Mực nho | Nét dày 2.5–3px, đầu nét hơi phình, có chỗ đứt | SVG filter `feDisplacementMap` scale 3–5 |
| Vải nâu | Dệt thô, sờn ở góc | Cross-hatch pattern 2px |
| Gốm/gạch nung | Đỏ đục, lỗ khí nhỏ | Màu bệt + noise thô |
| Phấn | Nét xốp, đứt quãng, bụi ở đầu nét | `stroke-dasharray` không đều + blur 0.4px |

**Quy tắc nét vẽ:**
- Tất cả viền là **nét mực đen `--muc`, dày 2.5–3px, có rung nhẹ** (không phải đường thẳng toán học).
- Không dùng đổ bóng mềm (`rgba(0,0,0,.1)`). Chỉ dùng **bóng khối cứng**: `0 4px 0 var(--tre-toi)` — như bóng của một vật gỗ đặt trên đất giữa trưa.
- Không dùng `border-radius` đồng loạt. Vật liệu quyết định độ bo: tre bo 10px, giấy dó bo 4px với mép rách, mẹt tròn hoàn toàn, gạch nung bo 2px.

---

## 5. Chữ

Hai họ chữ, vai trò tách bạch rõ.

| Vai trò | Font | Weight | Lý do |
|---|---|---|---|
| Tiêu đề, số bi, nút | **Baloo 2** | 700–800 | Nét dày tròn, giống chữ tô bằng bút lông của trẻ con, dấu tiếng Việt đầy đủ |
| Thân, nhãn, luật chơi | **Be Vietnam Pro** | 400–600 | Do người Việt thiết kế, dấu chuẩn, đọc tốt ở 15px trên điện thoại |

**Thang chữ** (cơ sở 17px, tỉ lệ 1.25):

```
12 · 15 · 17 · 21 · 26 · 33 · 41 · 51 · 64 · 80
```

- Số bi của bản thân: 64px, Baloo 2 800
- Tổng thực tế lúc reveal: 80px
- Tiêu đề màn hình: 33px
- Thân: 17px, `line-height` 1.65, độ dài dòng tối đa **62ch**
- Nhãn nhỏ: 15px — **viết thường có dấu, không viết hoa toàn bộ**. "số bi còn lại", không phải "SỐ BI CÒN LẠI".

Chữ số trong game (mã phòng, số bi) dùng `font-variant-numeric: tabular-nums` để không nhảy khi đếm ngược.

> Trước khi chốt, kiểm tra thực tế bảng chữ có dấu: `ẫ ậ ặ ề ễ ộ ợ ữ ự` ở weight 800 và size 12px. Nếu font hiển thị dấu bị dính hoặc bị cắt, đổi tiêu đề sang **Be Vietnam Pro 800** và bù độ "vui" bằng nghiêng nhẹ 2° + viền mực.

---

## 6. Hai hướng art — chọn lại

### Hướng A — 2.5D cắt giấy (khuyến nghị cho MVP)

Nền là **ảnh vẽ tay 2D** (do Gemini sinh, xem file prompt). Bàn tay, bi và xúc xắc là **3D low-poly được tô shader viền mực + màu bệt** (toon shading 2 tông, outline pass).

Ưu điểm:
- Nền đẹp ngay từ tuần đầu, không cần dựng cảnh 3D.
- Chỉ phải làm 3 model 3D thay vì cả một môi trường.
- Nhẹ trên điện thoại tầm trung — đúng yêu cầu §35 file gốc.
- Đổi nền theo phase chỉ là đổi ảnh, không phải relight cảnh.

Rủi ro: nền 2D và vật thể 3D lệch phối cảnh. **Cách xử lý:** khóa camera 3D ở một góc cố định cho mỗi phase, dựng nền theo đúng góc đó. Không cho camera xoay tự do.

### Hướng B — 3D toàn phần toon-shaded

Dành cho bản hoàn thiện, sau khi gameplay đã đúng. Cả sân, hiên, mái tranh đều là 3D với outline pass.

**Chốt:** làm Hướng A cho MVP. Chỉ chuyển sang B khi có ít nhất 100 phòng chơi thật.

---

## 7. Hệ UI — đổi tên toàn bộ component sang vật liệu

Đây là phần quan trọng nhất. **Trong repo, đặt tên class/component theo vật liệu**, để cả team không vô thức quay về UI generic.

| Component chuẩn | Tên trong Tổng Bi | Vật liệu & mô tả |
|---|---|---|
| Panel / Card | `.met` — **Mẹt tre** | Tròn, viền nan đan. Dùng cho vòng tròn người chơi, khu vực chính. |
| Content panel | `.giay-do` — **Giấy dó dán vách** | Chữ nhật, mép rách xơ, 4 góc có ghim tre hoặc vệt hồ dán. Mọi panel chứa chữ. |
| List container | `.chieu` — **Chiếu cói** | Dệt ngang, viền vải. Danh sách người chơi. |
| Header / Footer bar | `.liep` — **Tấm liếp tre** | Nan ngang thưa. HUD trên và dưới. |
| Button primary | `.the-tre` — **Thẻ tre** | Mặt tre thớ dọc, viền mực, bóng cứng `0 4px 0`. |
| Button danger | `.gach` — **Gạch nung** | Đỏ đục, bo 2px, nặng nề. Dùng cho "Rời phòng", "Bỏ cuộc". |
| Button confirm | `.la-chuoi` — **Lá chuối** | Xanh lá, gân lá chạy chéo. "Khóa đáp án", "Xác nhận". |
| Button ghost | `.mo-cau` — **Mo cau** | Nền trong, viền mực nét đứt. Hành động phụ. |
| Input | `.nan` — **Khung nan tre** | Nền giấy dó, viền nan, chữ Baloo giãn ký tự. |
| Modal | `.canh-cua` — **Cánh cửa gỗ** | Hai cánh mở ra hai bên khi hiện, có then cài ở giữa. |
| Toast | `.la-cuon` — **Lá chuối cuốn** | Trượt vào từ mép trên, tự cuốn lại và bay đi. |
| Avatar frame | `.non-la` — **Vành nón lá** | Vòng tròn hình nón nhìn từ trên, chóp là điểm neo màu đội. |
| Timer | `.nen-huong` — **Nén hương** | Que hương cháy dần, đầu than đỏ, khói mỏng. |
| Score / tally | `.vach-dat` — **Vạch trên nền đất** | Đếm bằng 4 vạch + 1 gạch chéo, vẽ bằng que. |
| Marble counter | `.tui-bi` — **Túi bi vải nâu** | Túi rút dây, phồng lên theo số bi. |
| Badge đội | `.khan` — **Khăn/dây đội** | Dải vải màu đội, mép sờn. |
| Progress bar | `.day-thung` — **Dây thừng** | Sợi thừng bện, phần đã đi qua sẫm màu. |
| Tooltip | `.manh-giay` — **Mẩu giấy gấp** | Giấy dó nhỏ, xoay nhẹ 3°. |

**Nút "Bắt đầu" của chủ phòng** không phải là nút. Nó là **cái trống ếch** — bấm vào phát ra tiếng trống, cả phòng nghe thấy cùng lúc.

---

## 8. Spec nút

| Thuộc tính | lg | md | sm |
|---|---|---|---|
| Chiều cao | 56px | 48px | 38px |
| Padding ngang | 28px | 22px | 14px |
| Cỡ chữ | 21px | 17px | 15px |
| Bo góc | 12px | 10px | 8px |
| Viền mực | 3px | 3px | 2.5px |
| Bóng cứng | `0 5px 0` | `0 4px 0` | `0 3px 0` |

**Trạng thái:**

| State | Xử lý |
|---|---|
| Mặc định | Bóng cứng đầy đủ |
| Hover (chỉ desktop) | Sáng lên 4%, xoay `-0.6deg` |
| Nhấn | `translateY(+4px)`, bóng về 0 — như ấn một khối gỗ xuống đất |
| Focus bàn phím | Viền vàng nghệ 3px, offset 3px — luôn nhìn thấy được |
| Disabled | Đất bạc màu `#A99070`, bỏ bóng, giảm opacity 0.6, con trỏ `not-allowed` |
| Đang chờ server | Chữ đổi thành `…`, có 3 hạt bụi nảy lên |

**Không dùng hover làm kênh thông tin duy nhất** (§35 file gốc). Mọi trạng thái phải đọc được khi chạm.

---

## 9. Art direction cho 3D

### 9.1. Bàn tay — tài sản quan trọng nhất

Đây là **tay trẻ con**, không phải tay người lớn thu nhỏ.

- Tỉ lệ: bàn tay ngắn, mũm mĩm, ngón tay gần bằng nhau, khớp ngón có lúm đồng tiền.
- Móng tay cắt cụt, có đất đen dưới móng.
- Vết bẩn: bụi đất ở mu bàn tay, vệt mực bút bi ở ngón trỏ, một miếng băng dán ở đốt ngón.
- Cổ tay: **vòng chỉ đỏ** (hoặc dây chun màu đội). Đây là nơi gắn màu đội — không tô màu cả bàn tay.
- Da: 3 tông có sẵn, đều là tông rám nắng, không có tông trắng bệch.
- Shader: toon 2 bậc + outline mực 2px.

Animation clips giữ nguyên tên trong §45 file gốc (`idle`, `reach`, `open_palm`, `pick_marble`, `place_marble`, `close_fist`, `hold_fist`, `open_fist`, `celebrate`) nhưng bổ sung:

- `wipe_dirt` — quệt tay vào quần trước khi bốc bi
- `peek` — hé nắm tay tự nhìn trộm bi của chính mình (idle biến thể, tạo cảm giác sống)
- `shake_fist` — lắc nắm tay trêu đối thủ

### 9.2. Bi

**Bi ve thủy tinh**, không phải cầu kim loại. Trong ruột có dải xoáy màu (xanh, đỏ, vàng). Kích thước ~16mm. Bề mặt có vài vết xước nhỏ — bi đã chơi nhiều, không phải bi mới mua.

Biến thể để làm skin sau này: bi ve xoáy · bi đục sữa · bi nước (trong suốt) · bi sứt (mẻ một góc, hiếm).

### 9.3. Xúc xắc

**Khối gỗ mít vuông, cạnh mòn tròn, mặt khắc chìm rồi bôi mực.** Không phải xúc xắc nhựa casino.

Sáu mặt theo §9.1 file gốc, nhưng đổi cách thể hiện:

| Mặt | Kết quả | Hình khắc |
|---|---|---|
| 1 | +3 bi | 3 viên bi khắc chìm |
| 2 | +6 bi | 6 viên bi |
| 3 | +9 bi | 9 viên bi |
| 4 | Hít đất | Hình que người chống tay |
| 5 | Thụt xì dầu | Hình que người ngồi xổm |
| 6 | Cõng đồng đội | Hình que cõng nhau |

Xúc xắc lăn trên **nền đất**, nên nó không nảy nhiều và có tung bụi khi dừng. Giảm `bounce` xuống ~0.15 so với mặt bàn gỗ.

### 9.4. Không có bàn — chỉ có nền đất

Đây là thay đổi lớn nhất so với §13 file gốc.

Bỏ hoàn toàn khái niệm "bàn tròn/bàn vuông". Thay bằng:

- **Một vòng tròn vẽ bằng que trên nền đất**, đường kính tương ứng số người chơi.
- Người chơi ngồi bệt quanh vòng tròn, chỉ thấy **từ đầu gối trở xuống + hai bàn tay** trong khung hình chính.
- Giữa vòng tròn là chỗ đặt bi chung và chỗ lăn xúc xắc.
- Vòng tròn bị mờ dần và bị xóa bởi bàn chân qua các vòng chơi — chi tiết nhỏ nhưng tạo cảm giác thời gian trôi.

Camera (thay §13):

| Camera | Framing |
|---|---|
| **Overview** | Cao 90cm, nghiêng 35°, thấy cả vòng tròn + mép mái tranh ở đỉnh khung |
| **Player Focus** | Sát đất, tiêu cự dài, chỉ có nắm tay và nền đất mờ phía sau |
| **Dice** | Cao 40cm, nhìn nghiêng, xúc xắc lăn về phía camera |
| **Result** | Kéo ra nhanh, nghiêng nhẹ 4°, bụi đất bay lên bắt sáng |

---

## 10. VFX

| Hiệu ứng | Khi nào | Mô tả |
|---|---|---|
| Bụi đất | Bi rơi, xúc xắc dừng, tay đập đất | Hạt nâu nhạt, bay chậm, tan trong 0.8s |
| Tia nắng khe mái | Lúc REVEAL | Một chùm sáng chéo rọi vào nắm tay đang mở |
| Lá tre rơi | Idle ở lobby | 2–3 lá, rơi xoay, mỗi 6–10 giây một lá |
| Mực loang | Khi khóa đáp án | Số đoán được "đóng dấu" bằng vệt mực loang ra rồi khô lại |
| Bụi phấn | Khi vạch điểm | Hạt trắng rơi xuống dưới vạch |
| Ve sầu rung | Lúc GUESS_TOTAL sắp hết giờ | Toàn màn hình rung 1px theo nhịp tiếng ve |

**Không dùng:** hạt lấp lánh, tia sáng thần thánh, confetti nhiều màu, hiệu ứng glow neon. Chiến thắng được ăn mừng bằng **bụi đất và tiếng reo**, không phải bằng pháo giấy.

---

## 11. Nguyên tắc chuyển động

- Mọi chuyển động phải có **quán tính của vật thật**. Dùng `cubic-bezier(.34,1.56,.64,1)` cho vật rơi/nảy, `cubic-bezier(.4,0,.2,1)` cho vật trượt.
- Panel không "fade in". Nó **được dán lên** (scale từ 0.94, xoay từ -1.5°, đứng lại) hoặc **được lật ra** (rotateY).
- Chỉ có **một** khoảnh khắc chuyển động không do người dùng kích hoạt trong mỗi màn hình. Ở phase REVEAL, đó là tia nắng. Ở lobby, đó là lá tre rơi. Không rải hiệu ứng vào mọi phần tử.
- Tổng thời gian một chuỗi animation không vượt quá timeout của phase (§37 file gốc): SELECT 20s, GUESS 15s, REVEAL 5s. Animation reveal phải xong trong **3.5s** để còn 1.5s đọc kết quả.
- Tôn trọng `prefers-reduced-motion`: bỏ rung, bỏ lá rơi, bỏ khói hương; giữ lại chuyển đổi trạng thái nhưng rút xuống 120ms.

---

## 12. Âm thanh

Thay hoàn toàn §28 file gốc.

**Lớp nền (ambient, loop):**
- Ve sầu — to dần theo độ căng của phase
- Gà gáy xa, chó sủa, tiếng chổi tre quét sân — random 20–40s một lần
- Gió lùa qua mái tranh

**Lớp tương tác:**

| Sự kiện | Âm thanh |
|---|---|
| Chạm nút | Gõ que tre vào nhau |
| Chọn bi | Bi thủy tinh chạm nhau lách cách |
| Bi rơi vào lòng bàn tay | Tiếng "cạch" trầm, có tiếng da |
| Nắm tay | Tiếng vải/da siết, rất khẽ |
| Đếm ngược | Nhịp trống ếch, nhanh dần |
| Hết giờ | Một tiếng trống ếch dứt khoát |
| Mở tay | Im lặng 0.4s → tiếng bi lăn trên đất |
| Đoán đúng | Tiếng reo trẻ con "ê ê ê!" + sáo trúc một nốt cao |
| Đoán sai | Tiếng "ơ…" hụt hẫng + đàn bầu một nốt trầm |
| Lắc xúc xắc | Gỗ va trong lòng bàn tay |
| Xúc xắc dừng | "Cốc" trên đất, không vang |
| Thắng trận | Trống ếch + sáo trúc, 3 giây |
| Bị loại | Một tiếng chuông chùa xa, rất nhẹ |

**Nhạc cụ được phép:** sáo trúc, đàn bầu, trống ếch, mõ, song loan. **Không dùng:** synth, trống điện tử, nhạc lofi.

Toàn bộ âm thanh phải nghe rõ trên loa điện thoại — mix tập trung ở 300Hz–4kHz, không dựa vào bass.

---

## 13. Iconography

Icon vẽ theo lối **hình que khắc trên đất/gỗ**, nét mực 3px, không có màu fill, tối đa 12 nét mỗi icon.

Bộ icon hình phạt (§11 file gốc):

| Hình phạt | Icon |
|---|---|
| Hít đất | Hình que chống hai tay, lưng thẳng |
| Thụt xì dầu | Hình que ngồi xổm, hai tay chống hông |
| Cõng đồng đội | Hai hình que chồng lên nhau |
| Hát một bài | Hình que há miệng + 2 nốt nhạc |
| Kể chuyện cười | Hình que + bong bóng thoại có "ha" |
| Bị trừ 1 bi | Một viên bi có dấu gạch chéo |
| Mất lượt đoán | Nắm tay bị buộc dây |

Mức độ hình phạt hiển thị bằng **số vạch đỏ** bên dưới icon (1–3 vạch), không dùng chữ "nhẹ/vừa/nặng".

---

## 14. Nội dung chữ trong game

Giọng văn: **trẻ con nói với nhau**, không phải app nói với người dùng. Ngắn, có dấu, không trang trọng.

| Tình huống | ❌ Đừng viết | ✅ Viết |
|---|---|---|
| Chờ người khác | "Đang đồng bộ trạng thái phòng…" | "Chờ tụi nó giấu bi xong đã" |
| Nhập mã | "Nhập mã phòng để tham gia" | "Mã phòng là gì?" |
| Hết giờ | "Hết thời gian. Hệ thống tự động chọn 1." | "Chậm quá! Cho mày 1 viên thôi" |
| Đoán đúng | "Chính xác!" | "Trúng phóc!" |
| Đoán sai | "Không chính xác." | "Trật lất" |
| Hết bi | "Bạn đã bị loại khỏi trận đấu." | "Sạch túi rồi. Vay không?" |
| Mất kết nối | "Lỗi kết nối. Vui lòng thử lại." | "Rớt mạng rồi. Bấm vào đây quay lại sân" |
| Phòng trống | "Chưa có người chơi nào." | "Mới có mình mày. Gửi link cho tụi nó đi" |

Màn hình lỗi và màn hình trống là cơ hội kể chuyện, không phải chỗ xin lỗi. Mất kết nối = **trời đổ mưa, cả bọn chạy vào hiên trú**, chứ không phải một hộp thoại xám.

---

## 15. Mobile & khả năng tiếp cận

- Vùng chạm tối thiểu 48×48px. Nút chính ở **nửa dưới màn hình**, trong tầm ngón cái.
- Không có thông tin nào chỉ truyền tải bằng màu. Đội có màu **và** vật nhận dạng (§3.2).
- Tương phản chữ tối thiểu 4.5:1 — vì vậy có quy tắc "không đặt chữ lên nền đất" ở §3.3.
- Ảnh nền phải có **vùng an toàn ở giữa** ít chi tiết để panel đọc được (xem file prompt, §2).
- Tổng dung lượng ảnh nền của cả game ≤ 2.5MB sau khi nén WebP. 16 nền × ~150KB.
- Hỗ trợ xoay ngang và dọc: nền phải có phiên bản 16:9 và 9:16, cùng bố cục chứ không phải crop.

---

## 16. Nên / Không nên

| ✅ Nên | ❌ Không nên |
|---|---|
| Nền đất có vết chân, vết bi lăn | Nền gỗ bóng, nỉ xanh casino |
| Bóng khối cứng lệch 4px | Đổ bóng mờ `rgba(0,0,0,.1)` |
| Viền mực rung nhẹ | Viền 1px xám đều tăm tắp |
| Chữ thường có dấu | NHÃN VIẾT HOA TOÀN BỘ |
| Bi ve có vết xước | Bi kim loại phản chiếu HDRI |
| Tay trẻ con lấm đất | Tay người lớn sạch sẽ |
| Vạch đếm bằng que trên đất | Bảng điểm dạng bảng số |
| Reo hò + bụi đất khi thắng | Confetti nhiều màu, glow neon |
| Mái tranh cắt ngang đỉnh khung hình | Header thanh ngang phẳng màu đơn |
| Xúc xắc gỗ khắc chìm | Xúc xắc nhựa chấm tròn trắng |

---

## 17. Checklist asset

### 17.1. Bắt buộc cho MVP

**Nền 2D (16 ảnh × 2 tỉ lệ = 32 file)** — sinh bằng Gemini theo file `tong_bi_prompt_nen_gemini.md`

**3D:**
- [ ] Bàn tay/cẳng tay trẻ con, rigged, GLB, ≤ 3.5k tris
- [ ] 12 animation clip (9 gốc + `wipe_dirt`, `peek`, `shake_fist`)
- [ ] Bi ve, 3 biến thể xoáy màu, ≤ 300 tris
- [ ] Xúc xắc gỗ 6 mặt khắc chìm + collider
- [ ] Toon shader + outline pass dùng chung

**UI:** đã có sẵn dạng CSS/SVG trong `tong-bi-ui-kit.html`, không cần asset ảnh.

**Texture rời:**
- [ ] Đất nện tileable 1024px
- [ ] Dải mái tranh 2048×256 (PNG trong suốt)
- [ ] Nan tre tileable 512px
- [ ] Giấy dó 1024px

### 17.2. Nên có

- [ ] 4 vật nhận dạng đội (khăn mỏ quạ, dây chun, lá chuối, nón lá)
- [ ] Particle bụi đất, lá tre, bụi phấn
- [ ] Bộ 7 icon hình phạt
- [ ] Túi bi vải nâu, 4 mức phồng
- [ ] Nén hương + khói

### 17.3. Nếu không tự làm được

Không mua asset pack low-poly generic — nó sẽ phá vỡ toàn bộ định hướng này. Thay vào đó:

1. **Nền:** sinh bằng Gemini (đã có prompt sẵn).
2. **Bàn tay:** đây là thứ **duy nhất** đáng thuê artist. Một bàn tay rig tốt + 12 clip là toàn bộ linh hồn game.
3. **Bi & xúc xắc:** tự dựng được trong Blender trong một buổi. Bi là quả cầu UV, xúc xắc là khối lập phương bevel.
4. **UI:** dùng UI kit CSS đã có.

### 17.4. Skin cho sau này (thay §49)

Không bán skin bàn/tay generic. Bán **bối cảnh**:

- Sân đình mùa hè (mặc định)
- Bãi biển miền Trung — nền cát, bi lăn để lại rãnh
- Ruộng bậc thang mùa gặt — nền rơm
- Sân trường giờ ra chơi — nền xi măng, vạch phấn
- Tết — sân đất có xác pháo, bi đỏ

> **Đã dựng một phần:** tầng buổi (sáng/đêm) và bốn mùa đã có trong game, miễn phí và
> không cần asset — xem §20. Bán bối cảnh sau này là bán **vùng miền** (bãi biển miền Trung,
> ruộng bậc thang, sân trường xi măng) chứ không bán lại mùa.

Mỗi bối cảnh đổi cả nền, ambient sound và texture nền đất. Đây là thứ người chơi thật sự muốn khoe.

---

## 18. Brief gửi artist / 3D artist (thay §56)

> Tôi cần art cho một web game party mô phỏng trò chơi bi tuổi thơ Việt Nam. Bối cảnh: sân đất trước một ngôi nhà mái tranh, ba giờ chiều mùa hè, một nhóm trẻ con ngồi bệt thành vòng tròn chơi bi. Người chơi giấu bi trong nắm tay, các đội đoán tổng số bi của cả vòng, rồi tất cả cùng mở tay.
>
> **Phong cách:** truyện tranh thiếu nhi Việt Nam thập niên 90 — nét mực đen đều tay dày 2–3px, màu bệt không gradient, nền giấy có hạt. Bảng màu lấy từ vật liệu: đất nện `#B9803F`, rơm rạ `#E7C170`, giấy dó `#F2E5C4`, chàm `#1F3F63`, đỏ điều `#C4322A`, lá chuối `#4C7A38`, vàng nghệ `#E8A72E`, mực nho `#2A211B`. Tuyệt đối không dùng phong cách anime, không 3D photoreal, không glow neon.
>
> **Cần làm (ưu tiên theo thứ tự):**
> 1. Bàn tay + cẳng tay **trẻ con** có rig, GLB, low-poly, toon shader 2 bậc + outline mực. Tay phải lấm đất, móng cắt cụt, có vòng chỉ đỏ ở cổ tay. 12 animation clip: idle, reach, open_palm, pick_marble, place_marble, close_fist, hold_fist, open_fist, celebrate, wipe_dirt, peek, shake_fist.
> 2. Viên bi ve thủy tinh có dải xoáy màu bên trong, 3 biến thể, có vết xước nhẹ.
> 3. Xúc xắc khối gỗ mít, cạnh mòn tròn, 6 mặt khắc chìm bôi mực, có collider và pivot đúng tâm.
> 4. Bốn vật nhận dạng đội: khăn mỏ quạ chàm, dây chun đỏ, tàu lá chuối, nón lá.
>
> **Không cần làm:** bàn chơi (game diễn ra trên nền đất), môi trường 3D (nền là ảnh 2D), UI (đã có bản CSS).
>
> **Ràng buộc kỹ thuật:** chạy 60fps trên điện thoại tầm trung. Bàn tay ≤ 3.5k tris, bi ≤ 300 tris, texture ≤ 512px, animation clip tách rời trong GLB.

---

## 19. Lưu ý bản quyền

Bộ truyện tranh dùng làm tham chiếu cảm hứng là tác phẩm có bản quyền. Vì vậy:

- **Không** nêu tên bộ truyện, tên nhân vật, hay tên tác giả trong prompt sinh ảnh, trong asset, trong tên file, trong repo, hay trong bất kỳ nội dung nào ra ngoài.
- **Không** tái tạo tạo hình nhân vật (kiểu tóc trái đào đặc trưng, trang phục, khuôn mặt) của bất kỳ nhân vật có sẵn nào.
- Cái được phép kế thừa là **phong cách chung của một dòng tranh** — nét mực, màu bệt, bối cảnh làng quê Bắc Bộ — vì đó là đặc điểm thể loại, không phải tài sản của một tác phẩm.
- Toàn bộ nhân vật, bàn tay, avatar của Tổng Bi phải là thiết kế gốc.

Các prompt trong file kèm theo đã được viết theo nguyên tắc này: mô tả đặc điểm thị giác thay vì nêu tên tác phẩm. Điều này cũng cho kết quả sinh ảnh tốt hơn, vì mô hình bám vào thuộc tính cụ thể thay vì đoán mò một IP.

---

## 20. Khung cảnh theo buổi và mùa

Tầng bên trên §2. §2 kể một **buổi chiều** (mỗi phase một khung giờ); tầng này quyết định
đó là buổi chiều của *mùa nào*, hay là một *đêm trăng*.

Nguyên tắc quan trọng nhất: **buổi/mùa không ghi đè nhịp ánh sáng của phase.** Bảng khí
trời chỉ *nhân* cường độ nắng, *pha* màu nắng và đổi bảng màu đất/lá. Nhờ vậy giữa đêm
mùa đông thì `GUESS_TOTAL` vẫn là phase sáng gắt nhất của cả ván, hướng bóng vẫn đúng
khung giờ, và câu chuyện của §2 không bị mất.

### 20.1. Ai chọn

| | Mặc định | Người chơi chọn tay |
|---|---|---|
| Buổi | theo đồng hồ máy: 18h–5h là đêm | ban ngày / đêm trăng |
| Mùa | theo tháng: 2–4 xuân, 5–7 hạ, 8–10 thu, 11–1 đông | xuân / hạ / thu / đông |

Lựa chọn lưu ở `localStorage`, **không** gửi lên server: đây là chuyện của người xem, hai
đứa trong cùng một phòng được ngồi ở hai mùa khác nhau mà không ảnh hưởng gì tới luật.
Để "tự động" thì cứ 5 phút đọc lại đồng hồ, nên ván bắt đầu lúc 17h55 sẽ tự sang đêm
giữa trận.

### 20.2. Mỗi khung cảnh có gì

Luôn có: cánh đồng + bờ ruộng, hai–ba bụi tre, nhà mái tranh.

| | Thêm vào |
|---|---|
| Sáng | mây trắng (hè thấp, thu mỏng và cao hơn) |
| Đêm | trăng thấp + sao, bến nước soi trăng, gió mạnh hơn 25%, đom đóm (chỉ đêm hè và đêm thu) |
| Xuân | mưa xuân, cây đào nở, cây nêu + dây pháo, xác pháo trên đất; đất nồm nên gần như không bốc bụi |
| Hạ | nắng gắt nhất, bụi đất nhiều nhất — khung cảnh gốc của §1 |
| Thu | đồng chín vàng, lá rụng trên đất và còn chao trong không khí, trời xanh và cao |
| Đông | đồng đã gặt chỉ còn gốc rạ, cây trụi lá, tre vàng và thưa, sương lạnh đọng thấp, nắng nhạt nhất. **Không có tuyết** — rét Bắc Bộ là trời xám và cây trụi, không phải mùa đông ôn đới |

### 20.3. Ba luật của khung cảnh

1. **Không vật đứng nào ở trong lòng vòng người ngồi.** Khung `tay` (§6) đặt camera trong
   lòng vòng ngoảnh ra nhìn chỗ ngồi, hậu cảnh phải là mảng đất trống. Ngoại lệ duy nhất
   là hạt bay (mưa, lá, cánh hoa, đom đóm) — mảnh cỡ centimet, và cũng chỉ được bay ngoài
   vòng người, vì hạt rơi trong vòng là rơi ngay trước ống kính.
2. **Mọi vị trí tất định.** Cả phòng phải thấy bụi tre ở cùng một chỗ.
3. **Mọi màu đi qua bảng khí trời.** Không vật nào được phát sáng lạc ra khỏi đêm hay
   tươi lạc ra khỏi mùa đông.

### 20.4. Ở đâu trong code

`three/troi.ts` (bảng khí trời) · `three/Quanh.tsx` (cả cái làng) · `lib/khungCanh.ts`
(chọn + lưu) · `ui/ChonKhungCanh.tsx` (nút góc phải dưới) · khối `[data-buoi]` /
`[data-mua]` trong `styles.css` (tông của các màn 2D) · `test/khungCanh.test.tsx`.

Tất cả dựng bằng primitive, **không thêm một byte asset nào**. Muốn nâng cấp bằng ảnh vẽ
tay thì bộ prompt nằm ở [tong_bi_prompt_khungcanh_mua.md](tong_bi_prompt_khungcanh_mua.md).
