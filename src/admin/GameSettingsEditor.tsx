import React, { useState } from 'react';
import { GameRules } from '../types/rules';
import { getGameRules, saveGameRules, resetGameRules } from '../storage/gameRulesStorage';
import {
  getRankingApiUrl,
  setRankingApiUrl,
  testRankingConnection,
} from '../services/rankingService';

export const GameSettingsEditor: React.FC = () => {
  const [rules, setRules] = useState<GameRules>(() => getGameRules());
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // GASランキング設定
  const [gasUrl, setGasUrl] = useState<string>(() => getRankingApiUrl());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [showGasHelp, setShowGasHelp] = useState<boolean>(false);

  const handleChange = <K extends keyof GameRules>(key: K, value: GameRules[K]) => {
    setRules((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveGameRules(rules);
    setRankingApiUrl(gasUrl);
    setSavedNotice('✅ ゲーム設定とランキングAPI設定を保存しました！次回プレイ時から反映されます。');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testRankingConnection(gasUrl);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: `テスト通信失敗: ${e.message || String(e)}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('ゲーム設定をデフォルト初期値に戻しますか？')) {
      const reset = resetGameRules();
      setRules(reset);
      setSavedNotice('🔄 設定をデフォルト値にリセットしました。');
      setTimeout(() => setSavedNotice(null), 3500);
    }
  };

  return (
    <div className="game-settings-container">
      <div className="settings-header">
        <div>
          <h2>⚙️ ゲームルール・パラメータ設定</h2>
          <p className="settings-subtitle">
            スコア計算、タイムボーナス、制限時間やGeoGuessr風のチャレンジルールをカスタマイズできます。
          </p>
        </div>
        <button
          type="button"
          className="secondary-btn reset-settings-btn"
          onClick={handleReset}
        >
          🔄 デフォルトに戻す
        </button>
      </div>

      {savedNotice && (
        <div className="settings-notice-banner" role="status">
          {savedNotice}
        </div>
      )}

      <form onSubmit={handleSave} className="settings-form">
        {/* セクション 1: タイムボーナス＆制限時間 */}
        <div className="settings-section-card">
          <div className="settings-card-title">
            <span className="card-icon">⏱️</span>
            <h3>タイムボーナス & 制限時間設定</h3>
          </div>
          <div className="settings-grid">
            <div className="form-group">
              <label htmlFor="maxTimeBonus">
                最大タイムボーナス点
                <span className="field-hint">（素早く回答した際の最大加算点）</span>
              </label>
              <input
                id="maxTimeBonus"
                type="number"
                min="0"
                max="5000"
                step="50"
                value={rules.maxTimeBonus}
                onChange={(e) => handleChange('maxTimeBonus', Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bonusDecaySeconds">
                ボーナス減衰完了秒数
                <span className="field-hint">（この秒数を経過するとボーナスが0点になります）</span>
              </label>
              <input
                id="bonusDecaySeconds"
                type="number"
                min="10"
                max="300"
                step="5"
                value={rules.bonusDecaySeconds}
                onChange={(e) => handleChange('bonusDecaySeconds', Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="timeLimitSeconds">
                1問あたりの制限時間（タイムアタック）
                <span className="field-hint">（GeoGuessr風のカウントダウン制限）</span>
              </label>
              <select
                id="timeLimitSeconds"
                value={rules.timeLimitSeconds}
                onChange={(e) => handleChange('timeLimitSeconds', Number(e.target.value))}
              >
                <option value={0}>制限なし（無制限）</option>
                <option value={30}>30秒（スピーディー）</option>
                <option value={60}>60秒（標準的）</option>
                <option value={90}>90秒（ゆったり）</option>
                <option value={120}>120秒（2分）</option>
              </select>
            </div>
          </div>
        </div>

        {/* セクション 2: 距離スコアリング */}
        <div className="settings-section-card">
          <div className="settings-card-title">
            <span className="card-icon">🎯</span>
            <h3>距離スコアリング設定</h3>
          </div>
          <div className="settings-grid">
            <div className="form-group">
              <label htmlFor="maxDistanceScore">
                満点距離スコア
                <span className="field-hint">（ズバリ正解時の最高基礎点）</span>
              </label>
              <input
                id="maxDistanceScore"
                type="number"
                min="1000"
                max="10000"
                step="500"
                value={rules.maxDistanceScore}
                onChange={(e) => handleChange('maxDistanceScore', Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="perfectDistanceKm">
                満点許容誤差 (km)
                <span className="field-hint">（0.1 = 100m以内で満点）</span>
              </label>
              <input
                id="perfectDistanceKm"
                type="number"
                min="0.01"
                max="5.0"
                step="0.05"
                value={rules.perfectDistanceKm}
                onChange={(e) => handleChange('perfectDistanceKm', Number(e.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="zeroScoreDistanceKm">
                0点になる最大誤差距離 (km)
                <span className="field-hint">（この距離以上離れると0点）</span>
              </label>
              <input
                id="zeroScoreDistanceKm"
                type="number"
                min="10"
                max="20000"
                step="10"
                value={rules.zeroScoreDistanceKm}
                onChange={(e) => handleChange('zeroScoreDistanceKm', Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>

        {/* セクション 3: GeoGuessr風プレイ制限（オススメ設定） */}
        <div className="settings-section-card">
          <div className="settings-card-title">
            <span className="card-icon">🌍</span>
            <h3>GeoGuessr風プレイ制限・チャレンジ設定（おすすめ）</h3>
          </div>
          <div className="settings-toggles-list">
            <label className="toggle-setting-row">
              <div className="toggle-info">
                <span className="toggle-title">地図のドラッグ移動（パン）を許可する</span>
                <span className="toggle-desc">
                  OFFにすると「No Move（移動禁止）」縛りプレイとなり、地図をドラッグ移動できなくなります。
                </span>
              </div>
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={rules.allowPan}
                onChange={(e) => handleChange('allowPan', e.target.checked)}
              />
            </label>

            <label className="toggle-setting-row">
              <div className="toggle-info">
                <span className="toggle-title">地図のズーム（拡大・縮小）を許可する</span>
                <span className="toggle-desc">
                  OFFにすると「No Zoom（拡大禁止）」縛りプレイとなり、初期縮尺のまま推測する高難度モードになります。
                </span>
              </div>
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={rules.allowZoom}
                onChange={(e) => handleChange('allowZoom', e.target.checked)}
              />
            </label>

            <label className="toggle-setting-row">
              <div className="toggle-info">
                <span className="toggle-title">ヒントボタンの利用を許可する</span>
                <span className="toggle-desc">
                  OFFにすると「No Hints（ヒント禁止）」となり、問題の追加ヒントを見ずに解答します。
                </span>
              </div>
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={rules.allowHints}
                onChange={(e) => handleChange('allowHints', e.target.checked)}
              />
            </label>

            <label className="toggle-setting-row">
              <div className="toggle-info">
                <span className="toggle-title">難易度ボーナス倍率を適用する</span>
                <span className="toggle-desc">
                  ONにすると、問題の難易度に応じて獲得スコアが倍率アップします（中級: ×1.2倍、上級: ×1.5倍）。
                </span>
              </div>
              <input
                type="checkbox"
                className="toggle-checkbox"
                checked={rules.difficultyMultiplier}
                onChange={(e) => handleChange('difficultyMultiplier', e.target.checked)}
              />
            </label>
          </div>
        </div>

        {/* セクション 4: Googleスプレッドシート 世界ランキング連携 (GAS) */}
        <div className="settings-section-card gas-ranking-card">
          <div className="settings-card-title">
            <span className="card-icon">🏆</span>
            <h3>Google スプレッドシート 世界ランキング連携 (GAS API)</h3>
          </div>
          <p className="section-intro">
            Google Apps Script (GAS) を利用して、プレイヤーのハイスコアをGoogleスプレッドシートとリアルタイムに同期できます（「華麗にヒラメいた！HoK!」と同様の仕組みです）。
          </p>

          <div className="form-group">
            <label htmlFor="gasRankingUrl">
              GAS ウェブアプリの URL (exec)
              <span className="field-hint">（例: https://script.google.com/macros/s/AKfycb.../exec）</span>
            </label>
            <div className="gas-input-row">
              <input
                id="gasRankingUrl"
                type="url"
                className="gas-url-input"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
              />
              <button
                type="button"
                className="secondary-btn ping-test-btn"
                onClick={handleTestConnection}
                disabled={isTesting || !gasUrl.trim()}
              >
                {isTesting ? '通信中...' : '📡 接続テスト'}
              </button>
            </div>
            {testResult && (
              <div className={`gas-test-result ${testResult.success ? 'success' : 'error'}`}>
                {testResult.success ? '✅ ' : '❌ '}
                {testResult.message}
              </div>
            )}
          </div>

          <div className="gas-help-toggle-box">
            <button
              type="button"
              className="gas-help-toggle-btn"
              onClick={() => setShowGasHelp(!showGasHelp)}
            >
              {showGasHelp ? '▼ スプレッドシート作成・設定手順を閉じる' : '▶ スプレッドシート作成・設定手順を表示する（初心者向け）'}
            </button>
            {showGasHelp && (
              <div className="gas-instructions-box">
                <h4>📋 簡単3分！スプレッドシート連携手順</h4>
                <ol>
                  <li>Google ドライブで新規「Google スプレッドシート」を作成します（ファイル名例: サカ地図_世界ランキング）。</li>
                  <li>メニュー「拡張機能」 &gt; 「Apps Script」を開きます。</li>
                  <li>エディタの内容を全消去し、プロジェクト内の <code>gas/RankingAPI.gs</code> のコードを全コピーして貼り付け、保存します。</li>
                  <li>画面右上の「デプロイ」 &gt; 「新しいデプロイ」をクリックします。</li>
                  <li>歯車アイコン「種類の選択」で「ウェブアプリ」を選択します。
                    <ul>
                      <li>次のユーザーとして実行: 自分</li>
                      <li>アクセスできるユーザー: <strong>全員 (Anyone)</strong> ← ★必ず「全員」にしてください</li>
                    </ul>
                  </li>
                  <li>「デプロイ」をクリックし、初回のみ「アクセスを承認」を完了します。</li>
                  <li>発行された「ウェブアプリの URL」をコピーして、上記の入力欄に貼り付けて「設定を保存する」を押せば完了です！</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        <div className="settings-footer-actions">
          <button type="submit" className="primary-btn save-settings-btn">
            💾 設定を保存する
          </button>
        </div>
      </form>
    </div>
  );
};
