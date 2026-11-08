import { GameHistory } from '../types/game';
import { getHistories } from '../storage/historyStorage';

export interface RankingEntry {
  rank?: number;
  id: string;
  playerName: string;
  totalScore: number;
  totalDistanceKm: number;
  avgTimeFormatted: string;
  questionCount: number;
  mode: string;
  categoryName: string;
  difficulty: string;
  playedAt: string;
  playerId?: string;
}

export const DEFAULT_GAS_API_URL =
  'https://script.google.com/macros/s/AKfycbyTsb8bURe9cp-xl4rrPuoan1K4HpQzGIRjKxopUnuwEJjskK8STrVGj0GmWZuHbaA/exec';

const STORAGE_KEYS = {
  API_URL: 'sakachizu_ranking_api_url',
  PLAYER_NAME: 'sakachizu_player_name',
  PLAYER_ID: 'sakachizu_user_unique_id',
  LOCAL_RANKINGS: 'sakachizu_local_rankings',
};

/**
 * 永続的なプレイヤー固有IDを取得（未生成時は自動生成して保存）
 */
export function getPlayerUniqueId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
    if (!id || !id.trim()) {
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      id = `PLY-${rand}`;
      localStorage.setItem(STORAGE_KEYS.PLAYER_ID, id);
    }
    return id;
  } catch (e) {
    return 'PLY-GUEST';
  }
}

/**
 * 設定されたGAS Web App URLを取得（未設定時はデフォルトのデプロイURLを使用）
 */
export function getRankingApiUrl(): string {
  try {
    const custom = localStorage.getItem(STORAGE_KEYS.API_URL);
    if (custom !== null) {
      return custom.trim();
    }
  } catch (e) {
    console.warn('[RankingService] Failed to read API URL from storage', e);
  }
  return DEFAULT_GAS_API_URL;
}

/**
 * GAS Web App URLを保存
 */
export function setRankingApiUrl(url: string): boolean {
  try {
    const clean = (url || '').trim();
    localStorage.setItem(STORAGE_KEYS.API_URL, clean);
    return true;
  } catch (e) {
    console.warn('[RankingService] Failed to save API URL', e);
    return false;
  }
}

/**
 * 最後に使用したプレイヤー名を取得
 */
export function getLastPlayerName(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || 'サポーター';
  } catch (e) {
    return 'サポーター';
  }
}

/**
 * プレイヤー名を保存
 */
export function savePlayerName(name: string): void {
  try {
    if (name && name.trim()) {
      localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name.trim().slice(0, 20));
    }
  } catch (e) {}
}

/**
 * 接続テスト (ping)
 */
export async function testRankingConnection(apiUrl = getRankingApiUrl()): Promise<{ success: boolean; message: string }> {
  if (!apiUrl) {
    return { success: false, message: 'Google Apps Script のウェブアプリ URL が未設定です' };
  }
  try {
    const sep = apiUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${apiUrl}${sep}action=ping&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: data.status === 'ok', message: data.message || '接続成功！' };
  } catch (err: any) {
    return { success: false, message: `接続に失敗しました: ${err.message || String(err)}` };
  }
}

/**
 * ローカル履歴からランキングを生成（GASが使えない場合や未設定時のフォールバック用）
 */
