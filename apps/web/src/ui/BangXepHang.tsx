/**
 * Bảng xếp hạng cuối vòng — chiếu cói trải giữa sân (§7).
 *
 * Mỗi dòng là một phe: hạng, khăn đội, đáp án đã đoán, và ngay dưới là từng
 * đứa trong phe giấu mấy viên, được/mất mấy viên. Gộp làm một chỗ để không
 * phải đọc hai bảng — bảng đoán và bảng bi — mới hiểu chuyện gì vừa xảy ra.
 *
 * Phe thắng nhấn bằng vật liệu (nền vàng nghệ, viền mực, nắm tay giơ lên), không
 * nhấn bằng viền màu bên trái — §3.3: vàng nghệ chỉ dành cho một thứ tại một
 * thời điểm, ở màn này là phe thắng.
 */
import { useEffect, useRef } from 'react';
import type { Player, RoundResult, Team } from '@tongbi/game-rules';
import { doiTheoMau, Khan, Non, type MauDoi } from './common.js';

export interface NguoiTrongPhe {
  player: Player;
  /** Số bi đã giấu trong tay lượt này; null nếu ngồi ngoài lượt. */
  giau: number | null;
  chenh: number;
  conLai: number;
}

export interface DongPhe {
  team: Team;
  doi: MauDoi;
  /** Hoà điểm thì chung một hạng. */
  hang: number;
  trung: boolean;
  /** Rule C — đoán trùng số với phe khác nên mất quyền thắng. */
  hong: boolean;
  doan: number | null;
  lech: number;
  /** Điểm ăn được riêng vòng này: server cộng 1 cho mỗi phe thắng. */
  diemThem: number;
  nguoi: NguoiTrongPhe[];
}

/**
 * Xếp các phe theo điểm rồi gắn kèm mọi thứ cần cho một dòng.
 * Hàm thuần, không đọc state — tách ra để test được thứ tự và cách chia hạng.
 *
 * `team.score` server gửi xuống ĐÃ cộng điểm của vòng vừa xong (xem
 * `Room.finishRound`), nên `diemThem` chỉ để nói phe nào vừa ăn điểm.
 */
export function xepHang(teams: Team[], players: Player[], result: RoundResult): DongPhe[] {
  const thang = new Set(result.winningTeamIds);
  const doanTheoPhe = new Map(result.guesses.map((g) => [g.teamId, g]));
  const giauTheoNguoi = new Map(result.reveals.map((r) => [r.playerId, r.marbles]));
  const biTheoNguoi = new Map(result.marbleDeltas.map((d) => [d.playerId, d]));

  // Phe rỗng (người bỏ về hết) không có gì để đọc, bỏ khỏi bảng.
  const co = teams
    .map((team, thuTu) => ({ team, thuTu }))
    .filter(({ team }) => players.some((p) => p.teamId === team.id));

  // Bằng điểm thì giữ nguyên thứ tự server gửi, để bảng không nhảy lung tung
  // giữa hai vòng chỉ vì hai phe hoà nhau.
  co.sort((a, b) => b.team.score - a.team.score || a.thuTu - b.thuTu);

  let hangTruoc = 0;
  let diemTruoc = Number.NaN;

  return co.map(({ team }, i) => {
    const hang = team.score === diemTruoc ? hangTruoc : i + 1;
    hangTruoc = hang;
    diemTruoc = team.score;

    const g = doanTheoPhe.get(team.id);
    const trung = thang.has(team.id);

    return {
      team,
      doi: doiTheoMau(team.color),
      hang,
      trung,
      hong: g?.disqualified ?? false,
      doan: g?.value ?? null,
      lech: g?.delta ?? 0,
      diemThem: trung ? 1 : 0,
      nguoi: players
        .filter((p) => p.teamId === team.id)
        .sort((a, b) => a.seat - b.seat)
        .map((player) => {
          const bi = biTheoNguoi.get(player.id);
          return {
            player,
            giau: giauTheoNguoi.get(player.id) ?? null,
            chenh: bi?.delta ?? 0,
            conLai: bi?.after ?? player.marbleCount,
          };
        }),
    };
  });
}

