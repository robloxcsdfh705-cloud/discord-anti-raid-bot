const STORAGE_KEYS = {
  admins: 'discordAntiRaidAdmins',
  currentUser: 'discordAntiRaidCurrentUser',
  token: 'discordAntiRaidEncryptedToken'
};

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123'
};

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToUint8Array(value) {
  const binary = atob(value);
  const result = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    result[i] = binary.charCodeAt(i);
  }
  return result;
}

async function hashString(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return arrayBufferToBase64(digest);
}

async function hashPassword(password, salt) {
  const seeded = `${salt}:${password}`;
  return hashString(seeded);
}

function getAdmins() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.admins), []);
}

function saveAdmins(admins) {
  localStorage.setItem(STORAGE_KEYS.admins, JSON.stringify(admins));
}

function getCurrentUser() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.currentUser), null);
}

function saveCurrentUser(user) {
  localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  localStorage.removeItem(STORAGE_KEYS.token);
}

async function ensureDefaultAdmin() {
  const admins = getAdmins();
  const exists = admins.some((admin) => admin.username === DEFAULT_ADMIN.username);

  if (exists) return;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltText = arrayBufferToBase64(salt.buffer);
  const passwordHash = await hashPassword(DEFAULT_ADMIN.password, saltText);

  admins.push({
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    username: DEFAULT_ADMIN.username,
    salt: saltText,
    passwordHash,
    email: 'admin@local',
    createdAt: new Date().toISOString(),
    role: 'admin'
  });

  saveAdmins(admins);
}

async function verifyLogin(username, password) {
  const admins = getAdmins();
  const user = admins.find((item) => item.username === username);

  if (!user) return false;

  const hashed = await hashPassword(password, user.salt);
  return hashed === user.passwordHash;
}

async function getUserByUsername(username) {
  return getAdmins().find((admin) => admin.username === username) || null;
}

async function deriveKey(secret) {
  const input = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptText(value, secret) {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(value);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return `${arrayBufferToBase64(iv.buffer)}:${arrayBufferToBase64(encrypted)}`;
}

async function decryptText(value, secret) {
  if (!value || !secret) return null;

  try {
    const [ivPart, encryptedPart] = value.split(':');
    if (!ivPart || !encryptedPart) return null;

    const key = await deriveKey(secret);
    const iv = base64ToUint8Array(ivPart);
    const encrypted = base64ToUint8Array(encryptedPart);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decrypt failed', error);
    return null;
  }
}

async function saveDiscordToken(token) {
  const user = getCurrentUser();
  if (!user) return;

  const admin = await getUserByUsername(user.username);
  if (!admin) return;

  const tokenSecret = `${admin.username}:${admin.passwordHash}`;
  const encrypted = await encryptText(token, tokenSecret);
  localStorage.setItem(STORAGE_KEYS.token, encrypted);
}

async function loadDiscordToken() {
  const user = getCurrentUser();
  if (!user) return null;

  const admin = await getUserByUsername(user.username);
  if (!admin) return null;

  const encrypted = localStorage.getItem(STORAGE_KEYS.token);
  if (!encrypted) return null;

  const tokenSecret = `${admin.username}:${admin.passwordHash}`;
  return decryptText(encrypted, tokenSecret);
}

function showDashboard(user = null) {
  const dashboardSection = document.getElementById('dashboardSection');
  const loginSection = document.getElementById('loginSection');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const accountBadge = document.getElementById('accountBadge');

  const currentUser = user || getCurrentUser();
  if (!currentUser) return;

  userName.textContent = currentUser.username || '管理員';
  userEmail.textContent = currentUser.email || 'admin@local';
  accountBadge.textContent = '已登入';

  dashboardSection.classList.remove('hidden');
  loginSection.classList.add('hidden');
}

function hideDashboard() {
  const dashboardSection = document.getElementById('dashboardSection');
  const loginSection = document.getElementById('loginSection');
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  clearAuth();
}

async function loginAdmin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!username || !password) {
    alert('請輸入帳號與密碼');
    return;
  }

  const valid = await verifyLogin(username, password);
  if (!valid) {
    alert('帳號或密碼錯誤');
    return;
  }

  const admin = await getUserByUsername(username);
  const user = {
    username: admin.username,
    email: admin.email || `${admin.username}@local`
  };

  saveCurrentUser(user);
  showDashboard(user);
  document.getElementById('loginPassword').value = '';
  alert('登入成功');
}

