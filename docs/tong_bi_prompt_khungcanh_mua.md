# TỔNG BI — BỘ PROMPT KHUNG CẢNH: SÁNG · ĐÊM · BỐN MÙA

Đi kèm `tong_bi_artdirection_dangian.md` (§2 nhịp ánh sáng, §3 bảng màu, §17.4 skin bối
cảnh) và `tong_bi_prompt_nen_gemini.md` (16 nền theo trang). File này chỉ nói về **khung
cảnh quanh sân**: buổi sáng, đêm trăng, và bốn mùa.

---

## 0. Đọc cái này trước — cái gì đã có sẵn, cái gì cần sinh

Phần khung cảnh 3D **đã dựng xong bằng code**, không cần một file ảnh nào:

| Thành phần | Ở đâu |
|---|---|
| Bảng khí trời (màu trời, sương, nắng, đất, lá) của 8 tổ hợp buổi × mùa | `apps/web/src/three/troi.ts` |
| Cánh đồng, bờ ruộng, bụi tre, nhà tranh, bến nước, trăng sao, đom đóm, mưa xuân, hoa đào, cây nêu, xác pháo, mây trắng, lá rụng, cây trụi lá | `apps/web/src/three/Quanh.tsx` |
| Chọn buổi/mùa (tự động theo đồng hồ + chọn tay, lưu ở máy) | `apps/web/src/lib/khungCanh.ts`, `apps/web/src/ui/ChonKhungCanh.tsx` |
| Tông màu của các màn 2D theo buổi/mùa | `apps/web/src/styles.css`, khối `[data-buoi]` / `[data-mua]` |

Vậy bộ prompt dưới đây dùng cho **ba việc**, theo thứ tự đáng làm:

1. **Ảnh nền 2D cho từng buổi/mùa** (trang chủ, sảnh, phòng chờ). Đây là chỗ ảnh ăn tiền
   nhất: các màn đó hiện chỉ có gradient tông đất.
2. **Ảnh tham chiếu để tinh chỉnh cảnh 3D.** Sinh 8 ảnh "sân + khung cảnh" rồi so với
   cảnh thật trên máy, thấy lệch chỗ nào thì sửa số trong `troi.ts` / `Quanh.tsx`. Rẻ hơn
   nhiều so với ngồi đoán màu.
3. **Sprite trong suốt để nâng cấp cảnh 3D** (tuỳ chọn, §6). Bụi tre và rặng cây dựng
   bằng primitive thì hơi thô; thay bằng một tấm phẳng có texture trong suốt là đẹp hơn
   hẳn mà vẫn nhẹ. Cách gắn xem §7.3.

**Đừng** sinh ảnh cho vòng tròn vạch, nắm tay, con vật hay xúc xắc — những thứ đó là 3D
thật, người chơi xoay camera quanh chúng được, dán ảnh vào là vỡ ngay.

---

## 1. Cách sinh 8 khung cảnh mà vẫn như cùng một hoạ sĩ vẽ

Giống §0 của file prompt nền: **sinh một ảnh chuẩn trước, rồi đính kèm nó vào 7 prompt
còn lại.**

1. Sinh **`ha_sang`** (mùa hè ban ngày) trước. Đây là khung cảnh gốc của art direction,
   cũng là cái dễ ra đúng nhất. Sinh 6–8 biến thể, chọn một.
2. Ảnh đó thành **ảnh chuẩn**. Bảy prompt còn lại mở đầu bằng:
   > `Match the exact art style, line weight, color palette, lighting and paper texture of the attached reference image. Same illustrator, same series, same village seen at a different hour and season. New scene:`
3. Thứ tự sinh tiếp: `ha_toi` → `xuan_sang` → `xuan_toi` → `thu_sang` → `thu_toi` →
   `dong_sang` → `dong_toi`. Đi từ mùa hè ra hai đầu để phong cách trôi từ từ, không
   nhảy thẳng từ hè sang đông.
