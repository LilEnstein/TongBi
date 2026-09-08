/**
 * P10 — Mở tay, đếm bi. Tổng thật nằm giữa mẹt tre, dưới là bảng xếp hạng các
 * phe, rồi tới túi bi của chính mình và nén hương đếm sang vòng sau.
 * Art direction §7, §10 (bụi đất, không confetti), §14.
 *
 * Thứ tự đọc trong hai giây: ai thắng (câu reo) → tổng thật là bao nhiêu (mẹt)
 * → mình đang đứng đâu và còn mấy viên (bảng + túi bi).
 */
import { useMemo } from 'react';
import type { Player, RoundResult, Team } from '@tongbi/game-rules';
import { GiayDo, Met } from './common.js';
import { BangXepHang, xepHang } from './BangXepHang.js';
import { useCountdown } from '../lib/useCountdown.js';

interface Props {
  result: RoundResult;
  teams: Team[];
  players: Player[];
  me: Player;
  /** Mốc server chuyển sang chuyện tiếp theo; null nếu không đếm ngược. */
  phaseEndsAt: number | null;
  vongCuoi: boolean;
}

/** Ba kiểu xoáy bi, lặp vòng cho hàng bi trông không đều tăm tắp. */
const BIEN = ['', 'x2', 'x3'] as const;
/** Quá số này thì hàng bi thành một vốc bi vô nghĩa, để con số nói thay. */
const TOI_DA_CHAM = 14;

export function ResultPanel({ result, teams, players, me, phaseEndsAt, vongCuoi }: Props) {
  const dong = useMemo(() => xepHang(teams, players, result), [teams, players, result]);

  // Nén hương đếm ngược đã cháy sẵn trên tấm liếp (xem `Hud`) — ở đây chỉ cần
  // biết CÓ đếm ngược hay không để viết đúng câu dưới cùng, không thắp thêm cây
  // hương thứ hai. Không gõ trống: màn này để đọc, không phải để giục.
  const conLai = useCountdown(phaseEndsAt, false);

  const tenPhe = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const minhTrung = result.winningTeamIds.includes(me.teamId);

  // Luật CLOSEST cho phe lệch ít nhất thắng, nên "trúng phóc" chỉ đúng khi đáp
  // án khớp hẳn — không thì câu reo đá nhau với con số ngay dưới nó.
  const trungY =
    result.winningTeamIds.length > 0 &&
    result.winningTeamIds.every(
      (id) => result.guesses.find((g) => g.teamId === id)?.delta === 0,
    );

  const tenThang = result.winningTeamIds.map(tenPhe).join(', ');
  const reo = result.push
    ? 'Trật lất cả lũ — bi ai nấy giữ'
    : minhTrung
      ? trungY
        ? 'Trúng phóc!'
        : 'Gần nhất là phe mình!'
      : trungY
        ? `${tenThang} trúng phóc`
        : `${tenThang} đoán gần nhất`;

  const cuaMinh = result.marbleDeltas.find((d) => d.playerId === me.id);
  const chenh = cuaMinh?.delta ?? 0;
  const conBi = cuaMinh?.after ?? me.marbleCount;

  // Bi còn lại vẽ đặc, bi vừa mất vẽ mờ ngay sau — thấy ngay vòng này lỗ mấy viên.
  const soDac = Math.min(conBi, TOI_DA_CHAM);
  const soMat = chenh < 0 ? Math.min(-chenh, TOI_DA_CHAM - soDac) : 0;

  return (
    /* Bọc lại thành một khối để khổ ngang còn xếp được hai cột — mẹt và câu reo
       bên trái, bảng phe và túi bi bên phải. Cũng để cả khối không bị .tay-cam
       bóp lại khi chật (mẹt méo mất tròn). */
    <div className="man-ket-qua">
      <Met className="tong-that hien">
        <span className="nhan-nho">tổng thực tế</span>
        <div className="so-to so">{result.actualTotal}</div>
      </Met>

      <p className="reo">{reo}</p>

      <BangXepHang dong={dong} myTeamId={me.teamId} />

      <GiayDo className="tui-minh">
        <div className="nhan-tui">
          <span className="nhan-nho">bi còn lại trong túi</span>
          {chenh !== 0 && (
            <em className={`chenh so ${chenh > 0 ? 'len' : 'xuong'}`}>
              {chenh > 0 ? `+${chenh}` : chenh} vòng này
            </em>
          )}
        </div>
        <div className="hang-bi hang-bi-minh" aria-label={`Còn ${conBi} viên bi`}>
          {Array.from({ length: soDac }, (_, i) => (
            <span key={`d${i}`} className={`bi ${BIEN[i % 3]}`} aria-hidden />
          ))}
          {Array.from({ length: soMat }, (_, i) => (
            <span key={`m${i}`} className="bi mo" aria-hidden />
          ))}
          <b className="so-bi so">{conBi}</b>
        </div>
      </GiayDo>

      {/* Không có mốc hết giờ (màn chơi thử tự bấm sang vòng) thì đừng hứa suông
          là sắp sang vòng. */}
      {conLai !== null && (
        <p className="loi-vong">
          {vongCuoi ? 'vòng cuối rồi — hương tàn là tan sân' : 'hương tàn là cả sân vào vòng sau'}
        </p>
      )}
    </div>
  );
}
