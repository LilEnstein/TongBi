/**
 * Chơi thử một mình với một AI — design doc §30 và MVP Phase 1 (§31).
 * Chạy hoàn toàn ở client: dựng PublicRoomState giả rồi đưa vào đúng Scene và
 * panel của bản multiplayer, nên đây cũng là bằng chứng rules engine không dính
 * gì tới UI hay network (§43).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  applyRoundResult,
  DEFAULT_SETTINGS,
  GamePhase,
  MAX_PLAYERS,
  TEAM_COLORS,
  WinRule,
  type Player,
  type PublicRoomState,
  type RoundResult,
} from '@tongbi/game-rules';
import { Scene } from '../three/Scene.js';
import { MarblePicker } from '../ui/MarblePicker.js';
import { GuessPanel } from '../ui/GuessPanel.js';
import { ResultPanel } from '../ui/ResultPanel.js';
import { Nut } from '../ui/common.js';
import type { RevealCue } from '../net/store.js';

const ME = 'you';
const BOT = 'bot';
const SETTINGS = { ...DEFAULT_SETTINGS, totalRounds: 3, winRule: WinRule.CLOSEST, selectSeconds: 0 };

/** Lời chỉ của thằng bạn ngồi cạnh, không phải hướng dẫn sử dụng (§14). */
const LOI_CHI: Partial<Record<GamePhase, string>> = {
  ROUND_START: 'Mỗi đứa mười viên. Ngồi xuống đi.',
  SELECT_MARBLES: 'Bốc mấy viên bỏ vào tay rồi nắm lại. Nó cũng đang giấu đấy.',
  CLOSE_HAND: 'Hai nắm tay chặt rồi. Không ai biết trong tay đứa kia mấy viên.',
  GUESS_TOTAL: 'Giờ đoán tổng bi của cả hai nắm tay — cả của bạn lẫn của nó.',
  REVEAL: 'Mở tay ra, đếm lại!',
  ROUND_RESULT: 'Đứa nào đoán gần hơn thì ôm bi của đứa kia.',
};

function makePlayer(id: string, name: string, avatar: string, seat: number, marbles: number): Player {
  return {
    id,
    name,
    avatar,
    teamId: `t-${id}`,
    marbleCount: marbles,
    connected: true,
    eliminated: false,
    isHost: id === ME,
    seat,
  };
}

