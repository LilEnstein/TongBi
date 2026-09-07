import { describe, expect, it } from 'vitest';
import { Group, Object3D, Vector3 } from 'three';
import { nhipCuChi } from '../src/three/Hand.js';

const TRUC_Z = new Vector3(0, 0, 1);

/** Dựng đúng quan hệ cha-con như ConVat: goc → canhTay. */
function dungCay() {
  const goc = new Group();
  goc.position.set(1.3, 0, -0.7);      // ghế nào đó quanh vòng
  goc.rotation.y = 0.9;                 // xoay mặt vào tâm
  goc.updateMatrixWorld(true);
  const canhTay = new Object3D();
  goc.add(canhTay);
  return { goc, canhTay };
}

describe('cánh tay: quaternion thay lookAt', () => {
  const vai: [number, number, number] = [-0.115, 0.456, 0.635];
  // Quét qua dải giá trị thật của drive: reach 0..1, lift 0..1, x lắc ±0.09
  const moc: Array<[number, number, number]> = [];
  for (const reach of [0, 0.35, 0.7, 1])
    for (const lift of [0, 0.5, 1])
      for (const x of [-0.0675, 0, 0.0675]) moc.push([x, 0.3 + lift * 0.45, 0.42 - reach * 0.62]);

  it('cho ra cùng hướng trục capsule như lookAt, mọi tư thế', () => {
    for (const [wx, wy, wz] of moc) {
      const dx = wx - vai[0], dy = wy - vai[1], dz = wz - vai[2];
      const len = Math.max(0.08, Math.hypot(dx, dy, dz));

      // Cách cũ: lookAt qua world space
      const a = dungCay();
      a.canhTay.position.set(vai[0] + dx / 2, vai[1] + dy / 2, vai[2] + dz / 2);
      a.canhTay.updateWorldMatrix(true, false);
      const dich = new Vector3(wx, wy, wz);
      a.goc.localToWorld(dich);
      a.canhTay.lookAt(dich);

      // Cách mới: quaternion trong không gian cha
      const b = dungCay();
      b.canhTay.position.set(vai[0] + dx / 2, vai[1] + dy / 2, vai[2] + dz / 2);
      b.canhTay.quaternion.setFromUnitVectors(TRUC_Z, new Vector3(dx, dy, dz).normalize());

      // Trục dài của capsule (đã xoay NAM nên nằm theo +Z của canhTay)
      const truc = (o: Object3D) => new Vector3(0, 0, 1).applyQuaternion(o.quaternion);
      const goc2 = truc(a.canhTay).angleTo(truc(b.canhTay));
      expect(goc2).toBeLessThan(1e-6);

      // Và trục đó phải trỏ đúng từ vai tới cổ tay
      const mongMuon = new Vector3(dx, dy, dz).normalize();
      expect(truc(b.canhTay).angleTo(mongMuon)).toBeLessThan(1e-6);
      expect(len).toBeGreaterThan(0.08);
    }
  });
});

describe('điểm gắn vai xoay theo ngực', () => {
  // Đúng bảng CAU_HINH của ConVat.tsx.
  const CON: Array<[string, number, number]> = [
    ['trau', 0.25, 0.4], ['ga', 0.21, 0.42], ['lon', 0.27, 0.34], ['meo', 0.2, 0.4],
    ['chuot', 0.185, 0.35], ['coc', 0.28, 0.24], ['ca', 0.23, 0.36],
    ['vit', 0.22, 0.38], ['chim', 0.175, 0.32], ['ho', 0.26, 0.42],
  ];
  // Toàn dải góc ngực thật: DANG.nghieng −0.14..0.32, cộng thở ±0.018 và d.dap −0.18.
  const GOC = [-0.32, -0.14, 0, 0.05, 0.2, 0.24, 0.3, 0.32];

  /** Đúng công thức trong ConVat.tsx. */
  function vaiTrongGoc(than: number, cao: number, gocThan: number) {
    const cucBo = [-than * 0.46, cao * 0.74, -than * 0.34];
    const cs = Math.cos(gocThan), sn = Math.sin(gocThan);
    return new Vector3(
      cucBo[0],
      0.16 + cucBo[1] * cs - cucBo[2] * sn,
      0.72 + cucBo[1] * sn + cucBo[2] * cs,
    );
  }

  it('đưa ngược về hệ `than` thì luôn ra cùng một điểm trên da ngực', () => {
    for (const [ten, than, cao] of CON) {
      const mong = new Vector3(-than * 0.46, cao * 0.74, -than * 0.34);
      for (const g of GOC) {
        // Dựng đúng group `than` của ConVat rồi hỏi ngược lại toạ độ cục bộ.
        const nut = new Object3D();
        nut.position.set(0, 0.16, 0.72);
        nut.rotation.x = g;
        nut.updateMatrixWorld(true);
        const cucBo = nut.worldToLocal(vaiTrongGoc(than, cao, g).clone());
        expect(cucBo.distanceTo(mong), `${ten} @ ${g}`).toBeLessThan(1e-9);
      }
    }
  });

  it('bản cũ (hằng số) thì KHÔNG bất biến — chứng minh lỗi là có thật', () => {
    const [, than, cao] = CON[0]!;                       // con trâu
    const cu = new Vector3(-than * 0.46, 0.16 + cao * 0.74, 0.72 - than * 0.34);
    const nut = new Object3D();
    nut.position.set(0, 0.16, 0.72);
    nut.rotation.x = 0.3;                                 // tư thế 'chom'
    nut.updateMatrixWorld(true);
    const lech = nut.worldToLocal(cu.clone())
      .distanceTo(new Vector3(-than * 0.46, cao * 0.74, -than * 0.34));
    expect(lech).toBeGreaterThan(0.08);                   // ~92mm, khớp con số của audit
  });
});

