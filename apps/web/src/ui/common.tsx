/**
 * Bộ phận dùng chung, đặt tên theo vật liệu — art direction §7.
 * Không có Button/Card/Modal/Toast ở đây: có thẻ tre, giấy dó, cánh cửa gỗ,
 * lá chuối cuốn. Ai đọc tên component cũng biết ngay nó làm bằng gì.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { AVATAR_TEN, TEAM_COLORS, TEAM_MARKS } from '@tongbi/game-rules';
import { useGame } from '../net/store.js';
import { nenSan, sfx, unlockAudio } from '../audio/sfx.js';
import { datTieng, tiengDangBat } from '../audio/nhacNen.js';

/* ─────────────────────────── Đội: màu và vật nhận dạng ─────────────────── */

export type MauDoi = 'cham' | 'dieu' | 'la' | 'nghe';
const THU_TU_DOI: MauDoi[] = ['cham', 'dieu', 'la', 'nghe'];

/** Đổi mã màu server gửi xuống thành tên vật liệu của đội. */
export function doiTheoMau(color: string | undefined): MauDoi {
  const i = TEAM_COLORS.findIndex((c) => c.toLowerCase() === (color ?? '').toLowerCase());
  return THU_TU_DOI[i < 0 ? 0 : i]!;
}

export function tenVatDoi(doi: MauDoi): string {
  return TEAM_MARKS[THU_TU_DOI.indexOf(doi)] ?? TEAM_MARKS[0];
}

/**
 * Vật nhận dạng đội vẽ lối nét mực — §3.2, §13.
 * Đi kèm màu để người mù màu vẫn phân biệt được đội.
 */
export function VatDoi({ doi, size = 14 }: { doi: MauDoi; size?: number }) {
  const chung = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (doi) {
    case 'cham': // khăn mỏ quạ
      return (
        <svg {...chung} className="que">
          <path d="M2 12 L8 3 L14 12 Z" />
        </svg>
      );
    case 'dieu': // dây chun đỏ buộc cổ tay
      return (
        <svg {...chung} className="que">
          <circle cx="8" cy="8" r="5.4" />
        </svg>
      );
    case 'la': // tàu lá chuối
      return (
        <svg {...chung} className="que">
          <path d="M13 3 C5 3 3 8 3 13 C3 8 8 4 13 3 Z" />
          <path d="M3 13 L11 5" />
        </svg>
      );
    default: // nón lá
      return (
        <svg {...chung} className="que">
          <path d="M8 2 L14 12 L2 12 Z" />
          <path d="M2 12 h12" />
        </svg>
      );
  }
}

/* ─────────────────────────── Giấy dó, mẹt tre ──────────────────────────── */

export function GiayDo({
  children,
  ghim,
  className = '',
  ...rest
}: {
  children: ReactNode;
  ghim?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`giay-do${ghim ? ' ghim' : ''}${className ? ` ${className}` : ''}`} {...rest}>
      {ghim && (
        <>
          <span className="ghim-trai" aria-hidden />
          <span className="ghim-phai" aria-hidden />
        </>
      )}
      {children}
    </div>
  );
}

export function Met({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`met${className ? ` ${className}` : ''}`}>{children}</div>;
}

/* ─────────────────────────── Nút — §8 ──────────────────────────────────── */

type VatNut = 'tre' | 'la' | 'gach' | 'mo';
const LOP_VAT: Record<VatNut, string> = {
  tre: 'the-tre',
  la: 'la-chuoi',
  gach: 'gach',
  mo: 'mo-cau',
};

export function Nut({
  children,
  onClick,
  vat = 'tre',
  co = 'md',
  rong,
  dat,
  cho,
  disabled,
  type = 'button',
  nhan,
}: {
  children: ReactNode;
  onClick?: () => void;
  /** Vật liệu: thẻ tre (chính) · lá chuối (xác nhận) · gạch nung (nguy hiểm) · mo cau (phụ). */
  vat?: VatNut;
  co?: 'lg' | 'md' | 'sm';
  rong?: boolean;
  /** Nút mo cau nằm trực tiếp trên nền đất thì chữ phải là phấn trắng. */
  dat?: boolean;
  /** Đang chờ server: chữ đổi thành ba hạt bụi nảy lên. */
  cho?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  nhan?: string;
}) {
  const lop = [
    'nut',
    LOP_VAT[vat],
    co !== 'md' ? co : '',
    rong ? 'rong' : '',
    dat ? 'tren-dat' : '',
    cho ? 'cho' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={lop}
      disabled={disabled || cho}
      aria-label={nhan}
      onClick={() => {
        unlockAudio();
        sfx.que();
        onClick?.();
      }}
    >
      {children}
      {cho && <span className="bui" aria-hidden />}
    </button>
  );
}

