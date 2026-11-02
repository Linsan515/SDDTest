# Quickstart & Validation: 節拍器網頁應用（Metronome Web App）

**Feature**: [spec.md](./spec.md) | **Contracts**: [scheduler](./contracts/scheduler.md)、[ui](./contracts/ui.md)

## 前置需求

- Node.js 20.19+ 或 22 LTS 與 npm（**目前這台電腦尚未安裝 Node.js**，例如可用 `brew install node@22`）。
- 支援 Web Audio API 的現代瀏覽器（Chrome、Edge、Firefox、Safari 最新兩版）。

## 安裝與執行

```bash
npm install
npm run dev        # 開發伺服器，預設 http://localhost:5173
npm test           # Vitest 單次執行所有測試
npm run build      # 型別檢查 + 產生正式版
npm run lint       # ESLint
npm run format:check  # Prettier 格式檢查
```

## 自動化驗證

| 情境 | 測試檔 | 預期 |
|---|---|---|
| 5 分鐘、抖動喚醒下無漂移（SC-001） | `src/metronome/scheduler.test.ts` | 每拍誤差 < 0.001 ms |
| 重音位置 4/4、3/4（FR-003、US1、US3） | `src/metronome/scheduler.test.ts` | 第 1、5 拍／第 1、4 拍為重音 |
| 播放中改 BPM、改拍號（FR-006、FR-008） | `src/metronome/scheduler.test.ts` | 下一個拍距／下一小節生效，拍位不重置 |
| 慢改快、喚醒延遲時不連響（SC-005、邊界情況） | `src/metronome/scheduler.test.ts` | 相鄰拍間隔皆 ≥ 當下 `60 / bpm` |
| 快速連按開始不重疊（邊界情況） | `src/components/Metronome.test.tsx` | 音訊 session 只建立一次 |
| 喚醒迴圈在 Web Worker 執行（背景分頁不降速） | `src/metronome/audio.test.ts` | 建立 module Worker，收到 tick 即排程，停止時 terminate |
| 不使用 `setInterval` | `src/metronome/no-setinterval.test.ts` | 原始碼中找不到 `setInterval` |
| UI 契約（US1–US3） | `src/components/Metronome.test.tsx` | 依 [ui.md](./contracts/ui.md) 的名稱與行為 |

## 手動驗證（真實聲音）

1. `npm run dev`，開啟網頁，按「開始」→ 立即聽到節拍，第一聲為較高、較響的重音。
2. 數 8 拍：第 1、5 拍為重音（4/4）。
3. 把滑桿拖到 60 → 顯示「60 BPM」，節奏變慢且不中斷。
4. 按拍號按鈕切到 3/4 → 從下一小節起每 3 拍一個重音。
5. 按「停止」→ 立即無聲；快速連按開始／停止 10 次 → 不出現重疊或殘留聲音。
6. 精準度抽查：用手機錄音 App 或 Audacity 錄 1 分鐘 120 BPM，
   確認相鄰拍間隔皆為 500 ms ± 5 ms、第 120 拍落在 59.5 秒附近 ± 5 ms。
7. 播放中切換到其他分頁 1 分鐘再切回 → 期間速度維持不變（120 BPM 不會變成 60 BPM）、無卡頓或漏拍。
8. 使用性抽測（SC-003、SC-004）：請至少 3 位未看過本專案的人試用並記錄——
   (a) 不看說明，計時完成「開始播放 → 調整速度 → 切換為 3 拍」，目標 30 秒內；
   (b) 播放 4/4 一分鐘，請對方在每小節第一拍拍手，確認能正確辨識重音。
   完整的 10 人測試（SC-004 的 9/10 門檻）於 MVP 之後進行。

## 驗證紀錄

（T031 執行後填寫：日期、瀏覽器／裝置、各步驟結果與偏差。）
