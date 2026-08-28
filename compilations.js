// Загрузка и отрисовка подборок
async function loadCompilations() {
  const container = document.getElementById('sec-compilations');
  if (!container) return;

  container.innerHTML = '<div class="text-slate-400 p-4">Loading compilations...</div>';

  try {
    const snapshot = await db.collection('compilations').get();
    if (snapshot.empty) {
      container.innerHTML = '<div class="text-slate-400 p-6 bg-slate-800 rounded-xl border border-slate-700">No compilations found. Create one in the Admin panel!</div>';
      return;
    }

    // Проверяем, админ ли текущий юзер
    const currentUser = firebase.auth().currentUser;
    const isAdmin = currentUser && currentUser.email === "doniyor09arabov@gmail.com";

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-6">';

    snapshot.forEach(doc => {
      const comp = doc.data();
      const compId = doc.id;
      const questionCount = comp.questionIds ? comp.questionIds.length : (comp.questions ? comp.questions.length : 0);

      html += `
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xl font-bold text-white">${comp.title || comp.name || 'Untitled Set'}</h3>
              ${isAdmin ? `
                <button onclick="deleteCompilation('${compId}')" class="text-red-400 hover:text-red-300 font-bold text-sm bg-red-500/10 hover:bg-red-500/20 px-3 py-1 rounded-lg transition border border-red-500/30">
                  Delete
                </button>
              ` : ''}
            </div>
            <p class="text-slate-300 text-sm font-medium mb-4">${comp.description || 'Custom SAT practice set.'}</p>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-slate-700/60 mt-2">
            <span class="text-xs font-bold uppercase text-slate-400 tracking-wider">${questionCount} Questions</span>
            <button onclick="startCompilationPractice('${compId}')" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-lg text-sm transition">
              Start Practice
            </button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

  } catch (error) {
    console.error("Error loading compilations:", error);
    container.innerHTML = `<div class="text-red-400 p-4">Error loading compilations: ${error.message}</div>`;
  }
}

// Функция удаления подборки
async function deleteCompilation(compId) {
  if (!confirm("Are you sure you want to delete this compilation?")) return;

  try {
    await db.collection('compilations').doc(compId).delete();
    if (window.showToast) window.showToast("Compilation deleted successfully!", "success");
    loadCompilations(); // Перезагружаем список
    if (window.populateCompilationDropdown) window.populateCompilationDropdown(); // Обновляем селект в админке
  } catch (error) {
    console.error("Error deleting compilation:", error);
    alert("Failed to delete compilation: " + error.message);
  }
}

window.loadCompilations = loadCompilations;
window.deleteCompilation = deleteCompilation;