/**
 * Trống ếch — nút bắt đầu của chủ trò. Bấm vào là có tiếng trống, cả sân nghe
 * thấy cùng lúc (§7). Không phải một cái nút bình thường nên không dùng .nut.
 */
export function TrongEch({
  onClick,
  disabled,
  chu = 'Bắt đầu',
  phu,
}: {
  onClick: () => void;
  disabled?: boolean;
  chu?: string;
  phu?: string;
}) {
  return (
    <button
      className="trong"
      disabled={disabled}
      onClick={() => {
        unlockAudio();
        sfx.trong();
        onClick();
      }}
    >
      {chu}
      {phu && <small>{phu}</small>}
    </button>
  );
}

/* ─────────────────────────── Nón lá, khăn đội ──────────────────────────── */

/**
 * Id avatar mới toàn chữ thường (`trau`, `ga`…). Hồ sơ lưu từ bản trước còn giữ
 * emoji trong localStorage, và server cũ có thể trả về emoji — hai dạng đó không
 * khớp mẫu này nên rơi xuống nhánh in chữ, không vỡ giao diện.
 */
const LA_ID_MAT = /^[a-z]+$/;

/** Mặt con vật trong vành nón: ảnh nếu là id mới, không thì in nguyên emoji cũ. */
function MatConVat({ avatar }: { avatar: string }) {
  const [hong, setHong] = useState(false);

  if (!LA_ID_MAT.test(avatar)) return <>{avatar}</>;
  // Ảnh chưa sinh hoặc tải hỏng thì lùi về chữ, tránh ô vuông vỡ ảnh.
  // 3 ký tự để `chuột` và `chim` không rút thành cùng một chữ.
  if (hong) return <b className="mat-chu">{(AVATAR_TEN[avatar] ?? avatar).slice(0, 3)}</b>;

  return (
    <img
      className="mat"
      src={`/mat/mat_${avatar}.webp`}
      alt=""
      width={40}
      height={40}
      /* Không lazy: cả 20 mặt hiện cùng lúc ở màn chọn và tổng chỉ ~250KB,
         hoãn tải chỉ tạo ra khung rỗng nháy lên rồi mới có ảnh. */
      decoding="async"
      onError={() => setHong(true)}
    />
  );
}

export function Non({
  avatar,
  doi,
  nho,
  mo,
  chon,
}: {
  avatar: string;
  doi?: MauDoi;
  nho?: boolean;
  mo?: boolean;
  /** Đang được chọn ở màn hình chọn mặt. */
  chon?: boolean;
}) {
  return (
    <span
      className={`non${doi ? ` d-${doi}` : ''}${nho ? ' nho' : ''}${mo ? ' mo' : ''}${
        chon ? ' chon' : ''
      }`}
      aria-hidden
    >
      <MatConVat avatar={avatar} />
      <span className="chop" />
    </span>
  );
}

export function Khan({ doi, ten, sm }: { doi: MauDoi; ten: string; sm?: boolean }) {
  return (
    <span className={`khan d-${doi}${sm ? ' sm' : ''}`} title={`Nhận dạng: ${tenVatDoi(doi)}`}>
      <span className="vat">
        <VatDoi doi={doi} size={sm ? 11 : 13} />
      </span>
      {ten}
    </span>
  );
}

/* ─────────────────────────── Nén hương: đồng hồ ────────────────────────── */

/**
 * Đồng hồ đếm ngược là một nén hương cháy dần — §7.
 * Tro lấn dần về bên phải, đầu than đỏ chạy theo, khói bay lên.
 */
export function NenHuong({ conLai, tong }: { conLai: number | null; tong: number }) {
  if (conLai === null) return null;
  const chay = Math.max(0, Math.min(100, 100 - (conLai / Math.max(1, tong)) * 100));
  const gap = conLai <= 5;
  return (
    <>
      <div
        className={`huong${gap ? ' gap' : ''}`}
        style={{ ['--chay' as string]: `${chay}%` }}
        role="timer"
        aria-label={`Còn ${Math.ceil(conLai)} giây`}
      >
        <div className="tro" />
        <div className="khoi" />
        <div className="than" />
      </div>
      <span className="con-giay so">{Math.ceil(conLai)}s</span>
    </>
  );
}

