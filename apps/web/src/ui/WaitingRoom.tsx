/**
 * Sảnh chờ — design doc §14 (Waiting Room) và §22 (tạo phòng, gửi link).
 * Chủ phòng chỉnh luật ở đây; mọi người khác thấy luật cập nhật theo thời gian thực.
 */
import { useState } from 'react';
import {
  BrokeRule,
  MAX_TEAMS,
  MIN_PLAYERS,
  PayoutMode,
  WinRule,
  type Penalty,
  type PublicRoomState,
} from '@tongbi/game-rules';
import { Button, CopyButton, QrCode } from './common.js';

interface Props {
  room: PublicRoomState;
  myId: string | null;
  isHost: boolean;
  onStart: () => void;
  onUpdateSettings: (patch: Record<string, unknown>) => void;
  onSetTeamCount: (n: number) => void;
  onSetTeam: (teamId: string) => void;
  onKick: (playerId: string) => void;
  onLeave: () => void;
  onSetPenalties: (penalties: Penalty[]) => void;
}

export function WaitingRoom({
  room,
  myId,
  isHost,
  onStart,
  onUpdateSettings,
  onSetTeamCount,
  onSetTeam,
  onKick,
  onLeave,
  onSetPenalties,
}: Props) {
  const [tab, setTab] = useState<'people' | 'rules' | 'share'>('people');
  const link = `${window.location.origin}/room/${room.id}`;
  const canStart = room.players.length >= MIN_PLAYERS;
  const capacity = room.maxPlayers;
  const isFull = room.players.length >= capacity;

  return (
    <div className="lobby">
      <header className="lobby__head">
        <div>
          <div className="lobby__code-label">MÃ PHÒNG</div>
          <div className="lobby__code">{room.id}</div>
          <div className={`lobby__capacity${isFull ? ' lobby__capacity--full' : ''}`}>
            {room.players.length} / {capacity} người{isFull ? ' — phòng đã đầy' : ''}
          </div>
        </div>
        <Button variant="ghost" onClick={onLeave}>
          Rời phòng
        </Button>
      </header>

      <nav className="tabs">
        <button className={tab === 'people' ? 'on' : ''} onClick={() => setTab('people')}>
          Người chơi ({room.players.length}/{capacity})
        </button>
        <button className={tab === 'rules' ? 'on' : ''} onClick={() => setTab('rules')}>
          Luật chơi
        </button>
        <button className={tab === 'share' ? 'on' : ''} onClick={() => setTab('share')}>
          Mời bạn
        </button>
      </nav>

      {tab === 'people' && (
        <section className="lobby__body">
          <ul className="players">
            {room.players.map((p) => {
              const team = room.teams.find((t) => t.id === p.teamId);
              return (
                <li key={p.id} className="player-row">
                  <span className="player-row__avatar">{p.avatar}</span>
                  <span className="player-row__name">
                    {p.name}
                    {p.id === myId && <em> (bạn)</em>}
                    {p.isHost && <span className="tag tag--host">chủ phòng</span>}
                    {!p.connected && <span className="tag tag--warn">mất kết nối</span>}
                  </span>
                  {room.teamMode > 0 && team && (
                    <span className="tag" style={{ background: team.color }}>
                      {team.name}
                    </span>
                  )}
                  {isHost && p.id !== myId && (
                    <button className="player-row__kick" onClick={() => onKick(p.id)} aria-label={`Mời ${p.name} ra`}>
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
            {Array.from({ length: Math.max(0, MIN_PLAYERS - room.players.length) }).map((_, i) => (
              <li key={`empty-${i}`} className="player-row player-row--empty">
                Đang chờ người chơi…
              </li>
            ))}
          </ul>

          {room.teamMode > 0 && (
            <div className="field">
              <label>Đội của bạn</label>
              <div className="chips">
                {room.teams.map((t) => (
                  <button
                    key={t.id}
                    className={`chip${room.players.find((p) => p.id === myId)?.teamId === t.id ? ' chip--on' : ''}`}
                    style={{ borderColor: t.color }}
                    onClick={() => onSetTeam(t.id)}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isHost ? (
            <Button full onClick={onStart} disabled={!canStart}>
              {canStart ? 'BẮT ĐẦU' : `Cần ít nhất ${MIN_PLAYERS} người`}
            </Button>
          ) : (
            <p className="panel__hint center">Đang chờ chủ phòng bắt đầu…</p>
          )}
        </section>
      )}

      {tab === 'rules' && (
        <section className="lobby__body">
          <RulesEditor
            room={room}
            isHost={isHost}
            onUpdateSettings={onUpdateSettings}
            onSetTeamCount={onSetTeamCount}
            onSetPenalties={onSetPenalties}
          />
        </section>
      )}

      {tab === 'share' && (
        <section className="lobby__body center">
          <p className="panel__hint">Gửi link này vào nhóm chat, ai bấm vào là vào thẳng phòng.</p>
          <div className="link-box">{link}</div>
          <CopyButton text={link} />
          <QrCode value={link} />
          <p className="panel__note">Hoặc đọc mã phòng cho bạn bè tự nhập: <b>{room.id}</b></p>
        </section>
      )}
    </div>
  );
}

function RulesEditor({
  room,
  isHost,
  onUpdateSettings,
  onSetTeamCount,
  onSetPenalties,
}: {
  room: PublicRoomState;
  isHost: boolean;
  onUpdateSettings: (patch: Record<string, unknown>) => void;
  onSetTeamCount: (n: number) => void;
  onSetPenalties: (p: Penalty[]) => void;
}) {
  const s = room.settings;
  const [newPenalty, setNewPenalty] = useState('');
  const disabled = !isHost;

  return (
    <div className="rules">
      {!isHost && <p className="panel__note">Chỉ chủ phòng chỉnh được luật.</p>}

      <div className="field">
        <label>Số bi khởi đầu</label>
        <NumberRow
          value={s.startingMarbles}
          min={1}
          max={40}
          disabled={disabled}
          onChange={(n) => onUpdateSettings({ startingMarbles: n })}
        />
      </div>

      <div className="field">
        <label>Số vòng</label>
        <NumberRow
          value={s.totalRounds}
          min={1}
          max={30}
          disabled={disabled}
          onChange={(n) => onUpdateSettings({ totalRounds: n })}
        />
      </div>

      <div className="field">
        <label>Bi tối đa mỗi lượt (0 = không giới hạn)</label>
        <NumberRow
          value={s.maxBet}
          min={0}
          max={20}
          disabled={disabled}
          onChange={(n) => onUpdateSettings({ maxBet: n })}
        />
      </div>

      <div className="field">
        <label>Cách chia đội</label>
        <div className="chips">
          {[0, 2, 3, 4].slice(0, MAX_TEAMS + 1).map((n) => (
            <button
              key={n}
              className={`chip${room.teamMode === n ? ' chip--on' : ''}`}
              disabled={disabled}
              onClick={() => onSetTeamCount(n)}
            >
              {n === 0 ? 'Mỗi người một đội' : `${n} đội`}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Luật thắng lượt</label>
        <div className="chips">
          {[
            { v: WinRule.EXACT, l: 'Đoán đúng tuyệt đối' },
            { v: WinRule.CLOSEST, l: 'Gần nhất thì thắng' },
            { v: WinRule.EXACT_UNIQUE, l: 'Đúng & không trùng' },
          ].map((o) => (
            <button
              key={o.v}
              className={`chip${s.winRule === o.v ? ' chip--on' : ''}`}
              disabled={disabled}
              onClick={() => onUpdateSettings({ winRule: o.v })}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Ăn thua bi</label>
        <div className="chips">
          <button
            className={`chip${s.payout === PayoutMode.STAKE ? ' chip--on' : ''}`}
            disabled={disabled}
            onClick={() => onUpdateSettings({ payout: PayoutMode.STAKE })}
          >
            Bi đặt là bi cược
          </button>
          <button
            className={`chip${s.payout === PayoutMode.FIXED ? ' chip--on' : ''}`}
            disabled={disabled}
            onClick={() => onUpdateSettings({ payout: PayoutMode.FIXED })}
          >
            Thắng/thua cố định
          </button>
        </div>
        {s.payout === PayoutMode.FIXED && (
          <NumberRow
            value={s.fixedPayout}
            min={1}
            max={10}
            disabled={disabled}
            onChange={(n) => onUpdateSettings({ fixedPayout: n })}
          />
        )}
        <p className="panel__note">
          {s.payout === PayoutMode.STAKE
            ? 'Bi đã bỏ vào tay là tiền cược: đội thắng chia số bi của phe thua.'
            : `Đội thắng được +${s.fixedPayout} bi, phe thua mất ${s.fixedPayout} bi.`}
        </p>
      </div>

      <div className="field">
        <label>Khi hết bi</label>
        <div className="chips">
          <button
            className={`chip${s.brokeRule === BrokeRule.DICE ? ' chip--on' : ''}`}
            disabled={disabled}
            onClick={() => onUpdateSettings({ brokeRule: BrokeRule.DICE, diceEnabled: true })}
          >
            Tung xúc xắc vay bi
          </button>
          <button
            className={`chip${s.brokeRule === BrokeRule.ELIMINATE ? ' chip--on' : ''}`}
            disabled={disabled}
            onClick={() => onUpdateSettings({ brokeRule: BrokeRule.ELIMINATE })}
          >
            Bị loại luôn
          </button>
        </div>
      </div>

      <div className="field">
        <label>Thời gian mỗi bước (giây)</label>
        <div className="grid-3">
          <NumberRow
            label="Chọn bi"
            value={s.selectSeconds}
            min={5}
            max={90}
            disabled={disabled}
            onChange={(n) => onUpdateSettings({ selectSeconds: n })}
          />
          <NumberRow
            label="Đoán"
            value={s.guessSeconds}
            min={5}
            max={90}
            disabled={disabled}
            onChange={(n) => onUpdateSettings({ guessSeconds: n })}
          />
          <NumberRow
            label="Xem kết quả"
            value={s.revealSeconds}
            min={2}
            max={20}
            disabled={disabled}
            onChange={(n) => onUpdateSettings({ revealSeconds: n })}
          />
        </div>
      </div>

      <div className="field">
        <label>Hình phạt trên xúc xắc</label>
        <ul className="penalties">
          {s.penalties.map((p) => (
            <li key={p.id}>
              <span>
                {p.icon} {p.label}
              </span>
              {isHost && s.penalties.length > 3 && (
                <button
                  onClick={() => onSetPenalties(s.penalties.filter((x) => x.id !== p.id))}
                  aria-label={`Xoá ${p.label}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {isHost && (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              const label = newPenalty.trim();
              if (!label) return;
              onSetPenalties([
                ...s.penalties,
                {
                  id: `custom-${Date.now()}`,
                  label,
                  description: label,
                  icon: '🎯',
                  severity: 'MEDIUM',
                },
              ]);
              setNewPenalty('');
            }}
          >
            <input
              value={newPenalty}
              onChange={(e) => setNewPenalty(e.target.value)}
              placeholder="Thêm hình phạt của bạn…"
              maxLength={40}
            />
            <Button type="submit" variant="ghost">
              Thêm
            </Button>
          </form>
        )}
        <p className="panel__note">
          Xúc xắc luôn có 3 mặt vay bi (+3 / +6 / +9) và 3 mặt hình phạt lấy từ danh sách này.
        </p>
      </div>

      <p className="panel__note">Phòng tối đa {room.maxPlayers} người.</p>
    </div>
  );
}

function NumberRow({
  value,
  min,
  max,
  onChange,
  disabled,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="numrow">
      {label && <small>{label}</small>}
      <div className="numrow__ctl">
        <button disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <b>{value}</b>
        <button disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
