function renderProgressDashboard() {
  const container = document.getElementById('sec-progress');
  if (!container) return;

  // 1. ПОЛУЧАЕМ ПРАВИЛЬНЫЙ КЛЮЧ С UID ТЕКУЩЕГО ЮЗЕРА
  const userId = (typeof getCurrentUserId === 'function')
    ? getCurrentUserId()
    : (firebase.auth() && firebase.auth().currentUser ? firebase.auth().currentUser.uid : 'guest_user');

  const attemptsKey = `user_attempts_${userId}`;
  const attempts = JSON.parse(localStorage.getItem(attemptsKey) || '[]');

  // 2. Расчет стрика (Daily Streak)
  const activeDaysSet = new Set();
  attempts.forEach(a => {
    if (a.timestamp) {
      const dateObj = new Date(a.timestamp);
      if (!isNaN(dateObj.getTime())) {
        const dateStr = dateObj.toISOString().split('T')[0];
        activeDaysSet.add(dateStr);
      }
    }
  });

  let streak = 0;
  const todayDate = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    const dStr = d.toISOString().split('T')[0];

    if (activeDaysSet.has(dStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // 3. Расчет времени (Today, This Week, This Month)
  let todaySeconds = 0;
  let weekSeconds = 0;
  let monthSeconds = 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  attempts.forEach(a => {
    const timeSpent = a.timeSpent || 30;
    const t = a.timestamp ? new Date(a.timestamp).getTime() : now.getTime();

    if (t >= startOfToday) todaySeconds += timeSpent;
    if (t >= startOfWeek.getTime()) weekSeconds += timeSpent;
    if (t >= startOfMonth) monthSeconds += timeSpent;
  });

  // Логика округления: < 30 сек -> 0 min, >= 30 сек -> 1 min; 60+ мин -> 1 hrs X min
  const formatTime = (secs) => {
    if (!secs || secs <= 0) return '0 min';

    // Округляем секунды до ближайшей минуты (26s -> 0 min, 49s -> 1 min)
    const totalMinutes = Math.round(secs / 60);

    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours} hrs ${mins} min`;
  };

  // 4. Подготовка данных для графика (15 дней)
  const last15Days = [];
  for (let i = 14; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    last15Days.push({ dateStr, label, seconds: 0 });
  }

  attempts.forEach(a => {
    if (a.timestamp) {
      const dateObj = new Date(a.timestamp);
      if (!isNaN(dateObj.getTime())) {
        const dStr = dateObj.toISOString().split('T')[0];
        const dayObj = last15Days.find(item => item.dateStr === dStr);
        if (dayObj) {
          dayObj.seconds += (a.timeSpent || 30);
        }
      }
    }
  });

  const maxSecs = Math.max(...last15Days.map(d => d.seconds), 60);

  let chartBarsHtml = '';
  last15Days.forEach(day => {
    const heightPercent = Math.max(Math.round((day.seconds / maxSecs) * 100), 8);
    chartBarsHtml += `
      <div class="flex flex-col items-center flex-1 h-full justify-end group relative">
        <div class="absolute -top-8 bg-slate-800 text-slate-200 border border-slate-700 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
          ${day.label}: ${formatTime(day.seconds)}
        </div>
        <div class="w-full bg-indigo-600 hover:bg-indigo-500 rounded-t transition-all duration-300" style="height: ${heightPercent}%"></div>
        <span class="text-[10px] text-slate-400 mt-2 truncate w-full text-center">${day.label.split(' ')[0]}</span>
      </div>
    `;
  });

  // Отдельный форматтер именно для таблицы "Average Time Per Question":
  // до 60 сек — просто секунды, после — минуты + секунды (напр. "1 min 3 sec").
  // Остальные карточки (Today/Week/Month/стрик) как были — formatTime не трогаем.
  const formatAvgTime = (secs) => {
    const rounded = Math.round(secs || 0);
    if (rounded <= 0) return '0 sec';
    if (rounded < 60) return `${rounded} sec`;

    const mins = Math.floor(rounded / 60);
    const remSecs = rounded % 60;
    return remSecs > 0 ? `${mins} min ${remSecs} sec` : `${mins} min`;
  };

  // 5. Сборка статистических таблиц
  const categoriesList = ['Algebra', 'Advanced Math', 'Problem-Solving and Data Analysis', 'Geometry and Trigonometry'];
  const difficulties = ['easy', 'medium', 'hard'];

  const statsMap = {};
  categoriesList.forEach(cat => {
    statsMap[cat] = {
      easy: { total: 0, correct: 0, timeSum: 0 },
      medium: { total: 0, correct: 0, timeSum: 0 },
      hard: { total: 0, correct: 0, timeSum: 0 },
    };
  });

  attempts.forEach(a => {
    if (statsMap[a.category] && statsMap[a.category][a.difficulty]) {
      const s = statsMap[a.category][a.difficulty];
      s.total++;
      if (a.isCorrect) s.correct++;
      s.timeSum += (a.timeSpent || 30);
    }
  });

  let timeRowsHtml = '';
  let accuracyRowsHtml = '';

  categoriesList.forEach(cat => {
    let timeCells = '';
    let accCells = '';

    difficulties.forEach(diff => {
      const data = statsMap[cat][diff];
      if (data.total > 0) {
        const avgTime = Math.round(data.timeSum / data.total);
        timeCells += `<td class="py-3 px-4 text-slate-200 font-medium">${formatAvgTime(avgTime)}</td>`;

        const acc = Math.round((data.correct / data.total) * 100);
        accCells += `<td class="py-3 px-4"><span class="px-2.5 py-1 rounded text-xs font-semibold ${acc >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : acc >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">${acc}%</span></td>`;
      } else {
        timeCells += `<td class="py-3 px-4 text-slate-500">—</td>`;
        accCells += `<td class="py-3 px-4 text-slate-500">—</td>`;
      }
    });

    timeRowsHtml += `
      <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
        <td class="py-3 px-4 text-slate-300 font-medium">${cat}</td>
        ${timeCells}
      </tr>
    `;

    accuracyRowsHtml += `
      <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition">
        <td class="py-3 px-4 text-slate-300 font-medium">${cat}</td>
        ${accCells}
      </tr>
    `;
  });

  // 6. Рендеринг UI
  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6 pb-12">
      <div>
        <h2 class="text-2xl font-bold text-white tracking-tight">Analytics & Progress</h2>
        <p class="text-sm text-slate-400 mt-0.5">Real-time statistics based on your solved practice questions.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div class="bg-slate-800 p-4 rounded-xl border border-slate-700/80 flex items-center gap-3">
          <div class="p-2.5 bg-slate-900 rounded-lg border border-slate-700 text-slate-400">
            <svg class="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider block">Daily Streak</span>
            <div class="text-xl font-bold text-white mt-0.5">${streak} days</div>
          </div>
        </div>

        <div class="bg-slate-800 p-4 rounded-xl border border-slate-700/80 flex items-center gap-3">
          <div class="p-2.5 bg-slate-900 rounded-lg border border-slate-700 text-slate-400">
            <svg class="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider block">Today</span>
            <div class="text-xl font-bold text-indigo-400 mt-0.5">${formatTime(todaySeconds)}</div>
          </div>
        </div>

        <div class="bg-slate-800 p-4 rounded-xl border border-slate-700/80 flex items-center gap-3">
          <div class="p-2.5 bg-slate-900 rounded-lg border border-slate-700 text-slate-400">
            <svg class="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider block">This Week</span>
            <div class="text-xl font-bold text-indigo-400 mt-0.5">${formatTime(weekSeconds)}</div>
          </div>
        </div>

        <div class="bg-slate-800 p-4 rounded-xl border border-slate-700/80 flex items-center gap-3">
          <div class="p-2.5 bg-slate-900 rounded-lg border border-slate-700 text-slate-400">
            <svg class="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 00-2 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider block">This Month</span>
            <div class="text-xl font-bold text-indigo-400 mt-0.5">${formatTime(monthSeconds)}</div>
          </div>
        </div>

      </div>

      <div class="bg-slate-800 p-5 rounded-xl border border-slate-700/80 space-y-4">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Activity (Last 15 Days / Minutes per Day)</h3>
        <div class="h-44 flex items-end gap-2 pt-6 px-2 border-b border-slate-700/80 pb-2">
          ${chartBarsHtml}
        </div>
      </div>

      <div class="bg-slate-800 p-5 rounded-xl border border-slate-700/80 space-y-3">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Time Per Question (Min & Sec)</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-700 text-slate-400 uppercase tracking-wider">
                <th class="py-2.5 px-4">Category</th>
                <th class="py-2.5 px-4">Easy</th>
                <th class="py-2.5 px-4">Medium</th>
                <th class="py-2.5 px-4">Hard</th>
              </tr>
            </thead>
            <tbody>
              ${timeRowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-slate-800 p-5 rounded-xl border border-slate-700/80 space-y-3">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Accuracy Rate (%)</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-700 text-slate-400 uppercase tracking-wider">
                <th class="py-2.5 px-4">Category</th>
                <th class="py-2.5 px-4">Easy</th>
                <th class="py-2.5 px-4">Medium</th>
                <th class="py-2.5 px-4">Hard</th>
              </tr>
            </thead>
            <tbody>
              ${accuracyRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.renderProgressDashboard = renderProgressDashboard;