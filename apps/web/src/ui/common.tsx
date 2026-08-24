import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useGame } from '../net/store.js';
import { sfx, unlockAudio } from '../audio/sfx.js';

/** Thông báo ngắn ở góc màn hình. */
export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} className={`toast toast--${t.kind}`} onClick={() => dismiss(t.id)}>
          {t.text}
        </button>
      ))}
    </div>
  );
}

/** QR để người khác quét vào phòng — design doc §40. */
export function QrCode({ value, size = 176 }: { value: string; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    void QRCode.toCanvas(canvas.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#12131a', light: '#ffffff' },
    });
  }, [value, size]);
  return <canvas ref={canvas} className="qr" width={size} height={size} aria-label="Mã QR vào phòng" />;
}

/** Nút bấm lớn, thân thiện với ngón tay — design doc §35. */
export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  full,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  disabled?: boolean;
  type?: 'button' | 'submit';
  full?: boolean;
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}${full ? ' btn--full' : ''}`}
      disabled={disabled}
      onClick={() => {
        unlockAudio();
        sfx.button();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

/** Copy link phòng vào clipboard, có fallback cho trình duyệt cũ. */
export function CopyButton({ text, label = 'Sao chép link' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const pushToast = useGame((s) => s.pushToast);

  const copy = async () => {
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
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      pushToast('error', 'Không sao chép được, bạn hãy copy thủ công.');
    }
  };

  return (
    <Button variant="ghost" onClick={() => void copy()}>
      {copied ? '✓ Đã sao chép' : label}
    </Button>
  );
}

/** Thanh đếm ngược của phase. */
export function TimerBar({ remaining, total }: { remaining: number | null; total: number }) {
  if (remaining === null) return null;
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  const urgent = remaining <= 5;
  return (
    <div className={`timer${urgent ? ' timer--urgent' : ''}`}>
      <div className="timer__bar" style={{ width: `${pct}%` }} />
      <span className="timer__label">{Math.ceil(remaining)}s</span>
    </div>
  );
}
