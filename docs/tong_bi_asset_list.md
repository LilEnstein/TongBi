# TỔNG BI — DANH SÁCH ẢNH CẦN TRÍCH & QUY TRÌNH TẠO TỪ ĐẦU

Đi kèm `tong_bi_prompt_nen_gemini.md` (prompt) và `tong_bi_artdirection_dangian.md` (art direction).

File này trả lời đúng 3 câu:
1. Mỗi prompt sinh ra **bao nhiêu file ảnh cuối**, tên gì, đặt ở đâu.
2. Bộ prompt mới cho **10 avatar** thay 10 emoji con vật.
3. Làm từ đầu như thế nào — từ lúc mở Gemini đến lúc `npm run dev` thấy ảnh.

---

## 0. Tóm tắt số lượng

| Nhóm | Prompt | File ảnh cuối | Ưu tiên |
|---|---|---|---|
| Avatar (thay emoji) | 1 sheet + 10 prompt sửa lẻ | **10** | ⭐ Làm trước |
| Nền màn hình | 16 | **32** (16:9 + 9:16) | Làm 3 trang trước |
| Asset rời | 10 | **28** (nhiều prompt sinh 1 sheet, phải cắt) | Chọn lọc |
| 9-slice panel | 1 | 1 (hoặc **0** — UI kit CSS đã đủ) | Bỏ qua |

**Tổng tối đa: 71 file.** Nhưng MVP chỉ thật sự cần **20 file** — xem §4 "Gói tối thiểu".

Điểm dễ nhầm nhất: các prompt ở §5 file prompt sinh ra **một tấm sheet nhiều vật**, không phải một file. Bạn phải **cắt sheet ra thành từng ảnh rời**. Cột "File cuối" ở §3 chính là danh sách phải cắt.

---

## 1. Avatar — 10 ảnh thay 10 emoji con vật

### 1.1. Vì sao đổi luôn cả danh sách con vật

Bộ emoji hiện tại là `🐯 🐼 🦊 🐸 🐵 🐧 🦁 🐨 🐰 🐮`. Gấu trúc, cáo, chim cánh cụt, koala, sư tử **không thuộc sân đất Bắc Bộ** — vẽ chúng theo lối tranh dân gian sẽ ra một thứ nửa vời. Đổi sang 10 con vật vốn có trong tranh dân gian Việt Nam thì prompt bám được vào một truyền thống tạo hình có thật, kết quả ổn định hơn hẳn.

Tranh Đông Hồ / Hàng Trống là **di sản dân gian, không thuộc sở hữu của ai** — mô tả đặc điểm tạo hình của dòng tranh này là hợp lệ theo §19 art direction. Vẫn giữ nguyên tắc: không nêu tên nghệ nhân, không sao chép nguyên một bức tranh cụ thể.

Nếu bạn muốn giữ đúng 10 con cũ, chỉ cần đổi danh sách con vật trong prompt §1.3 — phần còn lại của quy trình không đổi.

### 1.2. Bảng 10 avatar

| # | id (giá trị lưu trong state) | Con vật | File cuối |
|---|---|---|---|
| 1 | `trau` | Trâu, sừng cong | `mat_trau.webp` |
| 2 | `ga` | Gà trống, mào cao | `mat_ga.webp` |
| 3 | `lon` | Lợn, có xoáy âm dương trên má | `mat_lon.webp` |
| 4 | `meo` | Mèo | `mat_meo.webp` |
| 5 | `chuot` | Chuột, tai tròn to | `mat_chuot.webp` |
| 6 | `coc` | Cóc | `mat_coc.webp` |
| 7 | `ca` | Cá chép | `mat_ca.webp` |
| 8 | `vit` | Vịt | `mat_vit.webp` |
| 9 | `chim` | Chim chào mào | `mat_chim.webp` |
| 10 | `ho` | Hổ | `mat_ho.webp` |

**Bộ thứ hai** (sheet `image/mat_sheet2_sach.png` — bản gốc Gemini đã xoá watermark ngôi sao
trên cổ con chó), cắt bằng:

