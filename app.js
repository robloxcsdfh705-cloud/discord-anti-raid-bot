const STORAGE_KEYS = {
  admins: 'discordAntiRaidAdmins',
  currentUser: 'discordAntiRaidCurrentUser',
  token: 'discordAntiRaidEncryptedToken',
  settings: 'discordAntiRaidSettings',
  logs: 'discordAntiRaidLogs',
  guildData: 'discordAntiRaidGuildData'
};

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123'
};

const DEFAULT_SETTINGS = {
  massJoinProtection: true,
  phishingDetection: true,
  verificationRequired: true,
  adScan: true,
  welcomeMessage: true,
  leaveLog: true,
  autoRole: true,
  aiAutoReply: true,
  aiReplyEnabled: true,
  aiFrequency: '特定關鍵字',
  aiKeywords: ['歡迎', '規則', '驗證', '協助', '幫助'],
  customMessage: '歡迎加入伺服器，請先閱讀規則並完成驗證！'
};

const DEFAULT_SERVER_DATA = {
  guildName: '尚未綁定伺服器',
  guildId: '',
  avatarUrl: '',
  channels: [
    { id: 'general', name: 'general', type: 0 },
    { id: 'welcome', name: 'welcome', type: 0 },
    { id: 'rules', name: 'rules', type: 0 }
  ],
  roles: [
    { id: 'admin', name: '管理員' },
    { id: 'member', name: '成員' }
  ],
  source: 'local'
};

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function getGuildData() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEYS.guildData), DEFAULT_SERVER_DATA);
}

function saveGuildData(guildData) {
  localStorage.setItem(STORAGE_KEYS.guildData, JSON.stringify(guildData));
}

function buildFallbackGuildData() {
  return {
    guildName: '示例伺服器',
    guildId: 'demo-server',
    avatarUrl: '',
    channels: [
      { id: 'general', name: 'general', type: 0 },
      { id: 'welcome', name: 'welcome', type: 0 },
      { id: 'rules', name: 'rules', type: 0 },
      { id: 'mod-logs', name: 'mod-logs', type: 0 }
    ],
    roles: [
      { id: 'owner', name: '伺服器擁有者' },
      { id: 'admin', name: '管理員' },
      { id: 'member', name: '成員' }
    ],
    source: 'fallback'
  };
}

async function fetchBotGuildData(token) {
  const headers = {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', { headers });
    if (!guildsResponse.ok) {
      return buildFallbackGuildData();
    }

    const guilds = await guildsResponse.json();
    if (!Array.isArray(guilds) || guilds.length === 0) {
      return buildFallbackGuildData();
    }

    const selectedGuild = guilds[0];
    const guildUrl = `https://discord.com/api/v10/guilds/${selectedGuild.id}`;
    const channelsUrl = `https://discord.com/api/v10/guilds/${selectedGuild.id}/channels`;
    const rolesUrl = `https://discord.com/api/v10/guilds/${selectedGuild.id}/roles`;

    const [guildResponse, channelsResponse, rolesResponse] = await Promise.all([
      fetch(guildUrl, { headers }),
      fetch(channelsUrl, { headers }),
      fetch(rolesUrl, { headers })
    ]);

    const guildInfo = guildResponse.ok ? await guildResponse.json() : selectedGuild;
    const channels = channelsResponse.ok ? await channelsResponse.json() : [];
    const roles = rolesResponse.ok ? await rolesResponse.json() : [];

    return {
      guildName: guildInfo.name || selectedGuild.name || 'Discord 伺服器',
      guildId: guildInfo.id || selectedGuild.id || '',
      avatarUrl: guildInfo.icon ? `https://cdn.discordapp.com/icons/${guildInfo.id}/${guildInfo.icon}.png` : '',
      channels: (channels || []).filter((channel) => channel && (channel.type === 0 || channel.type === 5)).map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type
      })),
      roles: (roles || []).slice(0, 8).map((role) => ({
        id: role.id,
        name: role.name
      })),
      source: 'discord-api'
    };
  } catch (error) {
    console.error('取得 Discord 伺服器資料失敗:', error);
    return buildFallbackGuildData();
  }
}

