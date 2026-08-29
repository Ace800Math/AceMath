// ==========================================================================
// АДМИН-ПАНЕЛЬ: добавление новых вопросов (MCQ + SPR / Input) + СТАТИСТИКА
// ==========================================================================

const CATEGORIES = [
  "Algebra",
  "Advanced Math",
  "Problem-Solving and Data Analysis",
  "Geometry and Trigonometry"
];

// Панель кнопок для вставки математической разметки в конкретное поле
// (textarea или input) по id — вставляет шаблон в позицию курсора через
// window.insertMathToken из mathrender.js.
function renderMathToolbar(fieldId) {
  const buttons = [
    { label: '√', title: 'Корень: sqrt(...)', before: 'sqrt(', after: ')' },
    { label: 'a/b', title: 'Дробь: frac(числитель,знаменатель)', before: 'frac(', after: ',)' },
    { label: 'x²', title: 'Степень: сразу после ^, например 6^6', before: '^', after: '' },
    { label: '×', title: 'Умножение', before: '*', after: '' },
    { label: '°', title: 'Градус', before: '°', after: '' }
  ];

  const btnsHtml = buttons.map(b => `
    <button type="button" title="${b.title}"
      onclick="window.insertMathToken('${fieldId}', '${b.before}', '${b.after}')"
      class="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold w-8 h-7 rounded-lg transition">${b.label}</button>
  `).join('');

  return `<div class="flex items-center gap-1.5 flex-wrap">${btnsHtml}</div>`;
}

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
          <h3 class="text-xl font-extrabold text-white">Manage Questions</h3>
          <p class="text-xs text-slate-400 mt-1">All questions currently in the bank, in solving order. Delete removes a question everywhere immediately.</p>
        </div>
        <button type="button" onclick="loadAndRenderQuestionsList(true)" class="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition">Refresh List</button>
      </div>

      <div id="admin-questions-list" class="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700 max-h-96 overflow-y-auto">
        <div class="p-5 text-sm text-slate-400">Loading questions…</div>
      </div>

      <div class="flex items-center justify-between pt-4">
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
          ${renderMathToolbar('admin-question-text')}
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
                <div class="flex-1 space-y-1.5">
                  <input type="text" id="admin-option-${i}" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500" placeholder="Option ${String.fromCharCode(65 + i)}">
                  ${renderMathToolbar('admin-option-' + i)}
                </div>
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
          ${renderMathToolbar('admin-explanation-text')}
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
  loadAndRenderQuestionsList();
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
    if (!currentUser || currentUser.email.trim().toLowerCase() !== "doniyor09arabov@gmail.com") {
      totalEl.innerText = 'Access';
      monthEl.innerText = 'Denied';
      todayEl.innerText = '—';
      return;
    }

    const usersSnapshot = await firebase.firestore().collection("users").get();
    const users = usersSnapshot.docs.map(doc => doc.data());

    // 1. Total Users
    const totalUsers = users.length;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayStr = now.toDateString();

    // 2. New (This Month) - проверяет createdAt и created_at
    const newThisMonth = users.filter(user => {
      const rawCreated = user.createdAt || user.created_at;
      if (!rawCreated) return false;

      let createdDate = null;
      if (typeof rawCreated.toDate === 'function') {
        createdDate = rawCreated.toDate();
      } else {
        createdDate = new Date(rawCreated);
      }

      return createdDate.getFullYear() === currentYear && createdDate.getMonth() === currentMonth;
    }).length;

    // 3. Active Today - проверяет lastLogin и last_login
    const activeToday = users.filter(user => {
      const rawLogin = user.lastLogin || user.last_login;
      if (!rawLogin) return false;

      let loginDate = null;
      if (typeof rawLogin.toDate === 'function') {
        loginDate = rawLogin.toDate();
      } else {
        loginDate = new Date(rawLogin);
      }

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

// ==========================================================================
// СПИСОК ВОПРОСОВ + УДАЛЕНИЕ
// ==========================================================================

async function loadAndRenderQuestionsList(forceRefresh = false) {
  const listEl = document.getElementById('admin-questions-list');
  if (!listEl) return;

  listEl.innerHTML = `<div class="p-5 text-sm text-slate-400">Loading questions…</div>`;

  let all = [];
  try {
    all = await window.loadQuestionsFromFirestore(forceRefresh);
  } catch (err) {
    console.error('Error loading questions list:', err);
  }

  if (!all || all.length === 0) {
    listEl.innerHTML = `<div class="p-5 text-sm text-slate-400">No questions in the bank yet.</div>`;
    return;
  }

  const diffBadge = {
    easy: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    hard: 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
  };

  listEl.innerHTML = all.map((q, idx) => {
    const safeQuestion = (q.question || '(no text)').length > 90
      ? q.question.slice(0, 90) + '…'
      : (q.question || '(no text)');
    const badgeClass = diffBadge[q.difficulty] || 'bg-slate-700 text-slate-300 border border-slate-600';

    return `
      <div class="flex items-center justify-between gap-4 p-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-mono text-slate-500">#${idx + 1}</span>
            <span class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${badgeClass}">${q.difficulty || '—'}</span>
            <span class="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-700 text-slate-300">${q.category || '—'}</span>
          </div>
          <p class="text-sm text-slate-200 truncate">${safeQuestion}</p>
        </div>
        <button
          type="button"
          onclick="handleDeleteQuestion('${q.firestoreId}', ${idx + 1})"
          class="shrink-0 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold px-3 py-2 rounded-lg transition"
          title="Delete this question"
        >
          Delete
        </button>
      </div>
    `;
  }).join('');
}

async function handleDeleteQuestion(firestoreId, displayNumber) {
  if (!firestoreId) {
    if (typeof window.showToast === 'function') {
      window.showToast('This question has no Firestore ID and cannot be deleted (likely from the local fallback bank).', true);
    }
    return;
  }

  const ok = confirm(`Delete question #${displayNumber}? This can't be undone.`);
  if (!ok) return;

  try {
    await window.deleteQuestionFromFirestore(firestoreId);

    if (typeof window.showToast === 'function') {
      window.showToast('Question deleted.');
    }

    if (typeof window.refreshQuestionsFromCloud === 'function') {
      await window.refreshQuestionsFromCloud(true);
    }

    await loadAndRenderQuestionsList(true);
    await refreshAdminCounts();
  } catch (err) {
    console.error('Error deleting question:', err);
    if (typeof window.showToast === 'function') {
      window.showToast('Error deleting question: ' + err.message, true);
    }
  }
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

    // 4. Пересчет нумерации и обновление списка вопросов
    await refreshAdminCounts();
    await loadAndRenderQuestionsList(true);
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
window.loadAndRenderQuestionsList = loadAndRenderQuestionsList;
window.handleDeleteQuestion = handleDeleteQuestion;