export function Tutorial() {
  const navigate = useNavigate();
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.ROUND_START);
  const [phaseStartedAt, setPhaseStartedAt] = useState(Date.now());
  const [marbles, setMarbles] = useState<Record<string, number>>({ [ME]: 10, [BOT]: 10 });
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [guesses, setGuesses] = useState<Record<string, number>>({});
  const [result, setResult] = useState<RoundResult | null>(null);
  const [revealCue, setRevealCue] = useState<RevealCue | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const go = (next: GamePhase) => {
    setPhase(next);
    setPhaseStartedAt(Date.now());
  };

  useEffect(() => {
    if (phase === GamePhase.ROUND_START) later(() => go(GamePhase.SELECT_MARBLES), 2200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  const players = useMemo(
    () => [
      makePlayer(ME, 'Bạn', '🐯', 0, marbles[ME] ?? 0),
      makePlayer(BOT, 'Máy', '🤖', 1, marbles[BOT] ?? 0),
    ],
    [marbles],
  );

  const teams = useMemo(
    () =>
      players.map((p, i) => ({
        id: p.teamId,
        name: p.name,
        color: TEAM_COLORS[i]!,
        captainId: p.id,
        score: 0,
      })),
    [players],
  );

  const room: PublicRoomState = useMemo(
    () => ({
      id: 'TUTORIAL',
      phase,
      hostId: ME,
      round,
      maxPlayers: MAX_PLAYERS,
      settings: SETTINGS,
      players,
      teams,
      teamMode: 0,
      roundPublic: Object.fromEntries(
        players.map((p) => [
          p.id,
          {
            submitted: selections[p.id] !== undefined,
            revealed:
              phase === GamePhase.REVEAL || phase === GamePhase.ROUND_RESULT
                ? (selections[p.id] ?? null)
                : null,
            autoSubmitted: false,
          },
        ]),
      ),
      guesses: teams.map((t) => ({
        teamId: t.id,
        pending: null,
        locked: guesses[t.id] !== undefined,
        value: phase === GamePhase.ROUND_RESULT ? (guesses[t.id] ?? null) : null,
      })),
      phaseEndsAt: null,
      phaseStartedAt,
      lastResult: result,
      lastDice: null,
      pendingDicePlayerId: null,
      finalStandings: null,
    }),
    [phase, round, players, teams, selections, guesses, phaseStartedAt, result],
  );

  const submit = (amount: number) => {
    // Máy chọn ngẫu nhiên trong khoảng an toàn — chỉ là AI hướng dẫn, không phải gameplay thật.
    const botPick = 1 + Math.floor(Math.random() * Math.min(5, marbles[BOT] ?? 1));
    const next = { [ME]: amount, [BOT]: botPick };
    setSelections(next);
    later(() => go(GamePhase.CLOSE_HAND), 1000);
    later(() => go(GamePhase.GUESS_TOTAL), 2800);
  };

  const lockGuess = (value: number) => {
    const total = (selections[ME] ?? 0) + (selections[BOT] ?? 0);
    // Máy đoán quanh tổng thật nhưng lệch một chút, để người chơi có cửa thắng.
    const botGuess = Math.max(2, total + (Math.random() < 0.5 ? -2 : 2));
    const g = { [`t-${ME}`]: value, [`t-${BOT}`]: botGuess };
    setGuesses(g);

    const at = Date.now() + 250;
    setRevealCue({
      at,
      reveals: players.map((p) => ({ playerId: p.id, marbles: selections[p.id] ?? 0 })),
    });
    go(GamePhase.REVEAL);

    later(() => {
      const r = applyRoundResult({
        round,
        players,
        teams,
        selections,
        guesses: Object.entries(g).map(([teamId, v]) => ({ teamId, value: v })),
        settings: SETTINGS,
      });
      setResult(r);
      setMarbles(Object.fromEntries(r.marbleDeltas.map((d) => [d.playerId, d.after])));
      go(GamePhase.ROUND_RESULT);
    }, 2800);
  };

  const nextRound = () => {
    if (round >= SETTINGS.totalRounds) {
      navigate('/');
      return;
    }
    setSelections({});
    setGuesses({});
    setResult(null);
    setRevealCue(null);
    setRound((r) => r + 1);
    go(GamePhase.ROUND_START);
  };

  // Khung giờ đổi theo phase như bản nhiều người — art direction §2.
  const gio =
    phase === GamePhase.GUESS_TOTAL || phase === GamePhase.REVEAL || phase === GamePhase.ROUND_RESULT
      ? '12h'
      : '10h';

  return (
    <main className="san-choi" data-gio={gio}>
      <div className="canh">
        <Scene
          room={room}
          localPlayerId={ME}
          mySelection={selections[ME] ?? null}
          revealCue={revealCue}
          diceOutcome={null}
          diceStartedAt={null}
        />
      </div>

      <div className="nang" aria-hidden />
      {phase === GamePhase.REVEAL && <div className="tia-nang" aria-hidden />}

      <div className="liep-tren">
        <div className="liep">
          <span className="vong so">
            chơi thử · vòng {round}/{SETTINGS.totalRounds}
          </span>
          <Nut vat="mo" co="sm" onClick={() => navigate('/')}>
            Về nhà
          </Nut>
        </div>
      </div>

      <div className="tay-cam">
        {LOI_CHI[phase] && (
          <p className="canh-giua" style={{ margin: 0 }}>
            <span className="loi-nhac">{LOI_CHI[phase]}</span>
          </p>
        )}

        {phase === GamePhase.SELECT_MARBLES && (
          <MarblePicker
            me={players[0]!}
            settings={SETTINGS}
            submitted={selections[ME] !== undefined}
            mySelection={selections[ME] ?? null}
            onSubmit={submit}
          />
        )}

        {phase === GamePhase.GUESS_TOTAL && (
          <GuessPanel
            me={players[0]!}
            myTeam={teams[0]}
            teammates={[players[0]!]}
            activePlayers={players}
            settings={SETTINGS}
            locked={false}
            teamPending={null}
            lockedTeams={0}
            totalTeams={2}
            onChange={() => undefined}
            onLock={lockGuess}
          />
        )}

        {phase === GamePhase.ROUND_RESULT && result && (
          <>
            <ResultPanel result={result} teams={teams} players={players} myTeamId={`t-${ME}`} />
            <Nut vat="la" co="lg" rong onClick={nextRound}>
              {round >= SETTINGS.totalRounds ? 'Xong rồi — rủ tụi nó chơi thật' : 'Vòng sau'}
            </Nut>
          </>
        )}
      </div>
    </main>
  );
}
