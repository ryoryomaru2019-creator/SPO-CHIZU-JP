/**
 * ============================================================================
 * SPO-CHIZU-JP オンライン世界ランキング API (Google Apps Script)
 * JAPAN 地理王はキミだ！
 * ============================================================================
 * 
 * 【セットアップ手順】
 * 1. Google ドライブで新規「Google スプレッドシート」を作成します。
 *    （名前例: SPO-CHIZU-JP_世界ランキング / Spochizu_Rankings）
 * 2. メニュー「拡張機能」 > 「Apps Script」を開きます。
 * 3. 既存のコードを全て消去し、このスクリプトの内容をすべて貼り付けて保存（Ctrl+S）します。
 * 4. 画面右上の「デプロイ」 > 「新しいデプロイ」をクリックします。
 * 5. 歯車アイコン「種類の選択」で「ウェブアプリ」を選択します。
 *    - 説明: Sakachizu Ranking API
 *    - 次のユーザーとして実行: 自分 (アクセス権限を持つユーザー)
 *    - アクセスできるユーザー: 全員 (Anyone)  ← ★必ず「全員」に設定してください
 * 6. 「デプロイ」をクリックし、初回のみ「アクセスを承認」を完了します。
 * 7. 発行された「ウェブアプリの URL」をコピーし、サカ地図の管理画面または設定に貼り付けます。
 */

const SHEET_NAME = 'Rankings';
const REPORTS_SHEET_NAME = 'Reports';

// 初期化（シートがなければ自動作成してヘッダーを設定）
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      'ID', 'PlayerName', 'TotalScore', 'TotalDistanceKm',
      'AvgTimeFormatted', 'QuestionCount', 'Mode', 'CategoryName',
      'Difficulty', 'PlayedAt', 'CreatedAt', 'PlayerId'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#130e2a').setFontColor('#34d399');
    sheet.setFrozenRows(1);
  } else {
    // 既存シートに PlayerId ヘッダーがない場合は12列目に追加
    const lastCol = sheet.getLastColumn();
    if (lastCol < 12) {
      sheet.getRange(1, 12).setValue('PlayerId').setFontWeight('bold').setBackground('#130e2a').setFontColor('#34d399');
    }
  }
  return sheet;
}

// 問題報告用シートの初期化
function getOrCreateReportsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(REPORTS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REPORTS_SHEET_NAME);
    const headers = [
      'ReportID', 'QuestionID', 'QuestionTitle', 'OriginalName',
      'OriginalLat', 'OriginalLng', 'ReportedLat', 'ReportedLng',
      'ReportedName', 'EvidenceUrl', 'Comment', 'Status', 'CreatedAt'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#182542').setFontColor('#00E5FF');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// レスポンス返却用ヘルパー
function makeJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GETリクエスト処理（ランキング取得 / 接続テスト / CORSフォールバック送信 / 報告取得・送信 / スコア削除 / スコア更新）
function doGet(e) {
  try {
    const params = e ? e.parameter : {};
    const action = params.action || 'get';

    // 1. 接続確認 ping
    if (action === 'ping') {
      return makeJsonResponse({ status: 'ok', message: 'SPO-CHIZU-JP Ranking API is online!', timestamp: Date.now() });
    }

    // 2. GET経由でのスコア登録（ブラウザCORS制限対策のフォールバック用）
    if (action === 'submit') {
      const payload = params.data ? JSON.parse(decodeURIComponent(params.data)) : params;
      return handleScoreSubmission(payload);
    }

    // 3. GET経由での問題報告登録
    if (action === 'report') {
      const payload = params.data ? JSON.parse(decodeURIComponent(params.data)) : params;
      return handleReportSubmission(payload);
    }

    // 4. 報告一覧取得 (action === 'getReports')
    if (action === 'getReports') {
      const reports = queryReports();
      return makeJsonResponse({
        status: 'ok',
        count: reports.length,
        reports: reports,
        timestamp: Date.now()
      });
    }

    // 5. スコア削除 (action === 'deleteScore')
    if (action === 'deleteScore') {
      const payload = params.data ? JSON.parse(decodeURIComponent(params.data)) : params;
      return handleScoreDelete(payload);
    }

    // 6. スコア更新 (action === 'updateScore')
    if (action === 'updateScore') {
      const payload = params.data ? JSON.parse(decodeURIComponent(params.data)) : params;
      return handleScoreUpdate(payload);
    }

    // 7. 管理者用全件ランキング取得 (action === 'getAllRankings')
    if (action === 'getAllRankings') {
      const allRows = queryRankings(500, 'all', false); // false = ベスト3制限なし（全件）
      return makeJsonResponse({
        status: 'ok',
        count: allRows.length,
        rankings: allRows,
        timestamp: Date.now()
      });
    }

    // 8. ランキング取得 (action === 'get')（★各ユーザー上位3件までを掲載）
    const limit = Math.min(100, Math.max(5, parseInt(params.limit, 10) || 50));
    const mode = params.mode || 'all';

    const rankings = queryRankings(limit, mode, true); // true = ユーザーごとにベスト3まで
    return makeJsonResponse({
      status: 'ok',
      count: rankings.length,
      rankings: rankings,
      timestamp: Date.now()
    });
  } catch (err) {
    return makeJsonResponse({ status: 'error', message: err.toString() });
  }
}

// POSTリクエスト処理（スコア送信 / 問題報告送信 / スコア削除 / スコア更新）
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if (body.action === 'report') {
      return handleReportSubmission(body);
    }
    if (body.action === 'deleteScore') {
      return handleScoreDelete(body);
    }
    if (body.action === 'updateScore') {
      return handleScoreUpdate(body);
    }
    return handleScoreSubmission(body);
  } catch (err) {
    return makeJsonResponse({ status: 'error', message: err.toString() });
  }
}

