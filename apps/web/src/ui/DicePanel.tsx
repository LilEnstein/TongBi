/**
 * Sạch túi thì xin tung xúc xắc gỗ vay bi — art direction §9.3 (khối gỗ mít,
 * mặt khắc chìm bôi mực) và §13 (icon hình que, mức phạt là số vạch đỏ).
 */
import type { DiceOutcome, Player } from '@tongbi/game-rules';
import { GiayDo, IconPhat, MucPhat, Nut } from './common.js';

interface Props {
  roller: Player | undefined;
  isMe: boolean;
  outcome: DiceOutcome | null;
  onRoll: () => void;
  onForfeit: () => void;
}

/** Mặt xúc xắc: mặt vay bi khắc chìm đúng số bi, mặt phạt khắc hình que. */
function MatXucXac({ outcome }: { outcome: DiceOutcome }) {
  const vay = outcome.face.kind === 'BORROW';
  return (
    <div className="mat-xx to roi" style={{ margin: '0 auto 26px' }}>
      {vay ? (
        <div className="cham-bi">
          {Array.from({ length: outcome.face.marbles ?? 0 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      ) : (
        <IconPhat id={outcome.penalty?.id ?? 'khac'} size={54} />
      )}
      <span className="ten">{vay ? `vay ${outcome.face.marbles} bi` : outcome.face.label}</span>
    </div>
  );
}

export function DicePanel({ roller, isMe, outcome, onRoll, onForfeit }: Props) {
  if (!roller) return null;

  if (outcome) {
    const vay = outcome.marblesGained > 0;
    return (
      <GiayDo className="canh-giua dan-len">
        <MatXucXac outcome={outcome} />
        {vay ? (
          <>
            <h2 className="tua">Vay được {outcome.marblesGained} viên!</h2>
            <p className="moi">{roller.name} lại có bi để chơi tiếp.</p>
          </>
        ) : (
          <>
            <h2 className="tua">{outcome.face.label}</h2>
            {outcome.penalty && <MucPhat muc={outcome.penalty.severity} />}
            <p className="moi">{outcome.penalty?.description ?? 'Chủ trò xử thế nào thì chịu thế.'}</p>
            <p className="ghi-chu">
              Game chỉ nhắc thôi — làm hay không là chuyện của cả bọn ngoài sân.
            </p>
          </>
        )}
      </GiayDo>
    );
  }

  if (!isMe) {
    return (
      <GiayDo className="canh-giua dan-len">
        <h2 className="tua">{roller.name} sạch túi rồi</h2>
        <p className="moi">Đang ngồi xin tung xúc xắc vay bi…</p>
      </GiayDo>
    );
  }

  return (
    <GiayDo ghim className="dan-len">
      <h2 className="tua">Sạch túi rồi. Vay không?</h2>
      <p className="moi">
        Xúc xắc gỗ có ba mặt cho vay <b>3</b>, <b>6</b>, <b>9</b> viên — ba mặt còn lại là trò
        phạt, chịu được thì tung.
      </p>
      <Nut vat="la" co="lg" rong onClick={onRoll}>
        Xin vay bi
      </Nut>
      <div style={{ marginTop: 10 }}>
        <Nut vat="gach" rong onClick={onForfeit}>
          Thôi, ngồi xem
        </Nut>
      </div>
    </GiayDo>
  );
}
