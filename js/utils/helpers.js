// js/utils/helpers.js

// ========== FORMAT TIỀN ==========
export function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

// ========== FORMAT NGÀY ==========
export function formatDate(timestamp) {
  if (!timestamp) return '';
  
  // Realtime DB trả về ISO string
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '';
  
  // Realtime DB trả về ISO string
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// ========== HIỂN THỊ TOAST/NOTIFICATION ==========
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Hiện toast
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Ẩn sau 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== LOADING SPINNER ==========
export function showLoading() {
  const loader = document.createElement('div');
  loader.id = 'global-loader';
  loader.innerHTML = `
    <div class="loader-backdrop">
      <div class="spinner"></div>
    </div>
  `;
  document.body.appendChild(loader);
}

export function hideLoading() {
  const loader = document.getElementById('global-loader');
  if (loader) loader.remove();
}

// ========== CONFIRM DIALOG ==========
export function confirmDialog(message) {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
      <div class="dialog-backdrop">
        <div class="dialog-content">
          <p>${message}</p>
          <div class="dialog-actions">
            <button class="btn btn-secondary" id="cancelBtn">Hủy</button>
            <button class="btn btn-danger" id="confirmBtn">Xác nhận</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('#confirmBtn').onclick = () => {
      dialog.remove();
      resolve(true);
    };
    
    dialog.querySelector('#cancelBtn').onclick = () => {
      dialog.remove();
      resolve(false);
    };
  });
}

// ========== VALIDATE FORM ==========
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password) {
  return password.length >= 6;
}

export function validateRequired(value) {
  return value && value.trim() !== '';
}

export function validateNumber(value) {
  return !isNaN(parseFloat(value)) && parseFloat(value) > 0;
}

// ========== CHECK AUTH ==========
export function redirectIfNotAuth() {
  // Hàm này sẽ được gọi từ các page cần auth
  // Nếu không có user → redirect về login
  import('../config/firebase.js').then(({ auth }) => {
    if (!auth.currentUser) {
      window.location.href = '/login.html';
    }
  });
}

// ========== TRUNCATE TEXT ==========
export function truncate(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// ========== GET RELATIVE TIME ==========
export function getRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 30) return `${diffDays} ngày trước`;
  return formatDate(date);
}

// ========== DEBOUNCE ==========
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