export function getLocalRankings(limit = 10, mode = 'all'): RankingEntry[] {
  try {
    const histories: GameHistory[] = getHistories();

    // カテゴリ別の初期デモランキング
    const demoRankingsByMode: Record<string, RankingEntry[]> = {
      all: [
        { rank: 1, id: 'demo-all-1', playerName: 'カシマの疾風', totalScore: 49820, totalDistanceKm: 1.2, avgTimeFormatted: '00分12秒', questionCount: 5, mode: 'standard', categoryName: 'J1スタジアム', difficulty: 'medium', playedAt: new Date(Date.now() - 3600000).toISOString() },
        { rank: 2, id: 'demo-all-2', playerName: 'スタジアム巡礼者', totalScore: 48510, totalDistanceKm: 4.8, avgTimeFormatted: '00分18秒', questionCount: 5, mode: 'standard', categoryName: '全般', difficulty: 'all', playedAt: new Date(Date.now() - 7200000).toISOString() },
        { rank: 3, id: 'demo-all-3', playerName: 'Jマニア', totalScore: 47200, totalDistanceKm: 9.5, avgTimeFormatted: '00分25秒', questionCount: 5, mode: 'standard', categoryName: 'ファンクイズ', difficulty: 'hard', playedAt: new Date(Date.now() - 86400000).toISOString() },
      ],
      j1: [
        { rank: 1, id: 'demo-j1-1', playerName: '赤き浦和プライド', totalScore: 49910, totalDistanceKm: 0.8, avgTimeFormatted: '00分10秒', questionCount: 5, mode: 'j1', categoryName: 'J1リーグ', difficulty: 'hard', playedAt: new Date(Date.now() - 1800000).toISOString() },
        { rank: 2, id: 'demo-j1-2', playerName: 'トリコロール航海士', totalScore: 48950, totalDistanceKm: 3.1, avgTimeFormatted: '00分15秒', questionCount: 5, mode: 'j1', categoryName: 'J1リーグ', difficulty: 'medium', playedAt: new Date(Date.now() - 5400000).toISOString() },
        { rank: 3, id: 'demo-j1-3', playerName: '吹田の青黒魂', totalScore: 47800, totalDistanceKm: 7.2, avgTimeFormatted: '00分22秒', questionCount: 5, mode: 'j1', categoryName: 'J1リーグ', difficulty: 'expert', playedAt: new Date(Date.now() - 9000000).toISOString() },
      ],
      j2: [
        { rank: 1, id: 'demo-j2-1', playerName: '杜の都のベガルタ', totalScore: 49450, totalDistanceKm: 1.5, avgTimeFormatted: '00分14秒', questionCount: 5, mode: 'j2', categoryName: 'J2リーグ', difficulty: 'medium', playedAt: new Date(Date.now() - 2400000).toISOString() },
        { rank: 2, id: 'demo-j2-2', playerName: '山形モンテ熱烈サポ', totalScore: 48320, totalDistanceKm: 5.4, avgTimeFormatted: '00分19秒', questionCount: 5, mode: 'j2', categoryName: 'J2リーグ', difficulty: 'hard', playedAt: new Date(Date.now() - 6000000).toISOString() },
        { rank: 3, id: 'demo-j2-3', playerName: '長崎ピースV', totalScore: 47110, totalDistanceKm: 8.9, avgTimeFormatted: '00分24秒', questionCount: 5, mode: 'j2', categoryName: 'J2リーグ', difficulty: 'medium', playedAt: new Date(Date.now() - 12000000).toISOString() },
      ],
      j3: [
        { rank: 1, id: 'demo-j3-1', playerName: '松本山雅エクスプレス', totalScore: 49200, totalDistanceKm: 2.1, avgTimeFormatted: '00分13秒', questionCount: 5, mode: 'j3', categoryName: 'J3リーグ', difficulty: 'medium', playedAt: new Date(Date.now() - 3200000).toISOString() },
        { rank: 2, id: 'demo-j3-2', playerName: '相模原エナジー', totalScore: 48050, totalDistanceKm: 6.0, avgTimeFormatted: '00分20秒', questionCount: 5, mode: 'j3', categoryName: 'J3リーグ', difficulty: 'hard', playedAt: new Date(Date.now() - 7500000).toISOString() },
        { rank: 3, id: 'demo-j3-3', playerName: '琉球ベンガラキッカー', totalScore: 46890, totalDistanceKm: 11.2, avgTimeFormatted: '00分27秒', questionCount: 5, mode: 'j3', categoryName: 'J3リーグ', difficulty: 'expert', playedAt: new Date(Date.now() - 15000000).toISOString() },
      ],
      'j-all': [
        { rank: 1, id: 'demo-jall-1', playerName: 'Jリーグ全知全能', totalScore: 49950, totalDistanceKm: 0.5, avgTimeFormatted: '00分09秒', questionCount: 5, mode: 'j-all', categoryName: 'Jリーグ全クラブ', difficulty: 'expert', playedAt: new Date(Date.now() - 1200000).toISOString() },
        { rank: 2, id: 'demo-jall-2', playerName: '全60クラブ踏破王', totalScore: 48800, totalDistanceKm: 3.9, avgTimeFormatted: '00分16秒', questionCount: 5, mode: 'j-all', categoryName: 'Jリーグ全クラブ', difficulty: 'hard', playedAt: new Date(Date.now() - 4800000).toISOString() },
      ],
    };

    if (!histories || histories.length === 0) {
      return (demoRankingsByMode[mode] || demoRankingsByMode.all).slice(0, limit);
    }

    let filtered = histories;
    if (mode === 'j1') {
      filtered = histories.filter((h) => (h.mode.categoryName || '').includes('J1') || (h.mode as any).filterSummary?.includes('J1'));
    } else if (mode === 'j2') {
      filtered = histories.filter((h) => (h.mode.categoryName || '').includes('J2') || (h.mode as any).filterSummary?.includes('J2'));
    } else if (mode === 'j3') {
      filtered = histories.filter((h) => (h.mode.categoryName || '').includes('J3') || (h.mode as any).filterSummary?.includes('J3'));
    } else if (mode === 'j-all' || mode === 'jleague') {
      filtered = histories.filter((h) => (h.mode.categoryName || '').includes('J') || (h.mode as any).filterSummary?.includes('J'));
    }

    if (filtered.length === 0) {
      return (demoRankingsByMode[mode] || demoRankingsByMode.all).slice(0, limit);
    }

    const entries: RankingEntry[] = filtered.map((h, i) => {
      const avgKm = Number(h.averageDistanceKm.toFixed(2));
      return {
        id: h.id || `local-${i}`,
        playerName: 'あなた',
        totalScore: h.totalScore,
        totalDistanceKm: avgKm,
        avgTimeFormatted: '--',
        questionCount: h.results.length,
        mode: mode,
        categoryName: h.mode.categoryName || '全般',
        difficulty: h.mode.difficulty || 'all',
        playedAt: h.playedAt,
      };
    });

    entries.sort((a, b) => b.totalScore - a.totalScore);

    // ★各ユーザー上位3件（ベスト3）までにフィルタリング
    const userCountMap: Record<string, number> = {};
    const deduplicatedEntries: RankingEntry[] = [];
    for (const e of entries) {
      const userKey = e.playerId || e.playerName;
      userCountMap[userKey] = (userCountMap[userKey] || 0) + 1;
      if (userCountMap[userKey] <= 3) {
        deduplicatedEntries.push(e);
      }
    }

    return deduplicatedEntries.slice(0, limit).map((e, idx) => ({ ...e, rank: idx + 1 }));
  } catch (e) {
    return [];
  }
}

