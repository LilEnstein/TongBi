/**
 * Khung cảnh quanh sân: BUỔI (sáng / tối) và MÙA (xuân / hạ / thu / đông).
 *
 * Art direction §2 đã dùng ánh sáng để kể chuyện *trong một buổi chiều* — mỗi
 * phase là một khung giờ. Lớp này là tầng bên trên: nó không đổi câu chuyện của
 * phase mà đổi cả cái buổi chiều ấy thành một buổi sáng, một đêm trăng, hay một
 * chiều mùa đông. Vì thế nắng của phase được GIỮ NGUYÊN hướng và chỉ bị nhân
 * cường độ + pha màu theo buổi/mùa (xem `three/troi.ts`).
 *
 * Mặc định là "tự động": lấy theo đồng hồ và tháng của máy người chơi, để đứa
 * nào mở game tối mùa đông thì thấy đúng cái sân tối mùa đông của nó. Người
 * chơi chọn tay thì lựa chọn đó được lưu và thắng đồng hồ.
 */
import { create } from 'zustand';

export type Buoi = 'sang' | 'toi';
export type Mua = 'xuan' | 'ha' | 'thu' | 'dong';
/** Lựa chọn của người chơi — thêm một mức "để đồng hồ tự lo". */
export type ChonBuoi = Buoi | 'tu-dong';
export type ChonMua = Mua | 'tu-dong';

export const TEN_BUOI: Record<ChonBuoi, string> = {
  'tu-dong': 'theo đồng hồ',
  sang: 'ban ngày',
  toi: 'đêm trăng',
};

export const TEN_MUA: Record<ChonMua, string> = {
  'tu-dong': 'theo tháng',
  xuan: 'mùa xuân',
  ha: 'mùa hè',
  thu: 'mùa thu',
  dong: 'mùa đông',
};

export const BUOI_CHON: readonly ChonBuoi[] = ['tu-dong', 'sang', 'toi'];
export const MUA_CHON: readonly ChonMua[] = ['tu-dong', 'xuan', 'ha', 'thu', 'dong'];

/** Trời tối từ 18h tới 5h — khoảng giờ trẻ con còn được ra sân chơi bi. */
export function buoiTheoGio(luc: Date = new Date()): Buoi {
  const gio = luc.getHours();
  return gio >= 18 || gio < 5 ? 'toi' : 'sang';
}

/**
 * Mùa theo tháng dương lịch ở đồng bằng Bắc Bộ — nơi bối cảnh của game đứng.
 * Tháng 2–4 mưa xuân, 5–7 nắng gắt, 8–10 hanh khô, 11–1 rét.
 */
export function muaTheoThang(luc: Date = new Date()): Mua {
  const thang = luc.getMonth() + 1;
  if (thang >= 2 && thang <= 4) return 'xuan';
  if (thang >= 5 && thang <= 7) return 'ha';
  if (thang >= 8 && thang <= 10) return 'thu';
  return 'dong';
}

export function ganBuoi(chon: ChonBuoi, luc?: Date): Buoi {
  return chon === 'tu-dong' ? buoiTheoGio(luc) : chon;
}

export function ganMua(chon: ChonMua, luc?: Date): Mua {
  return chon === 'tu-dong' ? muaTheoThang(luc) : chon;
}

/* ───────────────────────────── Lưu lựa chọn ────────────────────────────── */

const KHOA = 'tongbi.khungcanh';

interface DaLuu {
  buoi: ChonBuoi;
  mua: ChonMua;
}

function doc(): DaLuu {
  try {
    const raw = localStorage.getItem(KHOA);
    if (raw) {
      const p = JSON.parse(raw) as Partial<DaLuu>;
      return {
        buoi: BUOI_CHON.includes(p.buoi as ChonBuoi) ? (p.buoi as ChonBuoi) : 'tu-dong',
        mua: MUA_CHON.includes(p.mua as ChonMua) ? (p.mua as ChonMua) : 'tu-dong',
      };
    }
  } catch {
    /* Safari private mode — không đọc được thì để tự động. */
  }
  return { buoi: 'tu-dong', mua: 'tu-dong' };
}

function luu(d: DaLuu): void {
  try {
    localStorage?.setItem(KHOA, JSON.stringify(d));
  } catch {
    /* Không lưu được thì chỉ mất lựa chọn sau khi tải lại trang. */
  }
}

/**
 * Dán buổi/mùa lên thẻ <html> để CSS đổi theo (nền các màn 2D, tint lớp .nang,
 * màu giấy dó). Cảnh 3D không đọc data-attribute này mà đọc thẳng store.
 */
function dan(buoi: Buoi, mua: Mua): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.buoi = buoi;
  document.documentElement.dataset.mua = mua;
}

/* ──────────────────────────────── Store ────────────────────────────────── */

interface KhungCanhStore {
  chonBuoi: ChonBuoi;
  chonMua: ChonMua;
  /** Buổi/mùa đã chốt sau khi giải "tự động" — cái mà cảnh thật sự dùng. */
  buoi: Buoi;
  mua: Mua;
  datBuoi(chon: ChonBuoi): void;
  datMua(chon: ChonMua): void;
  /** Đọc lại đồng hồ — gọi định kỳ để ván chơi lúc 17h55 tự sang đêm. */
  theoDongHo(): void;
}

export const useKhungCanh = create<KhungCanhStore>((set, get) => {
  const dau = doc();
  const buoi = ganBuoi(dau.buoi);
  const mua = ganMua(dau.mua);
  dan(buoi, mua);

  return {
    chonBuoi: dau.buoi,
    chonMua: dau.mua,
    buoi,
    mua,
    datBuoi(chon) {
      const moi = ganBuoi(chon);
      luu({ buoi: chon, mua: get().chonMua });
      dan(moi, get().mua);
      set({ chonBuoi: chon, buoi: moi });
    },
    datMua(chon) {
      const moi = ganMua(chon);
      luu({ buoi: get().chonBuoi, mua: chon });
      dan(get().buoi, moi);
      set({ chonMua: chon, mua: moi });
    },
    theoDongHo() {
      const s = get();
      const buoiMoi = ganBuoi(s.chonBuoi);
      const muaMoi = ganMua(s.chonMua);
      if (buoiMoi === s.buoi && muaMoi === s.mua) return;
      dan(buoiMoi, muaMoi);
      set({ buoi: buoiMoi, mua: muaMoi });
    },
  };
});
