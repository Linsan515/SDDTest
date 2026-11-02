# Contract: 節拍排程器模組（`src/metronome/scheduler.ts`）

純 TypeScript 模組，不直接引用 `window`、`AudioContext` 或任何計時器；
時鐘與「醒來」機制由呼叫端注入，以便單元測試完全決定性（見 [research.md](../research.md) R1、R8）。

## 常數

| 名稱 | 值 | 說明 |
|---|---|---|
| `MIN_BPM` | 40 | BPM 下限 |
| `MAX_BPM` | 240 | BPM 上限 |
| `DEFAULT_BPM` | 120 | 預設 BPM |
| `DEFAULT_BEATS_PER_BAR` | 4 | 預設拍號 |
| `LOOKAHEAD_SEC` | 0.1 | 前瞻排程視窗 |
| `START_DELAY_SEC` | 0.05 | 按下開始到第一拍的延遲 |

## 函式

### `clampBpm(value: number): number`
- 回傳四捨五入並夾在 `[MIN_BPM, MAX_BPM]` 的整數。

### `createScheduler(options): Scheduler`

```ts
type BeatsPerBar = 3 | 4;

interface ScheduledBeat { time: number; accent: boolean; beatIndex: number }

interface SchedulerOptions {
  bpm?: number;                       // 預設 DEFAULT_BPM
  beatsPerBar?: BeatsPerBar;          // 預設 DEFAULT_BEATS_PER_BAR
  onBeat: (beat: ScheduledBeat) => void; // 每排定一拍呼叫一次
}

interface Scheduler {
  start(now: number): void;   // now = 目前音訊時鐘秒數；第一拍排在 now + START_DELAY_SEC，accent = true
  stop(): void;
  tick(now: number): void;    // 排定所有 time < now + LOOKAHEAD_SEC 的拍；停止中呼叫無作用
  setBpm(bpm: number): void;  // 經 clampBpm；下一個尚未排程的拍起生效
  setBeatsPerBar(n: BeatsPerBar): void; // 播放中：下一小節起生效；停止中：立即生效
  readonly isPlaying: boolean;
  readonly bpm: number;
  readonly beatsPerBar: BeatsPerBar;  // 目前生效中的拍號
}
```

## 保證（測試必須覆蓋）

1. `start(t)` 後第 n 拍（0 起算）的 `time` = `t + START_DELAY_SEC + n × 60 / bpm`，
   無論 `tick` 被呼叫的時間點如何抖動（SC-001 無漂移）。
2. 每次 `tick` 不會重複排定同一拍，也不會漏排。
3. 每小節第 1 拍 `accent === true`，其餘為 `false`（FR-003）。
4. 播放中 `setBpm` 只影響尚未排定的拍（FR-006）。
5. 播放中 `setBeatsPerBar` 自下一小節第 1 拍起生效（FR-008）。
6. `stop()` 後再 `start()` 從 `beatIndex = 0` 開始（FR-009）。
7. 模組內**不得**使用 `setInterval`。
8. `tick(now)` 時若下一拍時間已早於 `now`，只會從 `now` 起排一拍，**不補排**已錯過的拍；
   因此任何時候相鄰兩拍的間隔都不會小於當下的 `60 / bpm`（spec 邊界情況、SC-005）。
