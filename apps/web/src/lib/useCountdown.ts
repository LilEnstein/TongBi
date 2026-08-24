import { useEffect, useRef, useState } from 'react';
import { sfx } from '../audio/sfx.js';

/**
 * Đồng hồ đếm ngược của phase — design doc §37.
 * Mốc kết thúc do server gửi nên mọi máy đếm cùng một hạn.
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
      if (tickSound && whole !== lastWhole.current && whole <= 5 && whole > 0) {
        sfx.tick(whole <= 3);
      }
      lastWhole.current = whole;
    };
    update();
    const id = setInterval(update, 200);
    return () => clearInterval(id);
  }, [endsAt, tickSound]);

  return remaining;
}
