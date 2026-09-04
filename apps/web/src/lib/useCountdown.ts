import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx.js';

/**
 * Đồng hồ đếm ngược của phase — design doc §37.
 * Mốc kết thúc do server gửi nên mọi máy đếm cùng một hạn.
 * Năm giây cuối gõ nhịp trống ếch nhanh dần, hết giờ là một tiếng dứt khoát (§12).
 */
export function useCountdown(endsAt: number | null, tickSound = true): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);
  const lastWhole = useRef<number>(-1);

  useEffect(() => {
    if (endsAt === null) {
      setRemaining(null);
      lastWhole.current = -1;
      return;
    }
    const update = () => {
      const secs = Math.max(0, (endsAt - Date.now()) / 1000);
      setRemaining(secs);
      const whole = Math.ceil(secs);
      if (tickSound && whole !== lastWhole.current) {
        if (whole <= 5 && whole > 0) sfx.demNguoc(whole <= 3);
        else if (whole === 0 && lastWhole.current > 0) sfx.hetGio();
      }
      lastWhole.current = whole;
    };
    update();
    const id = setInterval(update, 200);
    return () => clearInterval(id);
  }, [endsAt, tickSound]);

  return remaining;
}
