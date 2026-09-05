const firebaseConfig = {
  apiKey: "AIzaSyAAaLt_Ph9FDz0-9CnCi14Qv2l2YKH5W7U",
  authDomain: "blabla-8c8f4.firebaseapp.com",
  projectId: "blabla-8c8f4",
  storageBucket: "blabla-8c8f4.firebasestorage.app",
  messagingSenderId: "739604227792",
  appId: "1:739604227792:web:9d6b24997ddd85905560d5"
};

// Инициализация
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Регистрация
async function registerUser(email, password, firstName, lastName, targetScore, examDate) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    try {
      await db.collection("users").doc(user.uid).set({
        first_name: firstName,
        last_name: lastName,
        email: email,
        target_score: targetScore,
        exam_date: examDate,
        created_at: new Date().toISOString()
      });
    } catch (dbErr) {
      console.error("Firestore Write Error:", dbErr);
    }

    try {
      await user.sendEmailVerification();
    } catch (mailErr) {
      console.error("Email Verification Error:", mailErr);
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Логин
async function loginUser(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await user.reload();

    if (!user.emailVerified) {
      return {
        success: false,
        isUnverified: true,
        user: user,
        error: "Please verify your email address first."
      };
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function logoutUser() {
  await auth.signOut();
  localStorage.clear();
  location.reload();
}

window.saveUserToFirestore = async function(updates) {
  if (!auth.currentUser) return;
  try {
    await db.collection("users").doc(auth.currentUser.uid).set(updates, { merge: true });
  } catch (err) {
    console.error("Error saving to Firestore:", err);
  }
};

// 1. ОПТИМИЗАЦИЯ: Добавление попытки с мгновенным обновлением локального кэша
window.saveAttemptToFirestore = async function(attemptData) {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const userKey = `user_attempts_${userId}`;

  try {
    // Пишем сам факт попытки, как раньше
    await db.collection("users").doc(userId).collection("attempts").add(attemptData);

    // ДОБАВЛЕНО: параллельно копим суммарное время и число попыток прямо
    // на документе юзера (users/{uid}). Смысл: чтобы посмотреть "сколько
    // часов юзер провёл на сайте" в админке, не нужно читать все его
    // попытки (это может быть сотни reads на одного юзера) — читается
    // ОДИН документ, а число там уже готовое. Стоит это лишний write при
    // каждой попытке (запись и так уже идёт), а не лишние reads.
    db.collection("users").doc(userId).set({
      totalTimeSpentSeconds: firebase.firestore.FieldValue.increment(attemptData.timeSpent || 30),
      totalQuestionsAnswered: firebase.firestore.FieldValue.increment(1)
    }, { merge: true }).catch(err => console.error("Error updating time aggregate:", err));

    // Обновляем локальный кэш конкретного юзера
    const localAttempts = JSON.parse(localStorage.getItem(userKey) || '[]');
    localAttempts.push(attemptData);
    localStorage.setItem(userKey, JSON.stringify(localAttempts));

    // Обновляем счётчик в UI (фильтруем строго по isCorrect)
    const solvedCount = localAttempts.filter(a => a.isCorrect).length;
    const countEl = document.getElementById('home-solved-count');
    if (countEl) countEl.innerText = solvedCount;

  } catch (err) {
    console.error("Error saving attempt:", err);
  }
};

window.loadAttemptsFromFirestore = async function(forceRefresh = false) {
  if (!auth.currentUser) return [];
  const userId = auth.currentUser.uid;
  const userKey = `user_attempts_${userId}`;

  const cachedAttempts = localStorage.getItem(userKey);

  // 1. Быстрый возврат из кэша юзера
  if (!forceRefresh && cachedAttempts) {
    try {
      const parsed = JSON.parse(cachedAttempts);
      const solvedCount = parsed.filter(a => a.isCorrect).length;
      const countEl = document.getElementById('home-solved-count');
      if (countEl) countEl.innerText = solvedCount;
      return parsed;
    } catch (e) {
      console.error("Error parsing attempts cache:", e);
    }
  }

  // 2. Фетч из базы, если кэша нет или forceRefresh === true
  try {
    const snapshot = await db.collection("users").doc(userId).collection("attempts").get();
    const attempts = snapshot.docs.map(doc => doc.data());

    localStorage.setItem(userKey, JSON.stringify(attempts));

    // Считаем ТОЛЬКО верные решения
    const solvedCount = attempts.filter(a => a.isCorrect).length;
    const countEl = document.getElementById('home-solved-count');
    if (countEl) countEl.innerText = solvedCount;

    return attempts;
  } catch (err) {
    console.error("Error loading attempts from Firestore:", err);
    return JSON.parse(localStorage.getItem(userKey) || '[]');
  }
};

// ==========================================================================
// АДМИН-ПАНЕЛЬ
// ==========================================================================

const ADMIN_EMAILS = [
  "doniyor09arabov@gmail.com"
];

window.isCurrentUserAdmin = function() {
  return !!(auth.currentUser && ADMIN_EMAILS.includes(auth.currentUser.email));
};

window.saveQuestionToFirestore = async function(questionData) {
  const docRef = await db.collection("questions").add({
    ...questionData,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // После создания вопроса сбрасываем локальный кэш, чтобы при следующем запросе подтянулся свежий банк
  localStorage.removeItem('cached_questions');
  return docRef.id;
};

// 3. ОПТИМИЗАЦИЯ: Загрузка вопросов из базы только при отсутствии кэша или флаге forceRefresh
// Кэш банка вопросов "протухает" через CACHE_TTL_MS — иначе у ученика,
// который зашёл давно, в localStorage навсегда застревает старый список
// (баг: новые вопросы, добавленные админом, ему просто никогда не
// подгружаются, пока он сам не почистит кэш браузера).
const QUESTIONS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 часов

window.loadQuestionsFromFirestore = async function(forceRefresh = false) {
  const cachedQuestions = localStorage.getItem('cached_questions');
  const cachedAt = Number(localStorage.getItem('cached_questions_at') || 0);
  const isFresh = cachedAt && (Date.now() - cachedAt < QUESTIONS_CACHE_TTL_MS);

  if (!forceRefresh && cachedQuestions && isFresh) {
    try {
      return JSON.parse(cachedQuestions);
    } catch (e) {
      console.error("Error parsing cached questions:", e);
    }
  }

  try {
    const snapshot = await db.collection("questions").orderBy("createdAt", "asc").get();
    const questions = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));

    if (questions.length > 0) {
      localStorage.setItem('cached_questions', JSON.stringify(questions));
      localStorage.setItem('cached_questions_at', String(Date.now()));
    }
    return questions;
  } catch (err) {
    console.error("Error loading questions from Firestore:", err);
    return JSON.parse(localStorage.getItem('cached_questions') || '[]');
  }
};

window.getTotalUsersCount = async function() {
  try {
    if (typeof db.collection("users").count === 'function') {
      const snap = await db.collection("users").count().get();
      return snap.data().count;
    }
    const snap = await db.collection("users").get();
    return snap.size;
  } catch (err) {
    console.error("Error counting users:", err);
    return null;
  }
};

// Удаление вопроса (только для админа — доступ уже проверяется в UI через
// isCurrentUserAdmin, но также стоит продублировать правило в Firestore
// Security Rules: allow delete: if request.auth.token.email in [...]).
window.deleteQuestionFromFirestore = async function(firestoreId) {
  if (!firestoreId) return;
  await db.collection("questions").doc(firestoreId).delete();
  // Сбрасываем локальный кэш, чтобы удалённый вопрос сразу пропал у всех
  // при следующей подгрузке банка вопросов.
  localStorage.removeItem('cached_questions');
};

// Поиск юзера по email для админки: возвращает документ (включая
// totalTimeSpentSeconds/totalQuestionsAnswered) ОДНИМ чтением — без
// перебора всей коллекции attempts. where(...).limit(1).get() стоит
// ровно 1 read при точном совпадении email.
window.lookupUserByEmail = async function(email) {
  const normalized = (email || '').trim();
  if (!normalized) return null;

  try {
    const snapshot = await db.collection("users")
      .where("email", "==", normalized)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { uid: doc.id, ...doc.data() };
  } catch (err) {
    console.error("Error looking up user:", err);
    return null;
  }
};

// Экспорт в глобальную область
window.firebaseAuth = {
  registerUser,
  loginUser,
  logoutUser,
  auth,
  db
};