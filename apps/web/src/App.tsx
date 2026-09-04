import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Home } from './screens/Home.js';
import { RoomScreen } from './screens/RoomScreen.js';
import { Tutorial } from './screens/Tutorial.js';
import { LaCuonHop, NutTieng } from './ui/common.js';
import { wireSocket } from './net/store.js';
import { nenSan, unlockAudio } from './audio/sfx.js';
import { apTuyChonDaLuu, nhacNen, tiengDangBat } from './audio/nhacNen.js';

export function App() {
  useEffect(() => {
    wireSocket();
    apTuyChonDaLuu();
    // Trình duyệt di động chỉ cho phát âm thanh sau tương tác đầu tiên.
    // Chạm xong là cả sân nhà lên tiếng: ve sầu, gió lùa mái tranh (§12),
    // và liên khúc sáo trúc vào dần bên dưới.
    const unlock = () => {
      unlockAudio();
      nenSan.batDau();
      if (tiengDangBat()) {
        nenSan.nhuongNhac(true);
        nhacNen.batDau();
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      nenSan.dung();
      nhacNen.dung();
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<RoomScreen />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NutTieng />
      <LaCuonHop />
    </BrowserRouter>
  );
}