/** Nắm tay giơ lên — dấu hiệu của game, dùng thay vương miện cho phe nhất. */
function NamTayGio() {
  return (
    <svg
      className="que nam-tay"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6.2 11.6c0-1 .8-1.9 1.9-1.9h7.8c1 0 1.9.8 1.9 1.9v2.9c0 2.4-2 4.4-4.4 4.4h-2.8c-2.4 0-4.4-2-4.4-4.4z" />
      <path d="M6.2 12.6 4.4 10.9" />
      <path d="M9.4 9.7V7.6M12.1 9.7V7.2M14.8 9.7V7.9" />
    </svg>
  );
}

/**
 * Câu tả đáp án của một phe, viết thường như mọi nhãn khác (§5).
 *
 * Thắng KHÔNG có nghĩa là đoán đúng: luật CLOSEST (mặc định) cho phe lệch ít
 * nhất thắng. Ghi "trúng" cho một phe đoán 8 trong khi tổng thật là 6 thì bảng
 * tự mâu thuẫn với cái mẹt ngay phía trên, nên chỉ "trúng" khi lệch bằng 0.
 *
 * Chuyện phe này thắng đã có nền vàng nghệ, viền mực, nắm tay giơ lên và chip
 * +1 nói rồi — câu này chỉ cần nói đúng con số, và ngắn để không xuống dòng.
 */
export function loiDoan(d: DongPhe): string {
  if (d.doan === null) return 'không kịp đoán';
  if (d.hong) return `đoán ${d.doan} · đụng đáp án phe khác`;
  if (d.lech === 0) return `đoán ${d.doan} · trúng`;
  return `đoán ${d.doan} · lệch ${d.lech}`;
}

export function BangXepHang({
  dong,
  myTeamId,
}: {
  dong: DongPhe[];
  myTeamId: string | undefined;
}) {
  const than = useRef<HTMLOListElement>(null);

  // Sân đông thì bảng cuộn trong lòng nó; kéo dòng phe mình vào tầm mắt để
  // không ai phải tự đi tìm mình mới biết đang đứng thứ mấy. Chỉ động vào
  // thanh cuộn của bảng, không kéo cả tấm giấy dưới chân.
  useEffect(() => {
    const box = than.current;
    const dongMinh = box?.querySelector<HTMLElement>('.la-minh');
    if (!box || !dongMinh) return;
    const tren = dongMinh.offsetTop;
    const duoi = tren + dongMinh.offsetHeight;
    if (tren < box.scrollTop) box.scrollTop = tren;
    else if (duoi > box.scrollTop + box.clientHeight) box.scrollTop = duoi - box.clientHeight;
  }, [dong, myTeamId]);

  if (dong.length === 0) return null;

  return (
    <div className="bang-phe">
      <div className="dau-bang">
        <span className="o-hang">hạng</span>
        <span className="o-phe">phe và người</span>
        <span className="o-diem">điểm</span>
      </div>

      <ol className="than-bang" ref={than}>
        {dong.map((d) => (
          <li
            key={d.team.id}
            className={[
              'dong-phe',
              d.trung ? 'trung' : '',
              d.hong ? 'hong' : '',
              d.team.id === myTeamId ? 'la-minh' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="hang-phe so" aria-label={`hạng ${d.hang}`}>
              {d.hang}
            </span>

            <div className="than-phe">
              <div className="tren-phe">
                <Khan doi={d.doi} ten={d.team.name} sm />
                {d.trung && <NamTayGio />}
                <span className="doan-phe">{loiDoan(d)}</span>
              </div>

              <div className="nguoi-phe">
                {d.nguoi.map((n) => (
                  <span className="ai-phe" key={n.player.id}>
                    <Non avatar={n.player.avatar} doi={d.doi} nho mo={n.player.eliminated} />
                    <b>{n.player.name}</b>
                    {n.giau !== null && <em className="giau">giấu {n.giau}</em>}
                    {n.chenh !== 0 && (
                      <em className={`chenh so ${n.chenh > 0 ? 'len' : 'xuong'}`}>
                        {n.chenh > 0 ? `+${n.chenh}` : n.chenh}
                      </em>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <span className="cot-diem">
              <b className="diem-phe so">{d.team.score}</b>
              <em className={`them-diem so${d.diemThem > 0 ? ' an' : ''}`}>
                {d.diemThem > 0 ? `+${d.diemThem}` : '+0'}
              </em>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
