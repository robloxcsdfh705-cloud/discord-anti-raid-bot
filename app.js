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

function showDashboard(user = null) {
  const dashboardSection = document.getElementById('dashboardSection');
  const loginSection = document.getElementById('loginSection');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const accountBadge = document.getElementById('accountBadge');
  const userAvatar = document.getElementById('userAvatar');

  const currentUser = user || StorageManager.getUser();
  if (!currentUser) return;

  userName.textContent = currentUser.name || 'Google 使用者';
  userEmail.textContent = currentUser.email || 'No email provided';

  const savedToken = StorageManager.getToken();
  if (savedToken) {
    accountBadge.textContent = 'Google + Discord 已連接';
    accountBadge.style.background = 'rgba(52, 211, 153, 0.12)';
    accountBadge.style.color = '#bbf7d0';
  } else {
    accountBadge.textContent = 'Google 已登入 / 等待 Token';
    accountBadge.style.background = 'rgba(139, 92, 246, 0.12)';
    accountBadge.style.color = '#ddd6fe';
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

  if (userAvatar) {
    userAvatar.src = '';
    userAvatar.style.display = 'none';
  }

  if (accountBadge) accountBadge.textContent = '已登出';
  StorageManager.clearAll();
}

window.handleGoogleSignIn = function (response) {
  const payload = parseJwt(response.credential);

  if (!payload) {
    alert('Google 登入驗證失敗，請重試');
    return;
  }

  const user = {
    name: payload.name || payload.given_name || 'Google 使用者',
    email: payload.email || 'unknown@gmail.com',
    picture: payload.picture || ''
  };

  StorageManager.saveUser(user);
  showDashboard(user);

  const existingToken = StorageManager.getToken();
  if (!existingToken) {
    setTimeout(() => showTokenBindingModal(), 400);
  }
};

function attachGoogleLoginButton() {
  const button = document.getElementById('googleLoginButton');
  if (!button) return;

  button.addEventListener('click', () => {
    const googleSignin = document.querySelector('.g_id_signin');
    if (googleSignin) {
      const googleButton = googleSignin.querySelector('div');
      if (googleButton) googleButton.click();
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

  if (bindTokenBtn) bindTokenBtn.addEventListener('click', showTokenBindingModal);
  if (closeModalBtn) closeModalBtn.addEventListener('click', hideTokenBindingModal);
  if (bindConfirmBtn) bindConfirmBtn.addEventListener('click', bindDiscordToken);

  const tokenInput = document.getElementById('tokenInput');
  if (tokenInput) {
    tokenInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') bindDiscordToken();
    });
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

window.addEventListener('DOMContentLoaded', () => {
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

  const saveAIBtn = document.getElementById('saveAISettings');
  if (saveAIBtn) saveAIBtn.addEventListener('click', saveAISettings);

  const sendMsgBtn = document.getElementById('sendCustomMessageBtn');
  if (sendMsgBtn) sendMsgBtn.addEventListener('click', sendCustomMessage);
});
