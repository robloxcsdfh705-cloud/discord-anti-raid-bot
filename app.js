function parseJwt(token) {
  const base64Url = token.split('.')[1];
  if (!base64Url) return null;

  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  try {
    const binary = atob(normalized);
    const json = decodeURIComponent(
      Array.from(binary)
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );

    return JSON.parse(json);
  } catch (error) {
    console.error('JWT 解析失敗', error);
    return null;
  }
}

// 本地存儲管理
const StorageManager = {
  saveUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  saveToken: (token) => {
    localStorage.setItem('discordToken', token);
  },
  getToken: () => {
    return localStorage.getItem('discordToken');
  },
  clearAll: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('discordToken');
  }
};

// Discord Token 驗證
async function verifyDiscordToken(token) {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${token}`
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
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function hideTokenBindingModal() {
  const modal = document.getElementById('tokenBindingModal');
  if (modal) {
    modal.classList.add('hidden');
    document.getElementById('tokenInput').value = '';
  }
}

async function bindDiscordToken() {
  const token = document.getElementById('tokenInput').value.trim();
  
  if (!token) {
    alert('請輸入 Discord 機器人 Token');
    return;
  }

  const bindButton = document.querySelector('.bind-token-btn');
  bindButton.disabled = true;
  bindButton.textContent = '驗證中...';

  const isValid = await verifyDiscordToken(token);
  
  if (isValid) {
    StorageManager.saveToken(token);
    alert('✓ Discord 機器人 Token 綁定成功！');
    hideTokenBindingModal();
    showDashboard();
  } else {
    alert('✗ Token 無效，請檢查後重試');
    bindButton.disabled = false;
    bindButton.textContent = '綁定 Token';
  }
}

function showDashboard(user = null) {
  const dashboardSection = document.getElementById('dashboardSection');
  const loginSection = document.getElementById('loginSection');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const accountBadge = document.getElementById('accountBadge');
  const userAvatar = document.getElementById('userAvatar');
  
  const currentUser = user || StorageManager.getUser();
  const discordToken = StorageManager.getToken();

  if (!currentUser) return;

  userName.textContent = currentUser.name || '訪客';
  userEmail.textContent = currentUser.email || '未提供電子郵件';
  
  if (discordToken) {
    accountBadge.textContent = 'Google + Discord 已連接';
    accountBadge.style.background = 'rgba(52, 211, 153, 0.12)';
  } else {
    accountBadge.textContent = 'Google 已登入 / 等待 Token';
  }

  if (currentUser.picture) {
    userAvatar.src = currentUser.picture;
    userAvatar.style.display = 'block';
  }

  dashboardSection.classList.remove('hidden');
  loginSection.classList.add('hidden');
}

function hideDashboard() {
  const dashboardSection = document.getElementById('dashboardSection');
  const loginSection = document.getElementById('loginSection');
  const userAvatar = document.getElementById('userAvatar');
  const accountBadge = document.getElementById('accountBadge');

  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  userAvatar.src = '';
  userAvatar.style.display = 'none';
  accountBadge.textContent = '已登出';
  StorageManager.clearAll();
}

window.handleGoogleSignIn = function (response) {
  const payload = parseJwt(response.credential);

  if (!payload) {
    alert('無法驗證 Google 登入。請重試。');
    return;
  }

  const user = {
    name: payload.name || payload.given_name || 'Google 使用者',
    email: payload.email || 'unknown@gmail.com',
    picture: payload.picture || ''
  };

  StorageManager.saveUser(user);
  
  const savedToken = StorageManager.getToken();
  if (savedToken) {
    showDashboard(user);
  } else {
    showDashboard(user);
    setTimeout(() => {
      showTokenBindingModal();
    }, 500);
  }
};

function attachGoogleLoginButton() {
  const button = document.getElementById('googleLoginButton');
  if (!button) return;

  button.addEventListener('click', () => {
    const googleSignin = document.querySelector('.g_id_signin');
    if (googleSignin) {
      const googleButton = googleSignin.querySelector('div');
      if (googleButton) {
        googleButton.click();
      }
    }
  });
}

function attachSignOut() {
  const signOutButton = document.getElementById('signOutButton');
  if (!signOutButton) return;

  signOutButton.addEventListener('click', () => {
    hideDashboard();
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
      google.accounts.id.revoke('user@example.com', () => {});
    }
  });
}

function attachTokenBindingModal() {
  const bindTokenBtn = document.getElementById('bindTokenBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const bindConfirmBtn = document.querySelector('.bind-token-btn');

  if (bindTokenBtn) {
    bindTokenBtn.addEventListener('click', showTokenBindingModal);
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideTokenBindingModal);
  }

  if (bindConfirmBtn) {
    bindConfirmBtn.addEventListener('click', bindDiscordToken);
  }

  const tokenInput = document.getElementById('tokenInput');
  if (tokenInput) {
    tokenInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        bindDiscordToken();
      }
    });
  }
}

// AI 回覆管理
function saveAISettings() {
  const enabled = document.getElementById('aiReplyToggle').checked;
  const frequency = document.getElementById('aiFrequency').value;
  const keywords = document.getElementById('aiKeywords').value;

  const settings = {
    enabled,
    frequency,
    keywords: keywords.split(',').map(k => k.trim()).filter(k => k)
  };

  localStorage.setItem('aiSettings', JSON.stringify(settings));
  alert('✓ AI 設定已保存');
}

// 自訂訊息發送
function sendCustomMessage() {
  const channel = document.getElementById('channelSelect').value;
  const messageText = document.getElementById('customMessageText').value;

  if (!channel || !messageText) {
    alert('請選擇頻道並輸入訊息內容');
    return;
  }

  const discordToken = StorageManager.getToken();
  if (!discordToken) {
    alert('請先綁定 Discord Token');
    return;
  }

  alert(`✓ 訊息將發送到 ${channel}:\n\n${messageText}`);
  document.getElementById('customMessageText').value = '';
}

// 管理工具
function setupManagementTools() {
  const toolButtons = document.querySelectorAll('.tool-btn');
  
  toolButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.target.textContent;
      alert(`${action} 功能已觸發（需連接真實 Discord API）`);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // 檢查是否有保存的登入資訊
  const savedUser = StorageManager.getUser();
  if (savedUser) {
    showDashboard(savedUser);
  } else {
    hideDashboard();
  }

  attachGoogleLoginButton();
  attachSignOut();
  attachTokenBindingModal();
  setupManagementTools();

  // AI 設定按鈕
  const saveAIBtn = document.getElementById('saveAISettings');
  if (saveAIBtn) {
    saveAIBtn.addEventListener('click', saveAISettings);
  }

  // 自訂訊息發送按鈕
  const sendMsgBtn = document.getElementById('sendCustomMessageBtn');
  if (sendMsgBtn) {
    sendMsgBtn.addEventListener('click', sendCustomMessage);
  }
});
