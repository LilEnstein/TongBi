# TỔNG BI — BỘ PROMPT SINH NỀN & ASSET (Gemini)

Đi kèm `tong_bi_artdirection_dangian.md`. File này chứa prompt sẵn để dán thẳng vào Gemini.

---

## 0. Quy trình để 16 nền trông như cùng một họa sĩ vẽ

Đây là phần quan trọng nhất. Nếu sinh 16 ảnh riêng lẻ, bạn sẽ được 16 phong cách khác nhau.

1. **Sinh P05 trước tiên** (Bắt đầu vòng chơi). Đây là cảnh đầy đủ nhất: nền đất + mái tranh + vòng tròn. Sinh 6–8 biến thể, chọn 1 cái đúng nhất.
2. **Ảnh đó trở thành ảnh chuẩn.** Với 15 prompt còn lại, **đính kèm ảnh chuẩn** vào Gemini và mở đầu prompt bằng:
   > `Match the exact art style, line weight, color palette, lighting and paper texture of the attached reference image. Same illustrator, same series. New scene:`
3. Chỉ đổi **một biến** mỗi lần sinh lại. Nếu ảnh sai bố cục, sửa câu bố cục, giữ nguyên khối STYLE.
4. Sinh **16:9 trước**, sau đó dùng chính ảnh 16:9 làm reference để sinh bản **9:16** với cùng nội dung. Đừng crop — bố cục sẽ hỏng.
5. Đặt tên file theo mã page: `p05_round_start_16x9.png`, `p05_round_start_9x16.png`.

**Lưu ý về ổn định:** nếu Gemini vẫn trôi phong cách sau 3 lần thử, hãy giảm mô tả cảnh xuống còn 1 câu và tăng trọng số cho khối STYLE bằng cách đặt nó **lên đầu** prompt thay vì cuối.

---

## 1. Khối STYLE — dán vào **mọi** prompt

```
STYLE: 1990s Vietnamese children's comic book illustration. Clean confident
black ink outlines of even medium weight, flat cel-shaded color with no
gradients, exactly one darker shadow tone per object. Subtle rice-paper grain
over the whole image. Strictly limited palette: packed ochre earth #B9803F,
sunlit earth #D9A768, shaded earth #7A4F26, straw thatch #E7C170, mulberry
paper cream #F2E5C4, indigo #1F3F63, vermilion #C4322A, banana-leaf green
#4C7A38, turmeric yellow #E8A72E, ink brown-black #2A211B. Setting is a
northern Vietnamese village in the mid-1990s. Warm, nostalgic, hand-drawn.
Not photorealistic, not 3D, not anime, not painterly.
```

## 2. Khối NEGATIVE — dán vào mọi prompt

```
NEGATIVE: text, letters, words, captions, numbers, watermark, signature, logo,
photorealistic, 3D render, CGI, anime, manga, big sparkly eyes, glossy
highlights, lens flare, neon glow, bloom, modern buildings, cars, motorbikes,
power lines, antennas, plastic objects, smartphones, cluttered center, busy
composition, harsh black shadows, decorative frame, border, vignette,
close-up human faces, characters looking at the viewer, adult hands.
```

## 3. Quy tắc vùng an toàn (bắt buộc)

UI của game nằm đè lên nền. Nếu nền có chi tiết ở giữa, chữ sẽ không đọc được.

```
┌─────────────────────────────────┐
│  chi tiết ở đây (mái tranh)     │  ← 0–20% chiều cao
├─────────────────────────────────┤
│                                 │
│      VÙNG AN TOÀN               │  ← 20–75%: nền phẳng, ít chi tiết,
│      (panel UI nằm đây)         │     độ sáng đồng đều, không có
│                                 │     vật thể nào cắt ngang
├─────────────────────────────────┤
│  chi tiết ở đây (bi, dép, cỏ)   │  ← 75–100%
└─────────────────────────────────┘
```

Mọi prompt bên dưới đã có sẵn câu mô tả vùng an toàn. **Đừng xóa câu đó.**

