/**
 * Sân chơi: cùng một nền đất cho mọi người, panel đổi theo phase.
 * Mọi hành động đều gửi lên server rồi chờ state mới — client không tự đổi gì.
 *
 * Art direction §2: mỗi phase là một khung giờ khác nhau trong buổi chiều,
 * đổi bằng tint của lớp .nang chứ không đổi cả cảnh.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AVATAR_TEN,
  AVATARS,
  GamePhase,
  type Penalty,
  type SessionCredentials,
} from '@tongbi/game-rules';
import { emitAck, getSocket, ServerError } from '../net/socket.js';
import { useGame } from '../net/store.js';
import { loadProfile, saveProfile } from '../lib/session.js';
import { useCountdown } from '../lib/useCountdown.js';
import { Scene } from '../three/Scene.js';
import { Hud } from '../ui/Hud.js';
import { WaitingRoom } from '../ui/WaitingRoom.js';
import { MarblePicker } from '../ui/MarblePicker.js';
import { GuessPanel } from '../ui/GuessPanel.js';
import { ResultPanel } from '../ui/ResultPanel.js';
import { DicePanel } from '../ui/DicePanel.js';
import { GameOver } from '../ui/GameOver.js';
import { BuiDoi, CanhCua, GiayDo, LaTreRoi, Met, Non, Nut } from '../ui/common.js';
import { sfx } from '../audio/sfx.js';

type JoinState = 'idle' | 'joining' | 'joined' | 'need-name' | 'error';

/** Phase nào ứng với khung giờ nào trong buổi chiều — art direction §2. */
const GIO_THEO_PHASE: Record<string, string> = {
  WAITING: '8h',
  ROUND_START: '10h',
  SELECT_MARBLES: '10h',
  CLOSE_HAND: '10h',
  GUESS_TOTAL: '12h',
  REVEAL: '12h',
  ROUND_RESULT: '12h',
  DICE_ROLL: '15h',
  GAME_OVER: '17h',
};

