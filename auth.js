let originalRegisterHTML = '';

document.addEventListener('DOMContentLoaded', () => {
  const regForm = document.getElementById('form-register');
  if (regForm) originalRegisterHTML = regForm.innerHTML;
});

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  let text = message;
  if (typeof message === 'object' && message !== null) {
    text = message.message || message.error || JSON.stringify(message);
  } else if (typeof message !== 'string') {
    text = String(message);
  }

  toast.innerText = text;
  toast.className = `fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all duration-300 max-w-xs border ${
    isError 
      ? 'bg-red-900/95 border-red-500 text-red-100' 
      : 'bg-indigo-900/95 border-indigo-500 text-indigo-100'
  }`;

  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);
}

function toggleAuthMode(mode) {
  const regForm = document.getElementById('form-register');
  const loginForm = document.getElementById('form-login');
  const subtitle = document.getElementById('auth-subtitle');

  if (regForm && originalRegisterHTML && regForm.querySelector('#check-verified-btn')) {
    regForm.innerHTML = originalRegisterHTML;
  }

  if (mode === 'register') {
    if (loginForm) loginForm.classList.add('hidden');
    if (regForm) regForm.classList.remove('hidden');
    if (subtitle) subtitle.innerText = 'Create your new account';
  } else {
    if (regForm) regForm.classList.add('hidden');
    if (loginForm) loginForm.classList.remove('hidden');
    if (subtitle) subtitle.innerText = 'Sign in to your account';
  }
}

async function ensureFirebaseLoaded() {
  let attempts = 0;
  while ((!window.firebaseAuth || !window.firebase) && attempts < 40) {
    await new Promise(res => setTimeout(res, 100));
    attempts++;
  }
  return !!window.firebaseAuth && !!window.firebase;
}

async function handleRegister(e) {
  if (e) e.preventDefault();

  const isLoaded = await ensureFirebaseLoaded();
  if (!isLoaded) {
    showToast("Firebase module failed to load. Please refresh.", true);
    return;
  }

  const emailInput = document.getElementById('reg-email');
  const passInput = document.getElementById('reg-password');
  const firstInput = document.getElementById('reg-firstname');
  const lastInput = document.getElementById('reg-lastname');
  const targetInput = document.getElementById('reg-target');
  const dateInput = document.getElementById('reg-date');

  if (!emailInput || !passInput) return;

  const email = emailInput.value.trim();
  const password = passInput.value;
  const firstName = firstInput ? firstInput.value.trim() : '';
  const lastName = lastInput ? lastInput.value.trim() : '';
  const rawTarget = targetInput ? (parseInt(targetInput.value, 10) || 400) : 400;
  const examDate = dateInput ? dateInput.value : '';

  const btn = document.getElementById('reg-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Creating Account...';
  }

  try {
    const result = await window.firebaseAuth.registerUser(
      email, password, firstName, lastName, rawTarget, examDate
    );

    if (!result.success) {
      showToast(result.error, true);
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Create Account';
      }
      return;
    }

    showVerificationPendingScreen(email);

  } catch (err) {
    showToast('Error: ' + err.message, true);
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Create Account';
    }
  }
}

function showVerificationPendingScreen(email) {
  const regForm = document.getElementById('form-register');
  if (!regForm) return;

  if (!originalRegisterHTML) {
    originalRegisterHTML = regForm.innerHTML;
  }

  regForm.innerHTML = `
    <div class="space-y-4 text-center">
      <h3 class="text-lg font-bold text-white">Check Your Email</h3>
      <p class="text-xs text-slate-400">We sent a verification link to <span class="text-indigo-400 font-semibold">${email}</span>. Click the link in that email, then press the button below.</p>

      <button type="button" id="check-verified-btn" onclick="window.handleCheckVerified()" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition duration-200">
        I've Verified My Email
      </button>

      <button type="button" onclick="window.handleResendVerification()" class="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-2.5 rounded-lg transition duration-200">
        Resend Email
      </button>
    </div>
  `;
}

window.handleCheckVerified = async function() {
  const isLoaded = await ensureFirebaseLoaded();
  if (!isLoaded) return;

  const btn = document.getElementById('check-verified-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Checking...';
  }

  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    showToast('Session expired, please log in again.', true);
    toggleAuthMode('login');
    return;
  }

  await currentUser.reload();

  if (currentUser.emailVerified) {
    showToast('Email verified successfully!');
    location.reload();
  } else {
    showToast('Not verified yet — click the link in your email first.', true);
    if (btn) {
      btn.disabled = false;
      btn.innerText = "I've Verified My Email";
    }
  }
};

window.handleResendVerification = async function() {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) return;

  try {
    await currentUser.sendEmailVerification();
    showToast('Verification email resent!');
  } catch (err) {
    showToast('Error resending: ' + err.message, true);
  }
};