4. Mỗi lần sinh lại chỉ đổi **một** câu. Ảnh sai bố cục thì sửa câu bố cục, **không** sửa
   khối STYLE.
5. Sinh 16:9 trước, rồi lấy chính ảnh 16:9 làm reference để sinh 9:16. Đừng crop.

---

## 2. Khối STYLE — dán vào **mọi** prompt

```
STYLE: 1990s Vietnamese children's comic book illustration. Clean confident
black ink outlines of even medium weight, flat cel-shaded color with no
gradients, exactly one darker shadow tone per object. Subtle rice-paper grain
over the whole image. Setting is a northern Vietnamese village in the
mid-1990s: a packed-earth yard in front of a thatched-roof house, bamboo
clumps at the edge of the village, rice fields beyond. Warm, nostalgic,
hand-drawn. Not photorealistic, not 3D, not anime, not painterly.
```

## 3. Khối NEGATIVE — dán vào **mọi** prompt

```
NEGATIVE: text, letters, words, captions, numbers, watermark, signature, logo,
photorealistic, 3D render, CGI, anime, manga, big sparkly eyes, glossy
highlights, lens flare, neon glow, bloom, snow, ice, frost, autumn maple
forest, modern buildings, cars, motorbikes, power lines, antennas, plastic
objects, smartphones, cluttered center, busy composition, harsh black
shadows, decorative frame, border, vignette, close-up human faces, characters
looking at the viewer, adult hands.
```

> `snow, ice, frost` nằm trong negative vì mùa đông ở đây là **rét Bắc Bộ**: trời xám,
> cây trụi lá, đất nứt nẻ — **không có tuyết**. Mô hình sinh ảnh thấy chữ "winter" là
> đổ tuyết xuống, nên phải chặn thẳng.
> `autumn maple forest` cũng vậy: mùa thu Bắc Bộ là trời cao và lá bàng lá sấu rụng
> lác đác, không phải rừng phong đỏ rực kiểu Nhật/Canada.

## 4. Khối PALETTE — lấy đúng từ `troi.ts`, dán theo mùa

Đây là thứ làm ảnh khớp với cảnh 3D hơn bất kỳ thủ thuật prompt nào. Chọn **một** khối
theo mùa rồi cộng thêm khối buổi nếu là đêm.

**Mùa xuân** (mưa xuân, đất nồm)
```
PALETTE: damp packed earth #A9743A, wet sunlit earth #C99A5E, dark wet earth
#6B4520, hazy grey-warm overcast sky #A99A7E, fresh young leaf green #5E8F3E,
peach blossom pink #EDA9B6, firecracker red #C4322A, straw thatch #E7C170,
mulberry paper cream #F2E5C4, ink brown-black #2A211B.
```

**Mùa hè** (nắng gắt — khung cảnh gốc)
```
PALETTE: packed ochre earth #B9803F, sunlit earth #D9A768, shaded earth
#7A4F26, dusty warm ochre sky #C08A48, banana-leaf green #4C7A38, white cloud
cream #F6F1E4, straw thatch #E7C170, turmeric yellow #E8A72E, indigo #1F3F63,
vermilion #C4322A, ink brown-black #2A211B.
```

**Mùa thu** (trời cao, hanh khô)
```
PALETTE: dry earth #B98A46, pale dry earth #D9B071, shaded earth #7A5426,
high clear pale blue sky #A6B9BC, faded olive leaf #8A7A2E, ripe rice gold
#E8A72E, fallen leaf red #C4322A, straw thatch #E7C170, mulberry paper cream
#F2E5C4, ink brown-black #2A211B.
```

**Mùa đông** (rét, cây trụi lá)
```
PALETTE: bleached grey-brown earth #A9885F, pale cold earth #C3A67E, shaded
earth #6E5A3C, flat cold grey sky #A6A79C, dull olive-grey leaf #6F7A46, bare
branch brown #6E5A3C, straw thatch #C9A85E, mulberry paper cream #F2E5C4, ink
brown-black #2A211B. Very low saturation overall.
```

