# Data Model: 節拍器網頁應用（Metronome Web App）

**Feature**: [spec.md](./spec.md) | **Date**: 2026-11-02

所有資料都只存在記憶體中，不做任何持久化（設定儲存不在 MVP 範圍內）。

## MetronomeSettings（使用者可調整的設定）

| 欄位 | 型別 | 範圍／值 | 預設 | 來源需求 |
|---|---|---|---|---|
| `bpm` | integer | 40–240，步進 1 | 120 | FR-004 |
| `beatsPerBar` | `3 \| 4` | 3 或 4 | 4 | FR-007 |

**驗證規則**
- `bpm` 超出範圍時夾回邊界（< 40 → 40，> 240 → 240），非整數時四捨五入。
- `beatsPerBar` 只接受 3 或 4；切換按鈕在兩者之間互換。

## SchedulerState（排程器內部狀態）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `isPlaying` | boolean | 是否正在播放 |
| `beatIndex` | integer | 下一個要排程的拍在小節中的位置，0 起算（0 = 重音） |
| `lastBeatTime` | number \| null（秒，音訊時鐘） | 最近一個已排程之拍的時間；尚未排任何拍時為 `null` |
| `nextBeatTime` | number（秒，音訊時鐘） | 下一個要排程之拍的時間 |
| `pendingBeatsPerBar` | `3 \| 4 \| null` | 待下一小節套用的拍號 |

**衍生規則**
- 每拍間隔 = `60 / bpm` 秒（FR-002）。
- `accent = (beatIndex === 0)`（FR-003）。
- 排完一拍後：`lastBeatTime = 該拍時間`、`nextBeatTime = lastBeatTime + 60 / bpm`；
  `beatIndex = (beatIndex + 1) % beatsPerBar`；當 `beatIndex` 回到 0 且有 `pendingBeatsPerBar`
  時套用它（FR-008）。
- 播放中 `setBpm` 時，若 `lastBeatTime` 不為 `null`，重新計算
  `nextBeatTime = lastBeatTime + 60 / 新 bpm`，使新速度自下一個拍距起生效（FR-006）。
- **錯過的拍**：每次 `tick(now)` 開始時，若 `nextBeatTime < now`，將 `nextBeatTime` 設為 `now`，
  **不補排**已過去的拍。這避免兩種情況造成瞬間連響：播放中由慢改快
  （例如 40 → 240 BPM 時 `lastBeatTime + 0.25` 可能已早於現在），以及喚醒被嚴重延遲。
  正常運作時（喚醒間隔 < 前瞻視窗 100 ms）此條件永遠不成立，因此不影響精準度（SC-001）。

## ScheduledBeat（排程輸出）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `time` | number（秒，音訊時鐘） | 該拍應發聲的精確時間 |
| `accent` | boolean | 是否為重音 |
| `beatIndex` | integer | 小節中第幾拍（0 起算） |

## 狀態轉換

```text
          start()（重置 beatIndex = 0，nextBeatTime = now + 0.05s，套用待定的拍號）
 Stopped ───────────────────────────────────────────▶ Playing
    ▲                                                   │
    └──────────────────── stop() ───────────────────────┘
          （清除計時器、斷開 session 音訊、isPlaying = false）

 Playing 中：
   setBpm(n)          → 立即更新 bpm，下一個尚未排程的拍起生效
   setBeatsPerBar(n)  → 設為 pendingBeatsPerBar，下一小節第 1 拍起生效
 Stopped 中：
   setBpm / setBeatsPerBar → 立即更新設定
```
