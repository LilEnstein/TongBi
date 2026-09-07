/**
 * P01/P02 — Sân trước hiên nhà: đặt tên, chọn mặt, vạch sân mới hoặc vào sân bạn.
 * Art direction §7 (vật liệu), §14 (giọng văn trẻ con nói với nhau).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATAR_TEN, AVATARS, type SessionCredentials } from '@tongbi/game-rules';
import { emitAck } from '../net/socket.js';
import { useGame } from '../net/store.js';
import { loadProfile, saveProfile } from '../lib/session.js';
import { GiayDo, LaTreRoi, Non, Nut } from '../ui/common.js';

export function Home() {
  const navigate = useNavigate();
  const profile = loadProfile();
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [ma, setMa] = useState('');
  const [dangVach, setDangVach] = useState(false);
  const connected = useGame((s) => s.connected);
  const setCredentials = useGame((s) => s.setCredentials);
  const baoTin = useGame((s) => s.pushToast);

  const sanSang = name.trim().length > 0 && connected && !dangVach;

  const vachSan = async () => {
    setDangVach(true);
    saveProfile({ name: name.trim(), avatar });
    try {
      const res = await emitAck<{ credentials: SessionCredentials }>('CREATE_ROOM', {
        name: name.trim(),
        avatar,
      });
      setCredentials(res.credentials);
      navigate(`/room/${res.credentials.roomId}`);
    } catch (e) {
      baoTin('error', (e as Error).message);
    } finally {
      setDangVach(false);
    }
  };

  const vaoSan = () => {
    const sach = ma.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (sach.length < 4) {
      baoTin('error', 'Mã sân này lạ quá, xem lại đi');
      return;
    }
    saveProfile({ name: name.trim(), avatar });
    navigate(`/room/${sach}`);
  };

  return (
    <main className="san man-p01">
      <LaTreRoi />

      <header className="mai">
        <img className="dau-hieu" src="/logo.webp" alt="" width={96} height={96} />
        <h1 className="hieu" data-chu="TỔNG BI">
          TỔNG BI
        </h1>
        <p className="phu">Giấu bi trong tay · đoán tổng cả vòng · ai trúng thì ôm bi về</p>
      </header>

      <div className="san-trong">
        <div className="doi-hinh" aria-hidden>
          <i className="bi" />
          <i className="bi x2" />
          <i className="bi x3" />
          <i className="bi" />
        </div>

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
                autoComplete="nickname"
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

          <Nut vat="la" co="lg" rong onClick={() => void vachSan()} disabled={!sanSang} cho={dangVach}>
            Vạch sân mới
          </Nut>
        </GiayDo>

        <p className="canh-giua chu-dat" style={{ margin: 0 }}>
          hoặc
        </p>

        <GiayDo>
          <div className="o-nhap">
            <label className="nhan" htmlFor="ma">
              mã sân là gì?
            </label>
            <label className="nan ma">
              <input
                id="ma"
                value={ma}
                onChange={(e) => setMa(e.target.value.toUpperCase())}
                placeholder="AB12CD"
                maxLength={8}
                autoCapitalize="characters"
                autoCorrect="off"
              />
            </label>
          </div>
          <Nut rong onClick={vaoSan} disabled={!sanSang}>
            Vào sân
          </Nut>
        </GiayDo>

        <div className="canh-giua day">
          <Nut vat="mo" dat onClick={() => navigate('/tutorial')}>
            Chơi thử một mình →
          </Nut>
          {!connected && (
            <p style={{ marginTop: 12 }}>
              <span className="loi-nhac">Đang chạy ra sân…</span>
            </p>
          )}
          <p className="dan-nho chu-dat" style={{ marginTop: 14 }}>
            Cần ít nhất hai đứa. Mở chung một link là chơi được ngay.
          </p>
        </div>
      </div>
    </main>
  );
}