/* ─────────────────────────── Túi bi, vạch điểm ─────────────────────────── */

/** Túi bi vải nâu, xẹp dần theo số bi — đọc được từ xa (§7). */
export function TuiBi({ so, tong }: { so: number; tong: number }) {
  const ty = tong > 0 ? so / tong : 0;
  const lop = so <= 0 ? 'het' : ty < 0.45 ? 'voi' : '';
  return (
    <span className={`tui ${lop}`} aria-label={`Còn ${so} viên bi`}>
      <span className="rut" aria-hidden />
      <span className="tui-so so">{so}</span>
    </span>
  );
}

/** Điểm đếm bằng vạch que trên nền đất: 4 vạch dọc + 1 gạch chéo (§7). */
export function VachDat({ so }: { so: number }) {
  const bo = Math.floor(so / 5);
  const le = so % 5;
  return (
    <div className="vach" aria-label={`${so} lượt thắng`}>
      {Array.from({ length: bo }, (_, i) => (
        <div className="bo-vach" key={`b${i}`}>
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      ))}
      {le > 0 && (
        <div className="bo-vach">
          {Array.from({ length: le }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      )}
      {so === 0 && <span className="chu-dat">chưa có vạch nào</span>}
    </div>
  );
}

/* ─────────────────────────── Lá chuối cuốn: báo tin ────────────────────── */

export function LaCuonHop() {
  const toasts = useGame((s) => s.toasts);
  const bo = useGame((s) => s.dismissToast);
  return (
    <div className="la-cuon-hop" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          className={`la-cuon${t.kind === 'error' ? ' loi' : t.kind === 'success' ? ' mung' : ''}`}
          onClick={() => bo(t.id)}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────── Ống sáo: công tắc tiếng ────────────────── */

/**
 * Một ống sáo tre treo ở góc sân — bấm vào là tắt/mở toàn bộ tiếng:
 * liên khúc sáo trúc, ve sầu, trống ếch. Lựa chọn được ghi nhớ cho lần sau.
 */
export function NutTieng() {
  const [bat, setBat] = useState(tiengDangBat);

  return (
    <button
      className={`nut-tieng${bat ? '' : ' tat'}`}
      aria-label={bat ? 'Tắt tiếng' : 'Mở tiếng'}
      aria-pressed={bat}
      onClick={() => {
        const moi = !bat;
        unlockAudio();
        nenSan.batDau();
        nenSan.nhuongNhac(moi);
        datTieng(moi);
        setBat(moi);
        if (moi) sfx.que();
      }}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      >
        {/* ống sáo tre nằm ngang */}
        <path d="M3 12h11" />
        {/* hai làn hơi thoát ra — tắt tiếng thì không còn hơi */}
        <path className="hoi" d="M16.6 8.8a5.2 5.2 0 0 1 0 6.4" />
        <path className="hoi" d="M19.6 6.4a8.4 8.4 0 0 1 0 11.2" />
        {/* nét gạch chéo bằng mực khi tắt */}
        <path className="gach" d="M4.5 19.5 19.5 4.5" />
      </svg>
    </button>
  );
}

/* ─────────────────────────── Cánh cửa gỗ: hộp thoại ────────────────────── */

export function CanhCua({ children, onDong }: { children: ReactNode; onDong?: () => void }) {
  useEffect(() => {
    if (!onDong) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDong();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onDong]);

  return (
    <div className="rem" onClick={(e) => e.target === e.currentTarget && onDong?.()}>
      <div className="cua" role="dialog" aria-modal="true">
        <div className="then" />
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────── Mời bạn vào sân ───────────────────────────── */

/** QR để tụi nó quét vào sân — mực nho trên giấy dó cho đúng tông. */
export function MaQR({ value, size = 176 }: { value: string; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    void QRCode.toCanvas(canvas.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#2A211B', light: '#F2E5C4' },
    });
  }, [value, size]);
  return <canvas ref={canvas} className="qr" width={size} height={size} aria-label="Mã QR vào sân" />;
}

export function NutChepLink({ text, chu = 'Chép link' }: { text: string; chu?: string }) {
  const [xong, setXong] = useState(false);
  const baoTin = useGame((s) => s.pushToast);

  const chep = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setXong(true);
      baoTin('success', 'Chép link sân chơi rồi, gửi vào nhóm chat đi');
      setTimeout(() => setXong(false), 1800);
    } catch {
      baoTin('error', 'Máy không cho chép. Bạn bôi đen rồi copy tay nhé');
    }
  };

  return (
    <Nut vat="tre" onClick={() => void chep()}>
      {xong ? '✓ Chép rồi' : chu}
    </Nut>
  );
}

/* ─────────────────────────── Icon hình phạt — §13 ──────────────────────── */

/**
 * Icon vẽ lối hình que khắc trên đất: nét mực 3px, không màu fill,
 * tối đa 12 nét mỗi icon.
 */
export function IconPhat({ id, size = 46 }: { id: string; size?: number }) {
  const chung = {
    width: size,
    height: size,
    viewBox: '0 0 46 46',
    fill: 'none',
    stroke: 'var(--muc)',
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'que',
    'aria-hidden': true,
  };

  switch (id) {
    case 'pushup': // hít đất — chống hai tay, lưng thẳng
      return (
        <svg {...chung}>
          <circle cx="34" cy="14" r="5" />
          <path d="M30 19 L14 28 M14 28 L8 37 M14 28 L22 35 M30 19 L34 30" />
        </svg>
      );
    case 'squat': // thụt xì dầu — ngồi xổm, hai tay chống hông
      return (
        <svg {...chung}>
          <circle cx="23" cy="10" r="5" />
          <path d="M23 15 v11 M23 26 l-8 12 M23 26 l8 12 M15 20 h16" />
        </svg>
      );
    case 'carry': // cõng đồng đội — hai hình que chồng lên nhau
      return (
        <svg {...chung}>
          <circle cx="17" cy="13" r="5" />
          <path d="M17 18 v12 M17 30 l-6 10 M17 30 l6 10" />
          <circle cx="32" cy="10" r="4" />
          <path d="M32 14 v9 M25 20 h13" />
        </svg>
      );
    case 'sing': // hát một bài — há miệng + hai nốt nhạc
      return (
        <svg {...chung}>
          <circle cx="17" cy="14" r="6" />
          <path d="M15 16 q2 3 4 0 M17 20 v10 M17 30 l-5 9 M17 30 l5 9" />
          <path d="M32 10 v10 M32 20 a3 3 0 1 1-3-3 M38 14 v10" />
        </svg>
      );
    case 'joke': // kể chuyện cười — bong bóng thoại có "ha"
      return (
        <svg {...chung}>
          <circle cx="13" cy="15" r="5" />
          <path d="M13 20 v10 M13 30 l-4 9 M13 30 l4 9" />
          <path d="M24 8 h18 v13 h-11 l-5 5 v-5 h-2 z" />
          <path d="M30 14 h2 M36 14 h2" />
        </svg>
      );
    case 'borrow': // vay bi — ba viên bi khắc chìm
      return (
        <svg {...chung}>
          <circle cx="15" cy="26" r="6" />
          <circle cx="30" cy="26" r="6" />
          <circle cx="23" cy="14" r="6" />
        </svg>
      );
    case 'mat-bi': // bị trừ một bi
      return (
        <svg {...chung}>
          <circle cx="23" cy="23" r="10" />
          <path d="M14 32 L32 14" />
        </svg>
      );
    case 'mat-luot': // mất lượt đoán — nắm tay bị buộc dây
      return (
        <svg {...chung}>
          <path d="M12 20 q11-8 22 0 v9 q-11 6-22 0 z" />
          <path d="M12 26 h22" />
        </svg>
      );
    default: // hình phạt tự thêm: một cái que cắm xuống đất
      return (
        <svg {...chung}>
          <circle cx="23" cy="12" r="5" />
          <path d="M23 17 v12 M23 29 l-6 10 M23 29 l6 10 M14 22 h18" />
        </svg>
      );
  }
}

/** Mức độ hình phạt hiển thị bằng số vạch đỏ, không dùng chữ nhẹ/vừa/nặng (§13). */
export function MucPhat({ muc }: { muc: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) {
  const so = muc === 'HEAVY' ? 3 : muc === 'MEDIUM' ? 2 : 1;
  return (
    <span className="muc-phat" aria-label={`mức ${so} trên 3`}>
      {Array.from({ length: so }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

/* ─────────────────────────── Ba hạt bụi: đang chờ ──────────────────────── */

export function BuiDoi() {
  return (
    <div className="cho-doi" aria-hidden>
      <i />
      <i />
      <i />
    </div>
  );
}

/** Lá tre rơi ở sảnh — chuyển động duy nhất của màn hình chờ (§10, §11). */
export function LaTreRoi() {
  return (
    <div className="la-tre" aria-hidden>
      <i />
      <i />
      <i />
    </div>
  );
}
