/**
 * Khung cảnh theo buổi và mùa — `lib/khungCanh.ts`, `three/troi.ts`, `Quanh.tsx`.
 *
 * Ba thứ đáng test ở đây, vì cả ba đều là loại lỗi mắt không bắt ngay được:
 * đồng hồ chọn sai mùa, đêm sáng hơn ngày, và một bụi tre mọc vào giữa sân che
 * mất nắm tay của người chơi.
 */
import { describe, expect, it } from 'vitest';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Color, type Object3D } from 'three';
import { buoiTheoGio, ganBuoi, ganMua, muaTheoThang, type Mua } from '../src/lib/khungCanh.js';
import { khiTroi } from '../src/three/troi.js';
import { Quanh } from '../src/three/Quanh.js';

const MUA_HET: readonly Mua[] = ['xuan', 'ha', 'thu', 'dong'];
const RADIUS = 3.05;

/** Độ sáng cảm nhận của một màu, để so ngày với đêm. */
function sang(mau: string): number {
  const c = new Color(mau);
  return c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
}

/**
 * Nhận mesh bằng cờ `isMesh` chứ không bằng toán tử instanceof: test-renderer
 * nạp bản three riêng của nó (xem cảnh báo "Multiple instances of Three.js"),
 * nên so lớp với bản three import ở đây thì luôn sai. Toạ độ thế giới cũng đọc
 * thẳng từ `matrixWorld` vì cùng một lý do.
 */
function laMesh(o: Object3D): boolean {
  return (o as { isMesh?: boolean }).isMesh === true;
}

function toaDo(o: Object3D): { x: number; y: number; z: number } {
  const e = o.matrixWorld.elements;
  return { x: e[12]!, y: e[13]!, z: e[14]! };
}

/** Hạt bay (mưa, lá, cánh hoa, đom đóm) được phép trôi qua sân — luật 1 của Quanh. */
function laHatBay(o: Object3D): boolean {
  for (let n: Object3D | null = o; n; n = n.parent) {
    if (n.name.startsWith('hat-')) return true;
  }
  return false;
}

/**
 * Vị trí thế giới của mọi vật ĐỨNG cao hơn 0,5 đơn vị.
 *
 * Bỏ qua các vành (`RingGeometry`) vì chúng luôn đặt gốc ở tâm sân theo đúng
 * định nghĩa — cái đáng kiểm của một vành là bán kính trong, xem `vanhTrong`.
 */
function vatDung(scene: Object3D): Array<{ ten: string; x: number; y: number; z: number }> {
  scene.updateMatrixWorld(true);
  const out: Array<{ ten: string; x: number; y: number; z: number }> = [];
  scene.traverse((o) => {
    if (!laMesh(o) || laHatBay(o)) return;
    const ten = (o as { geometry: { type: string } }).geometry.type;
    if (ten === 'RingGeometry') return;
    const v = toaDo(o);
    if (v.y <= 0.5) return;
    out.push({ ten, ...v });
  });
  return out;
}

/** Bán kính trong của mọi vành trong cảnh: đồng lúa, sương lạnh. */
function vanhTrong(scene: Object3D): number[] {
  const out: number[] = [];
  scene.traverse((o) => {
    if (!laMesh(o)) return;
    const g = (o as { geometry: { type: string; parameters?: { innerRadius?: number } } }).geometry;
    if (g.type === 'RingGeometry' && typeof g.parameters?.innerRadius === 'number') {
      out.push(g.parameters.innerRadius);
    }
  });
  return out;
}

describe('Đồng hồ chọn buổi và mùa', () => {
  it('trời tối từ 18h tới 5h', () => {
    const luc = (gio: number) => new Date(2026, 5, 15, gio, 0, 0);
    expect(buoiTheoGio(luc(8))).toBe('sang');
    expect(buoiTheoGio(luc(17))).toBe('sang');
    expect(buoiTheoGio(luc(18))).toBe('toi');
    expect(buoiTheoGio(luc(23))).toBe('toi');
    expect(buoiTheoGio(luc(4))).toBe('toi');
    expect(buoiTheoGio(luc(5))).toBe('sang');
  });

  it('mùa theo tháng dương lịch đồng bằng Bắc Bộ', () => {
    const thang = (t: number) => new Date(2026, t - 1, 10);
    expect(muaTheoThang(thang(2))).toBe('xuan');
    expect(muaTheoThang(thang(4))).toBe('xuan');
    expect(muaTheoThang(thang(6))).toBe('ha');
    expect(muaTheoThang(thang(9))).toBe('thu');
    expect(muaTheoThang(thang(11))).toBe('dong');
    expect(muaTheoThang(thang(1))).toBe('dong');
  });

  it('chọn tay thì thắng đồng hồ, "tự động" thì nhường đồng hồ', () => {
    const dem = new Date(2026, 5, 15, 22, 0, 0);
    expect(ganBuoi('sang', dem)).toBe('sang');
    expect(ganBuoi('tu-dong', dem)).toBe('toi');
    expect(ganMua('dong', dem)).toBe('dong');
    expect(ganMua('tu-dong', dem)).toBe('ha');
  });
});

