/**
 * Kiểm tra scene 3D dựng đúng cấu trúc mà không cần trình duyệt thật.
 * @react-three/test-renderer chạy R3F headless nên có thể assert trên scene graph:
 * đủ chỗ ngồi, tay có rig ngón, bi hiển thị đúng luật thông tin ẩn, và sân là
 * nền đất chứ không phải cái bàn (art direction §9.4).
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { Mesh, Object3D } from 'three';
import {
  AVATAR_TEN,
  AVATARS,
  DEFAULT_SETTINGS,
  GamePhase,
  TEAM_COLORS,
  type Player,
  type PublicRoomState,
} from '@tongbi/game-rules';
import { ConVat, loaiConVat, type TuThe } from '../src/three/ConVat.js';
import { LONG } from '../src/three/toon.js';
import { Hand } from '../src/three/Hand.js';
import { PlayerSeat } from '../src/three/PlayerSeat.js';
import { San } from '../src/three/San.js';

function player(id: string, seat: number, marbles = 10): Player {
  return {
    id,
    name: id,
    avatar: '🐯',
    teamId: `t-${id}`,
    marbleCount: marbles,
    connected: true,
    eliminated: false,
    isHost: seat === 0,
    seat,
  };
}

function roomWith(phase: GamePhase, players: Player[]): PublicRoomState {
  return {
    id: 'TEST01',
    phase,
    hostId: players[0]!.id,
    round: 1,
    settings: DEFAULT_SETTINGS,
    players,
    teams: players.map((p, i) => ({
      id: p.teamId,
      name: p.name,
      color: TEAM_COLORS[i % TEAM_COLORS.length]!,
      captainId: p.id,
      score: 0,
    })),
    teamMode: 0,
    roundPublic: Object.fromEntries(
      players.map((p) => [p.id, { submitted: false, revealed: null, autoSubmitted: false }]),
    ),
    guesses: [],
    phaseEndsAt: null,
    phaseStartedAt: Date.now(),
    lastResult: null,
    lastDice: null,
    pendingDicePlayerId: null,
    finalStandings: null,
  };
}

/** Đếm mesh theo loại geometry bằng cách duyệt scene three thật. */
function countGeometry(renderer: { scene: { instance: Object3D } }, geometry: string): number {
  let n = 0;
  renderer.scene.instance.traverse((o) => {
    const g = (o as Mesh).geometry;
    if (g && g.type === geometry) n += 1;
  });
  return n;
}

/** Tổng số object trong scene, dùng để so sánh cấu trúc trước/sau khi đổi tư thế. */
function countObjects(renderer: { scene: { instance: Object3D } }): number {
  let n = 0;
  renderer.scene.instance.traverse(() => {
    n += 1;
  });
  return n;
}

function hasNamed(renderer: { scene: { instance: Object3D } }, name: string): boolean {
  let found = false;
  renderer.scene.instance.traverse((o) => {
    if (o.name === name) found = true;
  });
  return found;
}

/** Đếm object theo tên — dùng để tách bi trong tay khỏi bi trong đống trên đất. */
function countNamed(renderer: { scene: { instance: Object3D } }, name: string): number {
  let n = 0;
  renderer.scene.instance.traverse((o) => {
    if (o.name === name) n += 1;
  });
  return n;
}

