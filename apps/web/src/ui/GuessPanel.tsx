/**
 * P08 — Cả vòng giấu bi xong, giờ đoán tổng. Art direction §7, §10 (mực loang
 * khi khoá đáp án), §14 (giọng văn).
 */
import { useEffect, useState } from 'react';
import { guessBounds, type GameSettings, type Player, type Team } from '@tongbi/game-rules';
import { doiTheoMau, GiayDo, Khan, Nut } from './common.js';
import { sfx, unlockAudio } from '../audio/sfx.js';

interface Props {
  me: Player;
  myTeam: Team | undefined;
  teammates: Player[];
  activePlayers: Player[];
  settings: GameSettings;
  locked: boolean;
  teamPending: number | null;
  lockedTeams: number;
  totalTeams: number;
  onChange: (value: number) => void;
  onLock: (value: number) => void;
}

export function GuessPanel({
  me,
  myTeam,
  teammates,
  activePlayers,
  settings,
  locked,
  teamPending,
  lockedTeams,
  totalTeams,
  onChange,
  onLock,
}: Props) {
  const { min, max } = guessBounds(activePlayers, settings);
  const [so, setSo] = useState(() => teamPending ?? Math.round((min + max) / 2));

  // Đồng đội chỉnh thì mình thấy đổi theo.
  useEffect(() => {
    if (teamPending !== null && teamPending !== so && !locked) setSo(teamPending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamPending, locked]);

  const choiPhe = teammates.length > 1;
  const doi = doiTheoMau(myTeam?.color);

  if (locked) {
    return (
      <GiayDo className="canh-giua loang-muc">
        <h2 className="tua">Đóng dấu rồi 🔒</h2>
        <p className="moi">
          {myTeam ? <Khan doi={doi} ten={myTeam.name} sm /> : 'Bạn'} đoán{' '}
          <b className="so" style={{ fontFamily: "'Baloo 2', cursive", fontSize: 26 }}>
            {teamPending ?? so}
          </b>
          . Chờ mấy phe kia chốt nốt.
        </p>
        <span className="manh-giay">
          {lockedTeams}/{totalTeams} phe đã chốt
        </span>
      </GiayDo>
    );
  }

  const dat = (n: number) => {
    const moi = Math.min(max, Math.max(min, n));
    if (moi !== so) {
      unlockAudio();
      sfx.bi();
    }
    setSo(moi);
    onChange(moi);
  };

  return (
    <GiayDo ghim className="dan-len">
      <h2 className="tua">Cả vòng có tổng mấy viên?</h2>
      <p className="moi">
        Tay đứa nào cũng nắm chặt rồi. Đoán trong khoảng{' '}
        <b className="so">
          {min}–{max}
        </b>
        {choiPhe ? '. Cả phe chung một đáp án đấy.' : '.'}
      </p>

      <div className="dem">
        <Nut co="sm" onClick={() => dat(so - 1)} disabled={so <= min} nhan="Bớt">
          −
        </Nut>
        <span className="dem-so tong so">{so}</span>
        <Nut co="sm" onClick={() => dat(so + 1)} disabled={so >= max} nhan="Thêm">
          +
        </Nut>
      </div>

      <input
        className="day-thung"
        type="range"
        min={min}
        max={max}
        value={so}
        onChange={(e) => dat(Number(e.target.value))}
        aria-label="Tổng bi bạn đoán"
      />

      <Nut vat="la" co="lg" rong onClick={() => onLock(so)}>
        Khoá đáp án
      </Nut>

      {choiPhe && (
        <p className="ghi-chu">
          Cùng phe: {teammates.filter((t) => t.id !== me.id).map((t) => t.name).join(', ') || '—'}
        </p>
      )}
      <p className="ghi-chu">
        {lockedTeams}/{totalTeams} phe đã chốt
      </p>
    </GiayDo>
  );
}
