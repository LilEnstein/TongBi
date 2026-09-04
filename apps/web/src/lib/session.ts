import { AVATAR_MAC_DINH, type SessionCredentials } from '@tongbi/game-rules';

const KEY = 'tongbi.session';
const PROFILE_KEY = 'tongbi.profile';

export interface Profile {
  name: string;
  avatar: string;
}

/** Phiên chơi được giữ ở localStorage để reload trang vẫn vào lại đúng ghế (§36). */
export function loadSession(): SessionCredentials | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionCredentials>;
    if (!parsed.roomId || !parsed.playerId || !parsed.token) return null;
    return parsed as SessionCredentials;
  } catch {
    return null;
  }
}

export function saveSession(c: SessionCredentials | null): void {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch {
    /* Safari private mode — bỏ qua, chỉ mất khả năng reconnect sau reload. */
  }
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Profile>;
      if (p.name) return { name: p.name, avatar: p.avatar ?? AVATAR_MAC_DINH };
    }
  } catch {
    /* ignore */
  }
  return { name: '', avatar: AVATAR_MAC_DINH };
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
