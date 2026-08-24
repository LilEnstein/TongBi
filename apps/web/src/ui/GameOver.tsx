/** Bảng xếp hạng cuối trận. */
import type { PublicRoomState } from '@tongbi/game-rules';
import { Button } from './common.js';

export function GameOver({
  room,
  myId,
  isHost,
  onPlayAgain,
  onLeave,
}: {
  room: PublicRoomState;
  myId: string | null;
  isHost: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}) {
  const standings = room.finalStandings ?? [];
  const champion = standings[0];
  const championPlayer = room.players.find((p) => p.id === champion?.playerId);

  return (
    <div className="panel gameover">
      <div className="gameover__crown">👑</div>
      <div className="panel__title">
        {championPlayer ? `${championPlayer.avatar} ${championPlayer.name} thắng chung cuộc!` : 'Trận đấu kết thúc'}
      </div>

      <ol className="standings">
        {standings.map((s) => {
          const p = room.players.find((x) => x.id === s.playerId);
          if (!p) return null;
          return (
            <li key={s.playerId} className={s.playerId === myId ? 'me' : ''}>
              <span className="rank">#{s.rank}</span>
              <span className="who">
                {p.avatar} {p.name}
              </span>
              <span className="score">{s.marbles} bi</span>
            </li>
          );
        })}
      </ol>

      {isHost ? (
        <Button full onClick={onPlayAgain}>
          Chơi lại
        </Button>
      ) : (
        <p className="panel__hint center">Chờ chủ phòng mở ván mới…</p>
      )}
      <Button full variant="ghost" onClick={onLeave}>
        Rời phòng
      </Button>
    </div>
  );
}
