const questionBank = [
  {
    id: 1,
    category: "Algebra",
    difficulty: "easy",
    timeSpent: 45, // в секундах
    question: "If 3x + 7 = 22, what is the value of 6x - 4?",
    image: "",
    options: ["22", "26", "30", "34"],
    correctIndex: 1,
    explanation: "First, solve for x: 3x = 15, so x = 5. Then substitute into 6x - 4: 6(5) - 4 = 30 - 4 = 26."
  },
  {
    id: 2,
    category: "Advanced Math",
    difficulty: "medium",
    timeSpent: 75,
    question: "Which of the following is equivalent to (2x^3)^4?",
    image: "",
    options: ["8x^7", "8x^12", "16x^7", "16x^12"],
    correctIndex: 3,
    explanation: "Apply the power of a product rule: (ab)^n = a^n * b^n. So (2)^4 * (x^3)^4 = 16x^12."
  },
  {
    id: 3,
    category: "Problem-Solving and Data Analysis",
    difficulty: "easy",
    timeSpent: 50,
    question: "A jacket that originally cost $80 is on sale for 25% off. What is the sale price of the jacket?",
    image: "",
    options: ["$55", "$60", "$65", "$70"],
    correctIndex: 1,
    explanation: "Calculate 25% of 80: 0.25 * 80 = 20. Subtract the discount from the original price: 80 - 20 = 60."
  },
  {
    id: 4,
    category: "Geometry and Trigonometry",
    difficulty: "hard",
    timeSpent: 110,
    question: "What is the area of a circle with a circumference of 10π?",
    image: "",
    options: ["10π", "20π", "25π", "100π"],
    correctIndex: 2,
    explanation: "Circumference is C = 2πr = 10π, so r = 5. Area is A = πr^2 = π(5)^2 = 25π."
  }
];

window.questions = questionBank;
window.questionBank = questionBank;

// ==========================================================================
// ПОДГРУЗКА ВОПРОСОВ ИЗ FIRESTORE
// ==========================================================================
// Вопросы, добавленные через админ-панель, живут в Firestore, а не в этом
// файле. При наличии хотя бы одного облачного вопроса — window.questions
// заменяется на облачный список (порядок = порядок создания = порядок
// решения). Если облако пустое или недоступно — остаётся локальный банк
// (questionBank выше) как запасной вариант.
async function refreshQuestionsFromCloud(force = false) {
  if (typeof window.loadQuestionsFromFirestore !== 'function') return;

  // Пробрасываем флаг force дальше в запрос к базе
  const cloudQuestions = await window.loadQuestionsFromFirestore(force);
  if (cloudQuestions && cloudQuestions.length > 0) {
    window.questions = cloudQuestions;
    window.questionBank = cloudQuestions;
  }
}
window.refreshQuestionsFromCloud = refreshQuestionsFromCloud;

window.refreshQuestionsFromCloud = refreshQuestionsFromCloud;