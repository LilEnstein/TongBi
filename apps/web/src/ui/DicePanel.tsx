/** Xin vay bi bằng xúc xắc — design doc §8, §9, §10. */
import type { DiceOutcome, Player } from '@tongbi/game-rules';
import { Button } from './common.js';

interface Props {
  roller: Player | undefined;
  isMe: boolean;
  outcome: DiceOutcome | null;
  onRoll: () => void;
  onForfeit: () => void;
}

export function DicePanel({ roller, isMe, outcome, onRoll, onForfeit }: Props) {
  if (!roller) return null;

  if (outcome) {
    const borrowed = outcome.marblesGained > 0;
    return (
      <div className={`panel dice-result${borrowed ? ' dice-result--good' : ''}`}>
        <div className="dice-result__icon">{outcome.face.icon}</div>
        {borrowed ? (
          <>
            <div className="panel__title">+{outcome.marblesGained} BI</div>
            <p className="panel__hint">
              {roller.name} vay được {outcome.marblesGained} viên và chơi tiếp.
            </p>
          </>
        ) : (
          <>
            <div className="panel__title">HÌNH PHẠT: {outcome.face.label.toUpperCase()}</div>
            <p className="panel__hint">{outcome.penalty?.description ?? 'Chủ trò quyết định hình phạt.'}</p>
            <p className="panel__note">
              Game chỉ mô phỏng hình phạt — thực hiện ngoài đời là do cả nhóm tự quyết.
            </p>
          </>
        )}
      </div>
    );
  }

  if (!isMe) {
    return (
      <div className="panel panel--calm">
        <div className="panel__title">{roller.name} đã hết bi</div>
        <p className="panel__hint">Đang chờ tung xúc xắc xin vay bi…</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel__title">Bạn đã hết bi!</div>
      <p className="panel__hint">
        Tung xúc xắc để vay <b>3</b>, <b>6</b> hoặc <b>9</b> viên — nhưng có thể trúng hình phạt.
      </p>
      <Button full onClick={onRoll}>
        Tung xúc xắc 🎲
      </Button>
      <Button full variant="ghost" onClick={onForfeit}>
        Bỏ cuộc
      </Button>
    </div>
  );
}
