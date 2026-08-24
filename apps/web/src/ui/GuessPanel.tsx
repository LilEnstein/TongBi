/**
 * Nhập tổng bi cả bàn — design doc §5, §14 (Guess UI).
 * Cả đội chia sẻ một đáp án: ai cũng chỉnh được, khoá rồi thì không đổi.
 */
import { useEffect, useState } from 'react';
import { guessBounds, type GameSettings, type Player, type Team } from '@tongbi/game-rules';
import { Button } from './common.js';
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
  const [value, setValue] = useState(() => teamPending ?? Math.round((min + max) / 2));

  // Đồng đội chỉnh thì mình thấy đổi theo.
  useEffect(() => {
    if (teamPending !== null && teamPending !== value && !locked) setValue(teamPending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamPending, locked]);

  const isTeamPlay = teammates.length > 1;

  if (locked) {
    return (
      <div className="panel panel--calm">
        <div className="panel__title">Đã khoá đáp án 🔒</div>
        <p className="panel__hint">
          {myTeam?.name ?? 'Đội bạn'} đoán <b>{teamPending ?? value}</b>. Đang chờ các đội còn lại…
        </p>
        <div className="pill">
          {lockedTeams}/{totalTeams} đội đã khoá
        </div>
      </div>
    );
  }

  const set = (n: number) => {
    const next = Math.min(max, Math.max(min, n));
    if (next !== value) {
      unlockAudio();
      sfx.marbleClick();
    }
    setValue(next);
    onChange(next);
  };

  return (
    <div className="panel">
      <div className="panel__title">Tổng bi bạn đoán?</div>
      <p className="panel__hint">
        Tất cả bàn tay đã nắm lại. Đoán tổng số bi đang được giấu — trong khoảng{' '}
        <b>
          {min}–{max}
        </b>
        .
        {isTeamPlay && ' Cả đội dùng chung một đáp án.'}
      </p>

      <div className="stepper">
        <button className="stepper__btn" onClick={() => set(value - 1)} disabled={value <= min} aria-label="Giảm">
          −
        </button>
        <div className="stepper__value stepper__value--big">
          <span>{value}</span>
        </div>
        <button className="stepper__btn" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Tăng">
          +
        </button>
      </div>

      <input
        className="slider"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        aria-label="Tổng bi dự đoán"
      />

      <Button full variant="success" onClick={() => onLock(value)}>
        Khoá đáp án 🔒
      </Button>

      {isTeamPlay && (
        <p className="panel__note">
          Đồng đội: {teammates.filter((t) => t.id !== me.id).map((t) => t.name).join(', ') || '—'}
        </p>
      )}
      <div className="pill">
        {lockedTeams}/{totalTeams} đội đã khoá
      </div>
    </div>
  );
}