**Cộng thêm nếu là ĐÊM** (dán sau khối mùa)
```
NIGHT: the whole image is lit only by a low full moon. Deep indigo night air
#1F3F63, moonlight highlight #AEC6EE, moonlit earth desaturated toward
indigo, pond water almost black indigo, moon and its halo are the only bright
things in the frame, everything else reads as flat silhouette with one dim
lit edge. No lamps, no fire, no windows lit, no artificial light of any kind.
Still a flat cel-shaded ink illustration, not a photograph.
```

---

## 5. Tám prompt khung cảnh (buổi × mùa)

**Vùng an toàn (bắt buộc, đã có trong mọi prompt — đừng xoá):** UI đè lên giữa khung, nên
20–75% chiều cao phải là nền phẳng, sáng đều, không vật nào cắt ngang.

### `xuan_sang` — Sáng mùa xuân: mưa xuân, hoa đào, cây nêu, xác pháo

```
A packed-earth village yard in early spring, seen from about knee height with
the camera tilted down thirty degrees. Fine drizzle hangs in the air, so
everything is slightly veiled and the earth is dark and damp. At the left edge
a peach tree in bloom leans into frame, its bare dark branches carrying
clusters of pink blossom; a few petals lie on the wet ground. At the right
edge a very tall bamboo pole stands upright as a Tet ceremonial pole, a small
woven basket and a red pennant at its top, a spent string of firecrackers
hanging down its trunk. Scattered pink-red firecracker paper scraps lie on the
earth near it. Bamboo clumps and young green rice fields fill the far
background. The whole middle of the image is open flat damp earth, evenly lit,
with nothing in it. Overcast, soft, no hard shadows, quietly festive.

[STYLE] [PALETTE mùa xuân] [NEGATIVE]
```

### `xuan_toi` — Đêm mùa xuân: mưa bụi dưới trăng

```
The same village yard at night in early spring under a low full moon. Fine
drizzle drifts through the moonlight. The peach tree at the left edge is a
dark silhouette with its blossom clusters catching a faint pale rim of
moonlight. The Tet bamboo pole at the right edge is a tall thin silhouette
against the night sky. Wet earth reflects the moon as dull flat patches. The
whole middle of the image is open dark wet earth, evenly toned, nothing in it.
Quiet, cold-damp, held breath.

[STYLE] [PALETTE mùa xuân] [NIGHT] [NEGATIVE]
```

### `ha_sang` — Sáng mùa hè: nắng gắt, cánh đồng, bụi tre đầu làng ⭐ SINH TRƯỚC

```
A packed-earth village yard at midday in high summer, seen from about knee
height with the camera tilted down thirty degrees. Harsh bright sun, very
short hard shadows, dust hanging in the light. Along the far edge of the yard
runs a bank of earth, and beyond it flat green rice fields stretch away. Two
tall bamboo clumps stand at the far left and far right, their culms straight
and their leaf masses heavy at the top. A thatched-roof house with woven
bamboo walls sits in the far middle distance, its dark doorway open. A few
small white clouds sit low in a pale sky just above the fields. The whole
middle of the image is open flat sunlit earth, evenly lit, with nothing in it.
Hot, dry, cicada-loud.

[STYLE] [PALETTE mùa hè] [NEGATIVE]
```

### `ha_toi` — Đêm mùa hè: trăng sáng, bến nước, đom đóm

```
The same village yard at night in high summer under a low bright full moon
hanging just above the bamboo tops. To one side, past the yard, a village
pond: stone steps going down into almost-black water, a plank jetty, and the
moon laid across the water as a broken pale streak. Fireflies drift in the
dark air outside the yard as tiny warm points of light. The bamboo clumps are
silhouettes with one moonlit edge; a light breeze bends their tops. The whole
middle of the image is open dark earth, evenly toned, nothing in it. Warm
night, crickets, very still.

[STYLE] [PALETTE mùa hè] [NIGHT] [NEGATIVE]
```