async function verifyDiscordToken(token) {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${token}`
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Token 驗證失敗:', error);
    return false;
  }
}

function showTokenBindingModal() {
  const modal = document.getElementById('tokenBindingModal');
  if (modal) modal.classList.remove('hidden');
}

function hideTokenBindingModal() {
  const modal = document.getElementById('tokenBindingModal');
  if (modal) {
    modal.classList.add('hidden');
    const tokenInput = document.getElementById('tokenInput');
    if (tokenInput) tokenInput.value = '';
  }
}

async function bindDiscordToken() {
  const tokenInput = document.getElementById('tokenInput');
  const button = document.querySelector('.bind-token-btn');

  if (!tokenInput) return;

  const token = tokenInput.value.trim();
  if (!token) {
    alert('請輸入 Discord Bot Token');
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = '驗證中...';
  }

  const valid = await verifyDiscordToken(token);

  if (valid) {
    await saveDiscordToken(token);
    alert('✓ Discord Bot Token 綁定成功，並已加密保存於本機');
    hideTokenBindingModal();
  } else {
    alert('✗ Token 無效，請確認是否為正確的 Discord Bot Token');
  }

  if (button) {
    button.disabled = false;
    button.textContent = '綁定 Token';
  }
}

function saveAISettings() {
  const enabled = document.getElementById('aiReplyToggle').checked;
  const frequency = document.getElementById('aiFrequency').value;
  const keywords = document.getElementById('aiKeywords').value;

  const settings = {
    enabled,
    frequency,
    keywords: keywords.split(',').map((item) => item.trim()).filter(Boolean)
  };

  localStorage.setItem('aiSettings', JSON.stringify(settings));
  alert('✓ AI 設定已保存');
}

function sendCustomMessage() {
  const channel = document.getElementById('channelSelect').value;
  const message = document.getElementById('customMessageText').value.trim();

  if (!channel || !message) {
    alert('請選擇頻道並輸入訊息內容');
    return;
  }

  const currentToken = localStorage.getItem(STORAGE_KEYS.token);
  if (!currentToken) {
    alert('請先綁定 Discord Bot Token');
    return;
  }

  alert(`✓ 將發送到 ${channel}\n${message}`);
  document.getElementById('customMessageText').value = '';
}

function setupManagementTools() {
  const toolButtons = document.querySelectorAll('.tool-btn');
  toolButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const action = event.currentTarget.textContent;
      alert(`${action} 已觸發（實際執行需接上真實 Discord API）`);
    });
  });
}

function attachEvents() {
  document.getElementById('submitLogin').addEventListener('click', loginAdmin);
  document.getElementById('loginButton').addEventListener('click', () => {
    document.getElementById('loginSection').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('signOutButton').addEventListener('click', () => {
    hideDashboard();
    alert('已登出');
  });

  document.getElementById('bindTokenBtn').addEventListener('click', showTokenBindingModal);
  document.getElementById('closeModalBtn').addEventListener('click', hideTokenBindingModal);
  document.querySelector('.bind-token-btn').addEventListener('click', bindDiscordToken);

  document.getElementById('saveAISettings').addEventListener('click', saveAISettings);
  document.getElementById('sendCustomMessageBtn').addEventListener('click', sendCustomMessage);
  document.getElementById('tokenInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') bindDiscordToken();
  });

  setupManagementTools();
}

async function bootstrap() {
  await ensureDefaultAdmin();

  const currentUser = getCurrentUser();
  if (currentUser) {
    showDashboard(currentUser);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  }

  attachEvents();
}

window.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});
