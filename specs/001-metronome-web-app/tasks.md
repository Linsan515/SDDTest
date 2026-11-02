---

description: "Task list for 節拍器網頁應用（Metronome Web App）"
---

# Tasks: 節拍器網頁應用（Metronome Web App）

**Input**: Design documents from `/specs/001-metronome-web-app/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/scheduler.md, contracts/ui.md, quickstart.md

**Tests**: 包含測試任務。憲章原則 II（測試先行，不可協商）要求先寫測試、確認失敗後才實作。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- 單一前端專案，位於 repo 根目錄：`src/`、`index.html`、`package.json` 等（見 plan.md「Project Structure」）
- 測試與原始碼放在同一資料夾，檔名為 `*.test.ts` / `*.test.tsx`
- 路徑別名 `@/` 指向 `src/`

## 全域規則（每個任務都適用）

- **不得**在任何原始碼中使用 `setInterval`（使用者要求；T010 會自動檢查）。
- 拍子發聲時間只能來自 `AudioContext.currentTime`；計時器只用遞迴 `setTimeout` 喚醒（research R1）。
- 不得加入 spec / contracts 以外的功能、控制項、設定或抽象層（憲章原則 III、V）。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 建立 Vite + React + TypeScript 專案於 repo 根目錄：因根目錄已有 `specs/`、`.claude/`、`.specify/`，**不可**使用 create-vite 的覆寫選項；改為執行 `npm create vite@6 .vite-scaffold -- --template react-ts`，將 `.vite-scaffold/` 內所有檔案（含 `.gitignore`）移到 repo 根目錄後刪除 `.vite-scaffold/`。接著固定版本：`npm i react@18 react-dom@18` 與 `npm i -D vite@6 @vitejs/plugin-react@4 @types/react@18 @types/react-dom@18 typescript@5`，並執行 `npm install` 確認可安裝（產出 `package.json`、`index.html`、`vite.config.ts`、`tsconfig*.json`、`src/main.tsx`、`src/App.tsx`）
- [X] T002 安裝並設定 Tailwind CSS 3：`npm i -D tailwindcss@3 postcss autoprefixer` 與 `npx tailwindcss init -p`；在 `tailwind.config.js` 設定 `content: ["./index.html", "./src/**/*.{ts,tsx}"]`；將 `src/index.css` 內容替換為 `@tailwind base; @tailwind components; @tailwind utilities;` 三行
- [X] T003 設定路徑別名 `@/* → ./src/*`：`npm i -D @types/node`；在 `tsconfig.json` 與 `tsconfig.app.json` 的 `compilerOptions` 加入 `"baseUrl": "."` 與 `"paths": { "@/*": ["./src/*"] }`；在 `vite.config.ts` 加入 `resolve.alias: { "@": path.resolve(__dirname, "./src") }`
- [X] T004 初始化 shadcn/ui（Tailwind v3 相容版）：執行 `npx shadcn@2.3.0 init`（style: default、base color: neutral、CSS variables: yes），產生 `components.json`、`src/lib/utils.ts`，並更新 `tailwind.config.js` 與 `src/index.css`；再執行 `npx shadcn@2.3.0 add button slider` 產生 `src/components/ui/button.tsx`、`src/components/ui/slider.tsx`。**只**加入這兩個元件
- [X] T005 設定 Vitest：`npm i -D vitest@3 jsdom @testing-library/react @testing-library/dom`；在 `vite.config.ts` 頂端加 `/// <reference types="vitest/config" />` 並加入 `test: { environment: "jsdom", setupFiles: ["./src/test-setup.ts"], globals: false }`；建立 `src/test-setup.ts`，內含 `ResizeObserver` 的最小 polyfill（Radix Slider 在 jsdom 需要）與 `afterEach(cleanup)`；在 `package.json` scripts 加入 `"test": "vitest run"` 與 `"test:watch": "vitest"`
- [X] T006 清除 Vite 範本內容：刪除 `src/App.css`、`src/assets/`、`public/vite.svg`；將 `src/App.tsx` 改為只渲染 `<main className="min-h-screen flex items-center justify-center">` 與標題「節拍器」；`index.html` 的 `<title>` 改為「節拍器」、`lang="zh-Hant"`；確認 `npm run build` 與 `npm test`（此時無測試，可加 `--passWithNoTests`）成功
- [X] T007 設定 Prettier（憲章「品質與技術約束」要求格式化工具）：`npm i -D prettier@3`；建立 `.prettierrc.json`（`{ "semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100 }`）與 `.prettierignore`（`dist`、`node_modules`、`specs`、`.specify`、`.claude`）；在 `package.json` scripts 加入 `"format": "prettier --write ."` 與 `"format:check": "prettier --check ."`；執行 `npm run format` 後 `npm run format:check` 通過。不加入 `eslint-config-prettier` 等額外套件（Vite 範本的 ESLint 設定沒有格式規則，不會衝突）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 [P] 撰寫 logger 測試於 `src/lib/logger.test.ts`：以 `vi.spyOn(console, "info")`／`vi.spyOn(console, "error")` 驗證 `log("info", "metronome.start", { bpm: 120 })` 呼叫 `console.info` 一次，參數為單行 JSON 字串，可 `JSON.parse` 且含 `ts`（ISO 字串）、`level: "info"`、`event: "metronome.start"`、`bpm: 120`；`log("error", "audio.error", { message: "x" })` 改走 `console.error`。執行 `npm test` 確認**失敗**
- [X] T009 實作 `src/lib/logger.ts`：匯出 `type LogLevel = "info" | "error"` 與 `log(level, event: string, data: Record<string, unknown> = {})`，輸出 `JSON.stringify({ ts: new Date().toISOString(), level, event, ...data })`；`info` → `console.info`，`error` → `console.error`。不得記錄任何機密資料（research R7）。T008 通過
- [X] T010 [P] 撰寫 `src/metronome/no-setinterval.test.ts`：用 Node `fs`／`path` 遞迴讀取 `src/` 下所有 `.ts`／`.tsx` 檔（排除 `*.test.ts`、`*.test.tsx`），斷言沒有任何檔案內容包含字串 `setInterval`。此測試應立即通過，並在後續所有任務中持續保持通過
- [X] T011 建立 `src/metronome/scheduler.ts` 的型別與常數（尚無邏輯）：依 `contracts/scheduler.md` 匯出 `MIN_BPM = 40`、`MAX_BPM = 240`、`DEFAULT_BPM = 120`、`DEFAULT_BEATS_PER_BAR = 4`、`LOOKAHEAD_SEC = 0.1`、`START_DELAY_SEC = 0.05`，以及 `type BeatsPerBar = 3 | 4`、`interface ScheduledBeat { time: number; accent: boolean; beatIndex: number }`、`interface SchedulerOptions`、`interface Scheduler`（欄位與註解照抄 contract）

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 開始／停止精準節拍並聽到重音（Priority: P1）🎯 MVP

**Goal**: 按「開始」以 120 BPM、4/4 拍播放，每小節第 1 拍為重音；按「停止」立即無聲。

**Independent Test**: `npm test` 中 scheduler 的 US1 測試全部通過（含 5 分鐘無漂移）；`npm run dev` 按開始可聽到 500 ms 間隔、每 4 拍一個重音，按停止立即無聲。

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T012 [P] [US1] 撰寫 `src/metronome/scheduler.test.ts`（US1 區塊，`describe("US1 start/stop")`）：以 `createScheduler({ onBeat })` 收集 `ScheduledBeat[]`，涵蓋：
  (a) `start(10)` 後 `tick(10)` 排出第一拍 `time === 10.05`、`accent === true`、`beatIndex === 0`；
  (b) 120 BPM 下第 n 拍 `time === 10.05 + n * 0.5`（`toBeCloseTo(…, 9)`）；
  (c) **SC-001 無漂移**：以假時鐘從 `now = 0` 模擬 5 分鐘，每次 `tick` 間隔為 25 ms 加上 0–20 ms 的決定性偽隨機抖動（固定種子的簡單 LCG），斷言共排出 600 拍（120 BPM × 5 分鐘，容許最後一拍邊界 ±1）、每一拍 `|time − (0.05 + n × 0.5)| < 1e-6`、沒有重複 `time`、沒有缺漏；
  (d) 每次 `tick` 只排 `time < now + LOOKAHEAD_SEC` 的拍；
  (e) 4/4 時連續 8 拍的 `accent` 為 `[T,F,F,F,T,F,F,F]`；
  (f) `stop()` 後 `tick` 不再排拍、`isPlaying === false`；
  (g) `stop()` 後再 `start(t)`，第一拍 `beatIndex === 0` 且 `accent === true`（FR-009）；
  (h) **不補排已錯過的拍**：`start(0)` 後直接 `tick(2)`（模擬喚醒嚴重延遲），只排出 1 拍且 `time === 2`，再 `tick(2.5)` 排出的下一拍 `time === 2.5`（不得在同一次 `tick` 中補排 0.05、0.55、1.05… 等已過去的拍）。
  執行 `npm test` 確認**失敗**
- [X] T013 [P] [US1] 撰寫 `src/components/Metronome.test.tsx`（US1 區塊）：用 `vi.mock("@/metronome/audio")` 讓 `createAudioEngine` 回傳假引擎（`ensureStarted`、`now` 回傳 0、`startSession`、`stopSession`、`playClick`、`startWakeLoop`、`stopWakeLoop` 皆為 `vi.fn()`）；驗證：初始有名稱為「開始」的按鈕；點擊後按鈕名稱變為「停止」且 `startSession`、`startWakeLoop` 各被呼叫一次、`playClick` 至少被呼叫一次且第一次的第二個參數（accent）為 `true`；再點擊後名稱回到「開始」且 `stopSession`、`stopWakeLoop` 被呼叫；在**同一個** `act(() => { button.click(); button.click(); })` 內對「開始」按鈕連續觸發兩次 click（兩次之間不會重新渲染，模擬快速連按），`startSession` 仍只被呼叫一次（spec 邊界情況「快速連按不得重疊」）；讓假引擎 `ensureStarted` 丟出錯誤時，畫面顯示「無法啟動音訊，請改用支援 Web Audio 的瀏覽器」且按鈕維持「開始」。執行 `npm test` 確認**失敗**

### Implementation for User Story 1

- [X] T014 [US1] 在 `src/metronome/scheduler.ts` 實作 `createScheduler(options)` 的 `start`、`stop`、`tick`、`isPlaying`、`bpm`、`beatsPerBar`（此階段 bpm 固定為 `options.bpm ?? DEFAULT_BPM`、拍號固定為 `options.beatsPerBar ?? DEFAULT_BEATS_PER_BAR`），內部狀態依 `data-model.md` 的 SchedulerState：`start(now)` 設 `isPlaying = true`、`beatIndex = 0`、`lastBeatTime = null`、`nextBeatTime = now + START_DELAY_SEC`；`tick(now)` 在 `isPlaying` 時先檢查 `if (nextBeatTime < now) nextBeatTime = now`（不補排已錯過的拍，data-model「錯過的拍」規則），再 `while (nextBeatTime < now + LOOKAHEAD_SEC)` 呼叫 `onBeat({ time: nextBeatTime, accent: beatIndex === 0, beatIndex })`，接著 `lastBeatTime = nextBeatTime`、`nextBeatTime = lastBeatTime + 60 / bpm`、`beatIndex = (beatIndex + 1) % beatsPerBar`；`stop()` 設 `isPlaying = false`。不得引用 `window`、`AudioContext` 或任何計時器。T012 通過
- [X] T015 [P] [US1] 實作 `src/metronome/audio.ts`：匯出 `createAudioEngine()`，回傳物件含：
  `ensureStarted()`——若尚無 `AudioContext` 則建立（`window.AudioContext ?? window.webkitAudioContext`，皆不存在時 `throw new Error("Web Audio API not supported")`；為通過 TypeScript strict 編譯，在檔案內宣告 `declare global { interface Window { webkitAudioContext?: typeof AudioContext } }`），並呼叫 `ctx.resume()`（必須在使用者 click 處理中同步呼叫，research R5）；
  `now()`——回傳 `ctx.currentTime`；
  `startSession()`——建立新的 `GainNode`（gain 1）連到 `ctx.destination` 作為 session bus；
  `stopSession()`——`disconnect()` 目前的 session bus 並設為 `null`（research R3）；
  `playClick(time, accent)`——建立 `OscillatorNode`（`accent ? 1500 : 1000` Hz）與 `GainNode`，包絡為 `setValueAtTime(0, time)`、`linearRampToValueAtTime(accent ? 1.0 : 0.6, time + 0.001)`、`exponentialRampToValueAtTime(0.0001, time + 0.05)`，接到 session bus，`osc.start(time)`、`osc.stop(time + 0.06)`；無 session 時不做任何事（research R2）；
  `startWakeLoop(cb)`——以**遞迴 `setTimeout`**每 25 ms 呼叫 `cb()`；`stopWakeLoop()`——`clearTimeout`。**不得**使用 `setInterval`
- [X] T016 [US1] 實作 `src/metronome/useMetronome.ts`：React hook，以 `useRef` 保存一個 `createAudioEngine()` 與一個 `createScheduler({ onBeat: (b) => engine.playClick(b.time, b.accent) })`；回傳 `{ isPlaying, error, start, stop }`。`start()`：在 try 中依序 `engine.ensureStarted()`、`engine.startSession()`、`scheduler.start(engine.now())`、`scheduler.tick(engine.now())`、`engine.startWakeLoop(() => scheduler.tick(engine.now()))`，設 `isPlaying = true`、`error = null`，並 `log("info", "metronome.start", { bpm, beatsPerBar })`；catch 時設 `error = "無法啟動音訊，請改用支援 Web Audio 的瀏覽器"` 並 `log("error", "audio.error", { message })`。`stop()`：`engine.stopWakeLoop()`、`engine.stopSession()`、`scheduler.stop()`，設 `isPlaying = false`，`log("info", "metronome.stop")`。若 `scheduler.isPlaying` 已為 `true` 則 `start()` 不做任何事（避免連按重疊；必須以 scheduler 狀態判斷，不得只依賴 React state，因為連按時兩次 click 之間不會重新渲染）。元件卸載時（`useEffect` cleanup）呼叫 `stop()`
- [X] T017 [US1] 實作 `src/components/Metronome.tsx`：使用 `useMetronome()`，以 shadcn `Button` 顯示「開始」／「停止」並在 `onClick` 中呼叫 `start()`／`stop()`；`error` 不為 `null` 時以 `<p role="alert">` 顯示錯誤文字；以 Tailwind 置中排版。依 `contracts/ui.md` 不加入其他控制項。T013 通過
- [X] T018 [US1] 在 `src/App.tsx` 渲染 `<Metronome />`（保留標題「節拍器」）；執行 `npm test` 全部通過、`npm run build` 成功，並依 `quickstart.md` 手動驗證步驟 1、2、5

**Checkpoint**: User Story 1 完整可用且可獨立測試（MVP 第一個可展示版本）

---

## Phase 4: User Story 2 - 以滑桿調整 BPM（Priority: P2）

**Goal**: 以滑桿在 40–240 BPM（步進 1）間調整速度並即時顯示；播放中調整自下一拍生效、不中斷。

**Independent Test**: scheduler 的 US2 測試與 UI 的 US2 測試通過；`npm run dev` 拖動滑桿時顯示值即時變化，播放中速度改變且不中斷。

### Tests for User Story 2 ⚠️

- [X] T019 [P] [US2] 在 `src/metronome/scheduler.test.ts` 新增 `describe("US2 bpm")`：
  (a) `clampBpm`：`39 → 40`、`241 → 240`、`120.4 → 120`、`120.6 → 121`；
  (b) 停止中 `setBpm(60)` 後 `start(0)`，第 n 拍 `time === 0.05 + n * 1.0`；
  (c) 播放中（120 BPM）排出前 3 拍後 `setBpm(60)`，下一個排出的拍 `time === 第 3 拍 time + 1.0`，且 `beatIndex` 延續（不重置）；
  (d) `setBpm(500)` 後 `scheduler.bpm === 240`；
  (e) **慢改快不連響**：`createScheduler({ bpm: 40 })`、`start(0)`，以 25 ms 步進 `tick` 到 `now = 1.4`（此時上一拍為 0.05，下一拍預定 1.55），呼叫 `setBpm(240)`，再繼續以 25 ms 步進 `tick` 到 `now = 3`；斷言 `setBpm` 之後排出的所有相鄰拍間隔皆 `≥ 60 / 240 − 1e-9` 秒，且第一個新排出的拍 `time ≥ 1.4`（不得出現瞬間連響）。
  執行 `npm test` 確認**失敗**
- [X] T020 [P] [US2] 在 `src/components/Metronome.test.tsx` 新增 US2 區塊：存在 `getByRole("slider", { name: "BPM" })`，其 `aria-valuemin="40"`、`aria-valuemax="240"`、`aria-valuenow="120"`；畫面有文字「120 BPM」；對 slider `fireEvent.keyDown(slider, { key: "ArrowRight" })` 後顯示「121 BPM」；`fireEvent.keyDown(slider, { key: "End" })` 後顯示「240 BPM」；`Home` 後顯示「40 BPM」。執行 `npm test` 確認**失敗**

### Implementation for User Story 2

- [X] T021 [US2] 在 `src/metronome/scheduler.ts` 實作並匯出 `clampBpm(value)`（「`bpm` 超出範圍時夾回邊界（< 40 → 40，> 240 → 240），非整數時四捨五入」），以及 `setBpm(bpm)`：`bpm = clampBpm(bpm)`；若 `isPlaying` 且 `lastBeatTime !== null`，重新計算 `nextBeatTime = lastBeatTime + 60 / bpm`（data-model「播放中 setBpm」規則、FR-006）；若新的 `nextBeatTime` 已早於現在，由 T014 在 `tick` 中加入的防護拉回 `now`，不得在 `setBpm` 內另寫第二套補償邏輯。`createScheduler` 的 `options.bpm` 也經 `clampBpm`。T019 通過
- [X] T022 [US2] 在 `src/metronome/useMetronome.ts` 加入 `bpm` state（預設 `DEFAULT_BPM`）與 `setBpm(n)`：呼叫 `scheduler.setBpm(n)`、更新 state 為 `scheduler.bpm`，並 `log("info", "metronome.bpm_change", { bpm })`；回傳值加入 `bpm`、`setBpm`
- [X] T023 [US2] 在 `src/components/Metronome.tsx` 加入 shadcn `Slider`（`min={40} max={240} step={1} value={[bpm]} onValueChange={([v]) => setBpm(v)}`），並讓滑桿的 thumb 具備 `aria-label="BPM"`（若 shadcn 產生的 `slider.tsx` 未轉傳 aria 屬性至 `SliderPrimitive.Thumb`，以最小修改加入一個 `thumbLabel` 或直接轉傳 `aria-label` 的 prop）；在滑桿上方顯示文字 `{bpm} BPM`。T020 通過，並依 `quickstart.md` 手動驗證步驟 3

**Checkpoint**: User Stories 1 與 2 皆可獨立運作

---

## Phase 5: User Story 3 - 切換每小節 3 拍或 4 拍（Priority: P3）

**Goal**: 按鈕在 3/4 與 4/4 之間切換並顯示目前拍號；播放中切換自下一小節第 1 拍生效。

**Independent Test**: scheduler 的 US3 測試與 UI 的 US3 測試通過；`npm run dev` 切到 3/4 後每 3 拍一個重音。

### Tests for User Story 3 ⚠️

- [X] T024 [P] [US3] 在 `src/metronome/scheduler.test.ts` 新增 `describe("US3 meter")`：
  (a) 停止中 `setBeatsPerBar(3)` 後 `start(0)`，連續 6 拍 `accent` 為 `[T,F,F,T,F,F]`，`scheduler.beatsPerBar === 3`；
  (b) 播放中 4/4 已排出 2 拍（`beatIndex` 下一個為 2）時 `setBeatsPerBar(3)`：接下來排出的拍 `beatIndex` 依序為 `2, 3, 0, 1, 2, 0`（本小節以 4 拍完成，下一小節起改為 3 拍），且 `beatIndex === 0` 的拍 `accent === true`；
  (c) 播放中切換不影響拍與拍的時間間隔（仍為 `60 / bpm`）。
  執行 `npm test` 確認**失敗**
- [X] T025 [P] [US3] 在 `src/components/Metronome.test.tsx` 新增 US3 區塊：存在名稱包含「4/4」的按鈕；點擊後名稱包含「3/4」；再點擊回到「4/4」。執行 `npm test` 確認**失敗**

### Implementation for User Story 3

- [X] T026 [US3] 在 `src/metronome/scheduler.ts` 實作 `setBeatsPerBar(n: 3 | 4)`：停止中直接設定 `beatsPerBar = n`；播放中設 `pendingBeatsPerBar = n`，並在 `tick` 推進拍位後，當 `beatIndex` 回到 0 且 `pendingBeatsPerBar !== null` 時套用並清為 `null`（data-model、FR-008）。注意 `beatIndex` 的取模必須用**套用前**的拍號，讓本小節完整結束。T024 通過
- [X] T027 [US3] 在 `src/metronome/useMetronome.ts` 加入 `beatsPerBar` state（預設 `DEFAULT_BEATS_PER_BAR`）與 `toggleBeatsPerBar()`：在 3 與 4 之間切換，呼叫 `scheduler.setBeatsPerBar(next)`、更新 state，並 `log("info", "metronome.meter_change", { beatsPerBar: next })`；回傳值加入 `beatsPerBar`、`toggleBeatsPerBar`
- [X] T028 [US3] 在 `src/components/Metronome.tsx` 加入 shadcn `Button`（`variant="outline"`），文字為 `拍號：{beatsPerBar}/4`，`onClick={toggleBeatsPerBar}`。T025 通過，並依 `quickstart.md` 手動驗證步驟 4

**Checkpoint**: 所有使用者情境皆可獨立運作

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T029 執行 `npm run lint` 與 `npm run format` 並修正所有錯誤（不新增 ESLint 規則或套件），於 `src/` 範圍
- [X] T030 執行 `npm test`（含 `src/metronome/no-setinterval.test.ts`）、`npm run format:check` 與 `npm run build`，全部通過且無 TypeScript 錯誤
- [ ] T031 依 `specs/001-metronome-web-app/quickstart.md` 完成全部手動驗證（步驟 1–8，含錄音量測 ±5 ms、背景分頁測試與使用性抽測），並將結果與任何偏差記錄於 `specs/001-metronome-web-app/quickstart.md` 末尾的「驗證紀錄」段落。背景分頁測試須在 Phase 7（Web Worker 喚醒）完成後進行

---

## Phase 7: Bug Fix — 背景分頁降速（使用者回報）

**Purpose**: 使用者回報切到其他分頁時 120 BPM 會變成 60 BPM 並卡頓。原因：主執行緒的 `setTimeout` 在背景分頁被節流為約每秒一次。依 research R1（已修訂）改為在 Web Worker 內喚醒。

- [X] T032 撰寫 `src/metronome/audio.test.ts`：以 `vi.stubGlobal("Worker", FakeWorker)` 驗證 `startWakeLoop(cb)` 建立 URL 含 `wake-worker`、`type: "module"` 的 Worker 並送出 `"start"`；Worker 每送一次訊息 `cb` 被呼叫一次；`stopWakeLoop()` 呼叫 `terminate()`。執行 `npm test` 確認**失敗**
- [X] T033 建立 `src/metronome/wake-worker.ts`：收到 `"start"` 時以遞迴 `setTimeout` 每 25 ms `postMessage("tick")`，收到 `"stop"` 時 `clearTimeout`；**不得**使用 `setInterval`
- [X] T034 修改 `src/metronome/audio.ts` 的 `startWakeLoop`／`stopWakeLoop`：以 `new Worker(new URL("./wake-worker.ts", import.meta.url), { type: "module" })` 建立 Worker，`onmessage` 呼叫 callback；停止時 `terminate()`。T032 通過，`npm run build` 產出 worker chunk

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 → T002 → T003 → T004 → T005 → T006 → T007，必須依序（皆修改相同設定檔）
- **Foundational (Phase 2)**: 依賴 Setup 完成；T008、T010 可平行；T009 依賴 T008；T011 無依賴於 T008–T010
- **User Stories (Phase 3+)**: 依賴 Foundational 完成
- **Polish (Phase 6)**: 依賴所有使用者情境完成

### User Story Dependencies

- **US1 (P1)**: Foundational 完成後即可開始，不依賴其他情境
- **US2 (P2)**: 擴充 US1 的 `scheduler.ts`、`useMetronome.ts`、`Metronome.tsx`，需在 US1 完成後進行（憲章原則 V：MVP 驗證後再做下一個）
- **US3 (P3)**: 同上，需在 US1 完成後進行；與 US2 修改相同檔案，建議 US2 之後依序進行

### Within Each User Story

- 測試先寫並確認失敗 → scheduler 邏輯 → audio／hook → UI 元件
- 每個情境完成並通過 Checkpoint 後才進入下一個優先順序

### Parallel Opportunities

- Phase 2：T008 與 T010 可平行（不同檔案）
- US1：T012 與 T013 可平行（不同測試檔）；T015（`audio.ts`）可與 T014（`scheduler.ts`）平行
- US2：T019 與 T020 可平行
- US3：T024 與 T025 可平行

---

## Parallel Example: User Story 1

```bash
# 先平行撰寫 US1 的兩組測試：
Task: "T012 撰寫 scheduler US1 測試於 src/metronome/scheduler.test.ts"
Task: "T013 撰寫 Metronome US1 元件測試於 src/components/Metronome.test.tsx"

# 測試確認失敗後，平行實作兩個獨立模組：
Task: "T014 實作 createScheduler 於 src/metronome/scheduler.ts"
Task: "T015 實作 createAudioEngine 於 src/metronome/audio.ts"
```

---

## Implementation Strategy

### MVP First（User Story 1 Only）

1. 完成 Phase 1：Setup
2. 完成 Phase 2：Foundational
3. 完成 Phase 3：User Story 1
4. **STOP and VALIDATE**：`npm test` 通過，並以 quickstart 步驟 1、2、5 手動驗證
5. 可展示：固定 120 BPM、4/4 的精準節拍器

### Incremental Delivery

1. Setup + Foundational → 基礎就緒
2. 加入 US1 → 測試 → 展示（MVP！）
3. 加入 US2（BPM 滑桿）→ 測試 → 展示
4. 加入 US3（拍號切換）→ 測試 → 展示
5. Polish → 完整 quickstart 驗證

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- 每個測試任務都必須先執行並看到**失敗**，再進行對應實作（憲章原則 II）
- 建議每完成一個任務或一組邏輯相關任務就 commit
- 避免：模糊任務、同檔案衝突、規格外功能