```bash
python tools/cat_mat.py image/mat_sheet2_sach.png rong,ran,nguaxanh,ngua,sonduong,de,khi,khido,vittroi,cho
```

| # | id | Con vật | File cuối |
|---|---|---|---|
| 11 | `rong` | Rồng xanh, sừng vàng | `mat_rong.webp` |
| 12 | `ran` | Rắn xanh, bụng kem | `mat_ran.webp` |
| 13 | `nguaxanh` | Ngựa xanh, bờm vàng | `mat_nguaxanh.webp` |
| 14 | `ngua` | Ngựa hồng (nâu đỏ) | `mat_ngua.webp` |
| 15 | `sonduong` | Sơn dương đỏ, sừng cong | `mat_sonduong.webp` |
| 16 | `de` | Dê trắng, có râu | `mat_de.webp` |
| 17 | `khi` | Khỉ vàng | `mat_khi.webp` |
| 18 | `khido` | Khỉ đỏ | `mat_khido.webp` |
| 19 | `vittroi` | Vịt trời đầu xanh | `mat_vittroi.webp` |
| 20 | `cho` | Chó | `mat_cho.webp` |

Id chỉ gồm chữ thường không dấu, không gạch dưới — `Non` dựa vào đó để tách id với emoji
của hồ sơ cũ. Thêm con mới thì phải sửa cả ba file: `AVATARS` + `AVATAR_TEN` (game-rules `defaults.ts`),
`CAU_HINH` (`ConVat.tsx`) và `LONG` (`toon.ts`); test `scene.test.tsx` bắt nếu thiếu.

Đặt tại: `apps/web/public/mat/`
Kích thước: **256×256 px**, WebP **có alpha** (nền trong suốt), mỗi file ≤ 12KB.

### 1.3. Prompt sheet — sinh 1 lần ra cả 10 con

Đây là cách duy nhất để 10 avatar trông cùng một bộ. Đừng sinh rời từng con.

```
A single sheet showing ten animal head portraits arranged in a grid of two
rows of five, on a plain flat white background. Each head is centered in its
own invisible square cell, all ten heads drawn at exactly the same size and
the same three-quarter front angle, looking slightly toward the viewer, each
with a calm closed-mouth expression. Each head must occupy the same amount of
space within its cell.

Top row from left to right: a water buffalo with wide curved horns; a rooster
with a tall red comb; a pig with a round snout and a spiral swirl marking on
its cheek; a cat with pointed ears; a mouse with large round ears.
Bottom row from left to right: a toad with a wide flat head; a carp fish with
large scales and two barbels; a duck with a broad flat bill; a small crested
songbird; a tiger with bold stripes across its forehead.

Every head is drawn as Vietnamese folk woodblock print art: thick even black
outlines, flat unshaded areas of color, simple decorative curl and spiral
patterns inside the body shapes instead of realistic fur or feather texture,
no gradients, no highlights. Colors limited to indigo, vermilion, turmeric
yellow, banana-leaf green, warm ochre and cream. Head and neck only, cut off
at the shoulders. Wide even spacing between cells, generous margin around the
whole grid.

NEGATIVE: text, letters, words, numbers, watermark, signature, logo, frames,
borders, boxes or circles drawn around the heads, background scenery, shadows,
photorealistic, 3D render, CGI, anime, manga, big sparkly eyes, glossy
highlights, neon glow, cute mascot style, angry or scary expressions, human
faces, bodies, hands, overlapping heads, different sizes between heads.
```

> **Lưu ý:** prompt này **cố ý bỏ** `close-up faces` và `characters looking at the viewer` khỏi khối NEGATIVE gốc — khối đó viết cho ảnh nền. Avatar thì bắt buộc phải nhìn thẳng. Đừng dán khối NEGATIVE gốc vào đây.

### 1.4. Prompt sửa lẻ từng con

Sinh sheet xong thường có 1–3 con hỏng. **Đừng sinh lại cả sheet.** Đính kèm chính cái sheet vừa chọn làm ảnh tham chiếu rồi hỏi lại một con:

