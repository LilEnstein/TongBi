/**
 * Tan sân — hoàng hôn, khói bếp (§2). Xếp hạng đếm bằng túi bi, không phải bảng số.
 */
import type { PublicRoomState } from '@tongbi/game-rules';
import { GiayDo, Met, Non, Nut, TuiBi } from './common.js';

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
  const bang = room.finalStandings ?? [];
  const nhat = bang[0];
  const nguoiNhat = room.players.find((p) => p.id === nhat?.playerId);
  const nhieuNhat = Math.max(1, ...bang.map((s) => s.marbles));

  return (
    <>
      {nguoiNhat && (
        <Met className="tong-that hien">
          <span className="nhan-nho">ôm bi về nhất</span>
          <div className="canh-giua" style={{ display: 'flex', justifyContent: 'center' }}>
            <Non avatar={nguoiNhat.avatar} />
          </div>
          <div style={{ fontFamily: "'Baloo 2', cursive", fontWeight: 800, fontSize: 21 }}>
            {nguoiNhat.name}
          </div>
        </Met>
      )}

      <GiayDo ghim>
        <h2 className="tua canh-giua">Chiều xuống rồi, tan sân thôi</h2>

        <ol className="xep-hang">
          {bang.map((s) => {
            const p = room.players.find((x) => x.id === s.playerId);
            if (!p) return null;
            return (
              <li key={s.playerId} className={s.playerId === myId ? 'la-minh' : ''}>
                <span className="hang-so so">#{s.rank}</span>
                <span className="ai">
                  <Non avatar={p.avatar} nho /> {p.name}
                </span>
                <span style={{ transform: 'scale(.55)', transformOrigin: 'right center' }}>
                  <TuiBi so={s.marbles} tong={nhieuNhat} />
                </span>
                <span className="may-bi so">{s.marbles}</span>
              </li>
            );
          })}
        </ol>

        <hr className="tach" />

        {isHost ? (
          <Nut vat="la" co="lg" rong onClick={onPlayAgain}>
            Chơi ván nữa đi
          </Nut>
        ) : (
          <p className="canh-giua" style={{ margin: 0 }}>
            <span className="loi-nhac">Chờ chủ trò vạch sân mới…</span>
          </p>
        )}
        <div style={{ marginTop: 10 }}>
          <Nut vat="mo" rong onClick={onLeave}>
            Về nhà
          </Nut>
        </div>
      </GiayDo>
    </>
  );
}
