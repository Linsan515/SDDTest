# 節拍器（Metronome Web App）

**線上版：https://linsan515.github.io/SDDTest/**（直接開啟即可使用，不需安裝）

在瀏覽器中使用的精準節拍器：

- 開始／停止播放，每小節第一拍為重音
- 以滑桿調整速度（40–240 BPM）
- 切換 3/4 或 4/4 拍

拍子的發聲時間由 Web Audio API 的音訊時鐘決定，不使用 `setInterval`，長時間播放也不會漂移；
排程器由 Web Worker 喚醒，切到背景分頁時速度仍維持不變。

## 環境需求

- Node.js 20.19 以上或 22 LTS（含 npm）
- 支援 Web Audio API 的現代瀏覽器（Chrome、Edge、Firefox、Safari）

## 安裝

```bash
git clone git@github.com:Linsan515/SDDTest.git
cd SDDTest
npm install
```

## 執行

```bash
npm run dev
```

開啟終端機顯示的網址（預設為 http://localhost:5173），按「開始」即可播放。

> 瀏覽器規定音訊必須由使用者操作啟動，因此要先按一次「開始」才會有聲音。

## 常用指令

| 指令                   | 說明                           |
| ---------------------- | ------------------------------ |
| `npm run dev`          | 啟動開發伺服器                 |
| `npm test`             | 執行所有測試（Vitest）         |
| `npm run test:watch`   | 監看模式執行測試               |
| `npm run build`        | 型別檢查並建置正式版到 `dist/` |
| `npm run preview`      | 在本機預覽 `dist/` 的建置結果  |
| `npm run lint`         | ESLint 檢查                    |
| `npm run format`       | 以 Prettier 格式化程式碼       |
| `npm run format:check` | 檢查格式是否符合 Prettier      |

## 部署

線上版本：https://linsan515.github.io/SDDTest/

每次 push 到 `main`，GitHub Actions（`.github/workflows/deploy.yml`）會自動執行測試、建置，
並把 `dist/` 發布到 GitHub Pages。測試失敗時不會發布。

正式版建置的網址路徑是 `/SDDTest/`（`vite.config.ts` 的 `base`），開發伺服器仍在根路徑 `/`。
若改用其他主機或 repo 名稱，請一併修改 `base`。

## 專案結構

```text
src/
├── components/
│   ├── Metronome.tsx        # 節拍器畫面
│   └── ui/                  # shadcn/ui 元件（button、slider）
├── metronome/
│   ├── scheduler.ts         # 節拍排程邏輯（不依賴瀏覽器，可單元測試）
│   ├── audio.ts             # Web Audio：音效合成、啟動喚醒 Worker
│   ├── wake-worker.ts       # Web Worker：每 25 ms 喚醒排程器
│   └── useMetronome.ts      # 串接排程器與音訊的 React hook
└── lib/
    └── logger.ts            # 結構化 JSON 日誌
```

## 開發方式

本專案以 [Spec Kit](https://github.com/github/spec-kit) 進行規格驅動開發：

- 專案憲章：`.specify/memory/constitution.md`
- 本功能的規格、計畫與任務：`specs/001-metronome-web-app/`

技術堆疊：Vite、React 18、TypeScript、Tailwind CSS 3、shadcn/ui、Vitest。
