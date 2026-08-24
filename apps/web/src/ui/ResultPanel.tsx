/** Kết quả lượt — design doc §7 và §14 (Result UI). */
import type { Player, RoundResult, Team } from '@tongbi/game-rules';

interface Props {
  result: RoundResult;
  teams: Team[];
  players: Player[];
  myTeamId: string | undefined;
}

export function ResultPanel({ result, teams, players, myTeamId }: Props) {
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const teamColor = (id: string) => teams.find((t) => t.id === id)?.color ?? '#888';
  const iWon = myTeamId ? result.winningTeamIds.includes(myTeamId) : false;

  const headline = result.push
    ? 'Không đội nào đoán trúng — hoàn bi!'
    : iWon
      ? 'Đội bạn thắng lượt này! 🎉'
      : `${result.winningTeamIds.map(teamName).join(', ')} thắng lượt này`;

  return (
    <div className={`panel result${iWon ? ' result--win' : ''}`}>
      <div className="result__total">
        <span>TỔNG THỰC TẾ</span>
        <b>{result.actualTotal}</b>
      </div>

      <div className="result__headline">{headline}</div>

      <ul className="result__guesses">
        {result.guesses.map((g) => {
          const won = result.winningTeamIds.includes(g.teamId);
          return (
            <li key={g.teamId} className={won ? 'is-win' : g.disqualified ? 'is-dq' : ''}>
              <span className="dot" style={{ background: teamColor(g.teamId) }} />
              <span className="name">{teamName(g.teamId)}</span>
              <span className="value">{g.value}</span>
              <span className="mark">
                {won ? '✓' : g.disqualified ? 'trùng đáp án' : `lệch ${g.delta}`}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="result__deltas">
        {result.reveals.map((r) => {
          const p = players.find((x) => x.id === r.playerId);
          const d = result.marbleDeltas.find((x) => x.playerId === r.playerId);
          if (!p) return null;
          return (
            <div key={r.playerId} className="result__row">
              <span>
                {p.avatar} {p.name}
              </span>
              <span className="result__hand">giấu {r.marbles}</span>
              <span className={`result__delta ${(d?.delta ?? 0) >= 0 ? 'up' : 'down'}`}>
                {(d?.delta ?? 0) > 0 ? `+${d?.delta}` : (d?.delta ?? 0)} → {d?.after ?? p.marbleCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
