/**
 * Chọn số bi bỏ vào tay — design doc §3 State 2 (Cách B: bộ chọn số + animation).
 * Nút to, đọc rõ trên điện thoại, và không lộ lựa chọn cho người khác.
 */
import { useEffect, useState } from 'react';
import { maxAllowedBet, type GameSettings, type Player } from '@tongbi/game-rules';
import { Button } from './common.js';
import { sfx, unlockAudio } from '../audio/sfx.js';

interface Props {
  me: Player;
  settings: GameSettings;
  submitted: boolean;
  mySelection: number | null;
  onSubmit: (amount: number) => void;
}

export function MarblePicker({ me, settings, submitted, mySelection, onSubmit }: Props) {
  const max = maxAllowedBet(me, settings);
  const [value, setValue] = useState(() => Math.min(3, Math.max(1, max)));

  useEffect(() => {
    setValue((v) => Math.min(Math.max(1, v), Math.max(1, max)));
  }, [max]);

  if (submitted) {
    return (
      <div className="panel panel--calm">
        <div className="panel__title">Đã giấu bi 🤫</div>
        <p className="panel__hint">
          Bạn đã bỏ <b>{mySelection ?? '?'}</b> viên vào tay. Chờ mọi người cùng nắm tay lại…
        </p>
      </div>
    );
  }

  const set = (n: number) => {
    const next = Math.min(max, Math.max(1, n));
    if (next !== value) {
      unlockAudio();
      sfx.marbleClick();
    }
    setValue(next);
  };

  return (
    <div className="panel">
      <div className="panel__title">Chọn số bi bỏ vào tay</div>
      <p className="panel__hint">
        Bạn có <b>{me.marbleCount}</b> viên. Không ai thấy được lựa chọn của bạn.
      </p>

      <div className="stepper">
        <button className="stepper__btn" onClick={() => set(value - 1)} disabled={value <= 1} aria-label="Bớt một viên">
          −
        </button>
        <div className="stepper__value">
          <span>{value}</span>
          <small>/ {max}</small>
        </div>
        <button className="stepper__btn" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Thêm một viên">
          +
        </button>
      </div>

      <div className="marble-row" role="group" aria-label="Chọn nhanh số bi">
        {Array.from({ length: Math.min(max, 10) }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={`marble-chip${n === value ? ' marble-chip--on' : ''}`}
            onClick={() => set(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <Button full onClick={() => onSubmit(value)}>
        Nắm tay lại ✊
      </Button>
    </div>
  );
}