describe('Bàn tay có rig — design doc §4', () => {
  it('dựng đủ 5 ngón với các đốt lồng nhau', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Hand curl={0} reach={0} lift={0} />);
    // 4 ngón x 3 đốt + ngón cái 2 đốt = 14 capsule đốt, cộng cẳng tay và cổ tay.
    expect(countGeometry(renderer, 'CapsuleGeometry')).toBeGreaterThanOrEqual(14);
    // Lòng bàn tay là hai khối hộp.
    expect(countGeometry(renderer, 'BoxGeometry')).toBeGreaterThanOrEqual(2);
    await renderer.unmount();
  });

  it('nắm tay không làm sập scene và giữ nguyên số khớp', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Hand curl={1} reach={1} lift={0} />);
    const open = countObjects(renderer);
    await renderer.update(<Hand curl={0} reach={0} lift={1} />);
    expect(countObjects(renderer)).toBe(open);
    await renderer.unmount();
  });

  it('bi trong lòng bàn tay là con của bàn tay nên đi theo tay', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Hand curl={0} reach={1} lift={0}>
        <mesh name="marble-probe">
          <sphereGeometry args={[0.05, 8, 6]} />
        </mesh>
      </Hand>,
    );
    expect(hasNamed(renderer, 'marble-probe')).toBe(true);
    await renderer.unmount();
  });
});

describe('Sân đất — art direction §9.4', () => {
  it('không có bàn: chỉ có nền đất và vòng tròn vạch bằng que', async () => {
    const renderer = await ReactThreeTestRenderer.create(<San />);
    // Không còn mặt bàn hình trụ hay viền bàn hình xuyến.
    expect(countGeometry(renderer, 'CylinderGeometry')).toBe(0);
    expect(countGeometry(renderer, 'TorusGeometry')).toBe(0);
    // Nền đất, vệt chân, vệt bi lăn đều là mặt phẳng tròn.
    expect(countGeometry(renderer, 'CircleGeometry')).toBeGreaterThanOrEqual(3);
    // Hai nét vạch chồng nhau — que vạch không bao giờ đi trúng một lần.
    expect(countGeometry(renderer, 'RingGeometry')).toBe(2);
    await renderer.unmount();
  });

  it('vòng tròn mờ dần qua từng vòng chơi vì bị chân dẫm', async () => {
    const doAm = async (round: number) => {
      const r = await ReactThreeTestRenderer.create(<San round={round} />);
      let max = 0;
      r.scene.instance.traverse((o) => {
        const m = (o as Mesh).material as { opacity?: number } | undefined;
        const g = (o as Mesh).geometry;
        if (g && g.type === 'RingGeometry' && typeof m?.opacity === 'number') {
          max = Math.max(max, m.opacity);
        }
      });
      await r.unmount();
      return max;
    };
    expect(await doAm(6)).toBeLessThan(await doAm(1));
  });
});

describe('Chỗ ngồi và thông tin ẩn — design doc §18', () => {
  const p = player('me', 0, 7);

  it('không vẽ bi trong lòng bàn tay khi chưa biết số bi của người khác', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <PlayerSeat
        player={p}
        round={{ submitted: true, revealed: null, autoSubmitted: false }}
        phase={GamePhase.SELECT_MARBLES}
        phaseStartedAt={Date.now()}
        angle={Math.PI / 2}
        teamColor="#4aa3ff"
        isLocal={false}
        knownMarbles={null}
        openHandAt={null}
        isWinner={false}
        isRolling={false}
      />,
    );
    // Chỉ có đống bi trên đất; trong lòng bàn tay không có viên nào.
    expect(countNamed(renderer, 'bi-tren-dat')).toBe(7);
    expect(countNamed(renderer, 'bi-trong-tay')).toBe(0);
    await renderer.unmount();
  });

  it('vẽ đúng số bi trong lòng bàn tay sau khi reveal', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <PlayerSeat
        player={p}
        round={{ submitted: true, revealed: 3, autoSubmitted: false }}
        phase={GamePhase.REVEAL}
        phaseStartedAt={Date.now()}
        angle={Math.PI / 2}
        teamColor="#4aa3ff"
        isLocal={false}
        knownMarbles={3}
        openHandAt={Date.now()}
        isWinner={false}
        isRolling={false}
      />,
    );
    expect(countNamed(renderer, 'bi-tren-dat')).toBe(7);
    expect(countNamed(renderer, 'bi-trong-tay')).toBe(3);
    await renderer.unmount();
  });

  it('người bị loại không còn bi trong tay', async () => {
    const out = { ...player('out', 1, 0), eliminated: true };
    const renderer = await ReactThreeTestRenderer.create(
      <PlayerSeat
        player={out}
        round={{ submitted: false, revealed: 4, autoSubmitted: false }}
        phase={GamePhase.REVEAL}
        phaseStartedAt={Date.now()}
        angle={0}
        teamColor="#f0503c"
        isLocal={false}
        knownMarbles={4}
        openHandAt={Date.now()}
        isWinner={false}
        isRolling={false}
      />,
    );
    expect(countNamed(renderer, 'bi-tren-dat')).toBe(0);
    expect(countNamed(renderer, 'bi-trong-tay')).toBe(0);
    await renderer.unmount();
  });
});

