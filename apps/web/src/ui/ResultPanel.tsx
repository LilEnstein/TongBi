/**
 * P10 — Mở tay, đếm bi. Tổng thật nằm giữa mẹt tre, dưới là phe nào đoán bao nhiêu.
 * Art direction §7, §10 (bụi đất, không confetti), §14.
 */
import type { Player, RoundResult, Team } from '@tongbi/game-rules';
import { doiTheoMau, GiayDo, Khan, Met, Non, VachDat } from './common.js';

interface Props {
  result: RoundResult;
  teams: Team[];
  players: Player[];
  myTeamId: string | undefined;
}

export function ResultPanel({ result, teams, players, myTeamId }: Props) {
  const tenPhe = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const doiCua = (id: string) => doiTheoMau(teams.find((t) => t.id === id)?.color);
  const minhTrung = myTeamId ? result.winningTeamIds.includes(myTeamId) : false;

  const reo = result.push
    ? 'Trật lất cả lũ — bi ai nấy giữ'
    : minhTrung
      ? 'Trúng phóc!'
      : `${result.winningTeamIds.map(tenPhe).join(', ')} trúng phóc`;

  return (
    <>
      <Met className="tong-that hien">
        <span className="nhan-nho">tổng thực tế</span>
        <div className="so-to so">{result.actualTotal}</div>
      </Met>

      <p className="reo">{reo}</p>

      <GiayDo>
        <ul className="bang-doan">
          {result.guesses.map((g) => {
            const trung = result.winningTeamIds.includes(g.teamId);
            const diem = teams.find((t) => t.id === g.teamId)?.score ?? 0;
            return (
              <li key={g.teamId} className={trung ? 'trung' : g.disqualified ? 'hong' : ''}>
                <Khan doi={doiCua(g.teamId)} ten={tenPhe(g.teamId)} sm />
                <span className="lech">
                  {trung ? 'trúng' : g.disqualified ? 'đụng đáp án' : `lệch ${g.delta}`}
                </span>
                <span className="so-doan so">{g.value}</span>
                {diem > 0 && (
                  <span className="vach-nho">
                    <VachDat so={diem} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div style={{ marginTop: 12 }}>
          {result.reveals.map((r) => {
            const p = players.find((x) => x.id === r.playerId);
            const d = result.marbleDeltas.find((x) => x.playerId === r.playerId);
            if (!p) return null;
            const chenh = d?.delta ?? 0;
            return (
              <div key={r.playerId} className="dong-bi">
                <span>
                  <Non avatar={p.avatar} nho /> {p.name}
                </span>
                <span className="giau">giấu {r.marbles}</span>
                <span className={`chenh so ${chenh >= 0 ? 'len' : 'xuong'}`}>
                  {chenh > 0 ? `+${chenh}` : chenh} → {d?.after ?? p.marbleCount}
                </span>
              </div>
            );
          })}
        </div>
      </GiayDo>
    </>
  );
}