// 問題報告登録処理
function handleReportSubmission(payload) {
  const sheet = getOrCreateReportsSheet();
  const nowIso = new Date().toISOString();
  const id = String(payload.id || 'rep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

  sheet.appendRow([
    id,
    String(payload.questionId || ''),
    String(payload.questionTitle || ''),
    String(payload.originalName || ''),
    Number(payload.originalLat || 0),
    Number(payload.originalLng || 0),
    Number(payload.reportedLat || 0),
    Number(payload.reportedLng || 0),
    String(payload.reportedName || ''),
    String(payload.evidenceUrl || ''),
    String(payload.comment || ''),
    'pending',
    nowIso
  ]);

  return makeJsonResponse({
    status: 'ok',
    id: id,
    message: 'Report saved to Google Sheets successfully',
    timestamp: Date.now()
  });
}

// 問題報告一覧の取得
function queryReports() {
  const sheet = getOrCreateReportsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
  return values.map(function(row) {
    return {
      id: String(row[0]),
      questionId: String(row[1]),
      questionTitle: String(row[2]),
      originalName: String(row[3]),
      originalCoordinates: { latitude: Number(row[4]), longitude: Number(row[5]) },
      reportedCoordinates: { latitude: Number(row[6]), longitude: Number(row[7]) },
      reportedName: String(row[8] || ''),
      evidenceUrl: String(row[9] || ''),
      comment: String(row[10] || ''),
      status: String(row[11] || 'pending'),
      createdAt: String(row[12] || '')
    };
  });
}

// スコア登録処理
function handleScoreSubmission(payload) {
  const sheet = getOrCreateSheet();
  const now = new Date();
  const nowIso = now.toISOString();

  const playerName = String(payload.playerName || payload.name || '名無しサポーター').slice(0, 20);
  const totalScore = Math.max(0, parseInt(payload.totalScore !== undefined ? payload.totalScore : payload.score, 10) || 0);
  const totalDistanceKm = Number(parseFloat(payload.totalDistanceKm || payload.distanceKm || 0).toFixed(2));
  const avgTimeFormatted = String(payload.avgTimeFormatted || payload.timeFormatted || '--分--秒').slice(0, 30);
  const questionCount = parseInt(payload.questionCount, 10) || 5;
  const mode = String(payload.mode || 'standard').slice(0, 30);
  const categoryName = String(payload.categoryName || '全般').slice(0, 30);
  const difficulty = String(payload.difficulty || 'all').slice(0, 20);
  const playedAt = String(payload.playedAt || nowIso);
  const playerId = String(payload.playerId || '').slice(0, 50);
  const id = 'skz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

  sheet.appendRow([
    id,
    playerName,
    totalScore,
    totalDistanceKm,
    avgTimeFormatted,
    questionCount,
    mode,
    categoryName,
    difficulty,
    playedAt,
    nowIso,
    playerId
  ]);

  return makeJsonResponse({
    status: 'ok',
    id: id,
    message: 'Score saved successfully',
    timestamp: Date.now()
  });
}

// スコア削除処理（ユーザー自身の削除 or 管理者による削除）
function handleScoreDelete(payload) {
  const sheet = getOrCreateSheet();
  const targetId = String(payload.id || '').trim();
  const reqPlayerId = String(payload.playerId || '').trim();
  const isAdmin = payload.isAdmin === true || payload.isAdmin === 'true';

  if (!targetId) {
    return makeJsonResponse({ status: 'error', message: '削除対象のIDが指定されていません' });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return makeJsonResponse({ status: 'error', message: 'データが存在しません' });
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  let foundRowIndex = -1;
  let recordPlayerId = '';

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === targetId) {
      foundRowIndex = i + 2; // ヘッダー行 + 0-index offset
      recordPlayerId = String(values[i][11] || '');
      break;
    }
  }

  if (foundRowIndex === -1) {
    return makeJsonResponse({ status: 'error', message: '該当するスコアデータが見つかりません' });
  }

  // 権限チェック: 管理者であるか、または本人のPlayerIdが一致する場合に許可
  if (!isAdmin) {
    if (!reqPlayerId || !recordPlayerId || reqPlayerId !== recordPlayerId) {
      return makeJsonResponse({ status: 'error', message: '他のプレイヤーのスコアを削除することはできません' });
    }
  }

  sheet.deleteRow(foundRowIndex);

  return makeJsonResponse({
    status: 'ok',
    message: 'スコアを削除しました',
    id: targetId,
    timestamp: Date.now()
  });
}

