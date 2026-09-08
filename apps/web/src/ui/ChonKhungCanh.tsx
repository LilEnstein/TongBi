/**
 * Nút chọn khung cảnh — một mẩu giấy dó ghim ở góc phải dưới, cạnh công tắc
 * tiếng. Bấm vào thì mở ra hai hàng thẻ tre: chọn BUỔI (theo đồng hồ / ban ngày
 * / đêm trăng) và chọn MÙA (theo tháng / xuân / hạ / thu / đông).
 *
 * Mặc định cả hai đều "tự động", nên đứa nào mở game tối mùa đông là thấy đúng
 * cái sân tối mùa đông của nó mà không phải bấm gì. Chọn tay thì lưu lại máy —
 * đây là lựa chọn của người xem, không phải trạng thái phòng, nên KHÔNG gửi lên
 * server: hai đứa trong cùng một phòng vẫn được ngồi ở hai mùa khác nhau.
 */
import { useEffect, useRef, useState } from 'react';
import {
  BUOI_CHON,
  MUA_CHON,
  TEN_BUOI,
  TEN_MUA,
  useKhungCanh,
  type ChonBuoi,
  type ChonMua,
} from '../lib/khungCanh.js';
import { sfx } from '../audio/sfx.js';

export function ChonKhungCanh() {
  const [mo, setMo] = useState(false);
  const boc = useRef<HTMLDivElement>(null);
  const chonBuoi = useKhungCanh((s) => s.chonBuoi);
  const chonMua = useKhungCanh((s) => s.chonMua);
  const buoi = useKhungCanh((s) => s.buoi);
  const mua = useKhungCanh((s) => s.mua);
  const datBuoi = useKhungCanh((s) => s.datBuoi);
  const datMua = useKhungCanh((s) => s.datMua);

  // Bấm ra ngoài hoặc Esc thì gấp tờ giấy lại.
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: PointerEvent) => {
      if (!boc.current?.contains(e.target as Node)) setMo(false);
    };
    const thoat = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMo(false);
    };
    document.addEventListener('pointerdown', ngoai);
    document.addEventListener('keydown', thoat);
    return () => {
      document.removeEventListener('pointerdown', ngoai);
      document.removeEventListener('keydown', thoat);
    };
  }, [mo]);

  const doiBuoi = (c: ChonBuoi) => {
    datBuoi(c);
    sfx.gio();
  };
  const doiMua = (c: ChonMua) => {
    datMua(c);
    sfx.gio();
  };

  return (
    <div className="khung-canh" ref={boc}>
      {mo && (
        <div className="khung-canh-bang" role="group" aria-label="Chọn khung cảnh">
          <span className="nhan">trời</span>
          <div className="chon-nhanh">
            {BUOI_CHON.map((c) => (
              <button
                key={c}
                className={`the-tre-nho${c === chonBuoi ? ' chon' : ''}`}
                aria-pressed={c === chonBuoi}
                onClick={() => doiBuoi(c)}
              >
                {TEN_BUOI[c]}
              </button>
            ))}
          </div>
          <span className="nhan">mùa</span>
          <div className="chon-nhanh">
            {MUA_CHON.map((c) => (
              <button
                key={c}
                className={`the-tre-nho${c === chonMua ? ' chon' : ''}`}
                aria-pressed={c === chonMua}
                onClick={() => doiMua(c)}
              >
                {TEN_MUA[c]}
              </button>
            ))}
          </div>
          {/* Đang để tự động thì nói rõ đồng hồ đã chọn giúp cái gì. */}
          {(chonBuoi === 'tu-dong' || chonMua === 'tu-dong') && (
            <p className="ghi-chu">
              đang là {TEN_BUOI[buoi]}, {TEN_MUA[mua]}
            </p>
          )}
        </div>
      )}

      <button
        className="nut-khung-canh"
        aria-label="Chọn khung cảnh: trời và mùa"
        aria-expanded={mo}
        onClick={() => {
          setMo((v) => !v);
          sfx.que();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round">
          {buoi === 'toi' ? (
            /* Trăng khuyết và một ngôi sao. */
            <>
              <path d="M16.4 4.6a8 8 0 1 0 3 10.6A6.4 6.4 0 0 1 16.4 4.6Z" />
              <path d="M19.4 5.6v2.2M18.3 6.7h2.2" />
            </>
          ) : (
            /* Mặt trời với bốn tia — cùng lối vẽ nét mực của nút tiếng. */
            <>
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}