describe('cử chỉ bật/tắt không pop', () => {
  const DT = 1 / 60;
  const TAN_SO = 13;            // lắc tay
  const BIEN = 0.09;
  const TY_LE = 0.75;           // TY_LE_TAY trong PlayerSeat

  /** Chạy helper qua một chuỗi bật/tắt, trả về dãy giá trị theo frame. */
  function chay(batTai: (i: number) => boolean, soFrame: number) {
    const s = { bien: 0, pha: 0 };
    const ra: number[] = [];
    for (let i = 0; i < soFrame; i++) ra.push(nhipCuChi(s, batTai(i), TAN_SO, DT) * BIEN);
    return ra;
  }

  /** Bước nhảy lớn nhất giữa hai frame liền nhau, quy ra đơn vị world. */
  const buocLonNhat = (v: number[]) =>
    Math.max(...v.slice(1).map((x, i) => Math.abs(x - v[i]!))) * TY_LE;

  it('bật rồi tắt: không frame nào nhảy quá bước của chính dao động', () => {
    // Bật ở frame 30, tắt ở frame 200. 400 frame ≈ 6,7 s.
    const v = chay((i) => i >= 30 && i < 200, 400);
    expect(v[29]).toBe(0);
    expect(v[30]).toBe(0);                    // xuất phát đúng ở giữa, sin(0)
    /* Trần đúng phải cộng CẢ HAI vế của d/dt[sin(pha)·bien]:
         - dao động đủ biên, lấy mẫu rời rạc: 2A·sin(ω·dt/2)
         - envelope đang dâng:                A·λ·dt
       Lúc mới bật hai vế cùng dấu nên chồng lên nhau. Bỏ vế thứ hai là lý do
       lần đầu tôi đặt ngưỡng sai. */
    const tran = (2 * BIEN * Math.sin((TAN_SO * DT) / 2) + BIEN * 10 * DT) * TY_LE;
    expect(buocLonNhat(v)).toBeLessThanOrEqual(tran);

    /* Nhưng thứ thật sự quan trọng là so với bản cũ. Bản cũ nhảy tới trọn biên
       (0,0675 world) trong MỘT frame mà không báo trước. */
    const popCu = BIEN * TY_LE;
    expect(buocLonNhat(v)).toBeLessThan(popCu / 3);
    expect(Math.abs(v[399]!)).toBeLessThan(1e-4);   // tắt hẳn
  });

  it('giữ nguyên biên độ đỉnh — envelope không bóp cú lắc', () => {
    const v = chay(() => true, 240).slice(60);      // bỏ 1 s đầu cho biên lên
    expect(Math.max(...v.map(Math.abs))).toBeGreaterThan(BIEN * 0.97);
  });

  it('giữ nguyên tần số: đếm đúng số lần đổi dấu', () => {
    const v = chay(() => true, 60 * 4).slice(60);   // 3 s ở biên đủ
    const doiDau = v.slice(1).filter((x, i) => x * v[i]! < 0).length;
    // 13 rad/s → 13/(2π) ≈ 2,069 Hz → 3 s có ~12,4 lần đổi dấu
    expect(doiDau).toBeGreaterThanOrEqual(11);
    expect(doiDau).toBeLessThanOrEqual(14);
  });

  it('bản cũ POP thật — chứng minh lỗi có thật', () => {
    // Cũ: Math.sin(Date.now()/1000 * 13) * 0.09, bật/tắt nhị phân.
    let toiDa = 0;
    for (let t0 = 0; t0 < 1; t0 += 0.013) {
      const truoc = 0;                                    // frame trước khi bật
      const sau = Math.sin(t0 * TAN_SO) * BIEN;           // frame đầu sau khi bật
      toiDa = Math.max(toiDa, Math.abs(sau - truoc) * TY_LE);
    }
    expect(toiDa).toBeGreaterThan(0.06);                  // ~0,0675, khớp audit
  });
});