Sau khi sinh xong, vẫn nên phủ thêm một lớp `linear-gradient` mờ tông đất ở vùng giữa trong CSS (đã có sẵn class `.an-toan` trong UI kit).

---

## 4. Prompt cho từng page

### P01 — Trang chủ / Landing

**Vai trò:** ấn tượng đầu tiên. Logo và nút "Tạo phòng" nằm giữa.
**Safe zone:** giữa khung, rộng.

```
A dirt path leading away from the viewer toward a small village gate under a
huge old banyan tree, seen from a low child's-eye height. A thatched-roof
house is visible in the middle distance behind bamboo. Late morning light.
Three glass marbles rest on the dirt in the very bottom corner of the frame.
The entire middle of the image is open flat dirt ground and empty pale sky
with no objects, so text can sit on top of it. All detail is pushed to the
left edge, right edge and bottom edge. No people in the frame.

[dán khối STYLE]
[dán khối NEGATIVE]
```

---

### P02 — Sảnh: tạo phòng / vào phòng

**Vai trò:** nhập tên, chọn avatar, nhập mã phòng.
**Safe zone:** giữa và phải.

```
The front porch of a thatched-roof village house seen from the dirt yard, low
angle. Straw eaves cut across the top edge of the frame. A woven bamboo tray
and a pair of small rubber sandals sit on the earth at the bottom left. The
right two thirds of the image is empty sunlit packed dirt with a gentle even
tone, no objects, reserved for interface panels. Quiet mid-morning light,
long soft shadows falling to the right. No people.

[STYLE] [NEGATIVE]
```

---

### P03 — Phòng chờ

**Vai trò:** hiển thị mã phòng, QR, danh sách người chơi đang vào.
**Safe zone:** giữa.

```
A dirt yard in front of a thatched house. A rough circle has been scratched
into the packed earth with a stick, but the circle is empty and no one is
sitting in it yet. Scattered around the outside of the circle: a few pairs of
small sandals, a cloth bag, a bamboo stick lying on the ground. Straw eaves
along the top edge. The center of the circle is flat empty dirt with even
lighting so an interface panel can be placed over it. Morning, calm,
expectant. No people.

[STYLE] [NEGATIVE]
```

---

### P04 — Cấu hình phòng (chủ trò)

**Vai trò:** chỉnh số bi, số vòng, luật thắng, bật xúc xắc.
**Safe zone:** toàn bộ trung tâm — đây là màn hình nhiều form nhất.

```
Extreme close view looking straight down at a woven bamboo mat lying on
packed dirt ground. On the mat: a stubby pencil, a small cloth bag of glass
marbles pulled shut with a string, and one loose marble. All these objects
are arranged along the far left edge and far bottom edge only. The rest of
the mat is a clean even woven surface with nothing on it. Flat overhead
light, no strong shadows. No people, no hands.

[STYLE] [NEGATIVE]
```

---

### P05 — Bắt đầu vòng chơi (ROUND_START) ⭐ SINH ẢNH NÀY TRƯỚC

**Vai trò:** cảnh nền chủ đạo, dùng lại cho SELECT và CLOSE_HAND.
**Safe zone:** giữa.

```
A dirt yard in front of a thatched-roof village house, seen from about knee
height, camera tilted down thirty degrees. A wide circle is scratched into
the packed earth in the middle of the frame. Straw thatch eaves and a strip
of bamboo wall run across the top fifth of the image. Around the very edges
of the frame, only the crossed legs and bare feet of seated children are
visible, cropped by the frame; no faces, no upper bodies. The center of the
circle is empty flat dirt, evenly lit, with faint stick marks and a few
footprints. Midday summer light, short shadows, dry and warm.

[STYLE] [NEGATIVE]
```

---

### P06 — Chọn bi (SELECT_MARBLES)

**Vai trò:** người chơi bấm +/- chọn số bi. Cần cảm giác riêng tư, sát mặt đất.
**Safe zone:** giữa trên.

