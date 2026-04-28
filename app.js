/* ============================================================
   Digital Electronics Study Guide — App Logic
   Quiz engine, progress tracking, sidebar nav
   ============================================================ */

// ============================================================
// QUIZ DATA (FROM HTML)
// ============================================================
function loadQuizData() {
  const dataEl = document.getElementById('quiz-data');
  if (!dataEl) return {};

  try {
    const parsed = JSON.parse(dataEl.textContent || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('Failed to parse quiz data from HTML:', err);
    return {};
  }
}

const QUIZZES = loadQuizData();

// ============================================================
// STATE
// ============================================================
let totalQuestions = 0;
let answeredCorrect = 0;
const sectionScores = {};

// ============================================================
// RENDER QUIZZES
// ============================================================
function renderAllQuizzes() {
  for (const [sectionId, questions] of Object.entries(QUIZZES)) {
    const container = document.getElementById(`quiz-${sectionId}`);
    if (!container) continue;

    totalQuestions += questions.length;
    sectionScores[sectionId] = { correct: 0, total: questions.length, checked: false };

    questions.forEach((q, qi) => {
      const qDiv = document.createElement('div');
      qDiv.className = 'quiz-q';
      qDiv.id = `q-${sectionId}-${qi}`;

      const optionsHtml = q.opts.map((opt, oi) => `
        <label class="quiz-option" id="opt-${sectionId}-${qi}-${oi}">
          <input type="radio" name="q-${sectionId}-${qi}" value="${oi}" />
          ${opt}
        </label>
      `).join('');

      qDiv.innerHTML = `
        <p>Q${qi + 1}. ${q.q}</p>
        <div class="quiz-options">${optionsHtml}</div>
        <div class="q-exp" id="exp-${sectionId}-${qi}" style="display:none; margin-top:8px; padding:8px 12px; background:rgba(240,165,0,0.07); border-left:3px solid #f0a500; font-size:12px; color:#c8d0e0; border-radius:0 3px 3px 0;"></div>
      `;

      container.appendChild(qDiv);
    });
  }
}

// ============================================================
// CHECK QUIZ
// ============================================================
function checkQuiz(sectionId) {
  const questions = QUIZZES[sectionId];
  if (!questions) return;

  let correct = 0;

  questions.forEach((q, qi) => {
    const selected = document.querySelector(`input[name="q-${sectionId}-${qi}"]:checked`);
    const expDiv = document.getElementById(`exp-${sectionId}-${qi}`);

    // Mark all options
    q.opts.forEach((_, oi) => {
      const label = document.getElementById(`opt-${sectionId}-${qi}-${oi}`);
      label.classList.remove('correct-ans', 'wrong-ans');

      if (oi === q.ans) {
        label.classList.add('correct-ans');
      } else if (selected && parseInt(selected.value) === oi) {
        label.classList.add('wrong-ans');
      }

      // Disable radio
      const radio = label.querySelector('input');
      if (radio) radio.disabled = true;
    });

    // Explanation
    if (expDiv) {
      expDiv.style.display = 'block';
      expDiv.textContent = `→ ${q.exp}`;
    }

    if (selected && parseInt(selected.value) === q.ans) {
      correct++;
    }
  });

  const resultDiv = document.getElementById(`result-${sectionId}`);
  const pct = Math.round((correct / questions.length) * 100);

  if (resultDiv) {
    resultDiv.textContent = `Score: ${correct}/${questions.length} (${pct}%)  ${pct >= 80 ? '— Well done!' : pct >= 60 ? '— Keep revising.' : '— Review this section.'}`;
    resultDiv.className = `quiz-result ${pct >= 70 ? 'pass' : 'fail'}`;
  }

  // Update progress
  if (!sectionScores[sectionId].checked) {
    answeredCorrect += correct;
    sectionScores[sectionId].correct = correct;
    sectionScores[sectionId].checked = true;
    updateProgress();
  }

  // Disable check button
  const btn = document.querySelector(`#q-${sectionId} .btn-check`) ||
              document.querySelector(`[onclick="checkQuiz('${sectionId}')"]`);
  if (btn) {
    btn.textContent = 'Checked ✓';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'default';
  }
}

// ============================================================
// PROGRESS
// ============================================================
function updateProgress() {
  const total = totalQuestions;
  const correct = answeredCorrect;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const fill = document.getElementById('progress-fill');
  const label = document.getElementById('pct');

  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = pct + '%';
}

// ============================================================
// SIDEBAR NAV — ACTIVE STATE ON SCROLL
// ============================================================
function initScrollSpy() {
  const sections = document.querySelectorAll('.topic-section[id]');
  const navItems = document.querySelectorAll('.nav-item');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navItems.forEach(item => {
          item.classList.toggle('active', item.dataset.section === id);
        });
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach(s => observer.observe(s));
}

// ============================================================
// SIDEBAR TOGGLE (MOBILE)
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
}

// Close sidebar on nav link click (mobile)
document.addEventListener('click', (e) => {
  const link = e.target.closest('.nav-item');
  if (link && window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
});

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('sidebar').classList.remove('open');
  }
});

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  renderAllQuizzes();
  initScrollSpy();
  updateProgress();

  // Console easter egg for embedded engineers
  console.log('%c[0x00] Digital Electronics Study Guide Loaded', 'color:#f0a500; font-family:monospace; font-size:14px;');
  console.log('%c[0x01] QUIZZES: ' + Object.keys(QUIZZES).length + ' sections, ' +
    Object.values(QUIZZES).reduce((a, b) => a + b.length, 0) + ' questions',
    'color:#3fc67a; font-family:monospace; font-size:12px;');
});