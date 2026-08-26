let countdownInterval = null;
let currentProfile = null;
let activeEditMode = null; // 'target' или 'date'

function switchTab(tabName) {
  const sections = ['home', 'progress', 'practice', 'settings', 'admin'];

  sections.forEach(sec => {
    const secEl = document.getElementById(`sec-${sec}`);
    const tabBtn = document.getElementById(`tab-${sec}`);

    if (secEl && tabBtn) {
      if (sec === tabName) {
        secEl.classList.remove('hidden');
        tabBtn.className = 'w-full flex items-center gap-3 text-left px-5 py-4 rounded-2xl font-bold text-base am-text-accent am-bg-app border am-border shadow-md transition';

        if (tabName === 'progress' && typeof window.renderProgressDashboard === 'function') {
          window.renderProgressDashboard();
        }

        // АВТОМАТИЧЕСКИЙ РЕНДЕР ДАШБОРДА ПРАКТИКИ
        if (tabName === 'practice' && typeof window.renderPracticeDashboard === 'function') {
          window.renderPracticeDashboard();
        }

        if (tabName === 'settings' && typeof window.renderSettingsDashboard === 'function') {
          window.renderSettingsDashboard();
        }

        if (tabName === 'admin' && typeof window.renderAdminDashboard === 'function') {
          window.renderAdminDashboard();
        }

      } else {
        secEl.classList.add('hidden');
        tabBtn.className = 'w-full flex items-center gap-3 text-left px-5 py-4 rounded-2xl font-bold text-base am-text-muted am-hover-text-heading am-hover-bg-tint transition';
      }
    }
  });
}

function startCountdown(dateStr) {
  const countdownEl = document.getElementById('days-countdown');
  if (countdownInterval) clearInterval(countdownInterval);

  const updateTimer = () => {
    const now = new Date().getTime();
    const examTime = new Date(dateStr + 'T00:00:00').getTime();
    const diff = examTime - now;

    if (diff <= 0) {
      if (countdownEl) countdownEl.innerText = 'Exam Day!';
      clearInterval(countdownInterval);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (countdownEl) countdownEl.innerText = `${days}d ${hours}h ${mins}m`;
  };

  updateTimer();
  countdownInterval = setInterval(updateTimer, 60000);
}

function renderUserProfile(profile) {
  if (!profile) return;
  currentProfile = profile;

  const welcomeEl = document.getElementById('user-welcome');
  const targetHeaderEl = document.getElementById('user-target');
  const targetHomeEl = document.getElementById('home-target-score');
  const examDateEl = document.getElementById('user-exam-date');
  const homeExamDateEl = document.getElementById('home-exam-date');

  const firstName = profile.first_name || profile.firstName || 'Student';
  const rawTarget = profile.target_score || profile.targetScore || 1500;
  const rawDate = profile.exam_date || profile.examDate || '';

  if (welcomeEl) welcomeEl.innerText = `Welcome, ${firstName}!`;

  const roundedTarget = Math.round((Number(rawTarget) || 1500) / 10) * 10;
  if (targetHeaderEl) targetHeaderEl.innerText = roundedTarget;
  if (targetHomeEl) targetHomeEl.innerText = roundedTarget;

  if (rawDate) {
    if (examDateEl) examDateEl.innerText = rawDate;
    if (homeExamDateEl) homeExamDateEl.innerText = rawDate;
    startCountdown(rawDate);
  }
}

/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ */
function editTargetScore() {
  activeEditMode = 'target';
  document.getElementById('modal-title').innerText = 'Edit Target Score';
  document.getElementById('modal-target-group').classList.remove('hidden');
  document.getElementById('modal-date-group').classList.add('hidden');

  const targetHomeEl = document.getElementById('home-target-score');
  document.getElementById('modal-target-input').value = targetHomeEl ? targetHomeEl.innerText : '1500';

  const modal = document.getElementById('edit-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function editExamDate() {
  activeEditMode = 'date';
  document.getElementById('modal-title').innerText = 'Edit SAT Exam Date';
  document.getElementById('modal-target-group').classList.add('hidden');
  document.getElementById('modal-date-group').classList.remove('hidden');

  const homeExamDateEl = document.getElementById('home-exam-date');
  const currentVal = homeExamDateEl ? homeExamDateEl.innerText : '2026-10-03';

  const selectEl = document.getElementById('modal-date-select');
  if (currentVal !== '--') {
    selectEl.value = currentVal;
  }

  const modal = document.getElementById('edit-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function saveEditModal() {
  const savedUser = JSON.parse(localStorage.getItem('user_data') || '{}');
  const updates = {};

  if (activeEditMode === 'target') {
    const rawVal = parseInt(document.getElementById('modal-target-input').value, 10);
    if (!isNaN(rawVal) && rawVal >= 400 && rawVal <= 1600) {
      const roundedScore = Math.round(rawVal / 10) * 10;

      updates.target_score = roundedScore;
      savedUser.target_score = roundedScore;
      savedUser.targetScore = roundedScore;
    }
  } else if (activeEditMode === 'date') {
    const selectedDate = document.getElementById('modal-date-select').value;

    if (selectedDate) {
      updates.exam_date = selectedDate;
      savedUser.exam_date = selectedDate;
      savedUser.examDate = selectedDate;
    }
  }

  renderUserProfile(savedUser);
  localStorage.setItem('user_data', JSON.stringify(savedUser));

  if (typeof window.saveUserToFirestore === 'function') {
    window.saveUserToFirestore(updates);
  } else {
    console.error("saveUserToFirestore function is missing in window!");
  }

  closeEditModal();
}

// Автоматически обновляем lastLogin в Firestore при запуске (безопасная проверка)
if (typeof firebase !== 'undefined' && firebase.auth) {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      firebase.firestore().collection("users").doc(user.uid).set({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
  });
}

window.switchTab = switchTab;
window.renderUserProfile = renderUserProfile;
window.editTargetScore = editTargetScore;
window.editExamDate = editExamDate;
window.closeEditModal = closeEditModal;
window.saveEditModal = saveEditModal;