describe('Sân đông', () => {
  it('dựng được 8 chỗ ngồi quanh vòng tròn mà không lỗi', async () => {
    const players = Array.from({ length: 8 }, (_, i) => player(`p${i}`, i));
    const room = roomWith(GamePhase.SELECT_MARBLES, players);
    const renderer = await ReactThreeTestRenderer.create(
      <>
        <San />
        {players.map((p, i) => (
          <PlayerSeat
            key={p.id}
            player={p}
            round={room.roundPublic[p.id]}
            phase={room.phase}
            phaseStartedAt={room.phaseStartedAt}
            angle={(i / players.length) * Math.PI * 2}
            teamColor={TEAM_COLORS[i % TEAM_COLORS.length]!}
            isLocal={i === 0}
            knownMarbles={null}
            openHandAt={null}
            isWinner={false}
            isRolling={false}
          />
        ))}
      </>,
    );
    // 8 bàn tay x 14 capsule đốt trở lên.
    expect(countGeometry(renderer, 'CapsuleGeometry')).toBeGreaterThanOrEqual(8 * 14);
    // 8 người x 10 bi trong đống trên đất.
    expect(countNamed(renderer, 'bi-tren-dat')).toBe(80);
    // Chưa reveal thì không ai thấy bi trong tay ai, kể cả của chính mình khi
    // chưa chốt số.
    expect(countNamed(renderer, 'bi-trong-tay')).toBe(0);
    await renderer.unmount();
  });
});

describe('Con vật 3D — art direction §9.1 mở rộng', () => {
  const drive = { curl: 0, reach: 0, lift: 0 };

  it('con nào trong AVATARS cũng có ảnh mặt, tên đọc và bảng lông riêng', () => {
    for (const loai of AVATARS) {
      // Thiếu bảng lông thì boLong() lặng lẽ lùi về màu trâu — không lỗi, chỉ sai.
      expect(LONG[loai], loai).toBeDefined();
      expect(AVATAR_TEN[loai], loai).toBeDefined();
      // Không viết `new URL('../public/…', import.meta.url)`: Vite viết lại mẫu đó
      // thành URL tài nguyên web chứ không còn là đường dẫn file.
      const anh = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'mat', `mat_${loai}.webp`);
      expect(existsSync(anh), loai).toBe(true);
    }
  });

  it('dựng được cả hai mươi con vật, mỗi con một hình khối riêng', async () => {
    const soMesh: Record<string, number> = {};
    for (const loai of AVATARS) {
      const r = await ReactThreeTestRenderer.create(
        <ConVat loai={loai} drive={drive} tuThe="ngoi" seed={7} doi="#C4322A" />,
      );
      soMesh[loai] = countObjects(r);
      // Con nào cũng phải có đầu, thân và mắt — tối thiểu chục object.
      expect(soMesh[loai]).toBeGreaterThan(10);
      await r.unmount();
    }
    // Mười con không được ra cùng một bộ khối: phải có ít nhất bốn dáng khác nhau.
    expect(new Set(Object.values(soMesh)).size).toBeGreaterThanOrEqual(4);
  });

  it('avatar lạ (emoji của hồ sơ cũ) lùi về con mặc định thay vì vỡ cảnh', async () => {
    expect(loaiConVat('🐯')).toBe('trau');
    expect(loaiConVat('ho')).toBe('ho');
    const r = await ReactThreeTestRenderer.create(
      <ConVat loai="🐯" drive={drive} tuThe="ngoi" seed={1} doi="#4C7A38" />,
    );
    expect(countObjects(r)).toBeGreaterThan(10);
    await r.unmount();
  });

  it('đổi tư thế không thêm bớt khớp nào — animation chạy ngoài React', async () => {
    const r = await ReactThreeTestRenderer.create(
      <ConVat loai="meo" drive={drive} tuThe="ngoi" seed={3} doi="#1F3F63" />,
    );
    const ngoi = countObjects(r);
    for (const tuThe of ['chom', 'ngong', 'reo', 'xiu', 'tung'] as TuThe[]) {
      await r.update(<ConVat loai="meo" drive={drive} tuThe={tuThe} seed={3} doi="#1F3F63" />);
      expect(countObjects(r)).toBe(ngoi);
    }
    await r.unmount();
  });

  it('sân đông thì hạ chi tiết xuống để giữ framerate (§15)', async () => {
    const dem = async (chiTiet: 'cao' | 'vua' | 'thap') => {
      const r = await ReactThreeTestRenderer.create(
        <ConVat loai="ho" drive={drive} tuThe="ngoi" seed={5} doi="#E8A72E" chiTiet={chiTiet} />,
      );
      const n = countObjects(r);
      await r.unmount();
      return n;
    };
    const cao = await dem('cao');
    const vua = await dem('vua');
    const thap = await dem('thap');
    expect(thap).toBeLessThan(vua);
    expect(vua).toBeLessThan(cao);
  });
});

