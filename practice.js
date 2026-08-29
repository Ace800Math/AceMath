let desmosState = {
  top: '64px',
  left: '16px',
  width: '420px',
  height: '500px'
};
// --- АВТО-ПАТЧ ID ДЛЯ ВОПРОСОВ ---
(function ensureQuestionIds() {
  const bank = window.questions || window.questionBank || [];
  bank.forEach((q, idx) => {
    if (!q.id) {
      q.id = `q_auto_${idx + 1}`;
    }
  });
})();

// Функция выгрузки истории из Firebase (с проверкой кэша)
async function syncAttemptsFromFirebase() {
  const userId = getCurrentUserId();
  if (!userId || userId === 'guest_user' || typeof db === 'undefined') return;

  const attemptsKey = getUserAttemptsKey();
  const localData = localStorage.getItem(attemptsKey);

  // ПРОВЕРКА КЭША: Если данные в кэше есть — Firebase не трогаем (0 reads)
  if (localData && JSON.parse(localData).length > 0) {
    return;
  }

  try {
    const snapshot = await db.collection("users").doc(userId).collection("attempts").get();

    if (!snapshot.empty) {
      const attempts = [];
      snapshot.forEach(doc => attempts.push(doc.data()));

      // Восстанавливаем localStorage
      localStorage.setItem(attemptsKey, JSON.stringify(attempts));

      // Обновляем счётчик
      solvedCount = attempts.filter(a => a.isCorrect).length;
      const initialSolvedEl = document.getElementById('home-solved-count');
      if (initialSolvedEl) initialSolvedEl.innerText = solvedCount;
    }
  } catch (err) {
    console.error("Ошибка загрузки данных из Firebase:", err);
  }
}

// Запускаем синхронизацию ПОСЛЕ того, как Firebase подтянет юзера
if (typeof firebase !== 'undefined' && firebase.auth) {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      syncAttemptsFromFirebase();
    }
  });
} else {
  syncAttemptsFromFirebase();
}

function getCurrentUserId() {
  const fbUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
  return fbUser ? fbUser.uid : (window.currentUserId || localStorage.getItem('current_user_id') || 'guest_user');
}

function getUserAttemptsKey() {
  return `user_attempts_${getCurrentUserId()}`;
}

let questionTimerInterval = null;
let secondsSpent = 0;
let isTimerPaused = false;

let currentQuestionIndex = 0;
let filteredQuestions = [];
let selectedOption = null;
let userInputValue = '';
let hasAttemptedCurrent = false;

const savedAttempts = JSON.parse(localStorage.getItem(getUserAttemptsKey()) || '[]');
let solvedCount = savedAttempts.filter(a => a.isCorrect).length;
const initialSolvedEl = document.getElementById('home-solved-count');
if (initialSolvedEl) initialSolvedEl.innerText = solvedCount;

let totalSecondsSpent = 0;
let desmosCalculator = null;
let isDesmosOpen = false;

let activeDifficulties = { easy: false, medium: false, hard: false };
let activeStatusFilter = 'all';

