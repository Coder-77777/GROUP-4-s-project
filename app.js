/*
  app.js — Client-side SPA for EdTech Quiz Generator

  Purpose:
  - Manages UI screens, authentication state, quiz generation requests,
    quiz-taking workflow (questions, answers, timer), and result saving.
  - The code expects specific DOM element IDs; keep `index.html` in sync.
  - These inline comments are developer-facing only and will not appear
    on the rendered page.
*/

// ====================================
// GLOBAL STATE
// ====================================

const state = {
  token: null,
  user: null,
  currentQuestion: 0,
  score: 0,
  selectedAnswers: [],
  quizData: [],
  duration: 0,
  interval: null,
  quizMeta: {
    difficulty: "Medium",
    topic: "General"
  }
};

// ====================================
// DOM REFERENCES
// ====================================

const screens = {
  login: document.getElementById("loginScreen"),
  register: document.getElementById("registerScreen"),
  dashboard: document.getElementById("dashboardScreen"),
  setup: document.getElementById("setupScreen"),
  quiz: document.getElementById("quizScreen"),
  results: document.getElementById("resultsScreen")
};

const elements = {
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  registerName: document.getElementById("registerName"),
  registerEmail: document.getElementById("registerEmail"),
  registerPassword: document.getElementById("registerPassword"),
  loginMessage: document.getElementById("loginMessage"),
  registerMessage: document.getElementById("registerMessage"),
  dashboardAvg: document.getElementById("avgScoreValue"),
  dashboardCompleted: document.getElementById("quizzesCompletedValue"),
  dashboardHigh: document.getElementById("highestScoreValue"),
  recentList: document.getElementById("recentQuizzesList"),
  syllabusInput: document.getElementById("syllabusInput"),
  topicInput: document.getElementById("topicInput"),
  difficultyInput: document.getElementById("difficultyInput"),
  questionCountInput: document.getElementById("questionCountInput"),
  setupMessage: document.getElementById("setupMessage"),
  timerValue: document.getElementById("timerValue"),
  questionCounter: document.getElementById("questionCounter"),
  questionText: document.getElementById("questionText"),
  optionsContainer: document.getElementById("optionsContainer"),
  quizMessage: document.getElementById("quizMessage"),
  resultScore: document.getElementById("resultScore"),
  resultGrade: document.getElementById("resultGrade"),
  resultSummary: document.getElementById("resultSummary")
};

// ====================================
// HELPERS
// ====================================

function setMessage(element, text, type = "info") {
  if (!element) return;
  element.textContent = text;
  element.style.color = type === "error" ? "#f87171" : "#a5f3fc";
}

function getToken() {
  return localStorage.getItem("quizToken");
}

function saveAuth(token, user) {
  localStorage.setItem("quizToken", token);
  localStorage.setItem("quizUser", JSON.stringify(user));
  state.token = token;
  state.user = user;
}

function clearAuth() {
  localStorage.removeItem("quizToken");
  localStorage.removeItem("quizUser");
  state.token = null;
  state.user = null;
}

