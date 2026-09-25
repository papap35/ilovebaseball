# 愛棒球 — CPBL 數據站

中華職棒的戰績、進階數據視覺化、AI 賽前分析與個人化追蹤。

## 開發

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npx tsc --noEmit   # 型別檢查
npx eslint .
```

## 架構

資料來源與分析是分開的，換成真實資料時不需要動到任何分析或 UI 程式：

```
lib/domain/types.ts    領域型別（Game / BattingLine / PitchingLine / SeasonSnapshot）
lib/sources/           資料來源：只負責產出原始事實
  types.ts             CpblDataSource 介面
  simulated.ts         目前唯一實作（模擬一整季）
lib/analytics/         由原始事實推導出的所有數字（純函式）
  standings.ts         戰績、勝差、連勝敗、主客場分割
  elo.ts               Elo 戰力值（和局計 0.5 勝）
  advanced.ts          畢氏期望勝率、球場係數、wOBA / wRC+ / FIP
  playoff.ts           季後賽晉級機率（蒙地卡羅）
  summary.ts           傳給 client component 的序列化檢視
lib/ai/                賽前分析的 facts 組裝與 Claude 呼叫
```

### 接上真實 CPBL 資料

實作 `CpblDataSource`（`lib/sources/types.ts`）並在 `lib/sources/index.ts` 回傳它即可。
來源只需要提供原始事實 — 逐場比賽結果與球員的**成分數據**（AB/H/2B/3B/HR/BB/HBP/SF、
IP/H/HR/BB/K），其餘指標全部由 `lib/analytics` 推導。

> 目前站上的數據是模擬生成的，只用於產品展示。

### 賽制

季後賽機率依中職實際賽制判定：上、下半季冠軍取得季後賽資格；若同一隊包辦雙冠，
該隊直接進入台灣大賽，其餘由全年勝率遞補，共三隊晉級。

## AI 球評

`app/api/commentary` 會把該場比賽的結構化數據交給 Claude 生成賽前分析。
設定 API key 後啟用：

```bash
cp .env.example .env.local
# 填入 ANTHROPIC_API_KEY
```

沒有設定 key 也能正常使用 — 球評會自動降級為離線模板，並在畫面上標示來源。

## 視覺化

球隊顏色使用各隊真實識別色。中職有四隊落在暖色區，色盲可辨識度無法單靠顏色達標，
因此每張圖都另外提供非顏色的識別通道（折線圖右端直接標示隊名、長條圖 X 軸隊名、
tooltip 標示全名）。球場係數屬於「以 100 為中性的極性資料」，改用藍／紅發散配色而非球隊色。