```
Match the exact art style, line weight, color palette and head size of the
animal heads in the attached reference sheet. Same series, same illustrator.
Redraw only the <TÊN CON VẬT> head, alone and centered on a plain flat white
background, same three-quarter angle, same head size, calm closed-mouth
expression, head and neck only.

[dán khối NEGATIVE ở §1.3]
```

Thay `<TÊN CON VẬT>` bằng: `water buffalo` · `rooster` · `pig` · `cat` · `mouse` · `toad` · `carp fish` · `duck` · `crested songbird` · `tiger`.

### 1.5. Trích ra từ sheet

Sheet 1 tấm → **10 file**. Cắt theo lưới 2×5, mỗi ô vuông đều nhau, con vật nằm giữa ô, chừa lề trong khoảng 8%.

Vành nón lá (`.non` trong CSS) đã là một hình tròn viền mực rồi, nên avatar **không cần khung tròn riêng** — cắt vuông, để nền trong suốt, CSS bo tròn hộ.

---

## 2. Nền màn hình — 16 prompt → 32 file

Mỗi prompt ở §4 file prompt sinh **2 file**: một bản ngang, một bản dọc. Bản dọc phải **sinh lại** bằng chính bản ngang làm reference, **không được crop** (§0.4 file prompt).

| Mã | Tên file (thêm hậu tố `_16x9` / `_9x16`) | Màn hình dùng | Đã có chỗ gắn trong code? |
|---|---|---|---|
| P01 | `p01_landing` | Trang chủ | ✅ `.man-p01` |
| P02 | `p02_lobby` | Sảnh / nhập tên | ✅ `.man-p02` |
| P03 | `p03_waiting` | Phòng chờ | ✅ `.man-p03` |
| P04 | `p04_settings` | Cấu hình phòng | ❌ chưa |
| P05 | `p05_round_start` | ROUND_START ⭐ sinh trước | ❌ chưa |
| P06 | `p06_select` | Chọn bi | ❌ chưa |
| P07 | `p07_close_hand` | Nắm tay | ❌ chưa |
| P08 | `p08_guess` | Đoán tổng | ❌ chưa |
| P09 | `p09_reveal` | Mở tay | ❌ chưa |
| P10 | `p10_result` | Kết quả lượt | ❌ chưa |
| P11 | `p11_dice` | Xúc xắc | ❌ chưa |
| P12 | `p12_penalty` | Hình phạt | ❌ chưa |
| P13 | `p13_eliminated` | Hết bi | ❌ chưa |
| P14 | `p14_match_end` | Bảng vàng | ❌ chưa |
| P15 | `p15_tutorial` | Hướng dẫn | ❌ chưa |
| P16 | `p16_disconnect` | Mất kết nối | ❌ chưa |

Đặt tại `apps/web/public/nen/`. Ví dụ: `apps/web/public/nen/p05_round_start_9x16.webp`.

**Về P04–P14:** các phase trong trận đang render cảnh 3D che gần hết màn hình (`<div className="canh">` trong `apps/web/src/screens/RoomScreen.tsx:290`), chưa có slot ảnh nền. Muốn dùng nền cho các phase này thì cảnh 3D phải chuyển sang nền trong suốt rồi đặt ảnh phía sau — việc code riêng, không phải việc của art. Vì thế P04–P14 **chưa đáng sinh vội**.

---

## 3. Asset rời — 10 prompt → 28 file

Cột **"Số file phải cắt"** là phần phải **trích ra khỏi ảnh Gemini trả về**. Đây là chỗ hay bị bỏ sót nhất.