/**
 * オンライン世界ランキングを取得
 */
export async function fetchRankings(limit = 20, mode = 'all'): Promise<{
  isOnline: boolean;
  rankings: RankingEntry[];
}> {
  const apiUrl = getRankingApiUrl();
  if (!apiUrl) {
    return {
      isOnline: false,
      rankings: getLocalRankings(limit, mode),
    };
  }

  try {
    const sep = apiUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${apiUrl}${sep}action=get&limit=${limit}&mode=${encodeURIComponent(mode)}&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.status === 'ok' && Array.isArray(data.rankings)) {
      return {
        isOnline: true,
        rankings: data.rankings,
      };
    }
  } catch (err) {
    console.warn('[RankingService] Failed to fetch online rankings, using local fallback:', err);
  }

  return {
    isOnline: false,
    rankings: getLocalRankings(limit, mode),
  };
}

/**
 * 管理者用：世界ランキングの全件取得（ベスト3制限なし）
 */
export async function fetchAdminRankings(): Promise<{
  isOnline: boolean;
  rankings: RankingEntry[];
}> {
  const apiUrl = getRankingApiUrl();
  if (!apiUrl) {
    return {
      isOnline: false,
      rankings: getLocalRankings(500, 'all'),
    };
  }

  try {
    const sep = apiUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${apiUrl}${sep}action=getAllRankings&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.status === 'ok' && Array.isArray(data.rankings)) {
      return {
        isOnline: true,
        rankings: data.rankings,
      };
    }
  } catch (err) {
    console.warn('[RankingService] Failed to fetch admin rankings:', err);
  }

  return {
    isOnline: false,
    rankings: getLocalRankings(100, 'all'),
  };
}

/**
 * スコアを世界ランキング（GASスプレッドシート）へ登録
 */
