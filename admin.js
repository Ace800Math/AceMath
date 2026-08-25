// ==========================================================================
// АДМИН-ПАНЕЛЬ: добавление новых вопросов (MCQ + SPR / Input) + СТАТИСТИКА
// ==========================================================================

const CATEGORIES = [
  "Algebra",
  "Advanced Math",
  "Problem-Solving and Data Analysis",
  "Geometry and Trigonometry"
];

async function renderAdminDashboard() {
  const container = document.getElementById('sec-admin');
  if (!container) return;

  if (typeof window.isCurrentUserAdmin !== 'function' || !window.isCurrentUserAdmin()) {
    container.innerHTML = `
      <div class="am-card bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center text-slate-400">
        You don't have access to this section.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h2 class="text-2xl font-extrabold text-white">Admin Dashboard</h2>
        <p class="text-xs text-slate-400 mt-1">Manage users statistics and create new questions.</p>
      </div>

      <!-- СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ (ТОЛЬКО ДЛЯ АДМИНА) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 text-center shadow-md">
          <span class="block text-xs font-semibold uppercase text-slate-400 mb-1">Total Users</span>
          <div id="admin-total-users" class="text-3xl font-black text-white font-mono mt-1">Loading…</div>
        </div>
        <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 text-center shadow-md">
          <span class="block text-xs font-semibold uppercase text-slate-400 mb-1">New (This Month)</span>
          <div id="admin-month-users" class="text-3xl font-black text-indigo-400 font-mono mt-1">Loading…</div>
        </div>
        <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 text-center shadow-md">
          <span class="block text-xs font-semibold uppercase text-slate-400 mb-1">Active Today</span>
          <div id="admin-today-users" class="text-3xl font-black text-emerald-400 font-mono mt-1">Loading…</div>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-extrabold text-white">Add Question</h3>
          <p class="text-xs text-slate-400 mt-1">New questions appear in Practice immediately after saving — students always solve them in the order they were created.</p>
        </div>
        <button type="button" onclick="refreshAdminStats()" class="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition">Refresh Stats</button>
      </div>

      <div id="admin-position-preview" class="am-badge am-badge-accent w-fit">Loading numbering…</div>

      <form id="admin-question-form" class="space-y-5">

        <!-- Category + Difficulty + Type -->
        <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Category</label>
            <select id="admin-category" onchange="refreshAdminCounts()" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500">
              ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Difficulty</label>
            <select id="admin-difficulty" onchange="refreshAdminCounts()" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard" selected>Hard</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Question Type</label>
            <select id="admin-type" onchange="toggleAdminQuestionType(this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500">
              <option value="multiple_choice">Multiple Choice</option>
              <option value="input">Student-Produced Response (Input)</option>
            </select>
          </div>
        </div>

        <!-- Question text + optional image -->
        <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
          <label class="block text-xs font-semibold uppercase text-slate-400">Question Text</label>
          <textarea id="admin-question-text" required rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g. If 3x + 7 = 22, what is the value of 6x - 4?"></textarea>

          <label class="block text-xs font-semibold uppercase text-slate-400">Question Image URL (optional)</label>
          <input type="url" id="admin-question-image" placeholder="https://i.ibb.co/..." class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500">
          <p class="text-[10px] text-slate-500">Upload the image to a free host (imgbb.com, Imgur, etc.) first, then paste the direct link here. Leave empty if the question doesn't need a figure.</p>
        </div>

        <!-- MULTIPLE CHOICE OPTIONS -->
        <div id="admin-mcq-container" class="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
          <label class="block text-xs font-semibold uppercase text-slate-400">Answer Options — mark the correct one</label>
          <div class="space-y-2">
            ${[0, 1, 2, 3].map(i => `
              <div class="flex items-center gap-3">
                <input type="radio" name="admin-correct" value="${i}" ${i === 0 ? 'checked' : ''} class="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer">
                <span class="text-indigo-400 font-bold text-sm w-5">${String.fromCharCode(65 + i)}.</span>
                <input type="text" id="admin-option-${i}" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="Option ${String.fromCharCode(65 + i)}">
              </div>
            `).join('')}
          </div>
        </div>

        <!-- INPUT / SPR VALUE CONTAINER -->
        <div id="admin-spr-container" class="hidden bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-2">
          <label class="block text-xs font-semibold uppercase text-slate-400">Correct Answer Value</label>
          <input type="text" id="admin-spr-answer" placeholder="e.g. 12, -3.5 or 3/4" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 font-mono">
          <p class="text-[10px] text-slate-500">For free-response questions, set empty options array and specify exact correct answer.</p>
        </div>

        <!-- Explanation + optional image -->
        <div class="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
          <label class="block text-xs font-semibold uppercase text-slate-400">Explanation</label>
          <textarea id="admin-explanation-text" required rows="3" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500" placeholder="Walk through the solution step by step..."></textarea>

          <label class="block text-xs font-semibold uppercase text-slate-400">Explanation Image URL (optional)</label>
          <input type="url" id="admin-explanation-image" placeholder="https://i.ibb.co/..." class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500">
          <p class="text-[10px] text-slate-500">E.g. a screenshot of the Desmos trick, uploaded to a free host and linked here.</p>
        </div>

        <div class="flex items-center justify-end gap-3">
          <button type="button" id="admin-save-btn" onclick="handleSaveQuestion()" class="am-bg-accent hover:brightness-110 text-white font-semibold px-8 py-3 rounded-xl transition shadow-md disabled:opacity-40">
            Save Question →
          </button>
        </div>
      </form>
    </div>
  `;

  refreshAdminCounts();
  refreshAdminStats();
}

async function refreshAdminStats() {
  const totalEl = document.getElementById('admin-total-users');
  const monthEl = document.getElementById('admin-month-users');
  const todayEl = document.getElementById('admin-today-users');

  if (!totalEl || !monthEl || !todayEl) return;

  totalEl.innerText = 'Loading…';
  monthEl.innerText = 'Loading…';
  todayEl.innerText = 'Loading…';

  try {
    const currentUser = firebase.auth().currentUser;
    console.log("Current logged user email:", currentUser ? currentUser.email : "No user logged in");

    if (!currentUser || currentUser.email.trim().toLowerCase() !== "doniyor09arabov@gmail.com") {
      totalEl.innerText = 'Access';
      monthEl.innerText = 'Denied';
      todayEl.innerText = '—';
      return;
    }

    const usersSnapshot = await firebase.firestore().collection("users").get();
    const users = usersSnapshot.docs.map(doc => doc.data());

    const totalUsers = users.length;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const newThisMonth = users.filter(user => {
      if (!user.createdAt) return false;
      const createdDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
      return createdDate.getFullYear() === currentYear && createdDate.getMonth() === currentMonth;
    }).length;

    const todayStr = now.toDateString();
    const activeToday = users.filter(user => {
      const loginDate = user.lastLogin ? (user.lastLogin.toDate ? user.lastLogin.toDate() : new Date(user.lastLogin)) : null;
      if (!loginDate) return false;
      return loginDate.toDateString() === todayStr;
    }).length;

    totalEl.innerText = totalUsers;
    monthEl.innerText = newThisMonth;
    todayEl.innerText = activeToday;

  } catch (e) {
    console.error("Error loading admin stats:", e);
    totalEl.innerText = 'Error';
    monthEl.innerText = 'Error';
    todayEl.innerText = 'Error';
  }
}

// Старая функция сохранена для совместимости
async function refreshAdminUsersCount() {
  await refreshAdminStats();
}

function toggleAdminQuestionType(type) {
  const mcqContainer = document.getElementById('admin-mcq-container');
  const sprContainer = document.getElementById('admin-spr-container');

  if (type === 'input') {
    if (mcqContainer) mcqContainer.classList.add('hidden');
    if (sprContainer) sprContainer.classList.remove('hidden');
  } else {
    if (mcqContainer) mcqContainer.classList.remove('hidden');
    if (sprContainer) sprContainer.classList.add('hidden');
  }
}

async function refreshAdminCounts() {
  const previewEl = document.getElementById('admin-position-preview');
  const categoryEl = document.getElementById('admin-category');
  const difficultyEl = document.getElementById('admin-difficulty');
  if (!previewEl || !categoryEl || !difficultyEl) return;

  previewEl.innerText = 'Loading numbering…';

  const all = await window.loadQuestionsFromFirestore();
  const category = categoryEl.value;
  const difficulty = difficultyEl.value;

  const globalNumber = all.length + 1;
  const difficultyNumber = all.filter(q => q.difficulty === difficulty).length + 1;
  const categoryDifficultyNumber = all.filter(q => q.category === category && q.difficulty === difficulty).length + 1;

  previewEl.innerText = `This will be question #${globalNumber} overall — #${difficultyNumber} in ${difficulty} — #${categoryDifficultyNumber} in ${category} (${difficulty})`;
}

async function handleSaveQuestion() {
  const saveBtn = document.getElementById('admin-save-btn');
  const type = document.getElementById('admin-type').value;
  const questionText = document.getElementById('admin-question-text').value.trim();
  const explanationText = document.getElementById('admin-explanation-text').value.trim();
  const category = document.getElementById('admin-category').value;
  const difficulty = document.getElementById('admin-difficulty').value;

  const questionImageUrl = document.getElementById('admin-question-image').value.trim();
  const explanationImageUrl = document.getElementById('admin-explanation-image').value.trim();

  let questionData = {
    category,
    difficulty,
    type,
    question: questionText,
    image: questionImageUrl,
    explanation: explanationText,
    explanationImage: explanationImageUrl
  };

  if (type === 'multiple_choice') {
    const options = [0, 1, 2, 3].map(i => document.getElementById(`admin-option-${i}`).value.trim());
    const correctIndex = parseInt(document.querySelector('input[name="admin-correct"]:checked').value, 10);

    if (!questionText || options.some(o => !o) || !explanationText) {
      if (typeof window.showToast === 'function') {
        window.showToast('Please fill in the question, all 4 options, and the explanation.', true);
      }
      return;
    }

    questionData.options = options;
    questionData.correctIndex = correctIndex;
  } else if (type === 'input') {
    const sprAnswer = document.getElementById('admin-spr-answer').value.trim();

    if (!questionText || !sprAnswer || !explanationText) {
      if (typeof window.showToast === 'function') {
        window.showToast('Please fill in the question, the correct answer value, and the explanation.', true);
      }
      return;
    }

    questionData.options = [];
    questionData.correctAnswer = sprAnswer;
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerText = 'Saving...';
  }

  try {
    // 1. Сохраняем в Firestore
    await window.saveQuestionToFirestore(questionData);

    if (typeof window.showToast === 'function') {
      window.showToast('Question saved!');
    }

    // 2. ИНВАЛИДАЦИЯ КЭША И ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ БАНКА ВОПРОСОВ
    localStorage.removeItem('cached_questions');
    if (typeof window.refreshQuestionsFromCloud === 'function') {
      await window.refreshQuestionsFromCloud(true); // Передаем true для пробития кэша
    }

    // 3. Сброс полей формы
    document.getElementById('admin-question-text').value = '';
    document.getElementById('admin-explanation-text').value = '';
    [0, 1, 2, 3].forEach(i => { document.getElementById(`admin-option-${i}`).value = ''; });
    document.getElementById('admin-spr-answer').value = '';
    document.getElementById('admin-question-image').value = '';
    document.getElementById('admin-explanation-image').value = '';
    document.querySelector('input[name="admin-correct"][value="0"]').checked = true;

    // 4. Пересчет нумерации
    await refreshAdminCounts();
  } catch (err) {
    console.error('Error saving question:', err);
    if (typeof window.showToast === 'function') {
      window.showToast('Error: ' + err.message, true);
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerText = 'Save Question →';
    }
  }
}

window.renderAdminDashboard = renderAdminDashboard;
window.toggleAdminQuestionType = toggleAdminQuestionType;
window.refreshAdminCounts = refreshAdminCounts;
window.refreshAdminUsersCount = refreshAdminUsersCount;
window.refreshAdminStats = refreshAdminStats;
window.handleSaveQuestion = handleSaveQuestion;