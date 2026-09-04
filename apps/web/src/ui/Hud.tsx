/**
 * Tấm liếp tre trên đỉnh sân chơi — art direction §7.
 * Bên trái là vòng đang chơi, giữa là nén hương cháy dần thay đồng hồ,
 * bên phải là số bi còn trong túi.
 */
import { GamePhase, type Player, type PublicRoomState } from '@tongbi/game-rules';
import { NenHuong } from './common.js';
import { useCountdown } from '../lib/useCountdown.js';

/** Nhãn phase viết thường có dấu, không viết hoa toàn bộ (§5, §16). */
const TEN_BUOC: Record<string, string> = {
  ROUND_START: 'vào vòng mới',
  SELECT_MARBLES: 'giấu bi',
  CLOSE_HAND: 'nắm tay lại',
  GUESS_TOTAL: 'đoán tổng',
  REVEAL: 'mở tay',
  ROUND_RESULT: 'đếm bi',
  DICE_ROLL: 'tung xúc xắc',
  GAME_OVER: 'tan sân',
  WAITING: 'chờ bắt đầu',
};

export function Hud({
  room,
  me,
  connected,
}: {
  room: PublicRoomState;
  me: Player | null;
  connected: boolean;
}) {
  const dangDem = room.phase === GamePhase.SELECT_MARBLES || room.phase === GamePhase.GUESS_TOTAL;
  const conLai = useCountdown(room.phaseEndsAt, dangDem);
  const tong =
    room.phase === GamePhase.SELECT_MARBLES
      ? room.settings.selectSeconds
      : room.phase === GamePhase.GUESS_TOTAL
        ? room.settings.guessSeconds
        : Math.max(1, ((room.phaseEndsAt ?? 0) - room.phaseStartedAt) / 1000);

  const daGiau = room.players.filter((p) => room.roundPublic[p.id]?.submitted).length;
  const dangChoi = room.players.filter((p) => !p.eliminated && p.marbleCount > 0).length;

  return (
    <div className="liep-tren">
      <div className="liep">
        <span className="vong so">
          vòng {room.round}/{room.settings.totalRounds}
        </span>
        {conLai !== null ? (
          <NenHuong conLai={conLai} tong={tong} />
        ) : (
          <span className="vong" style={{ flex: 1, textAlign: 'center' }}>
            {TEN_BUOC[room.phase] ?? room.phase}
          </span>
        )}
        {me && (
          <span className="vong so" aria-label={`Còn ${me.marbleCount} viên bi`}>
            {me.marbleCount} bi
          </span>
        )}
      </div>

      {room.phase === GamePhase.SELECT_MARBLES && (
        <div className="tien-do">
          <span className="loi-nhac">
            {daGiau}/{dangChoi} đứa đã giấu bi xong
          </span>
        </div>
      )}

      {!connected && (
        <div className="mat-mang">
          <span className="loi-nhac">Rớt mạng rồi. Chờ chút, đang chạy vào hiên trú…</span>
        </div>
      )}
    </div>
  );
}