describe('Xoay sân không được làm lộ thông tin ẩn — design doc §18', () => {
  /**
   * Camera xoay được nên phải chắc chắn rằng bi của người khác KHÔNG nằm trong
   * scene, chứ không phải chỉ bị che khuất. Nếu nó có mặt trong scene graph thì
   * xoay tới đúng góc là thấy, và không có cách nào chặn được ở phía client.
   */
  it('bi của người khác không tồn tại trong scene ở mọi phase trước khi mở tay', async () => {
    const khac = player('doi-thu', 1, 9);
    const truocKhiMo = [
      GamePhase.ROUND_START,
      GamePhase.SELECT_MARBLES,
      GamePhase.CLOSE_HAND,
      GamePhase.GUESS_TOTAL,
    ];

    for (const phase of truocKhiMo) {
      const r = await ReactThreeTestRenderer.create(
        <PlayerSeat
          player={khac}
          round={{ submitted: true, revealed: null, autoSubmitted: false }}
          phase={phase}
          phaseStartedAt={Date.now()}
          angle={0}
          teamColor="#1F3F63"
          isLocal={false}
          knownMarbles={null}
          openHandAt={null}
          isWinner={false}
          isRolling={false}
        />,
      );
      expect(countNamed(r, 'bi-trong-tay')).toBe(0);
      await r.unmount();
    }
  });

  it('con vật của người khác không mang theo số bi nào để đọc ra', async () => {
    const khac = player('doi-thu', 2, 12);
    const r = await ReactThreeTestRenderer.create(
      <PlayerSeat
        player={khac}
        round={{ submitted: true, revealed: null, autoSubmitted: false }}
        phase={GamePhase.GUESS_TOTAL}
        phaseStartedAt={Date.now()}
        angle={Math.PI}
        teamColor="#4C7A38"
        isLocal={false}
        knownMarbles={null}
        openHandAt={null}
        isWinner={false}
        isRolling={false}
      />,
    );
    // Đống bi trên đất là thông tin công khai (ai cũng thấy túi bi của nhau),
    // nhưng số bi đang giấu trong tay thì không có mặt ở đâu trong scene.
    expect(countNamed(r, 'bi-tren-dat')).toBe(12);
    expect(countNamed(r, 'bi-trong-tay')).toBe(0);
    await r.unmount();
  });
});