// Сброс пароля через встроенный Firebase-флоу: письмо со ссылкой на email
async function handleForgotPassword() {
  const emailInput = document.getElementById('login-email');
  const email = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    showToast('Enter your email above first, then tap "Forgot password?" again.', true);
    if (emailInput) emailInput.focus();
    return;
  }

  const isLoaded = await ensureFirebaseLoaded();
  if (!isLoaded) {
    showToast('Firebase module failed to load. Please refresh.', true);
    return;
  }

  try {
    await firebase.auth().sendPasswordResetEmail(email);
    showToast(`Password reset link sent to ${email}. Check your inbox (and spam folder).`);
  } catch (err) {
    let errorMsg = 'Failed to send reset email.';
    if (err.code === 'auth/user-not-found') {
      errorMsg = 'No account found with that email.';
    } else if (err.code === 'auth/invalid-email') {
      errorMsg = 'Invalid email format.';
    } else if (err.code === 'auth/too-many-requests') {
      errorMsg = 'Too many attempts. Please try again later.';
    }
    showToast(errorMsg, true);
  }
}

async function handleLogin(e) {
  if (e) e.preventDefault();

  const isLoaded = await ensureFirebaseLoaded();
  if (!isLoaded) return showToast("Firebase loading error", true);

  const btn = document.getElementById('login-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'Signing in...';
  }

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const result = await window.firebaseAuth.loginUser(email, password);

    if (!result.success) {
      showToast(result.error, true);
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Sign In';
      }
    } else {
      showToast('Signed in successfully!');
      const authScreen = document.getElementById('auth-screen');
      const appScreen = document.getElementById('app-screen');
      if (authScreen) authScreen.classList.add('hidden');
      if (appScreen) appScreen.classList.remove('hidden');

      loadAndRenderUserData(result.user);
    }
  } catch (err) {
    showToast('Login Error: ' + err.message, true);
    if (btn) {
      btn.disabled = false;
      btn.innerText = 'Sign In';
    }
  }
}

async function loadAndRenderUserData(user) {
  try {
    // ДОБАВЛЕНО: подтягиваем попытки (attempts) из Firestore, привязанные
    // к аккаунту, а не только к этому браузеру. Функция уже существовала
    // в firebase.js, но никогда не вызывалась.
    if (typeof window.loadAttemptsFromFirestore === 'function') {
      await window.loadAttemptsFromFirestore();
    }

    const docSnap = await firebase.firestore().collection("users").doc(user.uid).get();

    let data = null;
    if (docSnap.exists) {
      data = docSnap.data();
      localStorage.setItem("user_data", JSON.stringify(data));
    } else {
      const cached = localStorage.getItem("user_data");
      if (cached) data = JSON.parse(cached);
    }

    if (data && typeof window.renderUserProfile === 'function') {
      window.renderUserProfile(data);
    }

    // Подгружаем вопросы из Firestore (админ-панель) поверх локального банка
    if (typeof window.refreshQuestionsFromCloud === 'function') {
      window.refreshQuestionsFromCloud();
    }

    // Показываем вкладку Admin только тебе (см. ADMIN_EMAILS в firebase.js)
    const adminTabBtn = document.getElementById('tab-admin');
    if (adminTabBtn && typeof window.isCurrentUserAdmin === 'function') {
      adminTabBtn.style.display = window.isCurrentUserAdmin() ? '' : 'none';
    }
  } catch (err) {
    console.error("Profile load error:", err);
  }
}

async function handleLogout() {
  try {
    localStorage.clear();
    sessionStorage.clear();
    await firebase.auth().signOut();
    window.location.reload();
  } catch (error) {
    console.error("Logout error:", error);
    showToast("Logout failed: " + error.message, true);
  }
}

// Инициализация слушателя авто-авторизации
document.addEventListener('DOMContentLoaded', () => {
  ensureFirebaseLoaded().then(loaded => {
    if (!loaded) return;

    firebase.auth().onAuthStateChanged(async (user) => {
      const authScreen = document.getElementById('auth-screen');
      const appScreen = document.getElementById('app-screen');

      if (user && user.emailVerified) {
        if (authScreen) authScreen.classList.add('hidden');
        if (appScreen) appScreen.classList.remove('hidden');

        await loadAndRenderUserData(user);
      } else {
        if (appScreen) appScreen.classList.add('hidden');
        if (authScreen) authScreen.classList.remove('hidden');

        if (user && !user.emailVerified) {
          showVerificationPendingScreen(user.email);
        }
      }
    });
  });
});

// Экспорт функций в окно для вызова из HTML
window.toggleAuthMode = toggleAuthMode;
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.handleForgotPassword = handleForgotPassword;
window.handleLogout = handleLogout;
window.showToast = showToast;