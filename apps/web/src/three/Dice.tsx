/**
 * Xúc xắc thử thách 6 mặt — design doc §9, §10, §46.
 * Server quyết định mặt trước, client chỉ chạy animation sao cho viên xúc xắc
 * dừng đúng mặt đó (Cách 1 trong §46) — không có random nào ở client.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, type Group, type Mesh } from 'three';
import type { DiceFace } from '@tongbi/game-rules';
import { easeOutCubic, smoothstep } from './geometry.js';
import { sfx } from '../audio/sfx.js';

const SHAKE_END = 0.9;
const FALL_END = 1.75;
const SETTLE_END = 2.25;

/**
 * Thứ tự material của BoxGeometry: +X, -X, +Y, -Y, +Z, -Z.
 * Góc xoay đưa từng mặt lên trên.
 */
const FACE_UP_ROTATION: Array<[number, number, number]> = [
  [0, 0, Math.PI / 2], // mặt 1 nằm ở +X
  [0, 0, -Math.PI / 2], // mặt 2 ở -X
  [0, 0, 0], // mặt 3 ở +Y
  [Math.PI, 0, 0], // mặt 4 ở -Y
  [-Math.PI / 2, 0, 0], // mặt 5 ở +Z
  [Math.PI / 2, 0, 0], // mặt 6 ở -Z
];

function faceTexture(face: DiceFace): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d')!;

  const borrow = face.kind === 'BORROW';
  g.fillStyle = borrow ? '#f7f3ea' : '#2b2f3d';
  g.fillRect(0, 0, size, size);

  g.strokeStyle = borrow ? '#d9cfba' : '#454b60';
  g.lineWidth = 10;
  g.strokeRect(12, 12, size - 24, size - 24);

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '84px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  g.fillText(face.icon, size / 2, size * 0.34);

  g.fillStyle = borrow ? '#1f6f4a' : '#ffd166';
  const label = face.label.toUpperCase();
  g.font = `bold ${label.length > 10 ? 30 : 40}px system-ui, "Segoe UI", sans-serif`;
  wrap(g, label, size / 2, size * 0.66, size - 44, 40);

  const tex = new CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function wrap(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => g.fillText(l, x, startY + i * lineHeight));
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
  const hitPlayed = useRef(false);

  const textures = useMemo(() => faces.map(faceTexture), [faces]);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  useEffect(() => {
    hitPlayed.current = false;
  }, [startedAt]);

  useFrame(() => {
    if (!group.current || !box.current) return;
    const t = (Date.now() - startedAt) / 1000;

    if (t < SHAKE_END) {
      // 1. Lắc xúc xắc trên cao
      group.current.position.set(
        position[0] + Math.sin(t * 26) * 0.11,
        position[1] + 1.15 + Math.sin(t * 19) * 0.09,
        position[2] + Math.cos(t * 23) * 0.11,
      );
      box.current.rotation.x += 0.34;
      box.current.rotation.y += 0.27;
      box.current.rotation.z += 0.19;
      return;
    }

    if (t < FALL_END) {
      // 2. Rơi xuống mặt bàn kèm một nhịp nảy
      const k = (t - SHAKE_END) / (FALL_END - SHAKE_END);
      const drop = easeOutCubic(k);
      const bounce = Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k) * 0.34;
      group.current.position.set(
        position[0],
        position[1] + 1.15 * (1 - drop) + bounce,
        position[2],
      );
      const spin = (1 - k) * 0.3;
      box.current.rotation.x += spin;
      box.current.rotation.y += spin * 0.8;
      if (!hitPlayed.current && k > 0.55) {
        hitPlayed.current = true;
        sfx.diceHit();
      }
      return;
    }

    // 3. Dừng lại đúng mặt server đã chọn
    group.current.position.set(position[0], position[1], position[2]);
    const target = FACE_UP_ROTATION[(resultFace ?? 1) - 1] ?? FACE_UP_ROTATION[0]!;
    const k = smoothstep(FALL_END, SETTLE_END, t);
    const r = box.current.rotation;
    r.x += (target[0] - r.x) * k * 0.35;
    r.y += (target[1] - r.y) * k * 0.35;
    r.z += (target[2] - r.z) * k * 0.35;
    if (t > SETTLE_END) {
      r.set(target[0], target[1], target[2]);
      // Nhấp nhô nhẹ để mặt kết quả bắt sáng, giúp camera zoom vào dễ đọc.
      group.current.position.y = position[1] + Math.sin(t * 3) * 0.012;
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh ref={box} castShadow>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        {textures.map((tex, i) => (
          <meshStandardMaterial key={i} attach={`material-${i}`} map={tex} roughness={0.45} />
        ))}
      </mesh>
    </group>
  );
}
