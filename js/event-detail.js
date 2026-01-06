// js/event-detail.js
import { auth } from './config/firebase.js';
import AuthService from './services/auth.service.js';
import EventService from './services/event.service.js';
import TransactionService from './services/transaction.service.js';
import { 
  showToast, 
  showLoading, 
  hideLoading, 
  confirmDialog,
  formatMoney,
  formatDate,
  validateRequired,
  validateNumber,
  debounce
} from './utils/helpers.js';

let currentUser = null;
let currentEvent = null;
let allTransactions = [];
let eventId = null;
let unsubscribeEvent = null;
let unsubscribeTransactions = null;
let editingTransactionId = null;

// ========== INIT ==========
async function init() {
  showLoading();
  
  // Get event ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  eventId = urlParams.get('id');
  
  if (!eventId) {
    showToast('Không tìm thấy sự kiện', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
    return;
  }
  
  // Check auth
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = await AuthService.getCurrentUserData();
    
    // Update UI
    document.getElementById('userName').textContent = currentUser.displayName || currentUser.email;
    
    // Load event & transactions
    await loadEventData();
    
    hideLoading();
  });
}

// ========== LOAD EVENT DATA ==========
async function loadEventData() {
  // Load event info
  unsubscribeEvent = EventService.listenToEvent(eventId, (event) => {
    if (!event) {
      showToast('Không tìm thấy sự kiện', 'error');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
      return;
    }
    
    currentEvent = event;
    renderEventInfo(event);
  });
  
  // Load transactions
  unsubscribeTransactions = TransactionService.listenToTransactions(eventId, (transactions) => {
    allTransactions = transactions;
    renderTransactions(transactions);
  });
}

// ========== RENDER EVENT INFO ==========
function renderEventInfo(event) {
  document.getElementById('eventTitle').textContent = event.name;
  document.getElementById('eventName').textContent = event.name;
  document.getElementById('eventDate').textContent = '📅 ' + formatDate(event.date);
  document.getElementById('totalIncome').textContent = formatMoney(event.totalIncome || 0);
  document.getElementById('totalExpense').textContent = formatMoney(event.totalExpense || 0);
  document.getElementById('balance').textContent = formatMoney(event.balance || 0);
}

