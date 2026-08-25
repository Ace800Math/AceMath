// ДОБАВЛЕНО: этой функции не хватало — она вызывалась в нескольких местах
// ниже, но нигде не была объявлена. Из-за этого возникала ошибка
// "notify is not defined", которая обрывала функцию ДО вызова
// closeEditNameModal()/closeEditPasswordModal() — поэтому окно не закрывалось.
function notify(message, isError = false) {
  if (typeof window.showToast === 'function') {
    window.showToast(message, isError);
  }
}

function renderSettingsDashboard() {
  const container = document.getElementById('sec-settings');
  if (!container) return;

  const user = firebase.auth().currentUser;
  const currentName = user?.displayName || localStorage.getItem('user_display_name') || localStorage.getItem('user_firstname') || 'Student';
  const currentEmail = user?.email || localStorage.getItem('user_email') || 'student@dsatuz.com';

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6 pb-12 relative">
      <div>
        <h2 class="text-2xl font-extrabold text-white">Settings</h2>
        <p class="text-xs text-slate-400 mt-1">Manage your account settings and preferences.</p>
      </div>

      <div class="space-y-4">
        <!-- 1. Basic Info -->
        <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-lg">
          <div class="flex items-center gap-3 border-b border-slate-700 pb-3">
            <span class="text-lg">👤</span>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">Basic info</h3>
              <p class="text-xs text-slate-400">Update your display name used across the app.</p>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2">
            <span id="settings-name-label" class="text-sm font-medium text-slate-200">${currentName}</span>
            <button onclick="openEditNameModal()" class="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition">Edit name</button>
          </div>
        </div>

        <!-- 2. Email Address -->
        <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-lg">
          <div class="flex items-center gap-3 border-b border-slate-700 pb-3">
            <span class="text-lg">✉️</span>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">Email address</h3>
              <p class="text-xs text-slate-400">Manage the email you use to sign in.</p>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2">
            <span class="text-sm font-medium text-slate-200">${currentEmail}</span>
            <button onclick="openEditEmailModal()" class="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition">Change email</button>
          </div>
        </div>

        <!-- 3. Password -->
        <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-lg">
          <div class="flex items-center gap-3 border-b border-slate-700 pb-3">
            <span class="text-lg">🔒</span>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-wider">Password</h3>
              <p class="text-xs text-slate-400">Choose a strong password to keep your account safe.</p>
            </div>
          </div>
          <div class="flex items-center justify-between pt-2">
            <span class="text-sm font-mono tracking-widest text-slate-300">••••••••</span>
            <button onclick="openEditPasswordModal()" class="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition">Change password</button>
          </div>
        </div>

        <!-- 4. Sign Out -->
        <div class="bg-red-950/20 border border-red-900/40 rounded-2xl p-6 space-y-4 shadow-lg">
          <div class="flex items-center gap-3 border-b border-red-900/30 pb-3">
            <span class="text-lg">🚪</span>
            <div>
              <h3 class="text-sm font-bold text-red-400 uppercase tracking-wider">Sign Out</h3>
              <p class="text-xs text-red-300/70">Sign out of your account on this device.</p>
            </div>
          </div>
          <div class="pt-2">
            <button onclick="handleSignOut()" class="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition shadow-md">Sign Out</button>
          </div>
        </div>
      </div>

      <!-- 5. Support -->
      <div class="mt-10 flex flex-col items-center justify-center text-center opacity-80 hover:opacity-100 transition-opacity">
        <span class="text-slate-500 text-xs uppercase tracking-wider font-bold mb-1">Need Help?</span>
        <a href="mailto:acemath800@gmail.com" class="text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
          acemath800@gmail.com
        </a>
      </div>

      <!-- МОДАЛКИ (Остаются без изменений) -->
      <div id="edit-name-modal" class="hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
          <h3 class="text-lg font-bold text-white">Edit Display Name</h3>
          <p class="text-xs text-slate-400">Enter your new name or nickname below:</p>
          <input type="text" id="modal-name-input" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500" value="${currentName}">
          <div class="flex justify-end gap-3 pt-2">
            <button onclick="closeEditNameModal()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition">Cancel</button>
            <button onclick="saveProfileName()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition">Save Changes</button>
          </div>
        </div>
      </div>

      <div id="edit-email-modal" class="hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
          <h3 class="text-lg font-bold text-white">Change Email Address</h3>
          <p class="text-xs text-slate-400">Re-enter your password and enter the new email address:</p>
          <input type="password" id="email-current-password" placeholder="Current Password" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
          <input type="email" id="modal-email-input" placeholder="New Email Address" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
          <div class="flex justify-end gap-3 pt-2">
            <button onclick="closeEditEmailModal()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition">Cancel</button>
            <button onclick="saveUserEmail()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition">Update Email</button>
          </div>
        </div>
      </div>

      <div id="edit-pass-modal" class="hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
          <h3 class="text-lg font-bold text-white">Change Password</h3>
          <p class="text-xs text-slate-400">Enter your current password and set a new one:</p>
          <input type="password" id="pass-current-password" placeholder="Current Password" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
          <input type="password" id="pass-new-password" placeholder="New Password (min 6 chars)" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500">
          <div class="flex justify-end gap-3 pt-2">
            <button onclick="closeEditPasswordModal()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl transition">Cancel</button>
            <button onclick="saveUserPassword()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition">Change Password</button>
          </div>
        </div>
      </div>

    </div>
  `;
}

// 1. Управление Именем
function openEditNameModal() {
  const modal = document.getElementById('edit-name-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeEditNameModal() {
  const modal = document.getElementById('edit-name-modal');
  if (modal) modal.classList.add('hidden');
}

async function saveProfileName() {
  const input = document.getElementById('modal-name-input');
  if (!input) return;
  const newName = input.value.trim();

  if (newName !== '') {
    const user = firebase.auth().currentUser;
    if (user) {
      try {
        await user.updateProfile({ displayName: newName });
      } catch (e) {
        console.error("Profile update error:", e);
      }
    }
    localStorage.setItem('user_display_name', newName);
    const nameLabel = document.getElementById('settings-name-label');
    if (nameLabel) nameLabel.innerText = newName;
    notify('Display name updated successfully!');
  }
  closeEditNameModal();
}

// 2. Управление Email
function openEditEmailModal() {
  const modal = document.getElementById('edit-email-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeEditEmailModal() {
  const modal = document.getElementById('edit-email-modal');
  if (modal) modal.classList.add('hidden');
}

async function saveUserEmail() {
  const pass = document.getElementById('email-current-password').value;
  const newEmail = document.getElementById('modal-email-input').value.trim();
  const user = firebase.auth().currentUser;

  if (!pass || !newEmail) return notify("Fill in all fields!", true);
  if (!user) return notify("User not authenticated.", true);

  try {
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, pass);
    await user.reauthenticateWithCredential(cred);

    if (typeof user.verifyBeforeUpdateEmail === 'function') {
      await user.verifyBeforeUpdateEmail(newEmail);
      notify(`Verification email sent to ${newEmail}! Confirm it to apply.`);
      // ИСПРАВЛЕНО: не пишем newEmail в localStorage здесь — реальный email
      // ещё старый, пока пользователь не перейдёт по ссылке подтверждения.
      // Иначе интерфейс показывал бы email как уже сменённый.
    } else {
      await user.updateEmail(newEmail);
      notify("Email updated successfully!");
      localStorage.setItem('user_email', newEmail);
    }

    closeEditEmailModal();
    renderSettingsDashboard();
  } catch (err) {
    console.error(err);
    let errorMsg = "Failed to update email.";
    if (err.code === 'auth/wrong-password' || err.message?.includes('INVALID_LOGIN_CREDENTIALS')) {
      errorMsg = "Current password is incorrect.";
    } else if (err.code === 'auth/invalid-email') {
      errorMsg = "Invalid email format.";
    }
    notify(errorMsg, true);
  }
}

// 3. Управление Паролем
function openEditPasswordModal() {
  const modal = document.getElementById('edit-pass-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeEditPasswordModal() {
  const modal = document.getElementById('edit-pass-modal');
  if (modal) modal.classList.add('hidden');
}

async function saveUserPassword() {
  const currentPass = document.getElementById('pass-current-password').value;
  const newPass = document.getElementById('pass-new-password').value;
  const user = firebase.auth().currentUser;

  if (!currentPass || !newPass) return notify("Fill in all fields!", true);
  if (newPass.length < 6) return notify("Password must be at least 6 characters.", true);
  if (!user) return notify("User not authenticated.", true);

  try {
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(newPass);

    notify("Password changed successfully!");
    document.getElementById('pass-current-password').value = '';
    document.getElementById('pass-new-password').value = '';
    closeEditPasswordModal();
  } catch (err) {
    console.error(err);
    let errorMsg = "Failed to change password.";
    if (err.code === 'auth/wrong-password' || err.message?.includes('INVALID_LOGIN_CREDENTIALS')) {
      errorMsg = "Current password is incorrect.";
    } else if (err.code === 'auth/weak-password') {
      errorMsg = "New password is too weak.";
    }
    notify(errorMsg, true);
  }
}

// 4. Выход
function handleSignOut() {
  if (confirm("Are you sure you want to sign out?")) {
    if (typeof window.handleLogout === 'function') {
      window.handleLogout();
    } else {
      firebase.auth().signOut().then(() => {
        localStorage.clear();
        sessionStorage.clear();
        location.reload();
      });
    }
  }
}

// Экспорт глобально
window.renderSettingsDashboard = renderSettingsDashboard;
window.renderSettings = renderSettingsDashboard;
window.openEditNameModal = openEditNameModal;
window.closeEditNameModal = closeEditNameModal;
window.saveProfileName = saveProfileName;
window.openEditEmailModal = openEditEmailModal;
window.closeEditEmailModal = closeEditEmailModal;
window.saveUserEmail = saveUserEmail;
window.openEditPasswordModal = openEditPasswordModal;
window.closeEditPasswordModal = closeEditPasswordModal;
window.saveUserPassword = saveUserPassword;
window.handleSignOut = handleSignOut;