// スコア更新処理（管理者による編集）
function handleScoreUpdate(payload) {
  const sheet = getOrCreateSheet();
  const targetId = String(payload.id || '').trim();
  const isAdmin = payload.isAdmin === true || payload.isAdmin === 'true';

  if (!targetId) {
    return makeJsonResponse({ status: 'error', message: '更新対象のIDが指定されていません' });
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return makeJsonResponse({ status: 'error', message: 'データが存在しません' });
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  let foundRowIndex = -1;

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === targetId) {
      foundRowIndex = i + 2;
      break;
    }
  }

  if (foundRowIndex === -1) {
    return makeJsonResponse({ status: 'error', message: '該当するスコアデータが見つかりません' });
  }

  // 指定された項目を上書き更新
  if (payload.playerName !== undefined) {
    sheet.getRange(foundRowIndex, 2).setValue(String(payload.playerName).slice(0, 20));
  }
  if (payload.totalScore !== undefined) {
    sheet.getRange(foundRowIndex, 3).setValue(Math.max(0, parseInt(payload.totalScore, 10) || 0));
  }
  if (payload.totalDistanceKm !== undefined) {
    sheet.getRange(foundRowIndex, 4).setValue(Number(parseFloat(payload.totalDistanceKm || 0).toFixed(2)));
  }
  if (payload.avgTimeFormatted !== undefined) {
    sheet.getRange(foundRowIndex, 5).setValue(String(payload.avgTimeFormatted).slice(0, 30));
  }
  if (payload.mode !== undefined) {
    sheet.getRange(foundRowIndex, 7).setValue(String(payload.mode).slice(0, 30));
  }
  if (payload.categoryName !== undefined) {
    sheet.getRange(foundRowIndex, 8).setValue(String(payload.categoryName).slice(0, 30));
  }
  if (payload.difficulty !== undefined) {
    sheet.getRange(foundRowIndex, 9).setValue(String(payload.difficulty).slice(0, 20));
  }

  return makeJsonResponse({
    status: 'ok',
    message: 'スコアを更新しました',
    id: targetId,
    timestamp: Date.now()
  });
}

// ランキング抽出（★各ユーザー上位3件までを掲載）
function queryRankings(limit, filterMode, deduplicateByPlayer) {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // ヘッダー以外のデータを全取得 (12列分: ID〜PlayerId)
  const values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  const rows = [];

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const score = Number(row[2]) || 0;
    const mode = String(row[6] || '');

    if (filterMode && filterMode !== 'all' && mode !== filterMode) {
      continue;
    }

    rows.push({
      id: String(row[0]),
      playerName: String(row[1] || 'サポーター'),
      totalScore: score,
      totalDistanceKm: Number(row[3]) || 0,
      avgTimeFormatted: String(row[4] || ''),
      questionCount: Number(row[5]) || 5,
      mode: mode,
      categoryName: String(row[7] || ''),
      difficulty: String(row[8] || ''),
      playedAt: String(row[9] || ''),
      playerId: String(row[11] || '')
    });
  }

  // スコア降順、同点なら距離昇順
  rows.sort(function(a, b) {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.totalDistanceKm - b.totalDistanceKm;
  });

  // ★各ユーザー上位3件（ベスト3）までにフィルタリング
  let filteredRows = rows;
  if (deduplicateByPlayer !== false) {
    const playerRecordCount = {};
    filteredRows = [];

    for (let j = 0; j < rows.length; j++) {
      const item = rows[j];
      // playerId があれば playerId で、なければ playerName でユーザーを識別
      const userKey = item.playerId || item.playerName;
      playerRecordCount[userKey] = (playerRecordCount[userKey] || 0) + 1;

      // 1人あたり上位3件までをランキングに採用
      if (playerRecordCount[userKey] <= 3) {
        filteredRows.push(item);
      }
    }
  }

  const sliced = filteredRows.slice(0, limit);
  return sliced.map(function(item, index) {
    return {
      rank: index + 1,
      id: item.id,
      playerName: item.playerName,
      totalScore: item.totalScore,
      totalDistanceKm: item.totalDistanceKm,
      avgTimeFormatted: item.avgTimeFormatted,
      questionCount: item.questionCount,
      mode: item.mode,
      categoryName: item.categoryName,
      difficulty: item.difficulty,
      playedAt: item.playedAt,
      playerId: item.playerId
    };
  });
}

