/**
 * Độ nghiêng khung hình (roll) của camera — Scene.tsx.
 *
 * `camera.lookAt()` ghi lại toàn bộ rotation mỗi frame, nên mọi trạng thái
 * tích luỹ phải nằm ngoài camera. Test này chốt đúng điều đó lại.
 */
import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';

const NGHIENG = 0.07;          // shot `ketQua` trong Scene.tsx:103
const LECH_KHUNG = 0.12;
const TARGET = new Vector3(0, 0.28, 0);
const VI_TRI = new Vector3(0, 4.0, 5.6);

const heSo = (dt: number) => 1 - Math.exp(-2.4 * Math.min(dt, 0.05));

/** Roll thật của camera: góc giữa trục "lên" của nó và mặt phẳng thẳng đứng. */
function rollThat(cam: PerspectiveCamera) {
  const len = new Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  const truoc = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  // Trục "lên" lý tưởng khi không nghiêng: thành phần thẳng đứng trực giao với hướng nhìn.
  const lenChuan = new Vector3(0, 1, 0).projectOnPlane(truoc).normalize();
  const dau = Math.sign(len.clone().cross(lenChuan).dot(truoc));
  return len.angleTo(lenChuan) * (dau || 1);
}

function dungCam() {
  const cam = new PerspectiveCamera(50, 0.5, 0.1, 100);
  cam.position.copy(VI_TRI);
  return cam;
}

describe('roll camera', () => {
  it('sau lookAt + rotateX thì rotation.z ~ 0 — tiền đề của bản cũ sai', () => {
    const cam = dungCam();
    cam.lookAt(TARGET);
    cam.rotateX(-LECH_KHUNG);
    expect(Math.abs(cam.rotation.z)).toBeLessThan(1e-9);
  });

  /** Bản cũ: cộng dồn vào chính camera.rotation.z, bị lookAt xoá mỗi frame. */
  function chayCu(dt: number, giay: number) {
    const cam = dungCam();
    const k = heSo(dt);
    for (let t = 0; t < giay; t += dt) {
      cam.lookAt(TARGET);
      cam.rotateX(-LECH_KHUNG);
      cam.rotation.z += (NGHIENG - cam.rotation.z) * k;
    }
    return rollThat(cam);
  }

  /** Bản mới: tích luỹ trong biến ngoài rồi áp một lần bằng rotateZ. */
  function chayMoi(dt: number, giay: number) {
    const cam = dungCam();
    const k = heSo(dt);
    let roll = 0;
    for (let t = 0; t < giay; t += dt) {
      cam.lookAt(TARGET);
      cam.rotateX(-LECH_KHUNG);
      roll += (NGHIENG - roll) * k;
      cam.rotateZ(roll);
    }
    return rollThat(cam);
  }

  it('bản cũ chỉ áp được ~4% độ nghiêng, và đổi theo framerate', () => {
    const o60 = Math.abs(chayCu(1 / 60, 3));
    const o30 = Math.abs(chayCu(1 / 30, 3));
    expect(o60 / NGHIENG).toBeLessThan(0.05);          // ~3,9%
    expect(o30 / o60).toBeGreaterThan(1.8);            // 30fps nghiêng gấp ~2 lần
  });

  it('bản mới tiến đúng tới độ nghiêng mong muốn', () => {
    expect(Math.abs(chayMoi(1 / 60, 3))).toBeCloseTo(NGHIENG, 3);
  });

  it('bản mới cho cùng kết quả ở 60fps, 30fps và 20fps', () => {
    const v = [1 / 60, 1 / 30, 1 / 20].map((dt) => Math.abs(chayMoi(dt, 3)));
    for (const x of v) expect(x).toBeCloseTo(v[0]!, 4);
  });
});
