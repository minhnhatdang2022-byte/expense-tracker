// js/services/auth.service.js
import { auth, db } from '../config/firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

class AuthService {
  // Đăng ký user mới
  async register(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Tạo document trong Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: displayName,
        role: 'user', // Mặc định là user
        createdAt: new Date()
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

    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { uid: user.uid, ...docSnap.data() };
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
