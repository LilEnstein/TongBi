/**
 * Kiểm tra scene 3D dựng đúng cấu trúc mà không cần trình duyệt thật.
 * @react-three/test-renderer chạy R3F headless nên có thể assert trên scene graph:
 * đủ ghế, tay có rig ngón, bi hiển thị đúng luật thông tin ẩn, xúc xắc chỉ xuất
 * hiện ở phase DICE_ROLL.
 */
import { describe, expect, it } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { Mesh, Object3D } from 'three';
import {
  DEFAULT_SETTINGS,
  GamePhase,
  TEAM_COLORS,
  type Player,
  type PublicRoomState,
} from '@tongbi/game-rules';
import { Hand } from '../src/three/Hand.js';
import { PlayerSeat } from '../src/three/PlayerSeat.js';
import { Table } from '../src/three/Table.js';

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

describe('Bàn chơi', () => {
  it('có mặt bàn, viền và chân bàn', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Table />);
    expect(countGeometry(renderer, 'CylinderGeometry')).toBeGreaterThanOrEqual(2);
    expect(countGeometry(renderer, 'TorusGeometry')).toBe(1);
    await renderer.unmount();
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
    // Chỉ có bi của đống bi trước mặt (7 viên x 2 mesh mỗi viên), không có bi trong tay.
    expect(countGeometry(renderer, 'SphereGeometry')).toBe(14);
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
    // 7 viên trong đống + 3 viên trong tay = 10 viên x 2 mesh.
    expect(countGeometry(renderer, 'SphereGeometry')).toBe(20);
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
    expect(countGeometry(renderer, 'SphereGeometry')).toBe(0);
    await renderer.unmount();
  });
});

describe('Bàn đầy người', () => {
  it('dựng được 8 chỗ ngồi mà không lỗi', async () => {
    const players = Array.from({ length: 8 }, (_, i) => player(`p${i}`, i));
    const room = roomWith(GamePhase.SELECT_MARBLES, players);
    const renderer = await ReactThreeTestRenderer.create(
      <>
        <Table />
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
    // 8 bàn tay x 14 capsule đốt.
    expect(countGeometry(renderer, 'CapsuleGeometry')).toBeGreaterThanOrEqual(8 * 14);
    // 8 người x 10 bi x 2 mesh.
    expect(countGeometry(renderer, 'SphereGeometry')).toBe(160);
    await renderer.unmount();
  });
});
