// js/dashboard.js
import { auth } from './config/firebase.js';
import AuthService from './services/auth.service.js';
import EventService from './services/event.service.js';
import { 
  showToast, 
  showLoading, 
  hideLoading, 
  confirmDialog,
  formatMoney,
  formatDate,
  validateRequired,
  debounce
} from './utils/helpers.js';

let currentUser = null;
let isAdmin = false;
let allEvents = [];
let unsubscribe = null;

// ========== INIT ==========
async function init() {
  showLoading();
  
  // Check auth
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = await AuthService.getCurrentUserData();
    isAdmin = currentUser.role === 'admin';
    
    // Update UI
    document.getElementById('userName').textContent = currentUser.displayName || currentUser.email;
    const roleEl = document.getElementById('userRole');
    roleEl.textContent = isAdmin ? 'Admin' : 'User';
    if (isAdmin) {
      roleEl.classList.add('admin');
      document.getElementById('adminBtn').style.display = 'block';
    }
    
    // Load events
    loadEvents();
    
    hideLoading();
  });
}

// ========== LOAD EVENTS ==========
function loadEvents() {
  // Unsubscribe previous listener
  if (unsubscribe) unsubscribe();
  
  // Listen to real-time updates
  unsubscribe = EventService.listenToEvents(currentUser.uid, isAdmin, (events) => {
    allEvents = events;
    renderEvents(events);
    updateStats(events);
  });
}

// ========== RENDER EVENTS ==========
function renderEvents(events) {
  const eventsGrid = document.getElementById('eventsGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (events.length === 0) {
    eventsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  eventsGrid.style.display = 'grid';
  emptyState.style.display = 'none';
  
  eventsGrid.innerHTML = events.map(event => `
    <div class="event-card" onclick="goToEventDetail('${event.id}')">
      <div class="event-card-header">
        <div>
          <div class="event-card-title">${event.name}</div>
          <div class="event-card-date">📅 ${formatDate(event.date)}</div>
        </div>
        <div class="event-card-actions" onclick="event.stopPropagation()">
          <button onclick="deleteEvent('${event.id}')" title="Xóa">🗑️</button>
        </div>
      </div>
      
      <div class="event-card-stats">
        <div class="event-stat">
          <div class="event-stat-label">Thu</div>
          <div class="event-stat-value income">${formatMoney(event.totalIncome || 0)}</div>
        </div>
        <div class="event-stat">
          <div class="event-stat-label">Chi</div>
          <div class="event-stat-value expense">${formatMoney(event.totalExpense || 0)}</div>
        </div>
        <div class="event-stat">
          <div class="event-stat-label">Dư</div>
          <div class="event-stat-value balance">${formatMoney(event.balance || 0)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ========== UPDATE STATS ==========
function updateStats(events) {
  const totalEvents = events.length;
  const totalIncome = events.reduce((sum, e) => sum + (e.totalIncome || 0), 0);
  const totalExpense = events.reduce((sum, e) => sum + (e.totalExpense || 0), 0);
  const totalBalance = totalIncome - totalExpense;
  
  document.getElementById('totalEvents').textContent = totalEvents;
  document.getElementById('totalIncome').textContent = formatMoney(totalIncome);
  document.getElementById('totalExpense').textContent = formatMoney(totalExpense);
  document.getElementById('totalBalance').textContent = formatMoney(totalBalance);
}

// ========== SEARCH EVENTS ==========
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', debounce((e) => {
  const searchTerm = e.target.value.toLowerCase();
  
  if (!searchTerm) {
    renderEvents(allEvents);
    return;
  }
  
  const filtered = allEvents.filter(event => 
    event.name.toLowerCase().includes(searchTerm)
  );
  
  renderEvents(filtered);
}, 300));

// ========== CREATE EVENT ==========
const createEventBtn = document.getElementById('createEventBtn');
const createEventModal = document.getElementById('createEventModal');
const createEventForm = document.getElementById('createEventForm');

createEventBtn.addEventListener('click', () => {
  createEventModal.style.display = 'flex';
  document.getElementById('eventName').value = '';
  document.getElementById('eventDate').value = '';
});

window.closeCreateModal = () => {
  createEventModal.style.display = 'none';
};

createEventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const nameInput = document.getElementById('eventName');
  const dateInput = document.getElementById('eventDate');
  const nameError = document.getElementById('eventNameError');
  const dateError = document.getElementById('eventDateError');
  
  // Reset errors
  nameError.textContent = '';
  dateError.textContent = '';
  nameInput.classList.remove('error');
  dateInput.classList.remove('error');
  
  // Validate
  const name = nameInput.value.trim();
  const date = dateInput.value;
  
  let hasError = false;
  
  if (!validateRequired(name)) {
    nameError.textContent = 'Vui lòng nhập tên sự kiện';
    nameInput.classList.add('error');
    hasError = true;
  }
  
  if (!date) {
    dateError.textContent = 'Vui lòng chọn ngày';
    dateInput.classList.add('error');
    hasError = true;
  }
  
  if (hasError) return;
  
  // Create event
  showLoading();
  
  const result = await EventService.createEvent({
    name,
    date,
    ownerId: currentUser.uid
  });
  
  hideLoading();
  
  if (result.success) {
    showToast('Tạo sự kiện thành công!', 'success');
    closeCreateModal();
  } else {
    showToast('Tạo sự kiện thất bại: ' + result.error, 'error');
  }
});

// ========== DELETE EVENT ==========
window.deleteEvent = async (eventId) => {
  const confirmed = await confirmDialog('Bạn có chắc muốn xóa sự kiện này? Tất cả dữ liệu sẽ bị mất vĩnh viễn!');
  
  if (!confirmed) return;
  
  showLoading();
  
  const result = await EventService.deleteEvent(eventId);
  
  hideLoading();
  
  if (result.success) {
    showToast('Xóa sự kiện thành công!', 'success');
  } else {
    showToast('Xóa sự kiện thất bại: ' + result.error, 'error');
  }
};

// ========== GO TO EVENT DETAIL ==========
window.goToEventDetail = (eventId) => {
  window.location.href = `event-detail.html?id=${eventId}`;
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

// ========== ADMIN PANEL ==========
document.getElementById('adminBtn').addEventListener('click', () => {
  window.location.href = 'admin.html';
});

// ========== START APP ==========
init();
