// js/admin.js
import { auth, db } from './config/firebase.js';
import AuthService from './services/auth.service.js';
import EventService from './services/event.service.js';
import { 
  showToast, 
  showLoading, 
  hideLoading, 
  confirmDialog,
  formatMoney,
  formatDate,
  formatDateTime,
  debounce
} from './utils/helpers.js';
import {
  ref,
  get,
  update,
  query,
  orderByChild
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

let currentUser = null;
let allUsers = [];
let allEvents = [];
let selectedUserId = null;

// ========== INIT ==========
async function init() {
  showLoading();
  
  // Check auth & admin
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = await AuthService.getCurrentUserData();
    
    // Check if admin
    if (currentUser.role !== 'admin') {
      showToast('Bạn không có quyền truy cập trang này', 'error');
      setTimeout(() => window.location.href = 'dashboard.html', 1500);
      return;
    }
    
    // Update UI
    document.getElementById('userName').textContent = currentUser.displayName || currentUser.email;
    
    // Load data
    await loadAllData();
    
    hideLoading();
  });
}

// ========== LOAD ALL DATA ==========
async function loadAllData() {
  await Promise.all([
    loadUsers(),
    loadEvents()
  ]);
  
  updateGlobalStats();
}

// ========== LOAD USERS ==========
async function loadUsers() {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    allUsers = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        allUsers.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
    }
    
    // Sort by createdAt desc
    allUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    renderUsers(allUsers);
    updateFilterOwner();
  } catch (error) {
    console.error('Error loading users:', error);
    showToast('Lỗi tải danh sách người dùng', 'error');
  }
}

