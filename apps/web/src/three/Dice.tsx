/**
 * Xúc xắc khối gỗ mít — art direction §9.3.
 * Mặt khắc chìm rồi bôi mực, không phải xúc xắc nhựa casino: lăn trên nền đất
 * nên nảy ít (bounce ~0.15 so với mặt bàn gỗ) và tung bụi khi dừng.
 *
 * Server quyết định mặt trước, client chỉ chạy animation sao cho viên xúc xắc
 * dừng đúng mặt đó (§46) — không có random nào ở client.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, type Group, type Mesh } from 'three';
import type { DiceFace } from '@tongbi/game-rules';
import { easeOutCubic, smoothstep } from './geometry.js';
import { MAU, toonGradient } from './toon.js';
import { sfx } from '../audio/sfx.js';

const SHAKE_END = 0.9;
const FALL_END = 1.75;
const SETTLE_END = 2.25;
/** Đất nện nuốt gần hết cú nảy — §9.3. */
const NAY_TREN_DAT = 0.15;

/**
 * Thứ tự material của BoxGeometry: +X, -X, +Y, -Y, +Z, -Z.
 * Góc xoay đưa từng mặt lên trên.
 */
const FACE_UP_ROTATION: Array<[number, number, number]> = [
  [0, 0, Math.PI / 2],
  [0, 0, -Math.PI / 2],
  [0, 0, 0],
  [Math.PI, 0, 0],
  [-Math.PI / 2, 0, 0],
  [Math.PI / 2, 0, 0],
];

/** Nét mực khắc chìm: vẽ hai lần, một nét sẫm và một nét sáng bên dưới. */
function net(g: CanvasRenderingContext2D, ve: () => void): void {
  g.save();
  g.translate(0, 3);
  g.strokeStyle = 'rgba(255, 236, 190, 0.55)';
  g.lineWidth = 9;
  ve();
  g.restore();
  g.strokeStyle = '#2A211B';
  g.lineWidth = 9;
  ve();
}

function veNguoiQue(g: CanvasRenderingContext2D, kieu: string): void {
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const dau = (x: number, y: number, r: number) =>
    net(g, () => {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
    });
  const than = (duong: Array<[number, number]>) =>
    net(g, () => {
      g.beginPath();
      duong.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
      g.stroke();
    });

  if (kieu === 'pushup') {
    dau(178, 84, 22);
    than([[160, 100], [86, 150]]);
    than([[86, 150], [56, 196]]);
    than([[86, 150], [128, 186]]);
    than([[160, 100], [180, 158]]);
  } else if (kieu === 'squat') {
    dau(128, 66, 22);
    than([[128, 88], [128, 146]]);
    than([[128, 146], [86, 200]]);
    than([[128, 146], [170, 200]]);
    than([[86, 112], [170, 112]]);
  } else {
    // cõng đồng đội: hai hình que chồng lên nhau
    dau(96, 84, 20);
    than([[96, 104], [96, 160]]);
    than([[96, 160], [66, 206]]);
    than([[96, 160], [126, 206]]);
    dau(166, 62, 17);
    than([[166, 79], [166, 122]]);
    than([[130, 108], [196, 108]]);
  }
}

