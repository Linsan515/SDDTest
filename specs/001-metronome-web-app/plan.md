# Implementation Plan: 節拍器網頁應用（Metronome Web App）

**Branch**: `001-metronome-web-app` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-metronome-web-app/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

建立單頁節拍器網頁：開始／停止、40–240 BPM 滑桿、3/4 與 4/4 切換、每小節第一拍重音。
精準度的關鍵是**不使用 `setInterval` 觸發聲音**，而是以 Web Audio API 的音訊時鐘
（`AudioContext.currentTime`）為唯一時間基準，採前瞻排程：在 Web Worker 內每 25 ms 以遞迴 `setTimeout` 喚醒一次（背景分頁也不會被節流），
把未來 100 ms 內的拍子預先排到音訊時鐘上的精確時間（見 [research.md](./research.md) R1）。
排程邏輯為不依賴瀏覽器的純 TypeScript 模組，以 Vitest 在假時鐘下驗證 5 分鐘無漂移。
介面以 Vite + React + TypeScript + Tailwind CSS 3 + shadcn/ui（Button、Slider）實作。

## Technical Context

**Language/Version**: TypeScript 5.x（strict），執行於瀏覽器；開發工具需 Node.js 20.19+ 或 22 LTS

**Primary Dependencies**: Vite 6、React 18、Tailwind CSS 3（+ PostCSS、Autoprefixer）、
shadcn/ui（以 `shadcn@2.3.0` CLI 安裝 `button`、`slider`，底層為 Radix UI）、Web Audio API（瀏覽器內建）

**Storage**: N/A（設定只存在記憶體中）

**Testing**: Vitest 3 + jsdom + `@testing-library/react`

**Code Quality**: ESLint（Vite 範本內建設定）+ Prettier 3（`format:check`），對應憲章「品質與技術約束」

**Target Platform**: 桌機與手機的主流現代瀏覽器（Chrome、Edge、Firefox、Safari 最新兩個主要版本）

**Project Type**: 單頁前端 web app（無後端）

**Performance Goals**: 每拍與理想時間偏差 ≤ ±5 ms、無累積漂移（SC-001）；開始／停止反應 ≤ 100 ms（SC-002）

**Constraints**: 不得使用 `setInterval` 播放拍子；無需登入、無需安裝；不新增 MVP 範圍外功能

**Scale/Scope**: 1 個頁面、1 個主要元件、3 個使用者情境、10 條功能需求

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 檢查 | 狀態 |
|---|---|---|
| I. 規格驅動 | `spec.md` 已完成且通過品質檢查清單；本計畫、research、data model、contracts 皆可追溯到 FR／SC | ✅ PASS |
| II. 測試先行 | 排程器以純函式模組設計，時鐘可注入 → 可先寫失敗測試；每個 US 對應 Vitest 測試（見 quickstart）；`npm test` 單一指令、決定性 | ✅ PASS |
| III. 簡潔優先 | 單一專案、無後端、無狀態管理套件、無日誌套件；音效以振盪器合成不需音檔；不使用 AudioWorklet。Web Worker 只用於喚醒迴圈（約 20 行），是滿足「背景分頁仍維持精準」的最小作法（research R1） | ✅ PASS |
| IV. 可觀測性 | 極小 JSON logger 記錄 start/stop/bpm_change/meter_change/audio.error；錯誤顯示於 UI 且寫入 `console.error`（research R7） | ✅ PASS |
| V. MVP 優先 | 只實作 spec 的 US1–US3 與 FR-001–FR-010；只加入 `button`、`slider` 兩個 shadcn 元件；無擴充點、無設定儲存 | ✅ PASS |

**Re-check after Phase 1 design**: ✅ PASS — 設計產出未新增任何規格外功能或抽象層；
外部相依皆為使用者指定（Vite、React、TypeScript、Tailwind 3、shadcn、Vitest），
額外的 `@testing-library/react` 用於驗證 UI 驗收情境（research R6），
Prettier 用於滿足憲章「必須通過標準格式化工具」的要求。

## Project Structure

### Documentation (this feature)

```text
specs/001-metronome-web-app/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── scheduler.md
│   └── ui.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
index.html
package.json
vite.config.ts               # 含 Vitest 設定（environment: jsdom）
tailwind.config.js
postcss.config.js
components.json              # shadcn 設定
.prettierrc.json / .prettierignore
tsconfig.json / tsconfig.app.json / tsconfig.node.json
src/
├── main.tsx
├── App.tsx
├── index.css                # Tailwind 指令 + shadcn CSS 變數
├── test-setup.ts            # Vitest 設定：ResizeObserver polyfill、cleanup
├── lib/
│   ├── utils.ts             # shadcn 的 cn()
│   ├── logger.ts            # 結構化 JSON 日誌（原則 IV）
│   └── logger.test.ts
├── components/
│   ├── ui/
│   │   ├── button.tsx       # shadcn 產生
│   │   └── slider.tsx       # shadcn 產生
│   ├── Metronome.tsx        # 唯一的功能元件（contracts/ui.md）
│   └── Metronome.test.tsx
└── metronome/
    ├── scheduler.ts         # 純排程邏輯（contracts/scheduler.md）
    ├── scheduler.test.ts
    ├── audio.ts             # AudioContext、click 合成、session gain、啟動／停止喚醒 Worker
    ├── audio.test.ts
    ├── wake-worker.ts       # Web Worker：每 25 ms 送出 tick（背景分頁不被節流）
    ├── useMetronome.ts      # React hook：串接 scheduler 與 audio
    └── no-setinterval.test.ts
```

**Structure Decision**: 單一前端專案，直接位於 repo 根目錄（Vite 預設結構）。
測試與原始碼放在同一資料夾（`*.test.ts(x)`），不另建 `tests/` 樹，以減少目錄層級。
`src/metronome/` 將「精準計時」核心與 UI 分離，是可獨立測試的最小切分，不屬於額外抽象層。

## Complexity Tracking

無違反憲章之處，不需填寫。
