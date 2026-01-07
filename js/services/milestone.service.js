// js/services/milestone.service.js
import { formatMoney, formatDate } from '../utils/helpers.js';

class MilestoneService {
  // Tạo danh sách dấu mốc từ transactions
  generateMilestones(transactions, event) {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const milestones = [];

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 1. KHOẢN THU ĐẦU TIÊN
    const firstIncome = sortedTransactions.find(t => t.type === 'income');
    if (firstIncome) {
      milestones.push({
        id: 'first-income',
        type: 'first',
        icon: '🎉',
        title: 'Khoản thu đầu tiên',
        description: `${firstIncome.title} - ${formatMoney(firstIncome.amount)}`,
        date: firstIncome.date,
        amount: firstIncome.amount,
        color: 'success'
      });
    }

    // 2. KHOẢN THU CUỐI CÙNG
    const lastIncome = [...sortedTransactions].reverse().find(t => t.type === 'income');
    if (lastIncome && lastIncome.id !== firstIncome?.id) {
      milestones.push({
        id: 'last-income',
        type: 'last',
        icon: '🏁',
        title: 'Khoản thu cuối cùng',
        description: `${lastIncome.title} - ${formatMoney(lastIncome.amount)}`,
        date: lastIncome.date,
        amount: lastIncome.amount,
        color: 'success'
      });
    }

    // 3. KHOẢN CHI LỚN NHẤT
    const expenses = sortedTransactions.filter(t => t.type === 'expense');
    if (expenses.length > 0) {
      const largestExpense = expenses.reduce((max, t) => 
        t.amount > max.amount ? t : max
      );
      
      milestones.push({
        id: 'largest-expense',
        type: 'max',
        icon: '💸',
        title: 'Khoản chi lớn nhất',
        description: `${largestExpense.title} - ${formatMoney(largestExpense.amount)}`,
        date: largestExpense.date,
        amount: largestExpense.amount,
        color: 'danger'
      });
    }

    // 4. KHOẢN THU LỚN NHẤT
    const incomes = sortedTransactions.filter(t => t.type === 'income');
    if (incomes.length > 0) {
      const largestIncome = incomes.reduce((max, t) => 
        t.amount > max.amount ? t : max
      );
      
      milestones.push({
        id: 'largest-income',
        type: 'max',
        icon: '💰',
        title: 'Khoản thu lớn nhất',
        description: `${largestIncome.title} - ${formatMoney(largestIncome.amount)}`,
        date: largestIncome.date,
        amount: largestIncome.amount,
        color: 'success'
      });
    }

    // 5. NGÀY CHI NHIỀU NHẤT
    const dailyExpenses = this.calculateDailyTotals(expenses);
    if (dailyExpenses.length > 0) {
      const maxExpenseDay = dailyExpenses.reduce((max, day) => 
        day.total > max.total ? day : max
      );
      
      milestones.push({
        id: 'max-expense-day',
        type: 'daily',
        icon: '📉',
        title: 'Ngày chi nhiều nhất',
        description: `${formatDate(maxExpenseDay.date)} - ${formatMoney(maxExpenseDay.total)}`,
        date: maxExpenseDay.date,
        amount: maxExpenseDay.total,
        color: 'danger',
        details: `${maxExpenseDay.count} giao dịch`
      });
    }

    // 6. NGÀY THU NHIỀU NHẤT
    const dailyIncomes = this.calculateDailyTotals(incomes);
    if (dailyIncomes.length > 0) {
      const maxIncomeDay = dailyIncomes.reduce((max, day) => 
        day.total > max.total ? day : max
      );
      
      milestones.push({
        id: 'max-income-day',
        type: 'daily',
        icon: '📈',
        title: 'Ngày thu nhiều nhất',
        description: `${formatDate(maxIncomeDay.date)} - ${formatMoney(maxIncomeDay.total)}`,
        date: maxIncomeDay.date,
        amount: maxIncomeDay.total,
        color: 'success',
        details: `${maxIncomeDay.count} giao dịch`
      });
    }

    // 7. DẤU MỐC TỔNG THU (1tr, 5tr, 10tr, 20tr, 50tr, 100tr)
    const incomeMilestones = this.calculateIncomeMilestones(sortedTransactions);
    milestones.push(...incomeMilestones);

    // 8. TÌNH TRẠNG KẾT THÚC
    if (event) {
      const finalBalance = event.balance || 0;
      const status = finalBalance >= 0 ? 'surplus' : 'deficit';
      
      milestones.push({
        id: 'final-status',
        type: 'final',
        icon: finalBalance >= 0 ? '✅' : '⚠️',
        title: finalBalance >= 0 ? 'Kết thúc với số dư dương' : 'Kết thúc thâm hụt',
        description: `Số dư: ${formatMoney(Math.abs(finalBalance))}`,
        date: new Date().toISOString(),
        amount: finalBalance,
        color: finalBalance >= 0 ? 'success' : 'warning'
      });
    }

    // Sort milestones by date
    return milestones.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  // Tính tổng theo ngày
  calculateDailyTotals(transactions) {
    const dailyMap = {};
    
    transactions.forEach(t => {
      const dateKey = new Date(t.date).toISOString().split('T')[0];
      
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: t.date,
          total: 0,
          count: 0
        };
      }
      
      dailyMap[dateKey].total += t.amount;
      dailyMap[dateKey].count++;
    });
    