| Mã | Prompt sinh ra | Số file phải cắt | Tên file cuối | Có thật sự cần? |
|---|---|---|---|---|
| A01 | 1 texture liền | **1** | `tex_dat.webp` (1024², tileable) | ⚠️ CSS đã có `feTurbulence`; chỉ làm nếu muốn hạt đất đẹp hơn |
| A02 | 1 dải mái tranh | **1** | `tex_mai_tranh.png` (2048×256, alpha) | ✅ Nên — mái tranh hiện là gradient CSS |
| A03 | 1 mẹt tròn | **1** | `ui_met.png` | ❌ `.met` CSS đã dựng xong |
| A04 | 1 thẻ tre | **1** | `ui_the_tre.png` | ❌ `.the-tre` CSS đã dựng xong |
| A05 | 1 nón lá | **1** | `ui_non_la.png` | ❌ `.non` CSS đã dựng xong |
| A06 | **1 sheet 4 túi** | **4** | `tui_0.png` `tui_1.png` `tui_2.png` `tui_3.png` | ⚠️ `TuiBi` đang là CSS |
| A07 | **1 sheet 6 mặt** | **6** | `xx_1.png` … `xx_6.png` | ✅ Làm texture 6 mặt cho model xúc xắc 3D |
| A08 | **1 sheet 5 viên bi** | **5** | `bi_cham.png` `bi_dieu.png` `bi_nghe.png` `bi_la.png` `bi_sua.png` | ✅ Làm texture bi |
| A09 | 1 nén hương | **1** | `ui_nen_huong.png` | ❌ `.nen-huong` CSS đã có |
| A10 | **1 sheet 7 icon** | **7** | `phat_hitdat.png` `phat_thutxidau.png` `phat_cong.png` `phat_hat.png` `phat_kechuyen.png` `phat_trubi.png` `phat_matluot.png` | ✅ Nên — icon hình phạt hiện chưa có |

Đặt tại `apps/web/public/asset/`.

**Cắt sheet:** mở trong Photopea (miễn phí, chạy trên web) → khung chọn vuông cùng kích thước → `Image → Crop` → `File → Export as PNG` cho từng ô. Chuẩn hoá canvas về cùng một kích thước cho các file cùng nhóm, không thì icon sẽ nhảy cỡ khi xếp hàng ngang.

---

## 4. Gói tối thiểu — 20 file, làm được trong một buổi

Nếu chỉ có một buổi, làm đúng 20 file này, bỏ hết phần còn lại:

```
apps/web/public/mat/     10 file   ← §1, đổi hẳn bộ mặt
apps/web/public/nen/      6 file   ← P01, P02, P03 × 2 tỉ lệ (3 chỗ gắn đã sẵn trong CSS)
apps/web/public/asset/    4 file   ← A02 mái tranh + 3 icon phạt hay dùng nhất
```

Lý do xếp avatar lên đầu: 10 avatar xuất hiện ở **mọi màn hình** — phòng chờ, HUD, bảng xếp hạng, nhãn ghế trong cảnh 3D — còn P05–P14 thì đang bị cảnh 3D che gần hết. Đổi mặt cho lãi cao nhất trên mỗi giờ bỏ ra.

---

## 5. Làm từ đầu — từng bước

### Bước 1 · Chuẩn bị chỗ để

Repo **chưa có** thư mục `apps/web/public`. Tạo trước:

```bash
mkdir -p apps/web/public/mat apps/web/public/nen apps/web/public/asset
```

Vite phục vụ thư mục này ở gốc URL: file `apps/web/public/mat/mat_trau.webp` truy cập bằng `/mat/mat_trau.webp`.

### Bước 2 · Mở Gemini

Vào **gemini.google.com**, hoặc **aistudio.google.com** nếu muốn kiểm soát nhiều hơn. Phải chọn model **sinh được ảnh**, không phải model chỉ trả lời chữ. Nếu nó trả về chữ thay vì ảnh, thêm câu mở đầu `Generate an image:`.

Kiểm tra ba thứ trước khi bắt đầu — thiếu cái nào thì quy trình gãy giữa chừng:
- **Đính kèm được ảnh** vào prompt (nút ghim / 📎). Cần cho §1.4 và cho mọi bản 9:16.
- **Chọn được tỉ lệ khung hình**, hoặc ít nhất viết được `16:9 aspect ratio` trong prompt và nó nghe.
- **Tải về được ảnh gốc**, không phải bản đã nén sẵn.

### Bước 3 · Sinh sheet avatar

Dán nguyên prompt §1.3. Sinh **6–8 lần**, tải hết về, rồi mới chọn 1 tấm.

