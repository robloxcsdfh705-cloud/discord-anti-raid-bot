# Discord Anti-Raid Bot

一套以 GitHub Pages 為網站入口、Google 登入作為管理員驗證，並綁定 Discord Bot Token 的防炸群與伺服器管理專案。

## 專案特色

- Google 帳號登入管理後台
- 綁定 Discord Bot Token
- 防炸群偵測：大量加入、釣魚連結、惡意訊息
- 驗證系統：新成員必須驗證後才可進入
- 歡迎 / 離開流程：自訂歡迎訊息與離開日誌
- 管理工具：禁言、踢出、封鎖、警告、黑名單
- AI 自動回覆：關鍵字觸發自動回覆
- 自訂發送訊息：可指定頻道發送公告或提醒
- GitHub Pages 前端部署：不需要第三方網站平台

## 功能總覽

- 防炸群檢測
- 驗證制度
- 歡迎/離開通知
- 批量加入警報
- 可疑連結判斷
- AI 回覆設定
- 自訂訊息發送
- 僅管理員可操作

## 技術架構

- 前端網站：GitHub Pages（HTML / CSS / JS）
- 登入方式：Google OAuth 2.0
- 機器人平台：Discord.js
- 執行環境：Node.js
- 資料保存：localStorage（網站前端）
- 真正管理資料：可接 MongoDB / SQLite / Supabase（擴充用）

## 專案結構

- `index.html`：管理控制台 UI
- `styles.css`：界面樣式
- `app.js`：Google 登入、Token 綁定、UI 邏輯
- `README.md`：專案說明
- `bot/discord-bot.js`：Discord 機器人主程式
- `bot/package.json`：Node.js 依賴
- `bot/.env.example`：機器人環境設定樣本

## Google 登入設定

1. 到 Google Cloud Console 建立 OAuth 2.0 Client ID
2. 在「Authorized JavaScript origins」加入你的 GitHub Pages 網址
3. 例如：
   - `https://robloxcsdfh705-cloud.github.io`
4. 在 `index.html` 中把 `YOUR_GOOGLE_CLIENT_ID` 替換成你的 Client ID

## Discord Bot Token 綁定

1. 到 Discord Developer Portal 建立一個 Bot
2. 取得 Bot Token
3. 在網站登入後，點擊「綁定 Discord Token」
4. 將機器人 Token 填入並驗證

## GitHub Pages 部署

1. 推送到 GitHub
2. 開啟 Repository Settings
3. 進入 Pages
4. 設定為 `Deploy from a branch`
5. 分支選 `main`
6. 資料夾保持 `/`
7. 儲存後即可取得 GitHub Pages 網址

## Discord 機器人啟動

```bash
cd bot
npm install
cp .env.example .env
```

編輯 `.env`：

```env
DISCORD_TOKEN=你的機器人Token
CLIENT_ID=你的應用程式Client ID
GUILD_ID=你的伺服器ID
ADMIN_IDS=你的Discord使用者ID
```

啟動：

```bash
npm start
```

## Discord 機器人指令（中文）

- `/ping`：檢查機器人是否在線
- `/驗證`：讓新成員完成驗證
- `/警告 @user 原因`：發送警告
- `/禁言 @user 時間`：禁言使用者
- `/解除禁言 @user`：解除禁言
- `/踢出 @user 原因`：踢出成員
- `/封鎖 @user 原因`：封鎖使用者
- `/說 #頻道 內容`：自訂發送訊息
- `/設置歡迎 內容`：設定歡迎訊息

## 安全建議

這個版型是適合初期展示與部署的完整腳手架，正式商用建議再加上：

- 後端 API（避免前端直接儲存 Token）
- 資料庫儲存設定
- 角色權限系統
- 審核日誌
- Discord slash command 自動部署
- 伺服器端速率限制

## 經典防炸群規則

- 60 秒內大量加入
- 可疑外部連結
- 重複垃圾訊息
- 大量 @everyone / @here
- 反覆驗證失敗
- 新成員短時間內大量踢出與重新加入

## 免責聲明

本專案僅供教育、個人開發、伺服器安全工具研究與學習使用，請勿用於侵害第三方權益或違法用途。

## 授權

MIT
