// js/services/event.service.js
import { db } from '../config/firebase.js';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

class EventService {
  // Tạo sự kiện mới
  async createEvent(eventData) {
    try {
      const docRef = await addDoc(collection(db, 'events'), {
        name: eventData.name,
        ownerId: eventData.ownerId,
        date: Timestamp.fromDate(new Date(eventData.date)),
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        createdAt: Timestamp.now()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Lấy danh sách sự kiện (theo user hoặc admin)
  async getEvents(userId, isAdmin = false) {
    try {
      let q;
      if (isAdmin) {
        q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      } else {
        q = query(
          collection(db, 'events'),
          where('ownerId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, events };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Real-time listener cho danh sách events
  listenToEvents(userId, isAdmin, callback) {
    let q;
    if (isAdmin) {
      q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, 'events'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      callback(events);
    });
  }

  // Lấy chi tiết sự kiện
  async getEventById(eventId) {
    try {
      const docRef = doc(db, 'events', eventId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, event: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Event not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Real-time listener cho chi tiết event
  listenToEvent(eventId, callback) {
    const docRef = doc(db, 'events', eventId);
    return onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  }

  // Cập nhật sự kiện
  async updateEvent(eventId, updates) {
    try {
      const docRef = doc(db, 'events', eventId);
      await updateDoc(docRef, updates);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Xóa sự kiện
  async deleteEvent(eventId) {
    try {
      await deleteDoc(doc(db, 'events', eventId));
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
