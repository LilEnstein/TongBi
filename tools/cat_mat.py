"""Cắt sheet 10 đầu con vật (2 hàng × 5 cột) thành 10 avatar nền trong suốt.

    python tools/cat_mat.py <duong_dan_sheet.png> [ten1,ten2,...,ten10]

Không đưa danh sách tên thì dùng bộ đầu tiên (trâu → hổ). Sheet thứ hai trở đi
PHẢI đưa tên, không thì nó ghi đè mất mười con cũ:

    python tools/cat_mat.py image/sheet2.png rong,ran,nguaxanh,ngua,sonduong,de,khi,khido,vittroi,cho

Nền trắng được tách bằng flood fill **từ mép ảnh**, không phải bằng "chọn mọi
pixel trắng" — nhờ vậy mảng bụng màu kem của cóc, mèo, chim, hổ không bị thủng,
vì chúng nằm trong nét viền mực nên vùng trắng ngoài không lan tới được.

Xuất hai bộ:
  mat_cutout/*.png   512px, để sửa tay nếu cần
  apps/web/public/mat/*.webp   256px, bản game dùng
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Thứ tự phải khớp đúng bố cục prompt §1.3: hàng trên rồi hàng dưới, trái sang phải.
TEN = [
    "trau", "ga", "lon", "meo", "chuot",
    "coc", "ca", "vit", "chim", "ho",
]
COT, HANG = 5, 2

# Ngưỡng flood: tổng chênh lệch 3 kênh so với trắng. Giấy dó #F2E5C4 lệch 98,
# nên 70 tách được nền mà không ăn vào màu kem.
NGUONG = 70
LE = 0.08          # lề chừa quanh con vật khi ép về ô vuông
CO_PNG = 512
CO_WEBP = 256


def tach_nen(cell: Image.Image) -> Image.Image:
    """Trả về ảnh RGBA, nền trắng nối với mép đã thành trong suốt."""
    # Viền trắng 2px nối mọi vùng nền rời rạc lại, để chỉ cần một điểm mồi.
    w, h = cell.size
    padded = Image.new("RGB", (w + 4, h + 4), (255, 255, 255))
    padded.paste(cell, (2, 2))

    DAU = (255, 0, 255)  # màu đánh dấu, chắc chắn không có trong tranh dân gian
    ImageDraw.floodfill(padded, (0, 0), DAU, thresh=NGUONG)

    arr = np.array(padded)
    nen = (arr[:, :, 0] == 255) & (arr[:, :, 1] == 0) & (arr[:, :, 2] == 255)

    alpha = np.where(nen, 0, 255).astype(np.uint8)

    # Co vào 1px: floodfill cắt ở ranh giới cứng nên còn sót viền trắng răng cưa.
    dac = alpha > 0
    co = (
        dac
        & np.roll(dac, 1, 0) & np.roll(dac, -1, 0)
        & np.roll(dac, 1, 1) & np.roll(dac, -1, 1)
    )
    alpha = np.where(co, 255, 0).astype(np.uint8)

    rgba = np.dstack([arr, alpha])
    # Pixel nền còn mang màu đánh dấu; kéo về trắng để rìa không ánh tím.
    rgba[nen, :3] = 255
    out = Image.fromarray(rgba, "RGBA").crop((2, 2, w + 2, h + 2))

    # Làm mềm rìa cho hết răng cưa.
    r, g, b, a = out.split()
    return Image.merge("RGBA", (r, g, b, a.filter(ImageFilter.GaussianBlur(0.6))))


def khe_trang(proj: np.ndarray, can: int) -> list[tuple[int, int]]:
    """Các đoạn không có mực nằm lọt giữa (bỏ lề ngoài), sắp theo vị trí."""
    trong = proj <= can
    doan, i = [], 0
    while i < len(trong):
        if trong[i]:
            j = i
            while j < len(trong) and trong[j]:
                j += 1
            doan.append((i, j))
            i = j
        else:
            i += 1
    return [d for d in doan if d[0] > 0 and d[1] < len(trong)]


def tim_vach(proj: np.ndarray, can_bao_nhieu: int) -> list[int]:
    """Vị trí cắt = giữa các khe trắng rộng nhất.

    Chia lưới đều là sai: sừng trâu thò sang ô con gà, râu mèo thò sang ô con
    chuột. Phải cắt đúng vào khe trắng thật giữa hai con.
    """
    for can in (0, 2, 6, 15, 40):
        khe = khe_trang(proj, can)
        if len(khe) >= can_bao_nhieu:
            rong = sorted(khe, key=lambda d: d[0] - d[1])[:can_bao_nhieu]
            return sorted((d[0] + d[1]) // 2 for d in rong)
    raise ValueError(
        f"chỉ tìm được {len(khe)} khe, cần {can_bao_nhieu} — "
        "sheet có hai con dính nhau, sinh lại với `wide even spacing between cells`"
    )


def ep_vuong(im: Image.Image) -> Image.Image:
    """Cắt sát con vật rồi đặt vào giữa một ô vuông có lề đều."""
    hop = im.getbbox()
    if hop is None:
        raise ValueError("ô trống — kiểm tra lại lưới cắt")
    im = im.crop(hop)

    canh = int(max(im.size) * (1 + LE * 2))
    khung = Image.new("RGBA", (canh, canh), (0, 0, 0, 0))
    khung.paste(im, ((canh - im.width) // 2, (canh - im.height) // 2))
    return khung


def main() -> int:
    # Console Windows mặc định cp1252, không in được dấu tiếng Việt.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

    if len(sys.argv) < 2:
        print(__doc__)
        return 2

    sheet_path = Path(sys.argv[1])
    if not sheet_path.exists():
        print(f"Không thấy file: {sheet_path}")
        return 1

    ten_list = sys.argv[2].split(",") if len(sys.argv) > 2 else TEN
    if len(ten_list) != COT * HANG:
        print(f"Cần đúng {COT * HANG} tên, nhận được {len(ten_list)}: {ten_list}")
        return 2

    goc = Path(__file__).resolve().parent.parent
    d_png = goc / "mat_cutout"
    d_webp = goc / "apps" / "web" / "public" / "mat"
    d_png.mkdir(parents=True, exist_ok=True)
    d_webp.mkdir(parents=True, exist_ok=True)

    sheet = Image.open(sheet_path).convert("RGB")
    W, H = sheet.size
    muc = np.array(sheet).astype(int).sum(2) < 720

    # Cắt ngang trước, rồi tìm khe dọc riêng cho từng hàng — hai hàng không
    # thẳng cột với nhau, ở sheet này lệch tới 70px.
    y_vach = tim_vach(muc.sum(1), HANG - 1)
    bien_y = [0, *y_vach, H]
    bien_x = [
        [0, *tim_vach(muc[bien_y[h]:bien_y[h + 1]].sum(0), COT - 1), W]
        for h in range(HANG)
    ]

    print(f"Sheet {W}×{H}")
    print(f"  vạch ngang: {y_vach}")
    for h in range(HANG):
        print(f"  vạch dọc hàng {h + 1}: {bien_x[h][1:-1]}")
    print()

    for i, ten in enumerate(ten_list):
        hang, cot = divmod(i, COT)
        hop = (bien_x[hang][cot], bien_y[hang], bien_x[hang][cot + 1], bien_y[hang + 1])
        con = ep_vuong(tach_nen(sheet.crop(hop)))

        png = d_png / f"mat_{ten}.png"
        con.resize((CO_PNG, CO_PNG), Image.LANCZOS).save(png)

        webp = d_webp / f"mat_{ten}.webp"
        con.resize((CO_WEBP, CO_WEBP), Image.LANCZOS).save(
            webp, "WEBP", quality=82, alpha_quality=100, method=6
        )

        # Tỉ lệ pixel đặc: quá thấp là cắt trượt, quá cao là nền chưa tách được.
        dac = np.array(con.split()[3]) > 8
        print(
            f"  {ten:6s} {con.width:4d}px  →  {webp.stat().st_size / 1024:5.1f}KB"
            f"   đặc {dac.mean() * 100:4.1f}%"
        )

    print(f"\nPNG 512px : {d_png}")
    print(f"WebP 256px: {d_webp}")
    print(f"Tổng WebP : {sum(f.stat().st_size for f in d_webp.glob('*.webp')) / 1024:.0f}KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