function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  return fetch(path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

function showScreen(screenId) {
  Object.values(screens).forEach((screen) => {
    screen.classList.remove("active");
  });

  const screen = document.getElementById(screenId);

  if (!screen) return;

  screen.classList.add("active");

  if (screenId === "dashboardScreen") {
    loadDashboard();
  }
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

// ====================================
// AUTHENTICATION
// ====================================

async function registerUser() {
  const username = elements.registerName.value.trim();
  const email = elements.registerEmail.value.trim();
  const password = elements.registerPassword.value.trim();

  if (!username || !email || !password) {
    setMessage(elements.registerMessage, "Please complete all registration fields.", "error");
    return;
  }

  try {
    const response = await apiFetch("/register", {
      method: "POST",
      body: { username, email, password }
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(elements.registerMessage, data.message || "Registration failed.", "error");
      return;
    }

    setMessage(elements.registerMessage, "Registration successful. Please log in.");
    setTimeout(() => showScreen("loginScreen"), 1200);
  } catch (error) {
    setMessage(elements.registerMessage, "Unable to register. Try again later.", "error");
    console.error(error);
  }
}

async function loginUser() {
  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value.trim();

  if (!email || !password) {
    setMessage(elements.loginMessage, "Email and password are required.", "error");
    return;
  }

  try {
    const response = await apiFetch("/login", {
      method: "POST",
      body: { email, password }
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(elements.loginMessage, data.message || "Login failed.", "error");
      return;
    }

    saveAuth(data.token, data.user);
    setMessage(elements.loginMessage, "Login successful.");
    showScreen("dashboardScreen");
  } catch (error) {
    setMessage(elements.loginMessage, "Unable to login. Try again later.", "error");
    console.error(error);
  }
}

function logoutUser() {
  clearAuth();
  showScreen("loginScreen");
}

// ====================================
// DASHBOARD
// ====================================

async function loadDashboard() {
  if (!state.token) {
    showScreen("loginScreen");
    return;
  }

  try {
    const response = await apiFetch("/dashboard");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to load dashboard.");
    }

    elements.dashboardAvg.textContent = `${data.metrics.averageScore}%`;
    elements.dashboardCompleted.textContent = data.metrics.quizzesCompleted;
    elements.dashboardHigh.textContent = `${data.metrics.highestScore}%`;

    elements.recentList.innerHTML = "";

    if (Array.isArray(data.recentQuizzes) && data.recentQuizzes.length) {
      data.recentQuizzes.forEach((quiz) => {
        const item = document.createElement("div");
        item.className = "option";
        item.style.cursor = "default";
        item.innerHTML = `<strong>${quiz.topic}</strong> — ${quiz.percentage}% on ${new Date(quiz.completedAt).toLocaleDateString()}`;
        elements.recentList.appendChild(item);
      });
    } else {
      elements.recentList.innerHTML = "<p>No recent quizzes yet.</p>";
    }
  } catch (error) {
    console.error(error);
    logoutUser();
  }
}

// ====================================
// QUIZ CREATION
// ====================================

async function createQuiz() {
  const syllabusText = elements.syllabusInput.value.trim();
  const topic = elements.topicInput.value.trim() || "General";
  const difficulty = elements.difficultyInput.value;
  const questionCount = parseNumber(elements.questionCountInput.value, 5);

  if (!syllabusText) {
    setMessage(elements.setupMessage, "Please paste syllabus or study material.", "error");
    return;
  }

  setMessage(elements.setupMessage, "Generating quiz, please wait...");

  try {
    const response = await apiFetch("/generate-quiz", {
      method: "POST",
      body: { syllabusText, difficulty, questionCount, topic }
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(elements.setupMessage, data.message || "Quiz generation failed.", "error");
      return;
    }

    state.quizData = data.questions || [];
    state.selectedAnswers = new Array(state.quizData.length).fill(null);
    state.currentQuestion = 0;
    state.score = 0;
    state.duration = 0;
    state.quizMeta = { difficulty, topic };

    if (state.quizData.length === 0) {
      setMessage(elements.setupMessage, "No questions were returned. Try a different input.", "error");
      return;
    }

    showScreen("quizScreen");
    renderQuestion();
    startTimer();
  } catch (error) {
    setMessage(elements.setupMessage, "Unable to generate quiz. Try again later.", "error");
    console.error(error);
  }
}

// ====================================
// QUIZ ENGINE
// ====================================

function renderQuestion() {
  if (!state.quizData.length) return;

  const current = state.quizData[state.currentQuestion];
  elements.questionCounter.textContent = `Question ${state.currentQuestion + 1} of ${state.quizData.length}`;
  elements.questionText.textContent = current.question || "Question text unavailable.";
  elements.optionsContainer.innerHTML = "";

  current.options.forEach((optionText, index) => {
    const option = document.createElement("div");
    option.className = "option";
    option.textContent = optionText;
    option.addEventListener("click", () => selectOption(index));
    if (state.selectedAnswers[state.currentQuestion] === index) {
      option.style.background = "linear-gradient(135deg,#7b2ff7,#ffd700)";
    }
    elements.optionsContainer.appendChild(option);
  });
}

function selectOption(index) {
  state.selectedAnswers[state.currentQuestion] = index;
  renderQuestion();
}

function nextQuestion() {
  if (state.currentQuestion < state.quizData.length - 1) {
    state.currentQuestion += 1;
    renderQuestion();
  }
}

function previousQuestion() {
  if (state.currentQuestion > 0) {
    state.currentQuestion -= 1;
    renderQuestion();
  }
}

async function submitQuiz() {
  stopTimer();

  if (!state.quizData.length) return;

  let correct = 0;
  state.quizData.forEach((question, index) => {
    if (state.selectedAnswers[index] === question.answer) {
      correct += 1;
    }
  });

  state.score = correct;
  const total = state.quizData.length;
  const percentage = Math.round((correct / total) * 100);

  await saveResults(correct, total, percentage, state.duration);

  elements.resultScore.textContent = `${percentage}%`;
  elements.resultGrade.textContent = calculateGrade(percentage);
  elements.resultSummary.textContent = `You answered ${correct} of ${total} questions correctly in ${state.duration} seconds.`;

  showScreen("resultsScreen");
}

// ====================================
// TIMER
// ====================================

function startTimer() {
  state.duration = 0;
  elements.timerValue.textContent = state.duration;
  clearInterval(state.interval);

  state.interval = setInterval(() => {
    state.duration += 1;
    elements.timerValue.textContent = state.duration;
  }, 1000);
}

function stopTimer() {
  clearInterval(state.interval);
}

// ====================================
// RESULTS
// ====================================

async function saveResults(score, total, percentage, duration) {
  if (!state.token) return;

  try {
    await apiFetch("/save-result", {
      method: "POST",
      body: {
        score,
        total,
        percentage,
        difficulty: state.quizMeta.difficulty,
        topic: state.quizMeta.topic,
        duration
      }
    });
  } catch (error) {
    console.error("Unable to save results:", error);
  }
}

// ====================================
// ANALYTICS
// ====================================

function calculateGrade(percentage) {
  if (percentage >= 90) return "Excellent";
  if (percentage >= 75) return "Great";
  if (percentage >= 50) return "Good";
  return "Keep Practicing";
}

// ====================================
// INITIALIZATION
// ====================================

function initializeApp() {
  state.token = getToken();
  state.user = localStorage.getItem("quizUser") ? JSON.parse(localStorage.getItem("quizUser")) : null;

  document.getElementById("loginButton").addEventListener("click", loginUser);
  document.getElementById("registerButton").addEventListener("click", registerUser);
  document.getElementById("showRegisterButton").addEventListener("click", () => showScreen("registerScreen"));
  document.getElementById("showLoginButton").addEventListener("click", () => showScreen("loginScreen"));
  document.getElementById("logoutButton").addEventListener("click", logoutUser);
  document.getElementById("generateQuizButton").addEventListener("click", () => showScreen("setupScreen"));
  document.getElementById("generateButton").addEventListener("click", createQuiz);
  const cancelSetupButton = document.getElementById("cancelSetupButton");
  if (cancelSetupButton) {
    cancelSetupButton.addEventListener("click", () => showScreen("dashboardScreen"));
  }
  document.getElementById("prevQuestionButton").addEventListener("click", previousQuestion);
  document.getElementById("nextQuestionButton").addEventListener("click", nextQuestion);
  document.getElementById("submitQuizButton").addEventListener("click", submitQuiz);
  document.getElementById("backToDashboardButton").addEventListener("click", () => showScreen("dashboardScreen"));

  if (state.token) {
    showScreen("dashboardScreen");
  } else {
    showScreen("loginScreen");
  }
}

document.addEventListener("DOMContentLoaded", initializeApp);