```
Very low camera almost resting on packed dirt ground, shallow feel. In the
bottom third of the frame a small brown cloth drawstring bag has tipped over
and seven glass marbles with colored swirls inside have spilled out onto the
earth, each casting a tiny hard shadow. The upper two thirds of the frame is
soft out-of-focus warm dirt and blurred bamboo, almost empty, with no
readable detail. Intimate and quiet. No people, no hands.

[STYLE] [NEGATIVE]
```

---

### P07 — Nắm tay giấu bi (CLOSE_HAND)

**Vai trò:** khoảnh khắc bí mật. Model 3D bàn tay sẽ nằm đè lên nền này.
**Safe zone:** toàn bộ giữa — không được có gì cả.

```
Packed dirt ground filling the whole frame, seen from very close and slightly
above, with the light dimmed as if a cloud just passed. Only texture: fine
grain, a hairline crack, one faint footprint at the very bottom edge, and a
blurred hint of green bamboo leaves at the top corners. Nothing else at all.
The image is almost abstract, a quiet empty surface. Slightly cooler and
darker than midday. No people, no hands, no objects.

[STYLE] [NEGATIVE]
```

---

### P08 — Đoán tổng (GUESS_TOTAL)

**Vai trò:** phase căng nhất. Nắng gắt, tiếng ve.
**Safe zone:** giữa, hình chữ nhật lớn.

```
A dirt yard at high noon, harsh bright summer sun, very short shadows. Around
all four edges of the frame, the closed fists and forearms of several
children reach inward toward the middle, cropped by the frame, each fist
tightly clenched. Their arms are thin and sunburnt, one wears a red string
around the wrist. The entire middle of the image is empty bright packed dirt
with nothing in it. Heat, tension, cicada-loud stillness. No faces, no
bodies, no adult hands.

[STYLE] [NEGATIVE]
```

---

### P09 — Mở tay (REVEAL)

**Vai trò:** khoảnh khắc sân khấu. Đây là ảnh nền đắt nhất, đáng sinh nhiều lần.
**Safe zone:** giữa, nhưng có một chùm sáng chéo rọi vào.

```
Packed dirt ground seen from low angle. A single narrow shaft of sunlight
falls diagonally from the upper left through an unseen gap in a thatched
roof, landing as a bright warm pool in the middle of the dirt. Dust motes
float inside the light beam. Everything outside the beam is in soft warm
shade. The lit pool in the center is clean and empty, no objects inside it.
Theatrical, held breath, one second before something is revealed. No people,
no hands.

[STYLE] [NEGATIVE]
```

---

### P10 — Kết quả lượt (RESULT)

**Vai trò:** công bố đội thắng, reo hò.
**Safe zone:** giữa trên.

```
A dirt yard, low camera. A cloud of fine ochre dust has just been kicked up
across the lower third of the frame and hangs in the air, backlit and glowing
warm. Two or three glass marbles are rolling across the dirt at the bottom
edge, leaving thin trails. Above the dust the air is clear and the background
is a plain sunlit wall of woven bamboo, unbroken and even, leaving the middle
of the frame open. Joyful, noisy, alive. No people, no faces.

[STYLE] [NEGATIVE]
```

---

### P11 — Tung xúc xắc vay bi (DICE)

**Vai trò:** cầu may. Model xúc xắc 3D nằm đè lên.
**Safe zone:** giữa.

```
Packed dirt ground with a small circle drawn on it in white chalk, seen from
about forty centimeters high at an angle. The chalk circle is empty. Around
the outside of the circle, faint scuff marks and a scattering of chalk dust.
Late afternoon light coming from the left, shadows long and warm. A worn
bamboo stick lies at the bottom right corner. The inside of the circle is
clean flat dirt with nothing in it. No people, no dice, no hands.

[STYLE] [NEGATIVE]
```

---

### P12 — Hình phạt (PENALTY)

**Vai trò:** hài hước, cả bọn cười.
**Safe zone:** giữa.