describe('Khí trời — three/troi.ts', () => {
  it('đêm nào cũng tối hơn ngày cùng mùa, ở cả nắng lẫn màu đất', () => {
    for (const mua of MUA_HET) {
      const ngay = khiTroi('sang', mua);
      const dem = khiTroi('toi', mua);
      expect(dem.nangHeSo).toBeLessThan(ngay.nangHeSo);
      expect(dem.ambient.manh).toBeLessThan(ngay.ambient.manh);
      expect(sang(dem.troi)).toBeLessThan(sang(ngay.troi));
      expect(sang(dem.dat.chinh)).toBeLessThan(sang(ngay.dat.chinh));
      expect(sang(dem.dat.sang)).toBeLessThan(sang(ngay.dat.sang));
      // Sương kéo gần lại để rìa sân chìm vào tối.
      expect(dem.suong[1]).toBeLessThan(ngay.suong[1]);
    }
  });

  it('mùa hè nắng gắt nhất, mùa đông nắng nhạt nhất', () => {
    const heSo = MUA_HET.map((m) => khiTroi('sang', m).nangHeSo);
    expect(Math.max(...heSo)).toBe(khiTroi('sang', 'ha').nangHeSo);
    expect(Math.min(...heSo)).toBe(khiTroi('sang', 'dong').nangHeSo);
  });

  it('mùa xuân đất nồm nên gần như không bốc bụi', () => {
    expect(khiTroi('sang', 'xuan').buiHeSo).toBeLessThan(
      khiTroi('sang', 'ha').buiHeSo * 0.5,
    );
  });
});

describe('Quanh sân — Quanh.tsx', () => {
  it('dựng được cả tám khung cảnh, và không vật đứng nào lọt vào lòng vòng', async () => {
    for (const buoi of ['sang', 'toi'] as const) {
      for (const mua of MUA_HET) {
        const renderer = await ReactThreeTestRenderer.create(
          <Quanh radius={RADIUS} buoi={buoi} mua={mua} khi={khiTroi(buoi, mua)} />,
        );
        const vat = vatDung(renderer.scene.instance);
        expect(vat.length).toBeGreaterThan(0);
        const lot = vat.filter((v) => Math.hypot(v.x, v.z) < RADIUS);
        expect(lot, `${buoi}/${mua}: ${JSON.stringify(lot)}`).toEqual([]);
        // Vành đồng và vành sương cũng phải nằm ngoài lòng vòng ngưỡi.
        for (const trong of vanhTrong(renderer.scene.instance)) {
          expect(trong, `${buoi}/${mua}`).toBeGreaterThanOrEqual(RADIUS * 1.2);
        }
        await renderer.unmount();
      }
    }
  }, 60_000);

  it('mỗi mùa có vật riêng của nó: nêu và mưa xuân, lá rụng, cây trụi lá', async () => {
    const dem = async (mua: Mua) => {
      const renderer = await ReactThreeTestRenderer.create(
        <Quanh radius={RADIUS} buoi="sang" mua={mua} khi={khiTroi('sang', mua)} />,
      );
      const scene = renderer.scene.instance;
      let hat = 0;
      let caoNhat = 0;
      scene.updateMatrixWorld(true);
      scene.traverse((o) => {
        if (!laMesh(o)) return;
        if (laHatBay(o)) hat += 1;
        const v = toaDo(o);
        // Chỉ đo vật đứng quanh sân: trăng, sao và mây đứng xa hơn 12 đơn vị
        // và cao hơn mọi thứ, đếm vào thì không còn so được cây với cây.
        if (Math.hypot(v.x, v.z) < 12) caoNhat = Math.max(caoNhat, v.y);
      });
      await renderer.unmount();
      return { hat, caoNhat };
    };

    // Cây nêu cao 4,6 nên mùa xuân là mùa có vật đứng cao nhất quanh sân.
    const xuan = await dem('xuan');
    const ha = await dem('ha');
    const thu = await dem('thu');
    const dong = await dem('dong');
    expect(xuan.caoNhat).toBeGreaterThan(ha.caoNhat);
    // Mưa xuân và cánh hoa đào là hạt bay; mùa hè ban ngày không có hạt nào.
    expect(xuan.hat).toBeGreaterThan(0);
    expect(ha.hat).toBe(0);
    // Mùa thu có lá rụng.
    expect(thu.hat).toBeGreaterThan(0);
    // Mùa đông chỉ còn cây trụi lá đứng im, không hạt nào bay.
    expect(dong.hat).toBe(0);
  }, 60_000);

  it('cảnh dựng tất định: hai lần dựng ra đúng một chỗ', async () => {
    const lan = async () => {
      const renderer = await ReactThreeTestRenderer.create(
        <Quanh radius={RADIUS} buoi="sang" mua="ha" khi={khiTroi('sang', 'ha')} />,
      );
      const vat = vatDung(renderer.scene.instance).map(
        (v) => `${v.ten}:${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`,
      );
      await renderer.unmount();
      return vat;
    };
    expect(await lan()).toEqual(await lan());
  }, 30_000);

  it('sân đông thì bớt chi tiết đi (§15)', async () => {
    const dem = async (nhe: boolean) => {
      const renderer = await ReactThreeTestRenderer.create(
        <Quanh radius={5.6} buoi="toi" mua="ha" khi={khiTroi('toi', 'ha')} nhe={nhe} />,
      );
      let n = 0;
      renderer.scene.instance.traverse((o) => {
        if (laMesh(o)) n += 1;
      });
      await renderer.unmount();
      return n;
    };
    expect(await dem(true)).toBeLessThan(await dem(false));
  }, 30_000);
});