// ========== RENDER TRANSACTIONS ==========
function renderTransactions(transactions) {
  const transactionsList = document.getElementById('transactionsList');
  const emptyState = document.getElementById('emptyTransactions');
  
  if (transactions.length === 0) {
    transactionsList.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  transactionsList.style.display = 'flex';
  emptyState.style.display = 'none';
  
  transactionsList.innerHTML = transactions.map(transaction => {
    const typeLabel = transaction.type === 'income' ? 'Thu' : 'Chi';
    const amountPrefix = transaction.type === 'income' ? '+' : '-';
    
    return `
      <div class="transaction-item ${transaction.type}">
        <div class="transaction-info">
          <div class="transaction-header">
            <span class="transaction-type-badge ${transaction.type}">${typeLabel}</span>
            <span class="transaction-title">${transaction.title}</span>
          </div>
          <div class="transaction-meta">
            <span>📅 ${formatDate(transaction.date)}</span>
            ${transaction.note ? `<span>💬 Có ghi chú</span>` : ''}
          </div>
          ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="transaction-amount ${transaction.type}">
            ${amountPrefix}${formatMoney(transaction.amount)}
          </div>
          <div class="transaction-actions">
            <button onclick="editTransaction('${transaction.id}')" title="Sửa">✏️</button>
            <button onclick="deleteTransaction('${transaction.id}')" title="Xóa">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ========== FILTER TRANSACTIONS ==========
const searchInput = document.getElementById('searchTransaction');
const filterType = document.getElementById('filterType');
const filterStartDate = document.getElementById('filterStartDate');
const filterEndDate = document.getElementById('filterEndDate');
const resetFilterBtn = document.getElementById('resetFilterBtn');

function applyFilters() {
  const filters = {
    searchTerm: searchInput.value.trim(),
    type: filterType.value,
    startDate: filterStartDate.value,
    endDate: filterEndDate.value
  };
  
  const filtered = TransactionService.filterTransactions(allTransactions, filters);
  renderTransactions(filtered);
}

searchInput.addEventListener('input', debounce(applyFilters, 300));
filterType.addEventListener('change', applyFilters);
filterStartDate.addEventListener('change', applyFilters);
filterEndDate.addEventListener('change', applyFilters);

resetFilterBtn.addEventListener('click', () => {
  searchInput.value = '';
  filterType.value = 'all';
  filterStartDate.value = '';
  filterEndDate.value = '';
  renderTransactions(allTransactions);
});

// ========== ADD TRANSACTION ==========
const addTransactionBtn = document.getElementById('addTransactionBtn');
const transactionModal = document.getElementById('transactionModal');
const transactionForm = document.getElementById('transactionForm');

addTransactionBtn.addEventListener('click', () => {
  editingTransactionId = null;
  document.getElementById('modalTitle').textContent = 'Thêm giao dịch';
  document.getElementById('submitBtn').textContent = 'Thêm giao dịch';
  
  // Reset form
  transactionForm.reset();
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('transactionDate').value = today;
  
  transactionModal.style.display = 'flex';
});

window.closeTransactionModal = () => {
  transactionModal.style.display = 'none';
  editingTransactionId = null;
};

// ========== EDIT TRANSACTION ==========
window.editTransaction = async (transactionId) => {
  editingTransactionId = transactionId;
  
  const transaction = allTransactions.find(t => t.id === transactionId);
  if (!transaction) return;
  
  // Update modal title
  document.getElementById('modalTitle').textContent = 'Sửa giao dịch';
  document.getElementById('submitBtn').textContent = 'Cập nhật';
  
  // Fill form
  document.getElementById('transactionTitle').value = transaction.title;
  document.getElementById('transactionType').value = transaction.type;
  document.getElementById('transactionAmount').value = transaction.amount;
  document.getElementById('transactionDate').value = new Date(transaction.date).toISOString().split('T')[0];
  document.getElementById('transactionNote').value = transaction.note || '';
  
  transactionModal.style.display = 'flex';
};

// ========== DELETE TRANSACTION ==========
window.deleteTransaction = async (transactionId) => {
  const confirmed = await confirmDialog('Bạn có chắc muốn xóa giao dịch này?');
  if (!confirmed) return;
  
  showLoading();
  
  const result = await TransactionService.deleteTransaction(eventId, transactionId);
  
  hideLoading();
  
  if (result.success) {
    showToast('Xóa giao dịch thành công!', 'success');
  } else {
    showToast('Xóa giao dịch thất bại: ' + result.error, 'error');
  }
};

// ========== SUBMIT TRANSACTION FORM ==========
transactionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get form values
  const titleInput = document.getElementById('transactionTitle');
  const typeInput = document.getElementById('transactionType');
  const amountInput = document.getElementById('transactionAmount');
  const dateInput = document.getElementById('transactionDate');
  const noteInput = document.getElementById('transactionNote');
  
  // Get error elements
  const titleError = document.getElementById('titleError');
  const typeError = document.getElementById('typeError');
  const amountError = document.getElementById('amountError');
  const dateError = document.getElementById('dateError');
  
  // Reset errors
  titleError.textContent = '';
  typeError.textContent = '';
  amountError.textContent = '';
  dateError.textContent = '';
  
  titleInput.classList.remove('error');
  typeInput.classList.remove('error');
  amountInput.classList.remove('error');
  dateInput.classList.remove('error');
  
  // Validate
  const title = titleInput.value.trim();
  const type = typeInput.value;
  const amount = amountInput.value;
  const date = dateInput.value;
  const note = noteInput.value.trim();
  
  let hasError = false;
  
  if (!validateRequired(title)) {
    titleError.textContent = 'Vui lòng nhập tên giao dịch';
    titleInput.classList.add('error');
    hasError = true;
  }
  
  if (!type) {
    typeError.textContent = 'Vui lòng chọn loại giao dịch';
    typeInput.classList.add('error');
    hasError = true;
  }
  
  if (!validateNumber(amount)) {
    amountError.textContent = 'Số tiền phải lớn hơn 0';
    amountInput.classList.add('error');
    hasError = true;
  }
  
  if (!date) {
    dateError.textContent = 'Vui lòng chọn ngày';
    dateInput.classList.add('error');
    hasError = true;
  }
  
  if (hasError) return;
  
  // Submit
  showLoading();
  
  const transactionData = {
    title,
    type,
    amount,
    date,
    note
  };
  
  let result;
  
  if (editingTransactionId) {
    // Update
    result = await TransactionService.updateTransaction(eventId, editingTransactionId, transactionData);
  } else {
    // Create
    result = await TransactionService.addTransaction(eventId, transactionData);
  }
  
  hideLoading();
  
  if (result.success) {
    showToast(
      editingTransactionId ? 'Cập nhật giao dịch thành công!' : 'Thêm giao dịch thành công!',
      'success'
    );
    closeTransactionModal();
  } else {
    showToast('Lỗi: ' + result.error, 'error');
  }
});

// ========== NAVIGATION ==========
window.goBack = () => {
  window.location.href = 'dashboard.html';
};

// ========== LOGOUT ==========
document.getElementById('logoutBtn').addEventListener('click', async () => {
  const confirmed = await confirmDialog('Bạn có chắc muốn đăng xuất?');
  if (!confirmed) return;
  
  showLoading();
  const result = await AuthService.logout();
  hideLoading();
  
  if (result.success) {
    window.location.href = 'login.html';
  } else {
    showToast('Đăng xuất thất bại', 'error');
  }
});

// ========== CLEANUP ==========
window.addEventListener('beforeunload', () => {
  if (unsubscribeEvent) unsubscribeEvent();
  if (unsubscribeTransactions) unsubscribeTransactions();
});

// ========== START APP ==========
init();