### `thu_sang` — Sáng mùa thu: trời xanh và cao, lá rụng

```
A packed-earth village yard on a clear autumn morning, seen from about knee
height with the camera tilted down thirty degrees. The sky is unusually high
and pale blue with a few very thin wisps of cloud far up. Beyond the yard the
rice fields have gone gold and are ready to cut. Bamboo clumps at the far left
and right have faded olive leaves. A scattering of dry fallen leaves — red,
turmeric yellow, olive — lies on the earth around the edges of the frame, and
three or four leaves are still tumbling through the air near the edges. The
whole middle of the image is open flat earth, evenly lit, with nothing in it.
Dry air, clean light, a little wistful.

[STYLE] [PALETTE mùa thu] [NEGATIVE]
```

### `thu_toi` — Đêm mùa thu: trăng rất trong, lá bay

```
The same village yard on a clear autumn night under a low full moon in a very
clean deep indigo sky with visible stars. The golden fields beyond read as a
dull pale band in the moonlight. A few dry leaves tumble through the air at
the edges of the frame, catching a thin pale edge of moonlight. The bamboo
clumps are flat silhouettes. The whole middle of the image is open dark earth,
evenly toned, nothing in it. Cold, clear, very quiet.

[STYLE] [PALETTE mùa thu] [NIGHT] [NEGATIVE]
```

### `dong_sang` — Sáng mùa đông: rét, cây trụi lá, đồng đã gặt

```
A packed-earth village yard on a cold overcast winter day in northern Vietnam,
seen from about knee height with the camera tilted down thirty degrees. No
snow and no frost anywhere. The light is flat and grey and casts almost no
shadow. Two bare trees stand at the far edges of the yard, only trunks and dry
branches, not a single leaf. The fields beyond have been harvested and are
just pale stubble and bare mud. The bamboo clumps have thinned out and gone
yellow. A low cold mist lies along the ground at the far edge of the yard. The
earth is bleached and cracked. The whole middle of the image is open flat pale
earth, evenly lit, with nothing in it. Grey, still, cold.

[STYLE] [PALETTE mùa đông] [NEGATIVE]
```

### `dong_toi` — Đêm mùa đông: rét cắt, trăng lạnh

```
The same village yard on a cold winter night, no snow and no frost, under a
low pale full moon in a grey-indigo sky. The bare trees at the edges are stark
black silhouettes of trunk and branches. Cold mist lies low across the
harvested fields beyond and softens everything above knee height. The earth is
a flat cold grey. The whole middle of the image is open dark earth, evenly
toned, nothing in it. Bitterly cold, empty, silent.

[STYLE] [PALETTE mùa đông] [NIGHT] [NEGATIVE]
```

---

## 6. Sprite trong suốt cho cảnh 3D (tuỳ chọn)

Sinh trên nền trắng phẳng rồi tách nền (Gemini không xuất PNG trong suốt — xem §7.2).
Mỗi sprite là **một tấm phẳng đứng trong cảnh 3D**, nên bố cục phải chính diện, chân
sprite phải nằm sát đáy ảnh, không có bóng đổ vẽ sẵn (bóng do cảnh tự đổ).

### S01 — Bụi tre, ba mùa trên một sheet

```
Three clumps of Vietnamese bamboo in a horizontal row on a plain white
background, drawn straight on from ground level, all the same height, each
clump about six straight culms growing from one base with heavy drooping leaf
masses near the top. Left clump: full deep green leaves, summer. Middle clump:
thinner faded olive leaves, autumn. Right clump: sparse yellowed leaves,
winter. The base of every clump sits exactly on the bottom edge of the image.
Flat cel shading, even black ink outlines, no cast shadow, no ground, no
horizon, nothing else in the image.
[STYLE] [NEGATIVE]
```

### S02 — Nhà mái tranh, chính diện

