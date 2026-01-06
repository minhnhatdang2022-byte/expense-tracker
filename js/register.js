// js/register.js
import AuthService from './services/auth.service.js';
import { showToast, showLoading, hideLoading, validateEmail, validateRequired } from './utils/helpers.js';

// Kiểm tra nếu đã đăng nhập thì redirect
AuthService.onAuthChange((user) => {
  if (user) {
    window.location.href = 'dashboard.html';
  }
});

// Xử lý form register
const registerForm = document.getElementById('registerForm');
const displayNameInput = document.getElementById('displayName');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');

const displayNameError = document.getElementById('displayNameError');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Reset errors
  displayNameError.textContent = '';
  emailError.textContent = '';
  passwordError.textContent = '';
  confirmPasswordError.textContent = '';
  
  displayNameInput.classList.remove('error');
  emailInput.classList.remove('error');
  passwordInput.classList.remove('error');
  confirmPasswordInput.classList.remove('error');
  
  // Validate
  const displayName = displayNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  let hasError = false;
  
  if (!validateRequired(displayName)) {
    displayNameError.textContent = 'Vui lòng nhập họ tên';
    displayNameInput.classList.add('error');
    hasError = true;
  }
  
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
  
  if (password !== confirmPassword) {
    confirmPasswordError.textContent = 'Mật khẩu xác nhận không khớp';
    confirmPasswordInput.classList.add('error');
    hasError = true;
  }
  
  if (hasError) return;
  
  // Register
  showLoading();
  
  const result = await AuthService.register(email, password, displayName);
  
  hideLoading();
  
  if (result.success) {
    showToast('Đăng ký thành công!', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  } else {
    let errorMessage = 'Đăng ký thất bại';
    
    if (result.error.includes('email-already-in-use')) {
      errorMessage = 'Email đã được sử dụng';
      emailInput.classList.add('error');
    } else if (result.error.includes('invalid-email')) {
      errorMessage = 'Email không hợp lệ';
      emailInput.classList.add('error');
    } else if (result.error.includes('weak-password')) {
      errorMessage = 'Mật khẩu quá yếu';
      passwordInput.classList.add('error');
    }
    
    showToast(errorMessage, 'error');
  }
});
