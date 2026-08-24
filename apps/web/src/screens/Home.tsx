/** Lobby — design doc §14: tạo phòng, nhập mã phòng, chọn tên và avatar. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATARS, type SessionCredentials } from '@tongbi/game-rules';
import { emitAck } from '../net/socket.js';
import { useGame } from '../net/store.js';
import { loadProfile, saveProfile } from '../lib/session.js';
import { Button } from '../ui/common.js';

export function Home() {
  const navigate = useNavigate();
  const profile = loadProfile();
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const connected = useGame((s) => s.connected);
  const setCredentials = useGame((s) => s.setCredentials);
  const pushToast = useGame((s) => s.pushToast);

  const ready = name.trim().length > 0 && connected && !busy;

  const createRoom = async () => {
    setBusy(true);
    saveProfile({ name: name.trim(), avatar });
    try {
      const res = await emitAck<{ credentials: SessionCredentials }>('CREATE_ROOM', {
        name: name.trim(),
        avatar,
      });
      setCredentials(res.credentials);
      navigate(`/room/${res.credentials.roomId}`);
    } catch (e) {
      pushToast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const joinRoom = () => {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length < 4) {
      pushToast('error', 'Mã phòng chưa đúng.');
      return;
    }
    saveProfile({ name: name.trim(), avatar });
    navigate(`/room/${clean}`);
  };

  return (
    <main className="home">
      <div className="home__hero">
        <div className="home__marbles" aria-hidden>
          <span /> <span /> <span /> <span />
        </div>
        <h1>TỔNG BI</h1>
        <p>Giấu bi trong tay. Đoán tổng cả bàn. Ai đoán trúng, người đó ôm bi.</p>
      </div>

      <div className="card">
        <div className="field">
          <label htmlFor="name">Tên của bạn</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên…"
            maxLength={16}
            autoComplete="nickname"
          />
        </div>

        <div className="field">
          <label>Chọn avatar</label>
          <div className="avatars">
            {AVATARS.map((a) => (
              <button
                key={a}
                className={`avatar${a === avatar ? ' avatar--on' : ''}`}
                onClick={() => setAvatar(a)}
                aria-label={`Avatar ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <Button full onClick={() => void createRoom()} disabled={!ready}>
          Tạo phòng mới
        </Button>

        <div className="divider">hoặc</div>

        <div className="field">
          <label htmlFor="code">Mã phòng</label>
          <div className="row">
            <input
              id="code"
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VD: AB12CD"
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect="off"
            />
            <Button onClick={joinRoom} disabled={!ready} variant="ghost">
              Vào
            </Button>
          </div>
        </div>
      </div>

      <button className="link-btn" onClick={() => navigate('/tutorial')}>
        Chơi thử một mình (hướng dẫn 60 giây) →
      </button>

      {!connected && <p className="home__status">Đang kết nối tới máy chủ…</p>}

      <footer className="home__foot">
        <p>Cần 2–8 người. Mở link cùng nhau là chơi được ngay.</p>
      </footer>
    </main>
  );
}
