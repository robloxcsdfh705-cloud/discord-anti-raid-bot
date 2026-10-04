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
    console.error('JWT parse failed', error);
    return null;
  }
}

function showDashboard(user) {
  const dashboardSection = document.getElementById('dashboardSection');
  const loginSection = document.getElementById('loginSection');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const accountBadge = document.getElementById('accountBadge');
  const userAvatar = document.getElementById('userAvatar');

  userName.textContent = user.name || 'Authenticated User';
  userEmail.textContent = user.email || 'No email provided';
  accountBadge.textContent = 'Google signed in';

  if (user.picture) {
    userAvatar.src = user.picture;
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
  accountBadge.textContent = 'Signed out';
}

window.handleGoogleSignIn = function (response) {
  const payload = parseJwt(response.credential);

  if (!payload) {
    alert('Unable to verify Google login. Please try again.');
    return;
  }

  const user = {
    name: payload.name || payload.given_name || 'Google User',
    email: payload.email || 'unknown@gmail.com',
    picture: payload.picture || ''
  };

  showDashboard(user);
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

window.addEventListener('DOMContentLoaded', () => {
  attachGoogleLoginButton();
  attachSignOut();
  hideDashboard();
});