// ========== RENDER USERS ==========
function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có người dùng nào</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(user => {
    const userEvents = allEvents.filter(e => e.ownerId === user.id);
    const eventCount = userEvents.length;
    
    return `
      <tr>
        <td>${user.displayName || 'N/A'}</td>
        <td>${user.email}</td>
        <td>
          <span class="user-badge ${user.role}">${user.role.toUpperCase()}</span>
        </td>
        <td>${eventCount}</td>
        <td>${user.createdAt ? formatDateTime(user.createdAt) : 'N/A'}</td>
        <td class="table-actions">
          <button class="btn btn-sm btn-secondary" onclick="changeRole('${user.id}', '${user.displayName || user.email}', '${user.role}')">
            Đổi role
          </button>
          <button class="btn btn-sm btn-primary" onclick="viewUserEvents('${user.id}')">
            Xem sự kiện
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ========== LOAD EVENTS ==========
async function loadEvents() {
  const result = await EventService.getEvents(null, true);
  
  if (result.success) {
    allEvents = result.events;
    renderEvents(allEvents);
  } else {
    showToast('Lỗi tải danh sách sự kiện', 'error');
  }
}

// ========== RENDER EVENTS ==========
function renderEvents(events) {
  const eventsGrid = document.getElementById('eventsGrid');
  const emptyState = document.getElementById('emptyEvents');
  
  if (events.length === 0) {
    eventsGrid.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  eventsGrid.style.display = 'grid';
  emptyState.style.display = 'none';
  
  eventsGrid.innerHTML = events.map(event => {
    const owner = allUsers.find(u => u.id === event.ownerId);
    const ownerName = owner ? (owner.displayName || owner.email) : 'Unknown';
    
    return `
      <div class="event-card" onclick="goToEventDetail('${event.id}')">
        <div class="event-card-header">
          <div>
            <div class="event-card-title">${event.name}</div>
            <div class="event-card-date">📅 ${formatDate(event.date)}</div>
            <div class="event-owner">
              <span>👤</span>
              <span class="event-owner-name">${ownerName}</span>
            </div>
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
    `;
  }).join('');
}

// ========== UPDATE GLOBAL STATS ==========
function updateGlobalStats() {
  const totalUsers = allUsers.length;
  const totalEvents = allEvents.length;
  const totalIncome = allEvents.reduce((sum, e) => sum + (e.totalIncome || 0), 0);
  const totalExpense = allEvents.reduce((sum, e) => sum + (e.totalExpense || 0), 0);
  
  document.getElementById('totalUsers').textContent = totalUsers;
  document.getElementById('totalEvents').textContent = totalEvents;
  document.getElementById('totalIncome').textContent = formatMoney(totalIncome);
  document.getElementById('totalExpense').textContent = formatMoney(totalExpense);
}

// ========== UPDATE FILTER OWNER ==========
function updateFilterOwner() {
  const filterOwner = document.getElementById('filterOwner');
  
  const options = allUsers.map(user => 
    `<option value="${user.id}">${user.displayName || user.email}</option>`
  ).join('');
  
  filterOwner.innerHTML = '<option value="all">Tất cả người dùng</option>' + options;
}

// ========== SEARCH USERS ==========
const searchUserInput = document.getElementById('searchUser');

const handleUserSearch = debounce((searchTerm) => {
  if (!searchTerm) {
    renderUsers(allUsers);
    return;
  }
  
  const filtered = allUsers.filter(user => 
    (user.displayName && user.displayName.toLowerCase().includes(searchTerm)) ||
    user.email.toLowerCase().includes(searchTerm)
  );
  
  renderUsers(filtered);
}, 300);

searchUserInput.addEventListener('input', (e) => {
  handleUserSearch(e.target.value.toLowerCase());
});

// ========== SEARCH EVENTS ==========
const searchEventInput = document.getElementById('searchEvent');

const handleEventSearch = debounce(() => {
  applyEventFilters();
}, 300);

searchEventInput.addEventListener('input', handleEventSearch);

// ========== FILTER EVENTS BY OWNER ==========
const filterOwner = document.getElementById('filterOwner');
filterOwner.addEventListener('change', applyEventFilters);

function applyEventFilters() {
  const searchTerm = searchEventInput.value.toLowerCase();
  const ownerId = filterOwner.value;
  
  let filtered = [...allEvents];
  
  // Filter by owner
  if (ownerId !== 'all') {
    filtered = filtered.filter(e => e.ownerId === ownerId);
  }
  
  // Filter by search term
  if (searchTerm) {
    filtered = filtered.filter(e => e.name.toLowerCase().includes(searchTerm));
  }
  
  renderEvents(filtered);
}

// ========== CHANGE ROLE ==========
const roleModal = document.getElementById('roleModal');
const confirmRoleBtn = document.getElementById('confirmRoleBtn');

window.changeRole = (userId, userName, currentRole) => {
  selectedUserId = userId;
  document.getElementById('roleUserName').textContent = userName;
  document.getElementById('newRole').value = currentRole;
  roleModal.style.display = 'flex';
};

window.closeRoleModal = () => {
  roleModal.style.display = 'none';
  selectedUserId = null;
};

confirmRoleBtn.addEventListener('click', async () => {
  const newRole = document.getElementById('newRole').value;
  
  if (!selectedUserId) return;
  
  const confirmed = await confirmDialog(`Xác nhận thay đổi quyền thành ${newRole.toUpperCase()}?`);
  if (!confirmed) return;
  
  showLoading();
  
  try {
    const userRef = ref(db, `users/${selectedUserId}`);
    await update(userRef, { role: newRole });
    
    showToast('Cập nhật quyền thành công!', 'success');
    closeRoleModal();
    await loadUsers();
  } catch (error) {
    showToast('Lỗi cập nhật quyền: ' + error.message, 'error');
  }
  
  hideLoading();
});

// ========== VIEW USER EVENTS ==========
window.viewUserEvents = (userId) => {
  filterOwner.value = userId;
  applyEventFilters();
  
  // Scroll to events section
  document.querySelector('.admin-section:last-child').scrollIntoView({ behavior: 'smooth' });
};

// ========== DELETE EVENT ==========
window.deleteEvent = async (eventId) => {
  const confirmed = await confirmDialog('Bạn có chắc muốn xóa sự kiện này? Tất cả dữ liệu sẽ bị mất vĩnh viễn!');
  if (!confirmed) return;
  
  showLoading();
  
  const result = await EventService.deleteEvent(eventId);
  
  hideLoading();
  
  if (result.success) {
    showToast('Xóa sự kiện thành công!', 'success');
    await loadEvents();
    updateGlobalStats();
  } else {
    showToast('Xóa sự kiện thất bại: ' + result.error, 'error');
  }
};

// ========== GO TO EVENT DETAIL ==========
window.goToEventDetail = (eventId) => {
  window.location.href = `event-detail.html?id=${eventId}`;
};

// ========== NAVIGATION ==========
window.goToDashboard = () => {
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

// ========== START APP ==========
init();