Tiêu chí chọn, theo đúng thứ tự này:
1. Mười con **cùng cỡ đầu**. Tiêu chí này loại nhiều tấm nhất.
2. Nét viền đều tay, không chỗ mảnh chỗ dày.
3. Không con nào có mắt long lanh kiểu anime.
4. Nền trắng phẳng thật sự, không có bóng đổ dưới đầu.

Đẹp nhưng lệch cỡ thì bỏ: cỡ đầu không sửa được ở hậu kỳ, còn màu thì sửa được (bước 6).

### Bước 4 · Sửa những con hỏng

Đính kèm sheet vừa chọn, dùng prompt §1.4 cho từng con hỏng. Sinh 3–4 biến thể mỗi con, chọn 1. Đây là lý do phải giữ nguyên sheet gốc: nó là ảnh chuẩn cho mọi lần sửa về sau.

### Bước 5 · Cắt và tách nền

Repo có sẵn công cụ, cần Python + Pillow + numpy (đã có trên máy này):

```bash
python tools/cat_mat.py duong/dan/sheet.png
```

Script tìm ranh giới, tách nền, ép mỗi con vào một ô vuông có lề đều, rồi xuất
hai bộ: `mat_cutout/*.png` 512px để sửa tay, và `apps/web/public/mat/*.webp`
256px cho game dùng.

Hai điểm mấu chốt, cả hai đều là lỗi đã gặp thật khi cắt sheet đầu tiên:

**Không chia lưới đều.** Gemini không xếp 10 con vào 10 ô bằng nhau — sừng trâu
thò sang ô con gà, râu mèo thò sang ô con chuột. Chia đều 5 cột thì trâu bị xén
mất sừng còn ô con gà dính một mảnh sừng lạc. Script tìm **khe trắng thật** giữa
hai con bằng phép chiếu mực, và tìm **riêng cho từng hàng** — ở sheet thử, ranh
giới hàng trên và hàng dưới lệch nhau tới 70px.

**Tách nền bằng flood fill từ mép ảnh**, không phải "chọn mọi pixel trắng". Cóc,
mèo, chim, hổ có mảng bụng màu kem rất gần trắng; tách theo màu là thủng bụng.
Vùng kem nằm trong nét viền mực nên vùng trắng bên ngoài không lan tới được.

Script in ra tỉ lệ **pixel đặc** của từng con để tự kiểm tra:

- dưới 25% → lưới cắt trượt, con vật bị cắt mất một phần
- trên 90% → nền chưa tách được, hoặc nét viền có lỗ hở làm nền trắng lọt vào trong

Cả hai trường hợp đều sinh lại con đó bằng prompt §1.4, đừng sửa tay.

Nếu muốn làm thủ công thay vì chạy script, trong Photopea:

```
Select → Color Range → click vùng trắng NGOÀI con vật → Fuzziness ~30 → OK
Select → Modify → Expand 1px        (ăn nốt viền trắng còn sót)
Delete → File → Export as → PNG
```

Nhớ bỏ chọn phần bụng kem nếu Color Range quét trúng nó.

### Bước 6 · Ép về đúng bảng màu

Bước này làm 10 avatar khớp nhau hơn mọi thủ thuật prompt. Photopea: `Image → Adjustments → Selective Color`, kéo từng dải màu về đúng hex ở §3.1 art direction — chàm `#1F3F63`, đỏ điều `#C4322A`, vàng nghệ `#E8A72E`, lá chuối `#4C7A38`, đất `#B9803F`, mực `#2A211B`.

### Bước 7 · Xuất WebP

```bash
for f in apps/web/public/mat_cutout/*.png; do
  n=$(basename "$f" .png)
  cwebp -q 82 -alpha_q 100 -resize 256 256 "$f" -o "apps/web/public/mat/${n}.webp"
done
```

Nền thì không cần alpha, nén mạnh hơn được:

```bash
cwebp -q 75 -resize 900 1600 p01_landing_9x16.png -o apps/web/public/nen/p01_landing_9x16.webp
```

Chưa có `cwebp`: tải ở `developers.google.com/speed/webp/download`, hoặc dùng squoosh.app kéo thả từng file.