```
A single-storey northern Vietnamese village house seen straight on from the
yard, isolated on a plain white background. Thatched straw roof with a ragged
eave, woven bamboo and dried-earth walls, one open dark doorway, two thin
bamboo veranda posts. The base of the walls sits on the bottom edge of the
image. Flat cel shading, even black ink outlines, no cast shadow, no ground,
no sky, nothing else in the image.
[STYLE] [PALETTE mùa hè] [NEGATIVE]
```

### S03 — Cây nêu và dây pháo

```
A tall thin bamboo Tet ceremonial pole standing upright, isolated on a plain
white background, seen straight on. A tuft of leaves left at the very top, a
small round woven bamboo basket hanging just below it, a small red cloth
pennant beside it, and a string of red firecrackers hanging down along the
trunk. The base of the pole sits on the bottom edge of the image. Very tall
narrow composition. Flat cel shading, black ink outlines, no shadow, nothing
else in the image.
[STYLE] [PALETTE mùa xuân] [NEGATIVE]
```

### S04 — Cây đào nở hoa

```
A small blossoming peach tree, isolated on a plain white background, seen
straight on. A short crooked dark trunk, bare angular branches, and dense
clusters of pink five-petal blossom, no leaves at all. A few loose petals
falling near the branches. The base of the trunk sits on the bottom edge of
the image. Flat cel shading, black ink outlines, no shadow, no ground,
nothing else in the image.
[STYLE] [PALETTE mùa xuân] [NEGATIVE]
```

### S05 — Cây trụi lá mùa đông

```
Two bare winter trees in a horizontal row on a plain white background, seen
straight on, no leaves at all, only trunk and dry angular branches and thin
twigs. Grey-brown bark with a darker shaded side. No snow, no frost. The base
of each trunk sits on the bottom edge of the image. Flat cel shading, black
ink outlines, no shadow, no ground, nothing else in the image.
[STYLE] [PALETTE mùa đông] [NEGATIVE]
```

### S06 — Bến nước

```
A village pond bank seen straight on from the yard, isolated on a plain white
background: three worn stone steps going down, a short plank jetty over the
water, a large earthenware water jar beside the steps, and a strip of
almost-black still water along the bottom. Flat cel shading, black ink
outlines, no cast shadow, no sky, nothing else in the image.
[STYLE] [PALETTE mùa hè] [NIGHT] [NEGATIVE]
```

### S07 — Mây trắng, bốn đám rời

```
Four separate flat cel-shaded white cumulus clouds in a horizontal row on a
plain white background, each a different simple silhouette, each outlined in
black ink with exactly one pale grey shadow tone underneath. Rounded lumpy
shapes, no wisps, no gradients, no sky behind them, nothing else in the image.
[STYLE] [NEGATIVE]
```

### S08 — Lá rụng, một sheet mười chiếc

```
Ten dry fallen leaves scattered across a plain white background, not
overlapping, each seen flat from above, each a simple broad leaf shape with a
single central vein drawn in ink. Colors across the ten: turmeric yellow,
faded olive, rust red, pale brown. Flat cel shading, black ink outlines, no
shadow, nothing else in the image.
[STYLE] [PALETTE mùa thu] [NEGATIVE]
```

### S09 — Mặt trăng và quầng

```
A full moon isolated and centered on a plain white background: a flat pale
cream disc with a few faint darker patches inside it, outlined in thin ink,
surrounded by one soft concentric pale halo ring. Perfectly circular,
symmetrical, no stars, no clouds, no sky, nothing else in the image.
[STYLE] [NEGATIVE]
```

### S10 — Dải cánh đồng lặp được ngang

```
A horizontal strip of flat Vietnamese paddy field seen from the side at
ground level, isolated on a plain white background, drawn so that the left and
right edges tile seamlessly. Rows of low rice tufts of even height along an
earth bank. Four versions stacked vertically in the same image, same
composition, only the color changing: young green spring rice, deep green
summer rice, gold ripe autumn rice, and grey harvested winter stubble. Flat
cel shading, black ink outlines, no shadow, no sky.
[STYLE] [NEGATIVE]
```

