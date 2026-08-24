/** HUD trong trận — design doc §14 (Gameplay HUD). */
import { GamePhase, type Player, type PublicRoomState } from '@tongbi/game-rules';
import { TimerBar } from './common.js';
import { useCountdown } from '../lib/useCountdown.js';

const PHASE_LABEL: Record<string, string> = {
  ROUND_START: 'Vào lượt mới',
  SELECT_MARBLES: 'Chọn bi',
  CLOSE_HAND: 'Nắm tay lại',
  GUESS_TOTAL: 'Đoán tổng',
  REVEAL: 'Mở tay!',
  ROUND_RESULT: 'Kết quả',
  DICE_ROLL: 'Xúc xắc',
  GAME_OVER: 'Kết thúc',
  WAITING: 'Chờ bắt đầu',
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
  const remaining = useCountdown(room.phaseEndsAt, room.phase === GamePhase.SELECT_MARBLES || room.phase === GamePhase.GUESS_TOTAL);
  const total =
    room.phase === GamePhase.SELECT_MARBLES
      ? room.settings.selectSeconds
      : room.phase === GamePhase.GUESS_TOTAL
        ? room.settings.guessSeconds
        : Math.max(1, ((room.phaseEndsAt ?? 0) - room.phaseStartedAt) / 1000);

  const submitted = room.players.filter((p) => room.roundPublic[p.id]?.submitted).length;
  const active = room.players.filter((p) => !p.eliminated && p.marbleCount > 0).length;

  return (
    <div className="hud">
      <div className="hud__top">
        <span className="hud__round">
          Vòng {room.round}/{room.settings.totalRounds}
        </span>
        <span className="hud__phase">{PHASE_LABEL[room.phase] ?? room.phase}</span>
        {me && (
          <span className="hud__marbles">
            {me.avatar} <b>{me.marbleCount}</b> bi
          </span>
        )}
      </div>

      <TimerBar remaining={remaining} total={total} />

      {room.phase === GamePhase.SELECT_MARBLES && (
        <div className="hud__progress">
          {submitted}/{active} người đã giấu bi
        </div>
      )}

      {!connected && <div className="hud__offline">Mất kết nối — đang thử nối lại…</div>}
    </div>
  );
}