function renderServerData() {
  const guildData = getGuildData();
  const serverName = document.getElementById('serverName');
  const serverId = document.getElementById('serverId');
  const guildAvatar = document.getElementById('guildAvatar');
  const guildRoleList = document.getElementById('guildRoleList');
  const serverChannelSummary = document.getElementById('serverChannelSummary');
  const channelSelect = document.getElementById('channelSelect');

  if (!serverName || !serverId || !guildRoleList || !serverChannelSummary || !channelSelect) {
    return;
  }

  serverName.textContent = guildData.guildName || DEFAULT_SERVER_DATA.guildName;
  serverId.textContent = guildData.guildId ? `伺服器 ID：${guildData.guildId}` : '尚未綁定機器人';

  if (guildData.avatarUrl) {
    guildAvatar.src = guildData.avatarUrl;
    guildAvatar.classList.remove('hidden');
  } else {
    guildAvatar.src = '';
    guildAvatar.classList.add('hidden');
  }

  const roleList = Array.isArray(guildData.roles) && guildData.roles.length > 0 ? guildData.roles : DEFAULT_SERVER_DATA.roles;
  guildRoleList.innerHTML = roleList.slice(0, 8).map((role) => `<span class="role-pill">${role.name}</span>`).join('');

  const channelList = Array.isArray(guildData.channels) && guildData.channels.length > 0 ? guildData.channels : DEFAULT_SERVER_DATA.channels;
  serverChannelSummary.innerHTML = channelList.slice(0, 6).map((channel) => `<span class="channel-chip">#${channel.name}</span>`).join('');

  channelSelect.innerHTML = '<option value="">選擇頻道...</option>' + channelList.map((channel) => `<option value="#${channel.name}">#${channel.name}</option>`).join('');
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
  return hashString(`${salt}:${password}`);
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

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeJsonParse(localStorage.getItem(STORAGE_KEYS.settings), {}) };
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  localStorage.removeItem(STORAGE_KEYS.token);
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : `admin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function ensureDefaultAdmin() {
  let admins = getAdmins();

  if (!Array.isArray(admins) || admins.length === 0) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltText = arrayBufferToBase64(salt.buffer);
    const passwordHash = await hashPassword(DEFAULT_ADMIN.password, saltText);

    admins = [{
      id: generateId(),
      username: DEFAULT_ADMIN.username,
      salt: saltText,
      passwordHash,
      email: 'admin@local',
      role: 'admin',
      createdAt: new Date().toISOString()
    }];

    saveAdmins(admins);
  }

  const settings = getSettings();
  saveSettings(settings);
}

async function verifyLogin(username, password) {
  const admins = getAdmins();
  const user = admins.find((item) => item.username === username);

  if (!user) return false;

  const passwordHash = await hashPassword(password, user.salt);
  return passwordHash === user.passwordHash;
}

function getUserByUsername(username) {
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

  const admin = getUserByUsername(user.username);
  if (!admin) return;

  const secret = `${admin.username}:${admin.passwordHash}`;
  const encrypted = await encryptText(token, secret);
  localStorage.setItem(STORAGE_KEYS.token, encrypted);
}

async function loadDiscordToken() {
  const user = getCurrentUser();
  if (!user) return null;

  const admin = getUserByUsername(user.username);
  if (!admin) return null;

  const encrypted = localStorage.getItem(STORAGE_KEYS.token);
  if (!encrypted) return null;

  const secret = `${admin.username}:${admin.passwordHash}`;
  return decryptText(encrypted, secret);
}

function showDashboard(user = null) {
  const currentUser = user || getCurrentUser();
  if (!currentUser) return;

  document.getElementById('userName').textContent = currentUser.username || '管理員';
  document.getElementById('userEmail').textContent = currentUser.email || 'admin@local';
  document.getElementById('accountBadge').textContent = '已登入';

  document.getElementById('dashboardSection').classList.remove('hidden');
  document.getElementById('loginSection').classList.add('hidden');
}

function hideDashboard() {
  document.getElementById('dashboardSection').classList.add('hidden');
  document.getElementById('loginSection').classList.remove('hidden');
  clearAuth();
}

function renderAdminList() {
  const adminList = document.getElementById('adminList');
  const admins = getAdmins();

  adminList.innerHTML = '';

  admins.forEach((admin) => {
    const row = document.createElement('div');
    row.className = 'admin-row';

    const left = document.createElement('div');
    left.className = 'admin-info';
    left.innerHTML = `<strong>${admin.username}</strong><span>${admin.role}</span>`;

    const actions = document.createElement('div');
    actions.className = 'admin-actions';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'ghost-btn small-btn';
    resetBtn.textContent = '重設密碼';
    resetBtn.addEventListener('click', () => {
      const newPassword = prompt(`請輸入 ${admin.username} 的新密碼：`);
      if (!newPassword || !newPassword.trim()) {
        return;
      }
      resetAdminPassword(admin.id, newPassword.trim());
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ghost-btn danger-btn small-btn';
    deleteBtn.textContent = '刪除';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`確定刪除帳號 ${admin.username}？`)) {
        deleteAdmin(admin.id);
      }
    });

    actions.append(resetBtn, deleteBtn);
    row.append(left, actions);
    adminList.appendChild(row);
  });
}

async function resetAdminPassword(adminId, newPassword) {
  const admins = getAdmins();
  const target = admins.find((admin) => admin.id === adminId);
  if (!target) return;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltText = arrayBufferToBase64(salt.buffer);
  target.salt = saltText;
  target.passwordHash = await hashPassword(newPassword, saltText);

  saveAdmins(admins);
  renderAdminList();
  alert(`已重設 ${target.username} 的密碼`);
}

function deleteAdmin(adminId) {
  const admins = getAdmins().filter((admin) => admin.id !== adminId);

  if (admins.length === 0) {
    alert('至少需要保留一個管理員帳號');
    return;
  }

  saveAdmins(admins);
  renderAdminList();

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.username === getAdmins().find((admin) => admin.id === adminId)?.username) {
    hideDashboard();
  }
}

async function createAdmin() {
  const username = document.getElementById('newAdminUsername').value.trim();
  const password = document.getElementById('newAdminPassword').value.trim();

  if (!username || !password) {
    alert('請輸入帳號與密碼');
    return;
  }

  const admins = getAdmins();
  if (admins.some((admin) => admin.username === username)) {
    alert('帳號已存在');
    return;
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltText = arrayBufferToBase64(salt.buffer);
  const passwordHash = await hashPassword(password, saltText);

  admins.push({
    id: generateId(),
    username,
    salt: saltText,
    passwordHash,
    email: `${username}@local`,
    role: 'admin',
    createdAt: new Date().toISOString()
  });

  saveAdmins(admins);
  renderAdminList();
  document.getElementById('newAdminUsername').value = '';
  document.getElementById('newAdminPassword').value = '';
  alert('新增管理員成功');
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

  const admin = getUserByUsername(username);
  saveCurrentUser({ username: admin.username, email: admin.email || `${admin.username}@local` });
  showDashboard({ username: admin.username, email: admin.email || `${admin.username}@local` });
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
  document.getElementById('tokenBindingModal').classList.remove('hidden');
}

function hideTokenBindingModal() {
  document.getElementById('tokenBindingModal').classList.add('hidden');
  document.getElementById('tokenInput').value = '';
}

function showAdminManager() {
  renderAdminList();
  document.getElementById('adminManagerModal').classList.remove('hidden');
}

function hideAdminManager() {
  document.getElementById('adminManagerModal').classList.add('hidden');
}

function showDocs() {
  document.getElementById('docsModal').classList.remove('hidden');
}

function hideDocs() {
  document.getElementById('docsModal').classList.add('hidden');
}

async function bindDiscordToken() {
  const tokenInput = document.getElementById('tokenInput');
  const button = document.querySelector('.bind-token-btn');

  const token = tokenInput.value.trim();
  if (!token) {
    alert('請輸入 Discord Bot Token');
    return;
  }

  button.disabled = true;
  button.textContent = '驗證中...';

  const valid = await verifyDiscordToken(token);
  if (valid) {
    await saveDiscordToken(token);
    const guildData = await fetchBotGuildData(token);
    saveGuildData(guildData);
    renderServerData();
    alert('✓ Discord Bot Token 綁定成功，已加密保存於本機，伺服器資料已載入');
    hideTokenBindingModal();
  } else {
    alert('✗ Token 無效，請確認是否為正確的 Discord Bot Token');
  }

  button.disabled = false;
  button.textContent = '綁定 Token';
}

function getSettingsFormValues() {
  const settings = getSettings();
  document.getElementById('aiReplyToggle').checked = settings.aiReplyEnabled;
  document.getElementById('aiFrequency').value = settings.aiFrequency || '特定關鍵字';
  document.getElementById('aiKeywords').value = (settings.aiKeywords || DEFAULT_SETTINGS.aiKeywords).join(', ');
  document.getElementById('customMessageText').value = settings.customMessage || DEFAULT_SETTINGS.customMessage;

  document.querySelectorAll('.setting-toggle').forEach((input) => {
    const key = input.dataset.key;
    input.checked = !!settings[key];
  });
}

function saveAISettings() {
  const settings = getSettings();
  settings.aiReplyEnabled = document.getElementById('aiReplyToggle').checked;
  settings.aiFrequency = document.getElementById('aiFrequency').value;
  settings.aiKeywords = document.getElementById('aiKeywords').value.split(',').map((item) => item.trim()).filter(Boolean);
  settings.customMessage = document.getElementById('customMessageText').value.trim() || DEFAULT_SETTINGS.customMessage;
  saveSettings(settings);
  alert('✓ AI 設定已保存');
}

function saveAllToggleSettings() {
  const settings = getSettings();
  document.querySelectorAll('.setting-toggle').forEach((input) => {
    const key = input.dataset.key;
    settings[key] = input.checked;
  });
  saveSettings(settings);
}

function sendCustomMessage() {
  const channel = document.getElementById('channelSelect').value;
  const message = document.getElementById('customMessageText').value.trim();

  if (!channel || !message) {
    alert('請選擇頻道並輸入訊息內容');
    return;
  }

  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (!token) {
    alert('請先綁定 Discord Bot Token');
    return;
  }

  alert(`✓ 將發送到 ${channel}\n${message}`);
}

function setupManagementTools() {
  const toolButtons = document.querySelectorAll('.tool-btn');
  toolButtons.forEach((button) => {
    button.addEventListener('click', () => {
      alert(`${button.textContent} 已觸發（實際執行需接上真實 Discord API）`);
    });
  });
}

function bindGlobalEvents() {
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

  document.getElementById('openAdminManagerBtn').addEventListener('click', showAdminManager);
  document.getElementById('closeAdminManagerBtn').addEventListener('click', hideAdminManager);
  document.getElementById('createAdminBtn').addEventListener('click', createAdmin);

  document.getElementById('showDocsBtn').addEventListener('click', showDocs);
  document.getElementById('closeDocsBtn').addEventListener('click', hideDocs);

  document.getElementById('saveAISettings').addEventListener('click', saveAISettings);
  document.getElementById('sendCustomMessageBtn').addEventListener('click', sendCustomMessage);

  document.getElementById('tokenInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') bindDiscordToken();
  });

  document.querySelectorAll('.setting-toggle').forEach((input) => {
    input.addEventListener('change', saveAllToggleSettings);
  });

  setupManagementTools();
}

async function bootstrap() {
  await ensureDefaultAdmin();

  getSettingsFormValues();
  renderServerData();

  const token = await loadDiscordToken();
  if (token) {
    const guildData = await fetchBotGuildData(token);
    saveGuildData(guildData);
    renderServerData();
  }

  const currentUser = getCurrentUser();
  if (currentUser) {
    showDashboard(currentUser);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  }

  bindGlobalEvents();
}

window.addEventListener('DOMContentLoaded', async () => {
  await bootstrap();
});