// --- ТАЙМЕР ---
function startQuestionTimer() {
  if (questionTimerInterval) clearInterval(questionTimerInterval);
  secondsSpent = 0;
  isTimerPaused = false;

  const timerEl = document.getElementById('question-timer');
  const pauseIcon = document.getElementById('timer-pause-icon');

  if (timerEl) timerEl.innerText = '00:00';
  if (pauseIcon) {
    pauseIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />`;
  }

  questionTimerInterval = setInterval(() => {
    if (!isTimerPaused) {
      secondsSpent++;
      const mins = String(Math.floor(secondsSpent / 60)).padStart(2, '0');
      const secs = String(secondsSpent % 60).padStart(2, '0');
      const currentTimerEl = document.getElementById('question-timer');
      if (currentTimerEl) currentTimerEl.innerText = `${mins}:${secs}`;
    }
  }, 1000);
}

function toggleTimerPause() {
  isTimerPaused = !isTimerPaused;
  const pauseIcon = document.getElementById('timer-pause-icon');
  if (pauseIcon) {
    if (isTimerPaused) {
      pauseIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 0118 0z" />`;
    } else {
      pauseIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />`;
    }
  }
}

function stopQuestionTimer() {
  if (questionTimerInterval) clearInterval(questionTimerInterval);
  return secondsSpent;
}

// --- ДАШБОРД ПРАКТИКИ ---
function renderPracticeDashboard() {
  stopQuestionTimer();
  const container = document.getElementById('sec-practice');
  if (!container) return;

  const bank = window.questions || window.questionBank || [];

  container.innerHTML = `
    <div class="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Create Your Session</h2>
        <p class="text-sm text-slate-400 mt-0.5">Select filters to build a personalized practice test or launch single-item sessions.</p>
      </div>

      <div class="bg-slate-800 p-5 rounded-xl border border-slate-700/80 space-y-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">General Filters</h3>
        <div class="flex flex-wrap gap-4">
          <div class="bg-slate-900 p-4 rounded-xl border border-slate-700/60">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">Difficulty</span>
            <div class="grid grid-cols-3 gap-3 text-center">
              <button onclick="toggleDifficulty('easy')" class="py-2.5 px-5 rounded-lg border text-xs font-bold transition ${activeDifficulties.easy ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}">Easy</button>
              <button onclick="toggleDifficulty('medium')" class="py-2.5 px-5 rounded-lg border text-xs font-bold transition ${activeDifficulties.medium ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}">Medium</button>
              <button onclick="toggleDifficulty('hard')" class="py-2.5 px-5 rounded-lg border text-xs font-bold transition ${activeDifficulties.hard ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}">Hard</button>
            </div>
          </div>

          <div class="bg-slate-900 p-4 rounded-xl border border-slate-700/60">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">Question Status</span>
            <div class="grid grid-cols-4 gap-2 text-center">
              <button onclick="setStatusFilter('all')" class="py-2.5 px-4 rounded-lg border text-xs font-bold transition ${activeStatusFilter === 'all' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}">All</button>
              <button onclick="setStatusFilter('unsolved')" class="py-2.5 px-4 rounded-lg border text-xs font-bold transition ${activeStatusFilter === 'unsolved' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}">Unsolved</button>
              <button onclick="setStatusFilter('solved')" class="py-2.5 px-4 rounded-lg border text-xs font-bold transition ${activeStatusFilter === 'solved' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}">Solved</button>
              <button onclick="setStatusFilter('incorrect')" class="py-2.5 px-4 rounded-lg border text-xs font-bold transition ${activeStatusFilter === 'incorrect' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}">Mistakes</button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-slate-800 p-5 rounded-xl border border-slate-700/80 space-y-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Browse by Subject</h3>
        ${renderCategoryItem("Algebra", bank)}
        ${renderCategoryItem("Advanced Math", bank)}
        ${renderCategoryItem("Problem-Solving and Data Analysis", bank)}
        ${renderCategoryItem("Geometry and Trigonometry", bank)}
      </div>
    </div>
  `;
}

function setStatusFilter(status) {
  activeStatusFilter = status;
  renderPracticeDashboard();
}

function toggleDifficulty(diff) {
  activeDifficulties[diff] = !activeDifficulties[diff];
  renderPracticeDashboard();
}

function filterByStatus(questions) {
  const attempts = JSON.parse(localStorage.getItem(getUserAttemptsKey()) || '[]');
  return questions.filter(q => {
    const qId = q.firestoreId || q.id;
    const qAttempts = attempts.filter(a => a.questionId === qId);
    const hasSolved = qAttempts.some(a => a.isCorrect);
    const hasFailed = qAttempts.some(a => !a.isCorrect);

    if (activeStatusFilter === 'unsolved') return qAttempts.length === 0;
    if (activeStatusFilter === 'solved') return hasSolved;
    if (activeStatusFilter === 'incorrect') return hasFailed && !hasSolved;
    return true;
  });
}

function renderCategoryItem(categoryName, bank) {
  let catQuestions = bank.filter(q => q.category === categoryName);
  const hasActiveDiffs = Object.values(activeDifficulties).some(v => v);
  if (hasActiveDiffs) {
    catQuestions = catQuestions.filter(q => activeDifficulties[q.difficulty]);
  }
  catQuestions = filterByStatus(catQuestions);

  const isDisabled = catQuestions.length === 0;
  const checkboxId = `cat-chk-${categoryName.replace(/\s+/g, '')}`;
  const safeCategoryName = categoryName.replace(/'/g, "\\'");

  return `
    <div class="bg-slate-900 p-4 rounded-xl border border-slate-700/60 flex items-center justify-between ${isDisabled ? 'opacity-40' : ''}">
      <div class="flex items-center gap-3.5">
        <div class="p-2 bg-slate-800 rounded-lg border border-slate-700 text-slate-400">
          <svg class="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
        </div>
        <div>
          <h4 class="text-sm font-bold">${categoryName}</h4>
          <span class="text-xs text-slate-400">${catQuestions.length} questions available</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <input type="checkbox" id="${checkboxId}" value="${categoryName}" class="subject-checkbox w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer" ${isDisabled ? 'disabled' : ''}>
        <button onclick="startSession('${safeCategoryName}')" class="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-lg text-white transition ${isDisabled ? 'pointer-events-none opacity-50' : ''}">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
    </div>
  `;
}

function startSession(clickedCategory) {
  const bank = window.questions || window.questionBank || [];
  const checkedBoxes = document.querySelectorAll('.subject-checkbox:checked');
  let selectedCategories = Array.from(checkedBoxes).map(cb => cb.value);

  if (selectedCategories.length === 0 && clickedCategory) {
    selectedCategories = [clickedCategory];
  }

  if (selectedCategories.length === 0) {
    alert("Please select at least one subject category.");
    return;
  }

  let list = bank.filter(q => selectedCategories.includes(q.category));
  const hasActiveDiffs = Object.values(activeDifficulties).some(v => v);
  if (hasActiveDiffs) {
    list = list.filter(q => activeDifficulties[q.difficulty]);
  }

  list = filterByStatus(list);
  filteredQuestions = list;

  if (filteredQuestions.length === 0) {
    alert("No questions match your current filter criteria.");
    return;
  }

  currentQuestionIndex = 0;
  isDesmosOpen = false;
  renderActiveQuestion();
}

// --- ОТРИСОВКА ВОПРОСА ---
function renderActiveQuestion() {
  const currentWrapper = document.getElementById('desmos-wrapper');
  if (currentWrapper) {
    if (currentWrapper.style.top) desmosState.top = currentWrapper.style.top;
    if (currentWrapper.style.left) desmosState.left = currentWrapper.style.left;
    if (currentWrapper.style.width) desmosState.width = currentWrapper.style.width;
    if (currentWrapper.style.height) desmosState.height = currentWrapper.style.height;
  }

  const container = document.getElementById('sec-practice');
  if (!container) return;

  const currentQuestion = filteredQuestions[currentQuestionIndex];
  selectedOption = null;
  userInputValue = '';
  hasAttemptedCurrent = false;

  const imageHTML = currentQuestion.image
  ? `<div class="my-4 flex justify-center">
       <img src="${currentQuestion.image}" alt="Figure" onclick="openImageModal(this.src)" class="max-h-52 w-auto object-contain cursor-pointer hover:opacity-95 transition" title="Click to enlarge">
     </div>`
  : '';

  const isInputType = Array.isArray(currentQuestion.options) && currentQuestion.options.length === 0;

  let answerBlockHtml = isInputType ? `
    <div class="space-y-3 max-w-sm">
      <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Answer</label>
      <input type="text" id="student-answer-input" oninput="handleInputChange(this.value)" placeholder="e.g. 12 or 3/4" class="w-full bg-white border-2 border-slate-900 text-slate-900 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition">
    </div>
  ` : `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
    ${currentQuestion.options.map((opt, idx) => `
      <button onclick="selectOption(${idx})" id="opt-btn-${idx}" class="opt-btn bg-white hover:bg-slate-50 border border-slate-300 p-2.5 rounded-xl text-left text-xs font-semibold transition text-slate-800">
        <span class="text-indigo-600 font-bold mr-1.5">${String.fromCharCode(65 + idx)}.</span> ${window.renderMath ? window.renderMath(opt) : opt}
      </button>
    `).join('')}
    </div>
  `;

  container.innerHTML = `
    <!-- DESMOS CALCULATOR -->
    <div id="desmos-wrapper" style="top: ${desmosState.top}; left: ${desmosState.left}; width: ${desmosState.width}; height: ${desmosState.height};" class="${isDesmosOpen ? '' : 'hidden'} fixed z-40 min-w-[320px] min-h-[380px] bg-slate-900 p-2 rounded-xl border border-slate-700 shadow-2xl flex flex-col resize overflow-auto">
      <div id="desmos-header" class="flex justify-between items-center mb-1 px-2 py-1.5 bg-slate-800 rounded-lg select-none cursor-move shrink-0">
        <span class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <svg class="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          Graphing Calculator
        </span>
        <button onclick="toggleDesmos()" class="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-700 transition">✕ Close</button>
      </div>
      <div id="desmos-calculator-container" class="w-full flex-1 rounded-lg overflow-hidden border border-slate-800 min-h-0"></div>
    </div>

    <!-- MAIN WORKSPACE -->
    <div id="practice-main-content" class="w-full space-y-3 pb-12 transition-all duration-300 ${isDesmosOpen ? 'ml-auto mr-2 max-w-xl' : 'mx-auto max-w-3xl'}">
      
      <!-- TOP NAV WITH BLACK BORDER -->
      <div class="flex items-center justify-between bg-white border border-slate-900 rounded-xl px-4 py-2 shadow-sm">
        <div class="flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-mono text-xs">
          <svg class="w-3.5 h-3.5 stroke-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span id="question-timer" class="font-bold text-slate-800">00:00</span>
          <button type="button" id="timer-pause-btn" onclick="toggleTimerPause()" class="ml-1 text-slate-500 hover:text-slate-800 transition focus:outline-none">
            <svg id="timer-pause-icon" class="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="toggleDesmos()" class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            Calculator
          </button>
          <button onclick="renderPracticeDashboard()" class="text-xs font-bold text-slate-500 hover:text-slate-800 transition px-2 py-1">✕ Exit</button>
        </div>
      </div>

      <!-- IMAGE -->
      ${imageHTML}

      <!-- QUESTION BOX WITH BLACK BORDER -->
      <div class="bg-white p-5 rounded-xl border border-slate-900 shadow-sm">
        <p class="text-sm sm:text-base font-medium leading-relaxed text-slate-800">${window.renderMath ? window.renderMath(currentQuestion.question) : currentQuestion.question}</p>
      </div>

      <!-- ANSWER BOX WITH BLACK BORDER -->
      <div class="bg-white p-5 rounded-xl border border-slate-900 space-y-3 shadow-sm">
        <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Answer Selection</h3>
        ${answerBlockHtml}
        <div id="feedback-msg" class="text-xs font-bold min-h-[1rem]"></div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <button onclick="checkAnswer()" id="submit-ans-btn" class="bg-slate-200 text-slate-400 font-bold px-6 py-2.5 rounded-xl text-xs transition cursor-not-allowed shadow-none" disabled>
            Check Answer
          </button>
        </div>
      </div>

      <!-- BOTTOM NAV WITH BLACK BORDER -->
      <div class="flex items-center justify-between bg-white border border-slate-900 rounded-xl px-4 py-2 shadow-sm relative">
        <button onclick="navigateQuestion(-1)" ${currentQuestionIndex === 0 ? 'disabled' : ''} class="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-30 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition">← Previous</button>

        <div class="flex items-center gap-2">
          <div class="relative">
            <button onclick="toggleInfoPopup()" class="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition flex items-center gap-1">ℹ Info</button>
            <div id="info-popup" class="hidden absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white border border-slate-900 p-3 rounded-xl shadow-xl text-xs text-slate-600 z-30 space-y-1">
              <div class="font-bold text-slate-800 text-xs">Question Details</div>
              <div>Difficulty: <span class="text-indigo-600 uppercase font-bold">${currentQuestion.difficulty || 'Medium'}</span></div>
              <div>Domain: <span class="text-slate-800">${currentQuestion.domain || currentQuestion.category || 'Math'}</span></div>
              ${currentQuestion.note ? `<div class="pt-1 border-t border-slate-200 mt-1 text-slate-700"><strong>Note:</strong> ${currentQuestion.note}</div>` : ''}
            </div>
          </div>

          <button onclick="toggleExplanationBox()" class="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition flex items-center gap-1">💡 Explanation</button>
        </div>

        <button onclick="navigateQuestion(1)" ${currentQuestionIndex === filteredQuestions.length - 1 ? 'disabled' : ''} class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 rounded-lg text-xs font-bold text-white transition">Next →</button>
      </div>
    </div>

    <!-- EXPLANATION DRAWER -->
    <div id="explanation-box" class="fixed inset-x-0 bottom-0 z-50 transform translate-y-full transition-transform duration-300 ease-out bg-white border-t-2 border-indigo-500 shadow-2xl max-h-[80vh] flex flex-col rounded-t-2xl">
      <div class="max-w-4xl w-full mx-auto p-6 flex flex-col h-full overflow-hidden">
        <div class="flex items-center justify-between pb-4 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <span class="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600 text-xl">💡</span>
            <div><h2 class="text-xl font-bold text-slate-800">Step-by-Step Explanation</h2></div>
          </div>
          <button onclick="toggleExplanationBox()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition">✕ Close</button>
        </div>

        <div class="py-4 overflow-y-auto flex-1 min-h-0 space-y-4 text-sm leading-relaxed pr-2">
          <div class="am-explanation-content bg-slate-50 text-slate-900 border border-slate-200 p-4 rounded-xl shadow-inner break-words [word-break:break-word]">
            ${currentQuestion.explanation ? (window.renderMath ? window.renderMath(currentQuestion.explanation) : currentQuestion.explanation) : 'No explanation available.'}
          </div>
          
          ${currentQuestion.explanationImage ? `
            <div class="flex justify-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <img src="${currentQuestion.explanationImage}" alt="Explanation figure" onclick="openImageModal(this.src)" class="max-h-64 object-contain rounded-lg cursor-pointer hover:opacity-90 transition">
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  startQuestionTimer();
  desmosCalculator = null;

  if (isDesmosOpen) {
    setTimeout(() => {
      initDesmos();
      makeDesmosDraggable();
    }, 50);
  }
}

function toggleInfoPopup() {
  const popup = document.getElementById('info-popup');
  if (popup) popup.classList.toggle('hidden');
}

function toggleExplanationBox() {
  const box = document.getElementById('explanation-box');
  if (!box) return;
  box.classList.toggle('translate-y-full');
  const infoPopup = document.getElementById('info-popup');
  if (infoPopup) infoPopup.classList.add('hidden');
}

function navigateQuestion(step) {
  const targetIndex = currentQuestionIndex + step;
  if (targetIndex >= 0 && targetIndex < filteredQuestions.length) {
    currentQuestionIndex = targetIndex;
    renderActiveQuestion();
  }
}

function toggleDesmos() {
  isDesmosOpen = !isDesmosOpen;
  const wrapper = document.getElementById('desmos-wrapper');
  const mainContent = document.getElementById('practice-main-content');

  if (!wrapper || !mainContent) return;

  if (isDesmosOpen) {
    wrapper.classList.remove('hidden');
    mainContent.classList.remove('mx-auto', 'max-w-3xl');
    mainContent.classList.add('ml-auto', 'mr-2', 'max-w-xl');

    setTimeout(() => {
      initDesmos();
      makeDesmosDraggable();
    }, 100);
  } else {
    wrapper.classList.add('hidden');
    mainContent.classList.remove('ml-auto', 'mr-2', 'max-w-xl');
    mainContent.classList.add('mx-auto', 'max-w-3xl');
  }
}

function initDesmos() {
  const container = document.getElementById('desmos-calculator-container');
  if (!container || !window.Desmos) return;

  // Если калькулятор уже создан в этом контейнере — просто делаем resize
  if (!desmosCalculator) {
    container.innerHTML = ''; // Очищаем контейнер перед инициализацией
    desmosCalculator = Desmos.GraphingCalculator(container, {
      keypad: false,
      expressions: true,
      settingsMenu: false
    });

    const wrapper = document.getElementById('desmos-wrapper');
    if (wrapper && window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        if (desmosCalculator) desmosCalculator.resize();
      });
      resizeObserver.observe(wrapper);
    }
  }

  setTimeout(() => {
    if (desmosCalculator) desmosCalculator.resize();
  }, 100);
}


function makeDesmosDraggable() {
  const wrapper = document.getElementById('desmos-wrapper');
  const header = document.getElementById('desmos-header');

  if (!wrapper || !header) return;

  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  header.onmousedown = function (e) {
    e = e || window.event;
    if (e.target.tagName.toLowerCase() === 'button') return;

    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;

    document.onmousemove = function (e) {
      e = e || window.event;
      e.preventDefault();

      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;

      wrapper.style.top = (wrapper.offsetTop - pos2) + "px";
      wrapper.style.left = (wrapper.offsetLeft - pos1) + "px";
    };

    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

function selectOption(index) {
  selectedOption = index;
  document.querySelectorAll('.opt-btn').forEach((btn, idx) => {
    if (idx === index) {
      // Выбранный вариант: просто темная рамка + легкий серый фон (без зеленых/красных цветов)
      btn.className = "opt-btn border-2 border-slate-900 bg-slate-100 text-slate-900 p-2.5 rounded-xl text-left text-xs font-bold transition shadow-sm";
    } else {
      // Неввыбранные варианты
      btn.className = "opt-btn border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 p-2.5 rounded-xl text-left text-xs font-semibold transition";
    }
  });

  const submitBtn = document.getElementById('submit-ans-btn');
  if (submitBtn) submitBtn.disabled = false;
}

function recordAttempt(question, isCorrect, timeSpent) {
  if (!question) return;

  const userId = getCurrentUserId();
  const attemptsKey = `user_attempts_${userId}`;

  const attemptData = {
    userId: userId,
    questionId: question.firestoreId || question.id || null,
    category: question.category || 'General',
    difficulty: question.difficulty || 'Medium',
    isCorrect: Boolean(isCorrect),
    timeSpent: parseInt(timeSpent) || 30,
    timestamp: new Date().toISOString()
  };

  try {
    const attempts = JSON.parse(localStorage.getItem(attemptsKey) || '[]');
    attempts.push(attemptData);
    localStorage.setItem(attemptsKey, JSON.stringify(attempts));
  } catch (e) {
    console.error("Ошибка сохранения в LocalStorage:", e);
  }

  if (typeof window.saveAttemptToFirestore === 'function') {
    window.saveAttemptToFirestore(attemptData);
  } else if (typeof db !== 'undefined' && userId !== 'guest_user') {
    db.collection("users").doc(userId).collection("attempts").add(attemptData)
      .catch(err => console.error("Firestore error:", err));
  }
}

function parseNumericAnswer(raw) {
  if (raw === null || raw === undefined) return null;
  let str = String(raw).trim().replace(/\s+/g, '');
  if (str === '') return null;

  if (str.endsWith('%')) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? null : num / 100;
  }

  const fractionMatch = str.match(/^-?\d+(\.\d+)?\/-?\d+(\.\d+)?$/);
  if (fractionMatch) {
    const [numStr, denStr] = str.split('/');
    const num = parseFloat(numStr);
    const den = parseFloat(denStr);
    if (isNaN(num) || isNaN(den) || den === 0) return null;
    return num / den;
  }

  if (!/^-?\d*\.?\d+$/.test(str)) return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}
function handleInputChange(val) {
  userInputValue = val.trim();
  const submitBtn = document.getElementById('submit-ans-btn');
  if (!submitBtn) return;

  if (userInputValue.length > 0) {
    // Ввели ответ: активируем и делаем яркой
    submitBtn.disabled = false;
    submitBtn.className = "bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-md";
  } else {
    // Поле пустое: блокируем и возвращаем блёклый цвет
    submitBtn.disabled = true;
    submitBtn.className = "bg-slate-200 text-slate-400 font-bold px-6 py-2.5 rounded-xl text-xs transition cursor-not-allowed shadow-none";
  }
}
function checkAnswer() {
  const currentQuestion = filteredQuestions[currentQuestionIndex];
  const isInputType = Array.isArray(currentQuestion.options) && currentQuestion.options.length === 0;

  if (!isInputType && selectedOption === null) return;
  if (isInputType && !userInputValue) return;

  const timeForThisQ = Math.max(stopQuestionTimer(), 1);
  const feedback = document.getElementById('feedback-msg');

  let isCorrect = false;

  if (isInputType) {
    const rawAnswer = currentQuestion.correctAnswer ?? currentQuestion.correct_answer ?? currentQuestion.correctIndex ?? '';
    const expectedNum = parseNumericAnswer(rawAnswer);
    const inputNum = parseNumericAnswer(userInputValue);

    if (expectedNum !== null && inputNum !== null) {
      isCorrect = Math.abs(expectedNum - inputNum) < 1e-9;
    } else {
      const normalizedInput = userInputValue.toLowerCase().replace(/\s+/g, '');
      const expected = String(rawAnswer).toLowerCase().replace(/\s+/g, '');
      isCorrect = (normalizedInput === expected);
    }
  } else {
    isCorrect = (selectedOption === currentQuestion.correctIndex);
  }

  if (!hasAttemptedCurrent) {
    recordAttempt(currentQuestion, isCorrect, timeForThisQ);
    totalSecondsSpent += timeForThisQ;
    hasAttemptedCurrent = true;
  }

  // Смена цвета ПОСЛЕ проверки
  if (isCorrect) {
    feedback.className = "text-emerald-600 font-bold text-sm";
    feedback.innerText = "✓ Correct!";

    if (!isInputType && selectedOption !== null) {
      const selectedBtn = document.getElementById(`opt-btn-${selectedOption}`);
      if (selectedBtn) selectedBtn.className = "opt-btn bg-emerald-100 border-2 border-emerald-600 text-emerald-950 p-2.5 rounded-xl text-left text-xs font-bold transition shadow-sm";
    }
  } else {
    feedback.className = "text-rose-600 font-bold text-sm";
    feedback.innerText = "✕ Incorrect. Try again or check the Explanation.";

    if (!isInputType && selectedOption !== null) {
      const selectedBtn = document.getElementById(`opt-btn-${selectedOption}`);
      if (selectedBtn) selectedBtn.className = "opt-btn bg-rose-100 border-2 border-rose-600 text-rose-950 p-2.5 rounded-xl text-left text-xs font-bold transition shadow-sm";
    }
  }
}

function openImageModal(src) {
  let modal = document.getElementById('image-lightbox-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'image-lightbox-modal';
    modal.className = 'fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200 opacity-0 pointer-events-none';
    modal.innerHTML = `
      <div class="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
        <button onclick="closeImageModal()" class="absolute -top-12 right-0 text-white hover:text-slate-300 text-sm font-bold bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-600 transition shadow">✕ Close</button>
        <img id="lightbox-img" src="" alt="Enlarged view" class="max-w-full max-h-[85vh] object-contain rounded-xl border border-slate-700 shadow-2xl">
      </div>
    `;
    modal.onclick = (e) => { if (e.target === modal) closeImageModal(); };
    document.body.appendChild(modal);
  }

  const img = modal.querySelector('#lightbox-img');
  img.src = src;
  modal.classList.remove('opacity-0', 'pointer-events-none');
}

function closeImageModal() {
  const modal = document.getElementById('image-lightbox-modal');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
  }
}

window.generateQuestion = renderPracticeDashboard;
window.startSession = startSession;
window.toggleDifficulty = toggleDifficulty;
window.setStatusFilter = setStatusFilter;
window.selectOption = selectOption;
window.handleInputChange = handleInputChange;
window.checkAnswer = checkAnswer;
window.toggleDesmos = toggleDesmos;
window.toggleTimerPause = toggleTimerPause;
window.navigateQuestion = navigateQuestion;
window.toggleExplanationBox = toggleExplanationBox;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;