    return Object.values(dailyMap);
  }

  // Tính dấu mốc tổng thu
  calculateIncomeMilestones(transactions) {
    const milestones = [];
    const thresholds = [1000000, 5000000, 10000000, 20000000, 50000000, 100000000];
    const reachedThresholds = new Set();
    
    let cumulativeIncome = 0;
    
    transactions.forEach(t => {
      if (t.type === 'income') {
        cumulativeIncome += t.amount;
        
        // Check if reached any threshold
        thresholds.forEach(threshold => {
          if (cumulativeIncome >= threshold && !reachedThresholds.has(threshold)) {
            reachedThresholds.add(threshold);
            
            milestones.push({
              id: `milestone-${threshold}`,
              type: 'threshold',
              icon: '🎯',
              title: `Tổng thu vượt ${this.formatThreshold(threshold)}`,
              description: `Đạt mốc ${formatMoney(threshold)}`,
              date: t.date,
              amount: threshold,
              color: 'primary'
            });
          }
        });
      }
    });
    
    return milestones;
  }

  // Format threshold display
  formatThreshold(amount) {
    if (amount >= 1000000) {
      return `${amount / 1000000} triệu`;
    }
    return formatMoney(amount);
  }

  // Lấy insights tổng quan
  getInsights(transactions, event) {
    if (!transactions || transactions.length === 0) {
      return {
        totalTransactions: 0,
        averageIncome: 0,
        averageExpense: 0,
        largestTransaction: 0,
        activeDays: 0
      };
    }

    const incomes = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');
    
    const uniqueDates = new Set(
      transactions.map(t => new Date(t.date).toISOString().split('T')[0])
    );

    return {
      totalTransactions: transactions.length,
      totalIncome: incomes.reduce((sum, t) => sum + t.amount, 0),
      totalExpense: expenses.reduce((sum, t) => sum + t.amount, 0),
      averageIncome: incomes.length > 0 
        ? incomes.reduce((sum, t) => sum + t.amount, 0) / incomes.length 
        : 0,
      averageExpense: expenses.length > 0 
        ? expenses.reduce((sum, t) => sum + t.amount, 0) / expenses.length 
        : 0,
      largestTransaction: Math.max(...transactions.map(t => t.amount)),
      activeDays: uniqueDates.size,
      incomeCount: incomes.length,
      expenseCount: expenses.length
    };
  }
}

export default new MilestoneService();