---

## 7. Xuất file & gắn vào code

### 7.1. Tên file và kích thước

| Loại | Tỉ lệ | Sinh ở | Xuất | Đặt tại |
|---|---|---|---|---|
| Nền khung cảnh, desktop | 16:9 | 1920×1080 | WebP q75, 1600×900, ~150KB | `apps/web/public/nen/<mã>_16x9.webp` |
| Nền khung cảnh, mobile | 9:16 | 1080×1920 | WebP q75, 900×1600, ~140KB | `apps/web/public/nen/<mã>_9x16.webp` |
| Sprite | tuỳ | ≥1024px cạnh dài | PNG trong suốt, ≤512px | `apps/web/public/sprite/<mã>.png` |

Mã nền là đúng tám cái ở §5: `xuan_sang`, `xuan_toi`, `ha_sang`, `ha_toi`, `thu_sang`,
`thu_toi`, `dong_sang`, `dong_toi` — trùng với giá trị `data-mua` + `data-buoi` trong
code, nên CSS viết ra rất gọn (§7.2).

**Tổng 16 file nền nên ≤ 2,4MB.** Nếu vượt: bỏ bản 9:16 của bốn cảnh đêm, dùng chung bản
16:9 (cảnh đêm gần như không có chi tiết ở rìa nên crop không hỏng bố cục).

### 7.2. Gắn nền vào các màn 2D

Ba màn 2D (`man-p01` trang chủ, `man-p02` sảnh, `man-p03` phòng chờ) đã có sẵn class
`nen-page an-toan`. Sau khi tách nền và ép bảng màu, thêm vào cuối `styles.css`:

```css
@media (min-aspect-ratio: 1/1) {
  [data-buoi='sang'][data-mua='xuan'] .nen-page { background-image: url('/nen/xuan_sang_16x9.webp'); }
  [data-buoi='sang'][data-mua='ha']   .nen-page { background-image: url('/nen/ha_sang_16x9.webp'); }
  [data-buoi='sang'][data-mua='thu']  .nen-page { background-image: url('/nen/thu_sang_16x9.webp'); }
  [data-buoi='sang'][data-mua='dong'] .nen-page { background-image: url('/nen/dong_sang_16x9.webp'); }
  [data-buoi='toi'][data-mua='xuan']  .nen-page { background-image: url('/nen/xuan_toi_16x9.webp'); }
  [data-buoi='toi'][data-mua='ha']    .nen-page { background-image: url('/nen/ha_toi_16x9.webp'); }
  [data-buoi='toi'][data-mua='thu']   .nen-page { background-image: url('/nen/thu_toi_16x9.webp'); }
  [data-buoi='toi'][data-mua='dong']  .nen-page { background-image: url('/nen/dong_toi_16x9.webp'); }
}
```

Bản dọc lặp lại đúng khối trên trong `@media (max-aspect-ratio: 1/1)` với hậu tố `_9x16`.

**Chỉ tải ảnh của khung cảnh đang chọn** — trình duyệt không tải `background-image` của
selector không khớp, nên 16 dòng CSS này vẫn chỉ tốn một file mỗi lượt chơi. Đừng
preload cả bộ.

### 7.3. Nếu muốn thay bụi tre / rặng cây 3D bằng sprite

`Quanh.tsx` dựng bụi tre bằng primitive (`BuiTre`). Muốn thay bằng tấm phẳng có texture
thì giữ nguyên vị trí và phần lay gió, chỉ đổi phần con:

```tsx
const anh = useTexture('/sprite/bui_tre.png');
// ...
<mesh position={[0, cao / 2, 0]}>
  <planeGeometry args={[cao * 0.9, cao]} />
  <meshToonMaterial
    map={anh}
    gradientMap={toonGradient()}
    transparent
    alphaTest={0.5}   // cắt thẳng, không blend — giữ được nét mực và không hỏng depth
    side={DoubleSide}
  />
</mesh>
```