```
A wide dirt yard in front of a thatched village house in late afternoon,
viewed straight on from a distance. Along the left and right edges of the
frame, small children are seated on the ground with their backs to the viewer,
seen from behind as dark simple silhouettes, shoulders shaking with laughter.
The wide middle of the yard is completely empty sunlit dirt. Long orange
shadows stretch across the ground. Playful and warm. No faces visible, no
detail on the children.

[STYLE] [NEGATIVE]
```

---

### P13 — Hết bi / bị loại (ELIMINATED)

**Vai trò:** tiếc nuối nhưng không bi thảm. Có nút "Xin vay bi".
**Safe zone:** giữa phải.

```
Late afternoon at the base of a large tree beside a dirt yard. An empty brown
cloth drawstring bag lies deflated on the ground at the bottom left, its
string loose, no marbles left. A single marble sits a little apart from it.
Long amber shadows fall across the packed earth. The right half and center of
the frame is calm empty ground and tree shade with no objects. Warm golden
hour, gentle, a little wistful, not sad. No people.

[STYLE] [NEGATIVE]
```

---

### P14 — Kết thúc trận / bảng vàng (MATCH END)

**Vai trò:** tổng kết, xếp hạng, nút chơi lại.
**Safe zone:** giữa.

```
A village at sunset seen from the edge of a dirt yard. A thatched-roof house
sits at the right of the frame with thin cooking smoke rising from behind it
into an orange and turmeric-yellow sky. Bamboo silhouettes on the left. The
entire middle of the frame is the open dirt yard, empty and evenly lit in
warm gold, with the long shadows of an unseen group falling across it. The
end of a good afternoon. Peaceful. No people in frame.

[STYLE] [NEGATIVE]
```

---

### P15 — Hướng dẫn chơi (TUTORIAL)

**Vai trò:** dạy luật trong 30–60 giây bằng animation.
**Safe zone:** giữa, dạng bảng.

```
A wall of dried earth and woven bamboo lath seen straight on, filling the
frame like a blackboard. In the far bottom corners, a few childish white
chalk scribbles: a small circle and a tally of four vertical strokes. The
whole central area of the wall is a clean even earthen surface with nothing
drawn on it, ready to be written on. Flat frontal light, no perspective
distortion, no shadows. No people, no hands.

[STYLE] [NEGATIVE]
```

---

### P16 — Mất kết nối / lỗi

**Vai trò:** rớt mạng, reload, phòng không tồn tại.
**Safe zone:** giữa.

```
Seen from underneath a thatched roof looking out at a dirt yard during a
sudden summer rainstorm. Strings of water drip from the straw eaves along the
top edge of the frame. The yard beyond is veiled in grey rain, muted and soft
and almost featureless, with puddles forming in the packed earth. A pair of
small sandals sits abandoned in the yard. The middle of the image is soft
uniform rain-grey with no detail. Cool, quiet, a pause. No people.

[STYLE] [NEGATIVE]
```

---

## 5. Prompt cho asset rời

Sinh trên nền trắng phẳng để tách nền dễ (Gemini không xuất PNG trong suốt — xem §7 để xử lý).

### A01 — Texture đất nện lặp được

```
A seamless tileable texture of dry packed ochre earth, flat top-down view,
even flat lighting with no shadows and no highlights, fine grain, a few
hairline cracks, tiny pebbles. Drawn in flat cel-shaded illustration with
subtle ink speckling, not photographic. The edges must tile seamlessly.
Single flat color field, no objects, no depth.
[STYLE] [NEGATIVE]
```

### A02 — Dải mái tranh (dùng làm header)

```
A horizontal strip of the underside edge of a thatched straw roof, seen
straight on from below, isolated on a plain white background. Individual
straw strands hang down at slightly uneven lengths making a ragged bottom
edge. Bound with thin bamboo strips along the top. Flat cel-shaded, straw
yellow and shaded amber, black ink outlines. Wide horizontal composition,
nothing else in the image.
[STYLE] [NEGATIVE]
```

### A03 — Mẹt tre (panel tròn)

