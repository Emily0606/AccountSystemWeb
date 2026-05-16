// API 客戶端
// 後端專案：https://github.com/Emily0606/AccountSystem
// 開發時用 localhost，部署後改成後端的公開網址
const API_BASE = 'https://accountsystem-070u.onrender.com';

// ── Token 管理 ─────────────────────────────────────────────────────────────
// JWT Token 存放在 localStorage，鍵值以 ast_ 為前綴避免命名衝突

const tokens = {
  // 取得 Access Token
  getAccess:  () => localStorage.getItem('ast_access'),
  // 取得 Refresh Token
  getRefresh: () => localStorage.getItem('ast_refresh'),
  // 取得過期時間（毫秒）
  getExpiry:  () => Number(localStorage.getItem('ast_expiry') || 0),

  // 登入或刷新後，將後端回傳的 token 資料存入 localStorage
  save(data) {
    localStorage.setItem('ast_access',  data.accessToken);
    localStorage.setItem('ast_refresh', data.refreshToken);
    // expiresIn 單位為秒，轉換為毫秒後加上當前時間得到到期時間點
    localStorage.setItem('ast_expiry',  String(Date.now() + data.expiresIn * 1000));
  },

  // 登出時清除所有 token
  clear() {
    ['ast_access', 'ast_refresh', 'ast_expiry'].forEach(k => localStorage.removeItem(k));
  },

  // 判斷使用者是否已登入（有 Access Token 即視為登入）
  isLoggedIn: () => !!localStorage.getItem('ast_access'),

  // 判斷 Access Token 是否快過期（距離過期不足 60 秒）
  isNearExpiry: () => {
    const expiry = Number(localStorage.getItem('ast_expiry') || 0);
    return expiry > 0 && Date.now() > expiry - 60_000;
  }
};

// ── HTTP 工具函式 ──────────────────────────────────────────────────────────
// 所有 API 請求都經過這個函式，統一處理錯誤

async function http(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  // 204 No Content 代表成功但無回應內容（如登出、刪除帳號）
  if (res.status === 204) return null;

  const body = await res.json().catch(() => null);

  // 非 2xx 視為錯誤，拋出含狀態碼的例外供呼叫端處理
  if (!res.ok) {
    const msg = body?.message ?? `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

// ── 需要認證的 HTTP 工具函式 ───────────────────────────────────────────────
// 自動帶入 Authorization Header，並在 Token 快過期時自動刷新

async function authHttp(path, options = {}) {
  // Token 快過期時，先刷新再發送請求
  if (tokens.isNearExpiry()) {
    await api.refresh().catch(() => {
      tokens.clear();
      throw new Error('登入已過期，請重新登入');
    });
  }

  const accessToken = tokens.getAccess();
  if (!accessToken) throw new Error('尚未登入');

  // 將 Access Token 附加到 Authorization Header
  return http(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${accessToken}` }
  });
}

// ── 對外公開的 API 方法 ────────────────────────────────────────────────────

const api = {
  // 登入：POST /v1/auth/login
  // 成功後自動儲存 token
  async login(account, password) {
    const data = await http('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ account, password })
    });
    tokens.save(data);
    return data;
  },

  // 註冊：POST /v1/auth/register
  // 成功回傳 HTTP 201，無回應內容；顯示名稱為選填
  async register(account, email, password, displayName) {
    const payload = { account, email, password };
    if (displayName) payload.displayName = displayName;
    return http('/v1/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  },

  // 刷新 Token：POST /v1/auth/refresh
  // 使用 Refresh Token 換取新的 Access Token 與 Refresh Token
  async refresh() {
    const refreshToken = tokens.getRefresh();
    if (!refreshToken) throw new Error('沒有可用的 Refresh Token');
    const data = await http('/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
    tokens.save(data);
    return data;
  },

  // 登出：POST /v1/auth/logout
  // 通知後端廢止 Refresh Token，並清除本地 token
  async logout() {
    const refreshToken = tokens.getRefresh();
    if (refreshToken) {
      await http('/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.getAccess()}` },
        body: JSON.stringify({ refreshToken })
      }).catch(() => {}); // 即使後端失敗也繼續清除本地 token
    }
    tokens.clear();
  },

  // 取得個人資料：GET /v1/users/me
  getProfile: () => authHttp('/v1/users/me'),

  // 更新個人資料：PATCH /v1/users/me
  // displayName 與 email 皆為選填，不傳代表不修改
  async updateProfile(displayName, email) {
    const payload = {};
    if (displayName !== undefined) payload.displayName = displayName;
    if (email !== undefined) payload.email = email;
    return authHttp('/v1/users/me', { method: 'PATCH', body: JSON.stringify(payload) });
  },

  // 變更密碼：PATCH /v1/users/me/password
  changePassword: (oldPassword, newPassword) =>
    authHttp('/v1/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ oldPassword, newPassword })
    }),

  // 刪除帳號：DELETE /v1/users/me（軟刪除）
  deleteAccount: () => authHttp('/v1/users/me', { method: 'DELETE' }),

  // 判斷是否已登入
  isLoggedIn: tokens.isLoggedIn
};

// ── 錯誤訊息轉換 ──────────────────────────────────────────────────────────
// 將後端 HTTP 狀態碼轉換為使用者看得懂的中文訊息

function friendlyError(err) {
  if (!err) return '發生未知錯誤';
  const status = err.status;
  if (status === 400) return err.message || '輸入資料格式有誤，請確認後再試';
  if (status === 401) return '帳號或密碼錯誤，請重新輸入';
  if (status === 403) return '帳號已被鎖定，請聯繫管理員';
  if (status === 409) return '帳號或電子郵件已被使用，請改用其他資訊';
  if (status === 500) return '伺服器發生錯誤，請稍後再試';
  return err.message || '發生錯誤，請稍後再試';
}
