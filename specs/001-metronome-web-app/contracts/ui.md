# Contract: 使用者介面（`src/components/Metronome.tsx`）

單一頁面、單一元件。以下為元件測試（`@testing-library/react`）依據的可存取性契約。

| 控制項 | 元件 | 可存取名稱／角色 | 行為 | 需求 |
|---|---|---|---|---|
| 開始／停止 | shadcn `Button` | `role="button"`，名稱於停止時為「開始」、播放時為「停止」 | 切換播放狀態 | FR-001、FR-009 |
| BPM 滑桿 | shadcn `Slider` | `role="slider"`，`aria-label="BPM"`，`aria-valuemin=40`、`aria-valuemax=240`、`aria-valuenow`=目前 BPM | 拖動或方向鍵調整，步進 1 | FR-004、FR-006 |
| BPM 顯示 | 文字 | 顯示「`{bpm} BPM`」 | 隨滑桿即時更新 | FR-005 |
| 拍號切換 | shadcn `Button` | `role="button"`，名稱包含目前拍號（「3/4」或「4/4」） | 在 3 與 4 之間切換 | FR-007、FR-008 |

## 行為約定

- 第一次按「開始」時，在同一個 click 事件處理中建立／恢復音訊（見 research R5）。
- 音訊無法啟動時（例如瀏覽器不支援 Web Audio），顯示一行錯誤訊息
  「無法啟動音訊，請改用支援 Web Audio 的瀏覽器」，並以 `audio.error` 記錄（憲章原則 IV）。
- 不提供本契約以外的控制項（憲章原則 V）。