export async function submitScore(payload: {
  playerName: string;
  totalScore: number;
  totalDistanceKm: number;
  avgTimeFormatted: string;
  questionCount: number;
  playerId?: string;
  mode?: string;
  categoryName?: string;
  difficulty?: string;
}): Promise<{ success: boolean; isOnline: boolean; message: string }> {
  // プレイヤー名をローカル記憶
  savePlayerName(payload.playerName);
  const playerId = payload.playerId || getPlayerUniqueId();

  const apiUrl = getRankingApiUrl();
  if (!apiUrl) {
    return {
      success: true,
      isOnline: false,
      message: 'ローカルに記録しました（スプレッドシート連携URLを設定すると世界ランキングに反映されます）',
    };
  }

  // 1. POST送信を試行
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'submit',
        playerId,
        ...payload,
        playedAt: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok') {
        return { success: true, isOnline: true, message: '世界ランキングにリアルタイム登録されました！' };
      }
    }
  } catch (postErr) {
    console.warn('[RankingService] POST submit failed, trying GET fallback...', postErr);
  }

  // 2. GETフォールバック送信（CORS対策）
  try {
    const encoded = encodeURIComponent(
      JSON.stringify({
        playerId,
        ...payload,
        playedAt: new Date().toISOString(),
      })
    );
    const sep = apiUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${apiUrl}${sep}action=submit&data=${encoded}&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok') {
        return { success: true, isOnline: true, message: '世界ランキングに登録されました！' };
      }
    }
  } catch (getErr: any) {
    console.error('[RankingService] All submission attempts failed:', getErr);
    return {
      success: false,
      isOnline: false,
      message: `ランキングへの送信に失敗しました: ${getErr.message || String(getErr)}`,
    };
  }

  return { success: false, isOnline: false, message: '登録に失敗しました' };
}

/**
 * スコア削除処理（ユーザー自身の削除 or 管理者による削除）
 */
export async function deleteScore(
  id: string,
  playerId = getPlayerUniqueId(),
  isAdmin = false
): Promise<{ success: boolean; message: string }> {
  const apiUrl = getRankingApiUrl();
  if (!apiUrl) {
    return { success: false, message: 'API連携URLが設定されていません' };
  }

  const payload = {
    action: 'deleteScore',
    id,
    playerId,
    isAdmin,
  };

  // 1. POST試行
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok') {
        return { success: true, message: data.message || 'スコアを削除しました' };
      }
      return { success: false, message: data.message || '削除に失敗しました' };
    }
  } catch (postErr) {
    console.warn('[RankingService] POST deleteScore failed, trying GET fallback...', postErr);
  }

  // 2. GETフォールバック
  try {
    const encoded = encodeURIComponent(JSON.stringify(payload));
    const sep = apiUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${apiUrl}${sep}action=deleteScore&data=${encoded}&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok') {
        return { success: true, message: data.message || 'スコアを削除しました' };
      }
      return { success: false, message: data.message || '削除に失敗しました' };
    }
  } catch (getErr: any) {
    console.error('[RankingService] GET deleteScore failed:', getErr);
    return { success: false, message: `通信エラー: ${getErr.message || String(getErr)}` };
  }

  return { success: false, message: '削除できませんでした' };
}

/**
 * スコア更新処理（管理者による編集）
 */
export async function updateScore(
  entry: Partial<RankingEntry> & { id: string },
  isAdmin = true
): Promise<{ success: boolean; message: string }> {
  const apiUrl = getRankingApiUrl();
  if (!apiUrl) {
    return { success: false, message: 'API連携URLが設定されていません' };
  }

  const payload = {
    action: 'updateScore',
    isAdmin,
    ...entry,
  };

  // 1. POST試行
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok') {
        return { success: true, message: data.message || 'スコアを更新しました' };
      }
      return { success: false, message: data.message || '更新に失敗しました' };
    }
  } catch (postErr) {
    console.warn('[RankingService] POST updateScore failed, trying GET fallback...', postErr);
  }

  // 2. GETフォールバック
  try {
    const encoded = encodeURIComponent(JSON.stringify(payload));
    const sep = apiUrl.includes('?') ? '&' : '?';
    const res = await fetch(`${apiUrl}${sep}action=updateScore&data=${encoded}&_t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok') {
        return { success: true, message: data.message || 'スコアを更新しました' };
      }
      return { success: false, message: data.message || '更新に失敗しました' };
    }
  } catch (getErr: any) {
    console.error('[RankingService] GET updateScore failed:', getErr);
    return { success: false, message: `通信エラー: ${getErr.message || String(getErr)}` };
  }

  return { success: false, message: '更新できませんでした' };
}

