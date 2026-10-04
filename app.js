const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123'
};

const StorageManager = {
  saveUser(user) {
    localStorage.setItem('discordAntiRaidUser', JSON.stringify(user));
  },
  getUser() {
    const raw = localStorage.getItem('discordAntiRaidUser');
    return raw ? JSON.parse(raw) : null;
  },
  saveToken(token) {
    localStorage.setItem('discordAntiRaidToken', token);
  },
  getToken() {
    return localStorage.getItem('discordAntiRaidToken');
  },
  clearAll() {
    localStorage.removeItem('discordAntiRaidUser');
    localStorage.removeItem('discordAntiRaidToken');
  }
};

function loginAdmin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!username || !password) {
    alert('請輸入帳號與密碼');
    return;
  }

  if (username === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
    const user = {
      username,
      email: 'admin@local'
    };

    StorageManager.saveUser(user);
    showDashboard(user);
    alert('登入成功');
    return;
  }

  alert('帳號或密碼錯誤');
}

function showDashboard(user = null) {
  const dashboardSection = document.getElementById('dashboardSection');
  const loginSection = document.getElementById('loginSection');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const accountBadge = document.getElementById('accountBadge');

  const currentUser = user || StorageManager.getUser();
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
  StorageManager.clearAll();
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
    StorageManager.saveToken(token);
    alert('✓ Discord Bot Token 綁定成功');
    hideTokenBindingModal();
    showDashboard(StorageManager.getUser());
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

  const token = StorageManager.getToken();
  if (!token) {
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

window.addEventListener('DOMContentLoaded', () => {
  const savedUser = StorageManager.getUser();
  if (savedUser) {
    showDashboard(savedUser);
  }

  attachEvents();
});
