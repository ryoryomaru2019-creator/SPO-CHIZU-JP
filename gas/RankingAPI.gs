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
      'Difficulty', 'PlayedAt', 'CreatedAt'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#130e2a').setFontColor('#34d399');
    sheet.setFrozenRows(1);
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

// GETリクエスト処理（ランキング取得 / 接続テスト / CORSフォールバック送信 / 報告取得・送信）
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

    // 5. ランキング取得 (action === 'get')
    const limit = Math.min(100, Math.max(5, parseInt(params.limit, 10) || 50));
    const mode = params.mode || 'all';

    const rankings = queryRankings(limit, mode);
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

// POSTリクエスト処理（スコア送信 / 問題報告送信）
function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if (body.action === 'report') {
      return handleReportSubmission(body);
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
    }
    return handleScoreSubmission(body);
  } catch (err) {
    return makeJsonResponse({ status: 'error', message: err.toString() });
  }
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
    nowIso
  ]);

  return makeJsonResponse({
    status: 'ok',
    id: id,
    timestamp: Date.now()
  });
}

// ランキング抽出（TotalScore降順ソート）
function queryRankings(limit, filterMode) {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // ヘッダー以外のデータを全取得
  const values = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
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
      playedAt: String(row[9] || '')
    });
  }

  // スコア降順、同点なら距離昇順
  rows.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.totalDistanceKm - b.totalDistanceKm;
  });

  const sliced = rows.slice(0, limit);
  return sliced.map((item, index) => ({
    rank: index + 1,
    ...item
  }));
}