Ba điều bắt buộc nếu đi đường này:

1. **`alphaTest` chứ không phải `transparent` một mình.** Sprite blend alpha sẽ vẽ sai
   thứ tự với nhau khi người chơi xoay sân.
2. **Sprite phải quay theo camera quanh trục Y**, nếu không xoay sân một vòng là thấy nó
   dẹt như tờ giấy. Xoay trong `useFrame`: `g.current.rotation.y = -camera.rotation.y`
   (chỉ trục Y — nghiêng theo cả camera thì cây sẽ ngả theo, trông rất sai).
3. **Vẫn phải giữ luật 1 của `Quanh.tsx`**: không vật đứng nào trong lòng vòng người.
   Test `apps/web/test/khungCanh.test.tsx` kiểm đúng luật đó và sẽ đỏ nếu vi phạm.

Đổi màu theo mùa thì không dùng được `theoKhi()` nữa (texture đã có màu sẵn) — cách rẻ là
để `color` của material làm tint: `color={khi.la.chinh}` với sprite vẽ bằng xám trung
tính. Vì thế S01 nên sinh **thêm** một bản xám nếu định tint theo mùa.

---

## 8. Kiểm lại trước khi coi là xong

- [ ] Tám ảnh nền xếp cạnh nhau trông như **một** hoạ sĩ vẽ cùng một cái làng ở tám thời
      điểm, không phải tám cái làng khác nhau.
- [ ] Mùa đông **không có tuyết**, không có sương muối trắng.
- [ ] Bốn cảnh đêm **không có đèn**, không có bếp lửa, không có cửa sổ sáng — chỉ có
      trăng. Có một đốm đèn là mất hẳn cái đêm quê.
- [ ] Vùng 20–75% chiều cao của mọi ảnh vẫn đọc được chữ khi đặt panel giấy dó lên.
      Kiểm bằng cách mở ảnh trên điện thoại **ngoài trời nắng**.
- [ ] Bảng màu của ảnh khớp `troi.ts`. Chưa khớp thì đừng sửa `troi.ts` theo ảnh trước —
      ép ảnh về bảng màu bằng `Selective Color` / LUT, vì `troi.ts` còn phải nuôi cảnh 3D
      và cả tông giao diện 2D.
- [ ] Tổng dung lượng thêm vào ≤ 2,4MB. 30 người trong một phòng, phần lớn dùng 4G.

## 9. Ba lỗi hay gặp riêng ở bộ này

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Mùa đông ra tuyết trắng xoá | Từ "winter" kéo mô hình về mùa đông ôn đới | Giữ nguyên `snow, ice, frost` trong NEGATIVE và thêm hẳn câu `no snow and no frost anywhere` vào phần mô tả cảnh |
| Cảnh đêm sáng như ban ngày lọc xanh | Mô hình hiểu "night" là "ảnh ban ngày tông xanh" | Nhấn `lit only by a low full moon` và `everything else reads as flat silhouette`; nếu vẫn sáng thì đặt khối NIGHT lên **đầu** prompt |
| Mùa thu ra rừng phong đỏ rực | "autumn" mặc định kéo về phong Nhật/Canada | Giữ `autumn maple forest` trong NEGATIVE, và mô tả lá rụng là `a scattering of dry fallen leaves`, không phải `autumn foliage` |

---

## 10. Bản quyền

Giữ đúng nguyên tắc của §9 file prompt nền: mô tả **đặc điểm thị giác** (độ dày nét, màu
bệt, làng Bắc Bộ thập niên 90, rét không tuyết), **không** nêu tên bộ truyện, nhân vật
hay hoạ sĩ nào. Cách viết đó vừa an toàn vừa cho kết quả ổn định hơn, vì mô hình bám vào
thuộc tính cụ thể thay vì đoán một IP.
