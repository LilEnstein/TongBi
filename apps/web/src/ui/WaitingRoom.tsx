/**
 * P03 — Sân đã vạch xong, vòng tròn còn trống, chờ tụi nó tới.
 * Art direction §7 (chiếu cói, giấy dó, trống ếch), §14 (giọng văn).
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
import {
  doiTheoMau,
  GiayDo,
  IconPhat,
  Khan,
  LaTreRoi,
  MaQR,
  MucPhat,
  Non,
  Nut,
  NutChepLink,
  TrongEch,
} from './common.js';

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
  const [the, setThe] = useState<'ai' | 'luat' | 'ru'>('ai');
  const link = `${window.location.origin}/room/${room.id}`;
  const duNguoi = room.players.length >= MIN_PLAYERS;
  const sucChua = room.maxPlayers;
  const day = room.players.length >= sucChua;

  return (
    <main className="san man-p03" data-gio="8h">
      <LaTreRoi />

      <div className="san-trong co-dau">
        <div className="hang deu">
          <GiayDo className="ma-san" style={{ flex: 1 }}>
            <span className="nhan" style={{ marginBottom: 0 }}>
              mã sân
            </span>
            <div className="so-ma so">{room.id}</div>
            <p className={`suc-chua${day ? ' day' : ''}`}>
              {room.players.length}/{sucChua} đứa{day ? ' — chật rồi' : ''}
            </p>
          </GiayDo>
          <Nut vat="gach" co="sm" onClick={onLeave}>
            Về nhà
          </Nut>
        </div>

        <nav className="the-chon">
          <button className={the === 'ai' ? 'dang' : ''} onClick={() => setThe('ai')}>
            Ai đang ngồi ({room.players.length})
          </button>
          <button className={the === 'luat' ? 'dang' : ''} onClick={() => setThe('luat')}>
            Luật sân
          </button>
          <button className={the === 'ru' ? 'dang' : ''} onClick={() => setThe('ru')}>
            Rủ thêm
          </button>
        </nav>

        {the === 'ai' && (
          <>
            <div className="chieu">
              <ul>
                {room.players.map((p) => {
                  const team = room.teams.find((t) => t.id === p.teamId);
                  const doi = doiTheoMau(team?.color);
                  return (
                    <li key={p.id} className={p.id === myId ? 'la-minh' : ''}>
                      <Non avatar={p.avatar} doi={doi} nho mo={!p.connected} />
                      <span className="ten">
                        {p.name}
                        {p.id === myId && <em>(bạn)</em>}
                        {p.isHost && <span className="the">chủ trò</span>}
                        {!p.connected && <span className="the canh">rớt mạng</span>}
                      </span>
                      {room.teamMode > 0 && team && <Khan doi={doi} ten={team.name} sm />}
                      {isHost && p.id !== myId && (
                        <button
                          className="bo-ra"
                          onClick={() => onKick(p.id)}
                          aria-label={`Mời ${p.name} ra khỏi sân`}
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  );
                })}
                {Array.from({ length: Math.max(0, MIN_PLAYERS - room.players.length) }).map((_, i) => (
                  <li key={`cho-${i}`} className="trong-cho">
                    chỗ này còn trống…
                  </li>
                ))}
              </ul>
            </div>

            {room.teamMode > 0 && (
              <GiayDo>
                <span className="nhan">bạn theo phe nào?</span>
                <div className="chon-nhanh">
                  {room.teams.map((t) => {
                    const doi = doiTheoMau(t.color);
                    const dang = room.players.find((p) => p.id === myId)?.teamId === t.id;
                    return (
                      <button
                        key={t.id}
                        className={`the-tre-nho${dang ? ' chon' : ''}`}
                        onClick={() => onSetTeam(t.id)}
                        aria-pressed={dang}
                      >
                        <Khan doi={doi} ten={t.name} sm />
                      </button>
                    );
                  })}
                </div>
              </GiayDo>
            )}

            <div className="canh-giua day">
              {isHost ? (
                <>
                  <TrongEch
                    onClick={onStart}
                    disabled={!duNguoi}
                    chu="Bắt đầu"
                    phu={duNguoi ? 'gõ một cái' : `cần ${MIN_PLAYERS} đứa`}
                  />
                  <p className="dan-nho chu-dat">Gõ trống là cả sân nghe thấy cùng lúc.</p>
                </>
              ) : (
                <p style={{ margin: 0 }}>
                  <span className="loi-nhac">Chờ chủ trò gõ trống…</span>
                </p>
              )}
              {room.players.length <= 1 && (
                <p className="dan-nho chu-dat">Mới có mình bạn. Gửi link cho tụi nó đi.</p>
              )}
            </div>
          </>
        )}

        {the === 'luat' && (
          <LuatSan
            room={room}
            isHost={isHost}
            onUpdateSettings={onUpdateSettings}
            onSetTeamCount={onSetTeamCount}
            onSetPenalties={onSetPenalties}
          />
        )}

        {the === 'ru' && (
          <GiayDo ghim className="canh-giua">
            <p>Gửi cái link này vào nhóm chat, đứa nào bấm vào là ngồi thẳng xuống sân.</p>
            <div className="duong-link">{link}</div>
            <NutChepLink text={link} />
            <MaQR value={link} />
            <p className="ghi-chu">
              Hoặc đọc mã sân cho tụi nó tự gõ: <b className="so">{room.id}</b>
            </p>
          </GiayDo>
        )}
      </div>
    </main>
  );
}

function LuatSan({
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
  const [phatMoi, setPhatMoi] = useState('');
  const khoa = !isHost;

  return (
    <GiayDo className="luat-muc">
      {!isHost && <p className="ghi-chu" style={{ marginTop: 0 }}>Chỉ chủ trò mới sửa được luật sân.</p>}

      <div className="o-nhap">
        <span className="nhan">mỗi đứa bắt đầu với mấy viên</span>
        <DemNho
          value={s.startingMarbles}
          min={1}
          max={40}
          disabled={khoa}
          onChange={(n) => onUpdateSettings({ startingMarbles: n })}
        />
      </div>

      <div className="o-nhap">
        <span className="nhan">chơi mấy vòng</span>
        <DemNho
          value={s.totalRounds}
          min={1}
          max={30}
          disabled={khoa}
          onChange={(n) => onUpdateSettings({ totalRounds: n })}
        />
      </div>

      <div className="o-nhap">
        <span className="nhan">mỗi lượt được bỏ nhiều nhất mấy viên (0 = thoải mái)</span>
        <DemNho
          value={s.maxBet}
          min={0}
          max={20}
          disabled={khoa}
          onChange={(n) => onUpdateSettings({ maxBet: n })}
        />
      </div>

      <div className="o-nhap">
        <span className="nhan">chia phe kiểu gì</span>
        <div className="chon-nhanh">
          {[0, 2, 3, 4].slice(0, MAX_TEAMS + 1).map((n) => (
            <button
              key={n}
              className={`the-tre-nho${room.teamMode === n ? ' chon' : ''}`}
              disabled={khoa}
              onClick={() => onSetTeamCount(n)}
            >
              {n === 0 ? 'ai lo thân nấy' : `${n} phe`}
            </button>
          ))}
        </div>
      </div>

      <div className="o-nhap">
        <span className="nhan">thế nào là trúng</span>
        <div className="chon-nhanh">
          {[
            { v: WinRule.EXACT, l: 'trúng phóc mới ăn' },
            { v: WinRule.CLOSEST, l: 'gần nhất là ăn' },
            { v: WinRule.EXACT_UNIQUE, l: 'trúng phóc & không đụng ai' },
          ].map((o) => (
            <button
              key={o.v}
              className={`the-tre-nho${s.winRule === o.v ? ' chon' : ''}`}
              disabled={khoa}
              onClick={() => onUpdateSettings({ winRule: o.v })}
            >
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="o-nhap">
        <span className="nhan">ăn thua bao nhiêu bi</span>
        <div className="chon-nhanh">
          <button
            className={`the-tre-nho${s.payout === PayoutMode.STAKE ? ' chon' : ''}`}
            disabled={khoa}
            onClick={() => onUpdateSettings({ payout: PayoutMode.STAKE })}
          >
            bi trong tay là bi cược
          </button>
          <button
            className={`the-tre-nho${s.payout === PayoutMode.FIXED ? ' chon' : ''}`}
            disabled={khoa}
            onClick={() => onUpdateSettings({ payout: PayoutMode.FIXED })}
          >
            ăn thua cố định
          </button>
        </div>
        {s.payout === PayoutMode.FIXED && (
          <div style={{ marginTop: 10 }}>
            <DemNho
              value={s.fixedPayout}
              min={1}
              max={10}
              disabled={khoa}
              onChange={(n) => onUpdateSettings({ fixedPayout: n })}
            />
          </div>
        )}
        <p className="ghi-chu">
          {s.payout === PayoutMode.STAKE
            ? 'Bi đã bỏ vào tay coi như đặt xuống đất: phe trúng chia nhau bi của phe trật.'
            : `Phe trúng ăn ${s.fixedPayout} bi, phe trật mất ${s.fixedPayout} bi.`}
        </p>
      </div>

      <div className="o-nhap">
        <span className="nhan">sạch túi thì sao</span>
        <div className="chon-nhanh">
          <button
            className={`the-tre-nho${s.brokeRule === BrokeRule.DICE ? ' chon' : ''}`}
            disabled={khoa}
            onClick={() => onUpdateSettings({ brokeRule: BrokeRule.DICE, diceEnabled: true })}
          >
            tung xúc xắc vay bi
          </button>
          <button
            className={`the-tre-nho${s.brokeRule === BrokeRule.ELIMINATE ? ' chon' : ''}`}
            disabled={khoa}
            onClick={() => onUpdateSettings({ brokeRule: BrokeRule.ELIMINATE })}
          >
            ra ngồi ngoài luôn
          </button>
        </div>
      </div>

      <div className="o-nhap">
        <span className="nhan">mỗi bước cho mấy giây</span>
        <div className="ba-cot">
          <DemNho
            label="chọn bi"
            value={s.selectSeconds}
            min={5}
            max={90}
            disabled={khoa}
            onChange={(n) => onUpdateSettings({ selectSeconds: n })}
          />
          <DemNho
            label="đoán"
            value={s.guessSeconds}
            min={5}
            max={90}
            disabled={khoa}
            onChange={(n) => onUpdateSettings({ guessSeconds: n })}
          />
          <DemNho
            label="xem kết quả"
            value={s.revealSeconds}
            min={2}
            max={20}
            disabled={khoa}
            onChange={(n) => onUpdateSettings({ revealSeconds: n })}
          />
        </div>
      </div>

      <div className="o-nhap">
        <span className="nhan">phạt gì khi xúc xắc trúng mặt phạt</span>
        <ul className="danh-phat">
          {s.penalties.map((p) => (
            <li key={p.id}>
              <span>
                <IconPhat id={p.id} size={30} />
                <span>
                  {p.label}
                  <MucPhat muc={p.severity} />
                </span>
              </span>
              {isHost && s.penalties.length > 3 && (
                <button
                  onClick={() => onSetPenalties(s.penalties.filter((x) => x.id !== p.id))}
                  aria-label={`Bỏ hình phạt ${p.label}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {isHost && (
          <form
            className="hang"
            style={{ flexWrap: 'nowrap' }}
            onSubmit={(e) => {
              e.preventDefault();
              const label = phatMoi.trim();
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
              setPhatMoi('');
            }}
          >
            <label className="nan">
              <input
                value={phatMoi}
                onChange={(e) => setPhatMoi(e.target.value)}
                placeholder="nghĩ ra trò phạt khác…"
                maxLength={40}
                aria-label="Hình phạt tự thêm"
              />
            </label>
            <Nut type="submit" co="sm">
              Thêm
            </Nut>
          </form>
        )}
        <p className="ghi-chu">
          Xúc xắc gỗ có ba mặt cho vay bi (3 · 6 · 9) và ba mặt là trò phạt lấy từ đây.
        </p>
      </div>

      <p className="ghi-chu">Sân này chứa tối đa {room.maxPlayers} đứa.</p>
    </GiayDo>
  );
}

function DemNho({
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
    <div>
      {label && <small style={{ display: 'block', fontSize: 13, opacity: 0.7 }}>{label}</small>}
      <div className="dem-nho">
        <button disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label="Bớt">
          −
        </button>
        <b className="so">{value}</b>
        <button disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label="Thêm">
          +
        </button>
      </div>
    </div>
  );
}
