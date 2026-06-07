# 部署與設定指南

## 一、Google Cloud 設定

### 1. 建立 Service Account

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案（或使用現有專案）
3. 啟用以下兩個 API：
   - **Google Forms API**
   - **Google Sheets API**
4. 前往「IAM 與管理 > 服務帳戶」，建立新服務帳戶
5. 下載金鑰 JSON 檔案（`key.json`）

### 2. 建立 Google Sheet

1. 建立一個新的 Google 試算表
2. 從網址列取得 Spreadsheet ID（`/d/` 後面那一段）
3. 將試算表共用給 Service Account 的 Email（編輯者權限）

---

## 二、Cloudflare 設定

### 1. 安裝 Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### 2. 建立 KV Namespace

```bash
wrangler kv:namespace create "KV"
```

將輸出的 `id` 填入 `wrangler.toml` 的 `id` 欄位。

### 3. 初始化 KV 預設值

```bash
wrangler kv:key put --namespace-id=<KV_ID> settings '{"isOpen":false,"limit":30}'
wrangler kv:key put --namespace-id=<KV_ID> count '0'
wrangler kv:key put --namespace-id=<KV_ID> emails '{}'
wrangler kv:key put --namespace-id=<KV_ID> form_schema '[]'
```

### 4. 設定 Secrets（機密環境變數）

```bash
wrangler pages secret put ADMIN_PASSWORD
# 輸入管理後台密碼

wrangler pages secret put GOOGLE_SERVICE_ACCOUNT_JSON
# 貼上整個 key.json 的內容（一行）

wrangler pages secret put GOOGLE_SHEET_ID
# 貼上試算表 ID

wrangler pages secret put ALLOWED_ORIGIN
# 貼上你的 Pages 網域，例如 https://your-project.pages.dev
```

---

## 三、部署到 Cloudflare Pages

### 方法 A：GitHub 自動部署（推薦）

1. 將此 Repo push 到 GitHub
2. Cloudflare Dashboard > Pages > 新增專案 > 連接 GitHub Repo
3. Build 設定：
   - Framework preset: `None`
   - Build command: （留空）
   - Build output directory: `.`
4. 部署後，前往「Settings > Functions」確認 Functions 已啟用

### 方法 B：本機手動部署

```bash
wrangler pages deploy .
```

---

## 四、使用流程

1. 前往 `https://your-project.pages.dev/admin.html` 登入管理後台
2. 貼上 Google Form URL，點「匯入表單」
3. 設定人數上限，點「開放報名」
4. 分享 `https://your-project.pages.dev/` 給參與者

---

## 五、本機開發

```bash
npm install -g wrangler
wrangler pages dev . --kv KV
```

需要先在 `.dev.vars` 設定本機環境變數：

```
ADMIN_PASSWORD=test123
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_SHEET_ID=your_sheet_id
ALLOWED_ORIGIN=http://localhost:8788
```
