// js/services/auth.service.js
import { auth, db } from '../config/firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  ref,
  set,
  get,
  child
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

class AuthService {
  // Đăng ký user mới
  async register(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Tạo node trong Realtime Database
      await set(ref(db, 'users/' + user.uid), {
        email: user.email,
        displayName: displayName,
        role: 'user', // Mặc định là user
        createdAt: new Date().toISOString()
      });

      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đăng nhập
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Đăng xuất
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Lấy thông tin user hiện tại
  async getCurrentUserData() {
    const user = auth.currentUser;
    if (!user) return null;

    const snapshot = await get(child(ref(db), `users/${user.uid}`));
    
    if (snapshot.exists()) {
      return { uid: user.uid, ...snapshot.val() };
    }
    return null;
  }

  // Kiểm tra user có phải admin không
  async isAdmin() {
    const userData = await this.getCurrentUserData();
    return userData && userData.role === 'admin';
  }

  // Lắng nghe trạng thái auth
  onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

export default new AuthService();
