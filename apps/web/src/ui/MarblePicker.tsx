/**
 * P06 — Bỏ vào tay mấy viên. Art direction §7 (giấy dó, thẻ tre, túi bi),
 * §15 (nút chính nằm nửa dưới màn hình, vùng chạm 56px).
 */
import { useEffect, useState } from 'react';
import { maxAllowedBet, type GameSettings, type Player } from '@tongbi/game-rules';
import { GiayDo, Nut, TuiBi } from './common.js';
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
  const [so, setSo] = useState(() => Math.min(3, Math.max(1, max)));

  useEffect(() => {
    setSo((v) => Math.min(Math.max(1, v), Math.max(1, max)));
  }, [max]);

  if (submitted) {
    return (
      <GiayDo className="canh-giua dan-len">
        <h2 className="tua">Giấu xong rồi 🤫</h2>
        <p className="moi">
          Trong tay bạn có <b className="so">{mySelection ?? '?'}</b> viên. Chờ tụi nó nắm tay
          nốt đã.
        </p>
      </GiayDo>
    );
  }

  const dat = (n: number) => {
    const moi = Math.min(max, Math.max(1, n));
    if (moi !== so) {
      unlockAudio();
      sfx.bi();
    }
    setSo(moi);
  };

  return (
    <GiayDo ghim className="dan-len">
      <h2 className="tua">Bỏ vào tay mấy viên?</h2>
      <p className="moi">Không đứa nào thấy được đâu, cứ giấu thoải mái.</p>

      <div className="dem">
        <Nut onClick={() => dat(so - 1)} disabled={so <= 1} nhan="Bớt một viên">
          −
        </Nut>
        <span className="dem-so so">
          {so}
          <small>trên {max} viên</small>
        </span>
        <Nut onClick={() => dat(so + 1)} disabled={so >= max} nhan="Thêm một viên">
          +
        </Nut>
      </div>

      <div className="hang-bi" aria-hidden>
        {Array.from({ length: Math.min(so, 20) }, (_, i) => (
          <i key={i} className={`bi${i % 3 === 1 ? ' x2' : i % 3 === 2 ? ' x3' : ''}`} />
        ))}
      </div>

      <hr className="tach" />

      <div className="hang" style={{ justifyContent: 'space-between' }}>
        <TuiBi so={me.marbleCount} tong={settings.startingMarbles} />
        <Nut vat="la" co="lg" onClick={() => onSubmit(so)}>
          Nắm tay lại ✊
        </Nut>
      </div>
      <p className="ghi-chu">Còn {me.marbleCount} viên trong túi.</p>
    </GiayDo>
  );
}