Kiểm tra dung lượng — trần là 2.5MB cho toàn bộ ảnh nền (§15 art direction):

```bash
du -ch apps/web/public/nen apps/web/public/mat apps/web/public/asset | tail -1
```

### Bước 8 · Xem thật trên điện thoại

`npm run dev`, mở trên điện thoại **ngoài trời nắng**. Panel giấy dó không đọc được thì làm tối vùng an toàn thêm 8% bằng cách sửa `.an-toan` trong CSS — đừng sinh lại ảnh.

---

## 6. Gắn vào code

### 6.1. Đổi danh sách avatar

`packages/game-rules/src/defaults.ts:59`

```ts
export const AVATARS = [
  'trau', 'ga', 'lon', 'meo', 'chuot',
  'coc', 'ca', 'vit', 'chim', 'ho',
] as const;
export const AVATAR_MAC_DINH = 'trau';
```

Đổi kèm 5 chỗ đang hardcode `'🐯'`:

- `apps/server/src/index.ts:47` và `:90`
- `apps/server/src/room.ts:163`
- `apps/web/src/lib/session.ts:38` và `:43`

### 6.2. Sửa component `Non` để render ảnh

`apps/web/src/ui/common.tsx:201` — thêm nhánh ảnh, giữ nhánh chữ để phòng người chơi cũ còn emoji lưu trong localStorage:

```tsx
const LA_ID = /^[a-z]+$/;   // id mới toàn chữ thường; emoji cũ không khớp

// trong <span className="non">, thay {avatar} bằng:
{LA_ID.test(avatar)
  ? <img className="mat" src={`/mat/mat_${avatar}.webp`} alt="" width={40} height={40} />
  : avatar}
```

CSS thêm cạnh khối `.non` (`apps/web/src/styles.css:696`):

```css
.non .mat { width: 72%; height: 72%; object-fit: contain; display: block; }
.non.nho .mat { width: 78%; height: 78%; }
```

### 6.3. Ba chỗ còn in avatar dạng chữ

Các chỗ này ghép `{p.avatar} {p.name}` thành text — sau khi đổi sang id, chúng sẽ hiện ra chữ `trau`. Phải đổi sang `<Non avatar={p.avatar} nho />`:

- `apps/web/src/three/PlayerSeat.tsx:295` — nhãn ghế trong cảnh 3D
- `apps/web/src/ui/GameOver.tsx:30` và `:48` — bảng vàng
- `apps/web/src/ui/ResultPanel.tsx:66` — kết quả lượt

### 6.4. Mở ảnh nền P01–P03

`apps/web/src/styles.css:2018` — bỏ comment 3 dòng đã dựng sẵn, rồi thêm class `nen-page an-toan` vào thẻ `<main>` của 3 màn hình đó.

Bản 16:9 gắn trong media query:

```css
@media (min-aspect-ratio: 1/1) {
  .man-p01 { background-image: url('/nen/p01_landing_16x9.webp'); }
  .man-p02 { background-image: url('/nen/p02_lobby_16x9.webp'); }
  .man-p03 { background-image: url('/nen/p03_waiting_16x9.webp'); }
}
```

---

## 7. Lỗi hay gặp ở khâu avatar

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| 10 con lệch cỡ đầu nhau | Gemini tự cân bố cục theo hình dáng từng con | Sinh lại sheet; đừng scale bằng tay ở hậu kỳ vì nét viền sẽ dày mỏng khác nhau |
| Con vật trông như mascot công ty | Từ "cute", "mascot", "friendly" kéo mô hình về hướng đó | Bỏ các từ đó, giữ `folk woodblock print`, `flat unshaded` |
| Avatar bị viền trắng khi hiển thị | Tách nền chưa ăn hết pixel viền | `Select → Modify → Expand 1px` trước khi xoá |
| Avatar chìm nghỉm trong vành nón | Ảnh quá nhạt so với nền nón `#e9d49b` | Ép nét viền về đúng mực nho `#2A211B` ở bước 6 |
| File WebP nặng hơn 30KB | Xuất từ ảnh 1024px mà quên resize | Thêm `-resize 256 256` vào lệnh `cwebp` |
