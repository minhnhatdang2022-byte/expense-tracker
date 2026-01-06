// js/services/event.service.js
import { db } from '../config/firebase.js';
import {
  ref,
  push,
  set,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo,
  onValue
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

class EventService {
  // Tạo sự kiện mới
  async createEvent(eventData) {
    try {
      const eventsRef = ref(db, 'events');
      const newEventRef = push(eventsRef);
      
      await set(newEventRef, {
        name: eventData.name,
        ownerId: eventData.ownerId,
        date: new Date(eventData.date).toISOString(),
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        createdAt: new Date().toISOString()
      });
      
      return { success: true, id: newEventRef.key };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Lấy danh sách sự kiện (theo user hoặc admin)
  async getEvents(userId, isAdmin = false) {
    try {
      const eventsRef = ref(db, 'events');
      let snapshot;
      
      if (isAdmin) {
        snapshot = await get(eventsRef);
      } else {
        const q = query(eventsRef, orderByChild('ownerId'), equalTo(userId));
        snapshot = await get(q);
      }

      const events = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          events.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
      }
      
      // Sort by createdAt desc
      events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { success: true, events };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Real-time listener cho danh sách events
  listenToEvents(userId, isAdmin, callback) {
    const eventsRef = ref(db, 'events');
    
    return onValue(eventsRef, (snapshot) => {
      const events = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const event = { id: childSnapshot.key, ...childSnapshot.val() };
          
          // Filter by owner nếu không phải admin
          if (isAdmin || event.ownerId === userId) {
            events.push(event);
          }
        });
      }
      
      // Sort by createdAt desc
      events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      callback(events);
    });
  }

  // Lấy chi tiết sự kiện
  async getEventById(eventId) {
    try {
      const eventRef = ref(db, `events/${eventId}`);
      const snapshot = await get(eventRef);

      if (snapshot.exists()) {
        return { success: true, event: { id: snapshot.key, ...snapshot.val() } };
      }
      return { success: false, error: 'Event not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Real-time listener cho chi tiết event
  listenToEvent(eventId, callback) {
    const eventRef = ref(db, `events/${eventId}`);
    
    return onValue(eventRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.key, ...snapshot.val() });
      } else {
        callback(null);
      }
    });
  }

  // Cập nhật sự kiện
  async updateEvent(eventId, updates) {
    try {
      const eventRef = ref(db, `events/${eventId}`);
      await update(eventRef, updates);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xóa sự kiện
  async deleteEvent(eventId) {
    try {
      // Xóa event
      await remove(ref(db, `events/${eventId}`));
      
      // Xóa tất cả transactions của event
      await remove(ref(db, `transactions/${eventId}`));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Tìm kiếm sự kiện
  async searchEvents(userId, isAdmin, searchTerm) {
    try {
      const result = await this.getEvents(userId, isAdmin);
      if (!result.success) return result;

      const filtered = result.events.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return { success: true, events: filtered };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Cập nhật tổng thu/chi/dư
  async updateTotals(eventId, totalIncome, totalExpense) {
    try {
      const balance = totalIncome - totalExpense;
      await this.updateEvent(eventId, {
        totalIncome,
        totalExpense,
        balance
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new EventService();