function faceTexture(face: DiceFace): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;

  // Mặt gỗ mít: màu bệt cộng thớ dọc.
  g.fillStyle = MAU.mit;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = 'rgba(90, 60, 25, 0.18)';
  g.lineWidth = 2;
  for (let x = 6; x < size; x += 9) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 7, size);
    g.stroke();
  }

  if (face.kind === 'BORROW') {
    // Bi khắc chìm, xếp thành lưới 3 cột như trên mặt gỗ thật.
    const n = face.marbles ?? 3;
    const cot = 3;
    const hang = Math.ceil(n / cot);
    const b = 44;
    const x0 = size / 2 - ((cot - 1) * b) / 2;
    const y0 = size / 2 - ((hang - 1) * b) / 2;
    for (let i = 0; i < n; i += 1) {
      const cx = x0 + (i % cot) * b;
      const cy = y0 + Math.floor(i / cot) * b;
      g.fillStyle = 'rgba(255, 236, 190, 0.5)';
      g.beginPath();
      g.arc(cx, cy + 3, 15, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2A211B';
      g.beginPath();
      g.arc(cx, cy, 14, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    const kieu = face.label.includes('Hít') ? 'pushup' : face.label.includes('Thụt') ? 'squat' : 'carry';
    veNguoiQue(g, kieu);
  }

  const tex = new CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

interface DiceProps {
  faces: DiceFace[];
  /** Mặt server đã chọn (1..6); null khi chưa tung. */
  resultFace: number | null;
  /** Mốc thời gian server bắt đầu tung — mọi máy chạy animation cùng nhịp (§21). */
  startedAt: number;
  position?: [number, number, number];
}

export function Dice({ faces, resultFace, startedAt, position = [0, 0.4, 0] }: DiceProps) {
  const group = useRef<Group>(null);
  const box = useRef<Mesh>(null);
  const bui = useRef<Group>(null);
  const daKeu = useRef(false);

  const textures = useMemo(() => faces.map(faceTexture), [faces]);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  useEffect(() => {
    daKeu.current = false;
  }, [startedAt]);

  useFrame(() => {
    if (!group.current || !box.current) return;
    const t = (Date.now() - startedAt) / 1000;

    if (t < SHAKE_END) {
      // 1. Lắc trong lòng bàn tay
      group.current.position.set(
        position[0] + Math.sin(t * 26) * 0.11,
        position[1] + 1.15 + Math.sin(t * 19) * 0.09,
        position[2] + Math.cos(t * 23) * 0.11,
      );
      box.current.rotation.x += 0.34;
      box.current.rotation.y += 0.27;
      box.current.rotation.z += 0.19;
      if (bui.current) bui.current.visible = false;
      return;
    }

    if (t < FALL_END) {
      // 2. Rơi xuống nền đất — đất nện nuốt gần hết cú nảy.
      const k = (t - SHAKE_END) / (FALL_END - SHAKE_END);
      const drop = easeOutCubic(k);
      const nay = Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k) * NAY_TREN_DAT;
      group.current.position.set(position[0], position[1] + 1.15 * (1 - drop) + nay, position[2]);
      const spin = (1 - k) * 0.3;
      box.current.rotation.x += spin;
      box.current.rotation.y += spin * 0.8;
      if (!daKeu.current && k > 0.55) {
        daKeu.current = true;
        sfx.xucXacDung();
      }
      return;
    }

    // 3. Dừng đúng mặt server đã chọn, bụi đất tung lên rồi tan trong 0.8s (§10).
    group.current.position.set(position[0], position[1], position[2]);
    const target = FACE_UP_ROTATION[(resultFace ?? 1) - 1] ?? FACE_UP_ROTATION[0]!;
    const k = smoothstep(FALL_END, SETTLE_END, t);
    const r = box.current.rotation;
    r.x += (target[0] - r.x) * k * 0.35;
    r.y += (target[1] - r.y) * k * 0.35;
    r.z += (target[2] - r.z) * k * 0.35;

    if (bui.current) {
      const tuoi = t - FALL_END;
      const song = Math.max(0, 1 - tuoi / 0.8);
      bui.current.visible = song > 0;
      bui.current.scale.setScalar(1 + (1 - song) * 2.4);
      bui.current.position.y = (1 - song) * 0.16;
    }

    if (t > SETTLE_END) {
      r.set(target[0], target[1], target[2]);
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh ref={box} castShadow>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        {textures.map((tex, i) => (
          <meshToonMaterial key={i} attach={`material-${i}`} map={tex} gradientMap={toonGradient()} />
        ))}
      </mesh>

      {/* Bụi đất tung lên khi khối gỗ dừng lại. */}
      <group ref={bui} visible={false} position={[0, 0, 0]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.16, -0.14, Math.sin(a) * 0.16]}>
              <sphereGeometry args={[0.05, 6, 5]} />
              <meshBasicMaterial color={MAU.datSang} transparent opacity={0.32} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
