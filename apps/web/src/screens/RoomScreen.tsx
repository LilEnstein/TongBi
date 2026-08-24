/**
 * Màn hình phòng chơi: cùng một scene 3D cho mọi người, panel đổi theo phase.
 * Mọi hành động đều gửi lên server rồi chờ state mới — client không tự đổi gì.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AVATARS, GamePhase, type Penalty, type SessionCredentials } from '@tongbi/game-rules';
import { emitAck, getSocket, ServerError } from '../net/socket.js';
import { useGame } from '../net/store.js';
import { loadProfile, saveProfile } from '../lib/session.js';
import { Scene } from '../three/Scene.js';
import { Hud } from '../ui/Hud.js';
import { WaitingRoom } from '../ui/WaitingRoom.js';
import { MarblePicker } from '../ui/MarblePicker.js';
import { GuessPanel } from '../ui/GuessPanel.js';
import { ResultPanel } from '../ui/ResultPanel.js';
import { DicePanel } from '../ui/DicePanel.js';
import { GameOver } from '../ui/GameOver.js';
import { Button } from '../ui/common.js';

type JoinState = 'idle' | 'joining' | 'joined' | 'need-name' | 'error';

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
  const pushToast = useGame((s) => s.pushToast);

  const [state, setState] = useState<JoinState>('idle');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
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
        setError((e as Error).message);
        setErrorCode(e instanceof ServerError ? e.code : undefined);
        setState('error');
      }
    },
    [roomId, setCredentials],
  );

  // Vào phòng: có phiên cũ thì reconnect, chưa có tên thì hỏi tên trước (§23, §36).
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

  // Nối lại sau khi rớt mạng — server giữ ghế nên chỉ cần JOIN_ROOM lại (§36).
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
      pushToast('error', kicked);
      reset();
      navigate('/');
    }
  }, [kicked, navigate, pushToast, reset]);

  const leave = () => {
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
      emitAck(event, payload).catch((e: Error) => pushToast('error', e.message));
    },
    [pushToast],
  );

  if (state === 'need-name') {
    return (
      <main className="home">
        <div className="home__hero">
          <h1>TỔNG BI</h1>
          <p>
            Bạn được mời vào phòng <b>{roomId}</b>
          </p>
        </div>
        <div className="card">
          <div className="field">
            <label htmlFor="jname">Tên của bạn</label>
            <input
              id="jname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên…"
              maxLength={16}
            />
          </div>
          <div className="field">
            <label>Avatar</label>
            <div className="avatars">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  className={`avatar${a === avatar ? ' avatar--on' : ''}`}
                  onClick={() => setAvatar(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <Button
            full
            disabled={!name.trim() || !connected}
            onClick={() => {
              saveProfile({ name: name.trim(), avatar });
              attempted.current = roomId;
              void join(name.trim(), avatar, null);
            }}
          >
            Vào phòng
          </Button>
        </div>
      </main>
    );
  }

  if (state === 'error') {
    const full = errorCode === 'ROOM_FULL';
    return (
      <main className="home">
        <div className="card center">
          <div className="panel__title">{full ? 'Phòng đã đầy' : 'Không vào được phòng'}</div>
          <p className="panel__hint">{error}</p>
          {full && (
            <p className="panel__note">
              Nhờ chủ phòng mở thêm một phòng nữa rồi gửi link mới nhé.
            </p>
          )}
          <Button full onClick={() => navigate('/')}>
            Về trang chủ
          </Button>
        </div>
      </main>
    );
  }

  if (!room || !me) {
    return (
      <main className="home center">
        <div className="loader" />
        <p className="home__status">{connected ? 'Đang vào phòng…' : 'Đang kết nối…'}</p>
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
        onLeave={leave}
      />
    );
  }

  const myTeam = room.teams.find((t) => t.id === me.teamId);
  const teammates = room.players.filter((p) => p.teamId === me.teamId);
  const activePlayers = room.players.filter((p) => !p.eliminated && p.marbleCount > 0);
  const myGuess = room.guesses.find((g) => g.teamId === me.teamId);
  const lockedTeams = room.guesses.filter((g) => g.locked).length;
  const roller = room.players.find((p) => p.id === room.pendingDicePlayerId);

  return (
    <main className="game">
      <div className="game__scene">
        <Scene
          room={room}
          localPlayerId={me.id}
          mySelection={priv?.selectedMarbles ?? null}
          revealCue={revealCue}
          diceOutcome={diceCue?.outcome ?? room.lastDice}
          diceStartedAt={diceCue?.at ?? null}
        />
      </div>

      <Hud room={room} me={me} connected={connected} />

      <div className="game__panel">
        {room.phase === GamePhase.ROUND_START && (
          <div className="panel panel--calm center">
            <div className="panel__title">Vòng {room.round}</div>
            <p className="panel__hint">Chuẩn bị chọn bi…</p>
          </div>
        )}

        {room.phase === GamePhase.SELECT_MARBLES &&
          (me.eliminated || me.marbleCount <= 0 ? (
            <div className="panel panel--calm center">
              <div className="panel__title">Bạn đang ngồi ngoài</div>
              <p className="panel__hint">Xem mọi người chơi hết vòng này nhé.</p>
            </div>
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
          <div className="panel panel--calm center">
            <div className="panel__title">Tất cả đã giấu bi ✊</div>
            <p className="panel__hint">Chuẩn bị đoán tổng…</p>
          </div>
        )}

        {room.phase === GamePhase.GUESS_TOTAL &&
          (myGuess ? (
            <GuessPanel
              me={me}
              myTeam={myTeam}
              teammates={teammates}
              activePlayers={activePlayers}
              settings={room.settings}
              locked={myGuess.locked}
              teamPending={priv?.teamPending ?? null}
              lockedTeams={lockedTeams}
              totalTeams={room.guesses.length}
              onChange={(v) => getSocket().emit('SET_GUESS', { value: v })}
              onLock={(v) => act('LOCK_GUESS', { value: v })}
            />
          ) : (
            <div className="panel panel--calm center">
              <div className="panel__title">Đội bạn không tham gia lượt này</div>
            </div>
          ))}

        {room.phase === GamePhase.REVEAL && (
          <div className="panel panel--calm center">
            <div className="panel__title">Mở tay! 🤲</div>
            <p className="panel__hint">Đếm xem tổng là bao nhiêu…</p>
          </div>
        )}

        {room.phase === GamePhase.ROUND_RESULT && room.lastResult && (
          <ResultPanel
            result={room.lastResult}
            teams={room.teams}
            players={room.players}
            myTeamId={me.teamId}
          />
        )}

        {room.phase === GamePhase.DICE_ROLL && (
          <DicePanel
            roller={roller}
            isMe={roller?.id === me.id}
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
            onLeave={leave}
          />
        )}
      </div>
    </main>
  );
}