```
A round woven bamboo winnowing tray seen perfectly straight from above,
isolated and centered on a plain white background. Visible over-under weave
pattern, a thicker rolled rim, worn pale straw color with an ink outline. The
inside surface is clean and empty. Perfectly circular, symmetrical, flat
lighting, no shadow, no perspective.
[STYLE] [NEGATIVE]
```

### A04 — Thẻ tre (mặt nút)

```
A rectangular flat slat of dried bamboo with rounded corners, seen straight
from above, isolated on a plain white background. Vertical grain lines, two
darker bamboo nodes, slightly worn edges, warm straw yellow with a thick
black ink outline. Empty surface, nothing written on it. Flat lighting, no
shadow, no perspective, wide horizontal shape.
[STYLE] [NEGATIVE]
```

### A05 — Vành nón lá (khung avatar)

```
A conical Vietnamese palm-leaf hat seen perfectly from directly above,
isolated on a plain white background. Concentric rings of stitched palm leaf
radiating from the center point, a bamboo rim. Pale straw color, black ink
outline, flat cel shading. Perfectly circular and symmetrical, no shadow.
[STYLE] [NEGATIVE]
```

### A06 — Túi bi (4 mức đầy)

```
Four small brown cloth drawstring pouches in a horizontal row on a plain
white background, drawn in identical style and identical size. From left to
right they get emptier: the first is round and full, the second slightly
slack, the third mostly flat, the fourth completely empty and crumpled with
its string loose. Coarse woven fabric, worn corners, black ink outline, flat
cel shading. Nothing else in the image.
[STYLE] [NEGATIVE]
```

### A07 — Xúc xắc gỗ, 6 mặt

```
A grid of six square wooden dice faces on a plain white background, arranged
in two rows of three, all the same size and drawn straight on. Each face is
jackfruit wood with visible grain and softly worn rounded corners, with a
symbol carved into it and filled with dark ink. Face one: three small
circles. Face two: six small circles. Face three: nine small circles. Face
four: a simple stick figure doing a push-up. Face five: a simple stick figure
squatting. Face six: a simple stick figure carrying another on its back. Flat
lighting, no shadows.
[STYLE] [NEGATIVE]
```

### A08 — Bi ve

```
Five glass marbles in a horizontal row on a plain white background, all the
same size, drawn straight on. Each is a clear glass sphere with a twisted
ribbon of color suspended inside: indigo, vermilion, turmeric yellow,
banana-leaf green, and one milky white. Each has one small crescent
highlight and a few faint surface scratches. Black ink outline, flat cel
shading, no reflections, no shadows.
[STYLE] [NEGATIVE]
```

### A09 — Nén hương (đồng hồ đếm ngược)

```
A single thin incense stick lying horizontally on a plain white background,
drawn straight on. The right end is unburnt pale brown wood, the middle is
the burning point with a small glowing ember, and the left end is grey ash
that has not yet fallen. A thin wisp of smoke rises from the ember. Black ink
outline, flat cel shading, very simple, nothing else in the image.
[STYLE] [NEGATIVE]
```

### A10 — Bộ icon hình phạt

```
Seven simple stick-figure pictograms in a horizontal row on a plain white
background, drawn as if scratched into wood with a knife: thick uneven dark
brown strokes, no fill color, no faces, maximum ten strokes each, all the
same size. In order: a figure doing a push-up; a figure squatting with hands
on hips; one figure carrying another on its back; a figure with an open mouth
and two music notes; a figure with a speech bubble; a single marble with a
diagonal line struck through it; a closed fist with a string tied around it.
[STYLE] [NEGATIVE]
```

---

## 6. Nếu bạn muốn box/button là ảnh thay vì CSS

File `tong-bi-ui-kit.html` đã dựng sẵn toàn bộ box/button bằng CSS + SVG, **không cần ảnh**. Ưu điểm: nhẹ, đổi màu theo đội được, sắc nét mọi độ phân giải, không tốn băng thông.

Chỉ sinh ảnh cho UI nếu bạn muốn độ chi tiết vật liệu cao hơn. Khi đó dùng kỹ thuật **9-slice**: sinh một ảnh khung rồi cắt thành 9 mảnh, 4 góc giữ nguyên, 4 cạnh và phần giữa kéo giãn.