export function RoomScreen() {
  const { code = '' } = useParams();
  const roomId = code.toUpperCase();
  const navigate = useNavigate();

  const connected = useGame((s) => s.connected);
  const room = useGame((s) => s.room);
  const priv = useGame((s) => s.privateState);
  const credentials = useGame((s) => s.credentials);
  const setCredentials = useGame((s) => s.setCredentials);
  const revealCue = useGame((s) => s.revealCue);
  const diceCue = useGame((s) => s.diceCue);
  const kicked = useGame((s) => s.kicked);
  const reset = useGame((s) => s.reset);
  const baoTin = useGame((s) => s.pushToast);

  const [state, setState] = useState<JoinState>('idle');
  const [daBaoLoai, setDaBaoLoai] = useState(false);
  // Người chơi đã tự xoay sân đi hay chưa, và mốc bấm nút kéo camera về khung.
  const [daXoaySan, setDaXoaySan] = useState(false);
  const [veKhungLuc, setVeKhungLuc] = useState(0);
  const [loi, setLoi] = useState('');
  const [maLoi, setMaLoi] = useState<string | undefined>(undefined);
  const profile = loadProfile();
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const attempted = useRef<string | null>(null);

  const join = useCallback(
    async (withName: string, withAvatar: string, creds?: SessionCredentials | null) => {
      setState('joining');
      try {
        const res = await emitAck<{ credentials: SessionCredentials }>('JOIN_ROOM', {
          roomId,
          name: withName,
          avatar: withAvatar,
          playerId: creds?.roomId === roomId ? creds.playerId : undefined,
          token: creds?.roomId === roomId ? creds.token : undefined,
        });
        setCredentials(res.credentials);
        setState('joined');
      } catch (e) {
        setLoi((e as Error).message);
        setMaLoi(e instanceof ServerError ? e.code : undefined);
        setState('error');
      }
    },
    [roomId, setCredentials],
  );

  // Vào sân: có phiên cũ thì ngồi lại chỗ cũ, chưa có tên thì hỏi tên trước (§23, §36).
  useEffect(() => {
    if (!connected || state === 'joining' || state === 'joined') return;
    if (attempted.current === roomId && state === 'error') return;

    const creds = credentials?.roomId === roomId ? credentials : null;
    if (creds) {
      attempted.current = roomId;
      void join(profile.name || 'Người chơi', profile.avatar, creds);
    } else if (profile.name) {
      attempted.current = roomId;
      void join(profile.name, profile.avatar, null);
    } else {
      setState('need-name');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, roomId]);

  // Nối lại sau khi rớt mạng — server giữ chỗ nên chỉ cần JOIN_ROOM lại (§36).
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => {
      const creds = useGame.getState().credentials;
      if (creds?.roomId === roomId) void join(profile.name || 'Người chơi', profile.avatar, creds);
    };
    socket.on('connect', onConnect);
    return () => {
      socket.off('connect', onConnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, join]);

  useEffect(() => {
    if (kicked) {
      baoTin('error', kicked);
      reset();
      navigate('/');
    }
  }, [kicked, navigate, baoTin, reset]);

  const veNha = () => {
    getSocket().emit('LEAVE_ROOM');
    setCredentials(null);
    reset();
    navigate('/');
  };

  const me = useMemo(
    () => room?.players.find((p) => p.id === credentials?.playerId) ?? null,
    [room, credentials],
  );

  const act = useCallback(
    (event: string, payload?: unknown) => {
      emitAck(event, payload).catch((e: Error) => baoTin('error', e.message));
    },
    [baoTin],
  );

  // Ve sầu rung màn hình khi sắp hết giờ đoán — VFX §10.
  const conLai = useCountdown(room?.phaseEndsAt ?? null, false);
  const veKeu = room?.phase === GamePhase.GUESS_TOTAL && conLai !== null && conLai <= 5;

  // Bị loại: một tiếng chuông chùa xa, rất nhẹ (§12), rồi cánh cửa gỗ khép lại.
  const biLoai = me?.eliminated ?? false;
  useEffect(() => {
    if (biLoai) sfx.biLoai();
    else setDaBaoLoai(false);
  }, [biLoai]);

  if (state === 'need-name') {
    return (
      <main className="san man-p02" data-gio="8h">
        <LaTreRoi />
        <header className="mai">
          <h1 className="hieu" data-chu="TỔNG BI">
            TỔNG BI
          </h1>
          <p className="phu">
            Có đứa rủ bạn vào sân <b className="so">{roomId}</b>
          </p>
        </header>
        <div className="san-trong">
          <GiayDo ghim>
            <div className="o-nhap">
              <label className="nhan" htmlFor="ten">
                tụi nó gọi bạn là gì?
              </label>
              <label className="nan">
                <input
                  id="ten"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="gõ tên vào đây…"
                  maxLength={16}
                />
              </label>
            </div>
            <div className="o-nhap">
              <span className="nhan">chọn cái mặt</span>
              <div className="chon-non">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    aria-label={`Chọn mặt ${AVATAR_TEN[a] ?? a}`}
                    aria-pressed={a === avatar}
                  >
                    <Non avatar={a} chon={a === avatar} />
                  </button>
                ))}
              </div>
            </div>
            <Nut
              vat="la"
              co="lg"
              rong
              disabled={!name.trim() || !connected}
              onClick={() => {
                saveProfile({ name: name.trim(), avatar });
                attempted.current = roomId;
                void join(name.trim(), avatar, null);
              }}
            >
              Ngồi xuống sân
            </Nut>
          </GiayDo>
        </div>
      </main>
    );
  }

  if (state === 'error') {
    const chat = maLoi === 'ROOM_FULL';
    return (
      <main className="san man-p02" data-gio="17h">
        <LaTreRoi />
        <div className="san-trong co-dau giua-doc">
          <GiayDo ghim className="canh-giua">
            <h2 className="tua">{chat ? 'Sân chật rồi' : 'Không vào sân được'}</h2>
            <p className="moi">{loi}</p>
            {chat && (
              <p className="ghi-chu">Bảo chủ trò vạch thêm một sân nữa rồi gửi link mới nhé.</p>
            )}
            <Nut co="lg" rong onClick={() => navigate('/')}>
              Về đầu ngõ
            </Nut>
          </GiayDo>
        </div>
      </main>
    );
  }

  if (!room || !me) {
    return (
      <main className="san man-p02" data-gio="8h">
        <LaTreRoi />
        <div className="san-trong co-dau giua-doc canh-giua">
          <BuiDoi />
          <p>
            <span className="loi-nhac">{connected ? 'Đang chạy ra sân…' : 'Đang tìm đường ra sân…'}</span>
          </p>
        </div>
      </main>
    );
  }

  if (room.phase === GamePhase.WAITING) {
    return (
      <WaitingRoom
        room={room}
        myId={me.id}
        isHost={me.isHost}
        onStart={() => act('START_GAME')}
        onUpdateSettings={(patch) => act('UPDATE_SETTINGS', patch)}
        onSetTeamCount={(n) => act('SET_TEAM_COUNT', { count: n })}
        onSetTeam={(teamId) => act('SET_TEAM', { teamId })}
        onKick={(playerId) => act('KICK_PLAYER', { playerId })}
        onSetPenalties={(penalties: Penalty[]) => act('SET_PENALTIES', { penalties })}
        onLeave={veNha}
      />
    );
  }

  const pheMinh = room.teams.find((t) => t.id === me.teamId);
  const cungPhe = room.players.filter((p) => p.teamId === me.teamId);
  const dangChoi = room.players.filter((p) => !p.eliminated && p.marbleCount > 0);
  const doanCuaMinh = room.guesses.find((g) => g.teamId === me.teamId);
  const soPheDaChot = room.guesses.filter((g) => g.locked).length;
  const nguoiTung = room.players.find((p) => p.id === room.pendingDicePlayerId);

  // Bị loại thì trời đã xế chiều với riêng mình (§2 — ELIMINATED 17h).
  const gio = me.eliminated ? '17h' : (GIO_THEO_PHASE[room.phase] ?? '10h');

  return (
    <main className={`san-choi${veKeu ? ' ve-keu' : ''}`} data-gio={gio}>
      <div className="canh">
        <Scene
          room={room}
          localPlayerId={me.id}
          mySelection={priv?.selectedMarbles ?? null}
          revealCue={revealCue}
          diceOutcome={diceCue?.outcome ?? room.lastDice}
          diceStartedAt={diceCue?.at ?? null}
          veKhungLuc={veKhungLuc}
          onTuXoay={setDaXoaySan}
        />
      </div>

      {/* Kéo để xoay sân, chụm hai ngón để phóng. Xoay rồi thì có đường về —
          camera cũng tự về khung của phase mỗi lần sang phase mới (§6). */}
      {daXoaySan && (
        <button className="ve-khung" onClick={() => setVeKhungLuc(Date.now())}>
          về chỗ cũ
        </button>
      )}

      {/* Nhịp ánh sáng của phase — một lớp tint duy nhất phủ lên cảnh. */}
      <div className="nang" aria-hidden />
      {/* Một tia nắng xuyên khe mái tranh rọi vào nắm tay đang mở (§10). */}
      {room.phase === GamePhase.REVEAL && <div className="tia-nang" aria-hidden />}

      <Hud room={room} me={me} connected={connected} />

      {biLoai && !daBaoLoai && (
        <CanhCua onDong={() => setDaBaoLoai(true)}>
          <GiayDo ghim className="canh-giua">
            <h2 className="tua">Sạch túi rồi</h2>
            <p className="moi">
              Ngồi bên vệ sân xem tụi nó chơi nốt buổi chiều. Ván sau lại có bi.
            </p>
            <Nut co="lg" onClick={() => setDaBaoLoai(true)}>
              Ngồi xem
            </Nut>
          </GiayDo>
        </CanhCua>
      )}

      <div className="tay-cam">
        {room.phase === GamePhase.ROUND_START && (
          <Met className="met-tin dan-len">
            <div className="baloo" style={{ fontSize: 26 }}>
              Vòng {room.round}
            </div>
            <p className="nhac">ngồi xuống, sắp chia bi</p>
          </Met>
        )}

        {room.phase === GamePhase.SELECT_MARBLES &&
          (me.eliminated || me.marbleCount <= 0 ? (
            <Met className="met-tin dan-len">
              <div className="baloo" style={{ fontSize: 21 }}>
                Bạn đang ngồi ngoài
              </div>
              <p className="nhac">xem tụi nó chơi nốt vòng này</p>
            </Met>
          ) : (
            <MarblePicker
              me={me}
              settings={room.settings}
              submitted={room.roundPublic[me.id]?.submitted ?? false}
              mySelection={priv?.selectedMarbles ?? null}
              onSubmit={(amount) => act('SUBMIT_MARBLES', { amount })}
            />
          ))}

        {room.phase === GamePhase.CLOSE_HAND && (
          <Met className="met-tin dan-len">
            <div className="baloo" style={{ fontSize: 21 }}>
              Cả bọn giấu bi xong ✊
            </div>
            <p className="nhac">nín thở, sắp đoán</p>
          </Met>
        )}

        {room.phase === GamePhase.GUESS_TOTAL &&
          (doanCuaMinh ? (
            <GuessPanel
              me={me}
              myTeam={pheMinh}
              teammates={cungPhe}
              activePlayers={dangChoi}
              settings={room.settings}
              locked={doanCuaMinh.locked}
              teamPending={priv?.teamPending ?? null}
              lockedTeams={soPheDaChot}
              totalTeams={room.guesses.length}
              onChange={(v) => getSocket().emit('SET_GUESS', { value: v })}
              onLock={(v) => act('LOCK_GUESS', { value: v })}
            />
          ) : (
            <Met className="met-tin dan-len">
              <div className="baloo" style={{ fontSize: 21 }}>
                Phe bạn ngồi ngoài lượt này
              </div>
            </Met>
          ))}

        {room.phase === GamePhase.REVEAL && (
          <Met className="met-tin dan-len">
            <div className="baloo" style={{ fontSize: 26 }}>
              Mở tay!
            </div>
            <p className="nhac">đếm xem được mấy viên…</p>
          </Met>
        )}

        {room.phase === GamePhase.ROUND_RESULT && room.lastResult && (
          <ResultPanel
            result={room.lastResult}
            teams={room.teams}
            players={room.players}
            me={me}
            phaseEndsAt={room.phaseEndsAt}
            vongCuoi={room.round >= room.settings.totalRounds}
          />
        )}

        {room.phase === GamePhase.DICE_ROLL && (
          <DicePanel
            roller={nguoiTung}
            isMe={nguoiTung?.id === me.id}
            outcome={diceCue?.outcome ?? room.lastDice}
            onRoll={() => act('ROLL_DICE')}
            onForfeit={() => act('FORFEIT')}
          />
        )}

        {room.phase === GamePhase.GAME_OVER && (
          <GameOver
            room={room}
            myId={me.id}
            isHost={me.isHost}
            onPlayAgain={() => act('PLAY_AGAIN')}
            onLeave={veNha}
          />
        )}
      </div>
    </main>
  );
}
