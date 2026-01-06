// js/config/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDBVmLtZleXhPgHnEopx4jw2BIhIicHgIE",
  authDomain: "quan-ly-thu-chi-fdda5.firebaseapp.com",
  databaseURL: "https://quan-ly-thu-chi-fdda5-default-rtdb.firebaseio.com",
  projectId: "quan-ly-thu-chi-fdda5",
  storageBucket: "quan-ly-thu-chi-fdda5.firebasestorage.app",
  messagingSenderId: "1063214543952",
  appId: "1:1063214543962:web:5b43eb2766ac0bc2f1cd55",
  measurementId: "G-MHB24KE4PL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db };