```
A wide horizontal panel made of a sheet of handmade mulberry paper pinned onto
a bamboo lattice wall, seen perfectly straight on, isolated on plain white.
The paper is cream colored with visible fibers and slightly torn irregular
edges. A small split-bamboo pin holds each of the four corners. The paper
surface is completely blank. Flat frontal lighting, no shadow, no
perspective, generous even margins on all four sides so the image can be cut
into nine slices.
[STYLE] [NEGATIVE]
```

Yêu cầu khi cắt 9-slice: 4 góc phải giống hệt nhau về kích thước, phần giữa phải là màu phẳng để kéo giãn không lộ.

---

## 7. Xuất file & xử lý sau khi sinh

| Loại | Tỉ lệ | Kích thước sinh | Xuất cuối |
|---|---|---|---|
| Nền desktop | 16:9 | 1920×1080 | WebP q75, 1600×900, ~150KB |
| Nền mobile | 9:16 | 1080×1920 | WebP q75, 900×1600, ~140KB |
| Asset rời | 1:1 hoặc 4:1 | ≥1024px cạnh dài | PNG trong suốt |

**Các bước sau khi sinh:**

1. **Tách nền cho asset:** Gemini trả về nền trắng, không phải trong suốt. Dùng `rembg`, hoặc trong Photoshop/Photopea: Select → Color Range → chọn trắng → xóa. Sau đó co viền vào 1px để không còn rìa trắng.
2. **Xóa chữ lạc:** mô hình sinh ảnh hay tự thêm chữ nguệch ngoạc dù đã có negative prompt. Kiểm tra kỹ, đặc biệt ở P15 (vách đất) và A02 (mái tranh).
3. **Ép về đúng bảng màu:** tạo một LUT hoặc dùng `Selective Color` để kéo toàn bộ ảnh về 10 màu ở §3.1 của art direction. Bước này làm 16 ảnh khớp nhau hơn bất kỳ thủ thuật prompt nào.
4. **Làm phẳng vùng an toàn:** nếu vùng giữa vẫn có chi tiết, dùng blur nhẹ + giảm contrast riêng vùng đó trước khi xuất.
5. **Nén:** `cwebp -q 75 input.png -o output.webp`. Tổng 32 file nên ≤ 2.5MB.
6. **Kiểm tra thực tế:** mở ảnh trên điện thoại ngoài trời nắng. Nếu panel giấy dó không đọc được, làm tối vùng an toàn thêm 8%.

---

## 8. Ba lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| 16 ảnh trông khác họa sĩ | Sinh riêng lẻ, không dùng reference | Quay lại §0 bước 2, đính kèm ảnh chuẩn |
| Ảnh đẹp nhưng UI không đọc được | Bỏ mất câu vùng an toàn | Thêm lại, và tăng cường: `the center third must be completely empty` |
| Ra ảnh giống anime | Từ "cute", "kid", "cartoon" trong prompt kéo mô hình về anime | Bỏ các từ đó, giữ "1990s comic book", "flat cel-shaded", và giữ nguyên dòng `not anime` trong negative |

---

## 9. Bản quyền

Toàn bộ prompt trong file này mô tả **đặc điểm thị giác** (độ dày nét, màu bệt, bối cảnh làng Bắc Bộ, thập niên 90) chứ không nêu tên bất kỳ bộ truyện, nhân vật hay họa sĩ nào. Hãy giữ nguyên nguyên tắc đó khi bạn tự viết thêm prompt:

- ❌ `in the style of <tên bộ truyện>`
- ❌ `character looks like <tên nhân vật>`
- ✅ `1990s Vietnamese children's comic book illustration, even-weight ink outlines, flat cel color`

Ngoài lý do bản quyền, cách viết thứ hai còn cho kết quả ổn định hơn, vì mô hình bám vào thuộc tính cụ thể thay vì đoán một IP mà nó có thể chưa từng thấy.
