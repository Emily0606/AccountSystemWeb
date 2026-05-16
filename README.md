# AccountSystemWeb

帳號管理系統的前端介面，對接 [AccountSystem](https://github.com/Emily0606/AccountSystem) REST API。

## 功能

- 使用者登入 / 註冊
- 個人資料查看
- JWT Token 自動刷新

## 專案結構

```
AccountSystemWeb/
├── index.html          # 登入頁面
├── register.html       # 註冊頁面
├── dashboard.html      # 個人資料頁面
├── css/
│   └── style.css       # 共用樣式
└── js/
    └── api.js          # API 客戶端（含 Token 管理）
```

## 本機開發

### 前置需求

- 後端 [AccountSystem](https://github.com/Emily0606/AccountSystem) 須先啟動於 `http://localhost:8080`
- VS Code 安裝 [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) 擴充套件

### 啟動步驟

1. 啟動後端（`http://localhost:8080`）
2. 在 VS Code 對 `index.html` 按右鍵，選 **Open with Live Server**
3. 瀏覽器自動開啟 `http://localhost:5500`

### 修改後端位址

若後端不在預設位址，編輯 `js/api.js` 第一行：

```js
const API_BASE = 'http://localhost:8080';
```

## 注意事項

**CORS：** 後端需允許來自 `http://localhost:5500` 的請求，相關設定請參考 [AccountSystem](https://github.com/Emily0606/AccountSystem) 的 `SecurityConfig.java`。

## 相關連結

- 後端專案：[Emily0606/AccountSystem](https://github.com/Emily0606/AccountSystem)
- API 文件（後端啟動後）：`http://localhost:8080/swagger-ui.html`
