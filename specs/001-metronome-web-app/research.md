# Research: 節拍器網頁應用（Metronome Web App）

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-11-02

## R1. 精準計時：不使用 `setInterval`

- **Decision**: 使用 Web Audio API 的 `AudioContext.currentTime` 作為唯一時間基準，
  以「前瞻排程（lookahead scheduling）」預先把每一拍排到音訊時鐘上的精確時間點
  （`oscillator.start(time)`）。JavaScript 計時器只負責「定期醒來檢查是否該排下一拍」，
  不決定拍子發聲的時間。
  - 喚醒機制：遞迴 `setTimeout`，每 25 ms 一次。
  - 前瞻視窗：100 ms（每次醒來把「現在到 100 ms 後」之間的所有拍排好）。
  - 下一拍時間 = 上一拍的排定時間 + 60 / BPM（以上一拍的**排定時間**累加，而非以「現在」計算，
    因此不會累積誤差）。
- **Rationale**:
  - `setInterval`／`setTimeout` 的回呼會被主執行緒工作、GC、render 延遲數毫秒到數十毫秒，
    且誤差會累積；直接用它觸發聲音無法達到 SC-001（±5 ms、不漂移）。
  - 音訊時鐘由音訊硬體驅動，排定的發聲時間是樣本等級的精準；只要計時器在 100 ms 內醒來一次，
    計時器抖動完全不影響聲音時間。
  - 這是 Web Audio 節拍器的標準作法（Chris Wilson, "A Tale of Two Clocks"）。
- **Alternatives considered**:
  - `setInterval` 直接播放：使用者明確禁止，且誤差不符 SC-001。
  - `requestAnimationFrame` 喚醒：分頁在背景時會被暫停，違反「背景分頁仍維持精準」的邊界情況。
  - Web Worker 內計時器喚醒：可避免背景節流，但多一個檔案與訊息協定；
    播放中的音訊分頁在主流瀏覽器不會被強力節流，MVP 不需要（憲章原則 III、V）。
    若實測背景分頁出現漏拍，再作為後續改進。
  - AudioWorklet 自行產生音訊：最精準但複雜度高很多，不符 MVP。

## R2. 音效：重音與一般拍

- **Decision**: 以 `OscillatorNode` + `GainNode` 即時合成短促的 click，不使用音檔。
  - 重音（第 1 拍）：1500 Hz，峰值音量 1.0。
  - 一般拍：1000 Hz，峰值音量 0.6。
  - 包絡：約 1 ms 起音、約 50 ms 指數衰減後停止。
- **Rationale**: 不需載入與解碼音檔，第一次按下就能立即發聲（SC-002）；
  音高與音量雙重差異讓重音容易辨識（SC-004）；零額外資源檔。
- **Alternatives considered**: 預錄音檔 + `AudioBuffer`：音色較好，但需載入、解碼與管理資源，MVP 不需要。

## R3. 停止時立即無聲

- **Decision**: 每次「開始」建立一個新的 session `GainNode` 作為該次播放所有 click 的匯流；
  「停止」時清除計時器，並將該 session `GainNode` 斷開（`disconnect()`），
  已排進前瞻視窗但尚未發聲的拍子因此不會被聽到。
- **Rationale**: 滿足 SC-002「停止後 100 ms 內不再有聲音」與「快速連按開始／停止不重疊」的邊界情況，
  不需要追蹤每一個 oscillator。
- **Alternatives considered**: 追蹤所有已排程 oscillator 並逐一 `stop()`：可行但需要額外的集合管理。

## R4. 播放中變更 BPM 與拍號

- **Decision**:
  - BPM：排程器記錄最近一個已排程拍的時間 `lastBeatTime`；`setBpm` 時重新計算
    `nextBeatTime = lastBeatTime + 60 / 新 bpm`，因此新速度自下一個尚未排程的拍子起生效；
    已在 100 ms 前瞻視窗內排好的拍子（最多一拍）維持原時間。
    若重新計算後的 `nextBeatTime` 已早於現在（慢改快時可能發生），`tick` 會把它拉回現在、
    不補排已錯過的拍，避免瞬間連響（見 data-model「錯過的拍」）。
  - 拍號：變更記為「待套用」，在拍位回到 0（下一小節第 1 拍）時才套用，符合 FR-008。
- **Rationale**: 播放不中斷、不重置拍位（FR-006），實作只是排程器狀態的兩個欄位。
- **Alternatives considered**: 變更時重啟排程器：會造成拍位重置與聲音中斷，違反 FR-006／FR-008。

## R5. 瀏覽器自動播放限制

- **Decision**: `AudioContext` 在使用者第一次按「開始」時才建立（或 `resume()`），
  在 click 事件處理函式內同步呼叫。
- **Rationale**: 主流瀏覽器要求音訊必須由使用者手勢啟動；在手勢內建立可確保第一次按下就有聲音。

## R6. 技術堆疊（使用者指定）

- **Decision**:
  - Vite 6 + React 18 + TypeScript 5（`react-ts` 範本）。
  - Tailwind CSS **3**（`tailwindcss@3` + `postcss` + `autoprefixer`）。
  - shadcn/ui：因最新版 CLI 預設 Tailwind v4，使用支援 Tailwind v3 的版本 `npx shadcn@2.3.0 init`；
    只加入本功能需要的 `button` 與 `slider` 兩個元件。
  - Vitest 3 + jsdom + `@testing-library/react` 進行單元與元件測試。
- **Rationale**: 依使用者指定。React 18 與 shadcn 的 Tailwind v3 版本相容性最穩定，避免 peer dependency 問題。
  `@testing-library/react` 是 Vitest 測試 React 元件的標準搭配，用來驗證 UI 驗收情境（憲章原則 II）。
- **Alternatives considered**: React 19：shadcn 舊版 CLI 需額外 `--legacy-peer-deps` 處理，MVP 無需新功能。

## R7. 可觀測性（憲章原則 IV）在前端的落實

- **Decision**: 一個極小的 `logger`（`log(level, event, data)`），輸出單行 JSON
  `{ ts, level, event, ...data }`；`info` 走 `console.info`，`error` 走 `console.error`。
  只記錄生命週期事件：`metronome.start`、`metronome.stop`、`metronome.bpm_change`、
  `metronome.meter_change`、`audio.error`。**不**逐拍記錄。
- **Rationale**: 對應憲章「結構化日誌、錯誤明確回報、一般輸出與錯誤分流」；
  瀏覽器中 `console.info`/`console.error` 即對應 stdout/stderr。逐拍日誌會干擾主執行緒且無價值。
- **Alternatives considered**: 引入日誌套件：違反原則 III（最少相依）。

## R8. 精準度驗證方式

- **Decision**: 排程邏輯寫成**不依賴瀏覽器音訊**的純 TypeScript 模組，時鐘與發聲以介面注入。
  單元測試以假時鐘模擬 5 分鐘、且每次喚醒時間帶有隨機抖動（0–20 ms），
  驗證第 n 拍排定時間 = 起始時間 + n × 60 / BPM（誤差 < 0.001 ms），證明無漂移（SC-001）。
- **Rationale**: 使精準度在 CI 可重現、具決定性（憲章原則 II）；實際聲音再以 quickstart 手動驗證。
