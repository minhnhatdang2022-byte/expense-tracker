// js/login.js
import AuthService from './services/auth.service.js';
import { showToast, showLoading, hideLoading, validateEmail } from './utils/helpers.js';

// Kiểm tra nếu đã đăng nhập thì redirect
AuthService.onAuthChange((user) => {
  if (user) {
    window.location.href = 'dashboard.html';
  }
});

// Xử lý form login
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Reset errors
  emailError.textContent = '';
  passwordError.textContent = '';
  emailInput.classList.remove('error');
  passwordInput.classList.remove('error');
  
  // Validate
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  let hasError = false;
  
  if (!validateEmail(email)) {
    emailError.textContent = 'Email không hợp lệ';
    emailInput.classList.add('error');
    hasError = true;
  }
  
  if (password.length < 6) {
    passwordError.textContent = 'Mật khẩu phải có ít nhất 6 ký tự';
    passwordInput.classList.add('error');
    hasError = true;
  }
  
  if (hasError) return;
  
  // Login
  showLoading();
  
  const result = await AuthService.login(email, password);
  
  hideLoading();
  
  if (result.success) {
    showToast('Đăng nhập thành công!', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  } else {
    let errorMessage = 'Đăng nhập thất bại';
    
    if (result.error.includes('invalid-credential') || result.error.includes('user-not-found')) {
      errorMessage = 'Email hoặc mật khẩu không đúng';
    } else if (result.error.includes('wrong-password')) {
      errorMessage = 'Mật khẩu không đúng';
    } else if (result.error.includes('too-many-requests')) {
      errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau';
    }
    
    showToast(errorMessage, 'error');
  }
});
