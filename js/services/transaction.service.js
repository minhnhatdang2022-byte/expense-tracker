// js/services/transaction.service.js
import { db } from '../config/firebase.js';
import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import EventService from './event.service.js';

class TransactionService {
  // Thêm giao dịch mới
  async addTransaction(eventId, transactionData) {
    try {
      const transactionsRef = ref(db, `transactions/${eventId}`);
      const newTransactionRef = push(transactionsRef);
      
      await set(newTransactionRef, {
        title: transactionData.title,
        type: transactionData.type, // 'income' hoặc 'expense'
        amount: parseFloat(transactionData.amount),
        date: new Date(transactionData.date).toISOString(),
        note: transactionData.note || '',
        createdAt: new Date().toISOString()
      });

      // Cập nhật tổng
      await this.recalculateTotals(eventId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Lấy danh sách giao dịch
  async getTransactions(eventId) {
    try {
      const transactionsRef = ref(db, `transactions/${eventId}`);
      const snapshot = await get(transactionsRef);

      const transactions = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          transactions.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
      }
      
      // Sort by date desc
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return { success: true, transactions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Real-time listener cho transactions
  listenToTransactions(eventId, callback) {
    const transactionsRef = ref(db, `transactions/${eventId}`);

    return onValue(transactionsRef, (snapshot) => {
      const transactions = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          transactions.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
      }
      
      // Sort by date desc
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      callback(transactions);
    });
  }

  // Cập nhật giao dịch
  async updateTransaction(eventId, transactionId, updates) {
    try {
      const transactionRef = ref(db, `transactions/${eventId}/${transactionId}`);
      await update(transactionRef, {
        ...updates,
        amount: parseFloat(updates.amount),
        date: new Date(updates.date).toISOString()
      });

      // Cập nhật tổng
      await this.recalculateTotals(eventId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xóa giao dịch
  async deleteTransaction(eventId, transactionId) {
    try {
      const transactionRef = ref(db, `transactions/${eventId}/${transactionId}`);
      await remove(transactionRef);

      // Cập nhật tổng
      await this.recalculateTotals(eventId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Tính lại tổng thu/chi
  async recalculateTotals(eventId) {
    try {
      const result = await this.getTransactions(eventId);
      if (!result.success) return result;

      let totalIncome = 0;
      let totalExpense = 0;

      result.transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
          totalExpense += transaction.amount;
        }
      });

      await EventService.updateTotals(eventId, totalIncome, totalExpense);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Lọc giao dịch
  filterTransactions(transactions, filters) {
    let filtered = [...transactions];

    // Lọc theo loại
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }

    // Lọc theo khoảng số tiền
    if (filters.minAmount) {
      filtered = filtered.filter(t => t.amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(t => t.amount <= parseFloat(filters.maxAmount));
    }

    // Tìm kiếm theo tên
    if (filters.searchTerm) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Lọc theo khoảng thời gian
    if (filters.startDate) {
      const startDate = new Date(filters.startDate).getTime();
      filtered = filtered.filter(t => new Date(t.date).getTime() >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate).getTime();
      filtered = filtered.filter(t => new Date(t.date).getTime() <= endDate);
    }

    return filtered;
  }
}

export default new TransactionService();
