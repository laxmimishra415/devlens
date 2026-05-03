const API = 'http://localhost:3000/api';
let token = localStorage.getItem('token');
let editor;

// CodeMirror Editor initialize
window.onload = () => {
  editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    lineNumbers: true,
    theme: 'dracula',
    mode: 'javascript',
    indentUnit: 2,
    autoCloseBrackets: true,
  });

  if (token) {
    showApp();
  }
};

// Language change
document.getElementById('language-select').addEventListener('change', (e) => {
  const modeMap = {
    javascript: 'javascript',
    python: 'python',
    java: 'text/x-java',
    cpp: 'text/x-c++src',
    sql: 'sql'
  };
  editor.setOption('mode', modeMap[e.target.value]);
});

// Auth tabs
function showTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
  });
  // Clear errors on tab switch
  document.getElementById('login-error').textContent = '';
  document.getElementById('reg-error').textContent = '';
}

// ===== VALIDATION FUNCTIONS =====

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  return errors;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.color = '#ef4444';
}

function showSuccess(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.color = '#10b981';
}

// Password strength indicator
document.getElementById('reg-password').addEventListener('input', (e) => {
  const password = e.target.value;
  const indicator = document.getElementById('password-strength');
  
  if (password.length === 0) {
    indicator.textContent = '';
    return;
  }

  const errors = validatePassword(password);
  if (errors.length === 0) {
    indicator.textContent = '✅ Strong password';
    indicator.style.color = '#10b981';
  } else if (password.length >= 6) {
    indicator.textContent = '⚠️ Medium — Missing: ' + errors.join(', ');
    indicator.style.color = '#f59e0b';
  } else {
    indicator.textContent = '❌ Weak — Missing: ' + errors.join(', ');
    indicator.style.color = '#ef4444';
  }
});

// ===== REGISTER =====
async function register() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  // Validations
  if (!name) {
    showError('reg-error', '❌ Name is required');
    return;
  }
  if (name.length < 2) {
    showError('reg-error', '❌ Name must be at least 2 characters');
    return;
  }
  if (!validateEmail(email)) {
    showError('reg-error', '❌ Please enter a valid email address');
    return;
  }
  const pwErrors = validatePassword(password);
  if (pwErrors.length > 0) {
    showError('reg-error', '❌ Password needs: ' + pwErrors.join(', '));
    return;
  }

  // Button loading state
  const btn = document.querySelector('#register-form button');
  btn.textContent = 'Creating account...';
  btn.disabled = true;

  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();
  btn.textContent = 'Register';
  btn.disabled = false;

  if (res.ok) {
    token = data.token;
    localStorage.setItem('token', token);
    localStorage.setItem('userName', data.user.name);
    showApp();
  } else {
    if (data.error.includes('already')) {
      showError('reg-error', '❌ Email already registered — please Login instead');
      // Auto switch to login after 2 seconds
      setTimeout(() => showTab('login'), 2000);
    } else {
      showError('reg-error', '❌ ' + data.error);
    }
  }
}

// ===== LOGIN =====
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  // Validations
  if (!validateEmail(email)) {
    showError('login-error', '❌ Please enter a valid email address');
    return;
  }
  if (!password) {
    showError('login-error', '❌ Password is required');
    return;
  }

  // Button loading state
  const btn = document.querySelector('#login-form button');
  btn.textContent = 'Logging in...';
  btn.disabled = true;

  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  btn.textContent = 'Login';
  btn.disabled = false;

  if (res.ok) {
    token = data.token;
    localStorage.setItem('token', token);
    localStorage.setItem('userName', data.user.name);
    showApp();
  } else {
    if (data.error.includes('Invalid')) {
      showError('login-error', '❌ Wrong email or password — not registered? Click Register');
    } else {
      showError('login-error', '❌ ' + data.error);
    }
  }
}

// Logout
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  token = null;
  document.getElementById('auth-section').style.display = 'flex';
  document.getElementById('app-section').style.display = 'none';
}

// App dikhao
function showApp() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'block';
  document.getElementById('user-name').textContent =
    localStorage.getItem('userName') || 'User';
}

// Code Review
async function reviewCode() {
  const code = editor.getValue();
  const language = document.getElementById('language-select').value;

  if (!code.trim()) {
    alert('Please enter some code to review!');
    return;
  }

  document.getElementById('loading').style.display = 'block';
  document.getElementById('review-results').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('review-btn').disabled = true;

  try {
    const res = await fetch(`${API}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code, language })
    });

    const data = await res.json();

    if (res.ok) {
      displayReview(data.review);
    } else {
      alert('Review failed: ' + data.error);
    }
  } catch (err) {
    alert('Server error: ' + err.message);
  } finally {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('review-btn').disabled = false;
  }
}

// Review results dikhao
function displayReview(review) {
  document.getElementById('review-results').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';

  const fillList = (id, items) => {
    const ul = document.getElementById(id);
    ul.innerHTML = '';
    if (items.length === 0) {
      ul.innerHTML = '<li>✅ No issues found</li>';
    } else {
      items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
    }
  };

  fillList('bugs-list', review.bugs);
  fillList('performance-list', review.performance);
  fillList('security-list', review.security);
  fillList('suggestions-list', review.suggestions);
}