import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Credenciais corretas alinhadas com o seu banco da Europa:
const firebaseConfig = {
  apiKey: "AIzaSyCXHBFDahCxPlaxw-oILvzKLpVZlUsq_1E",
  authDomain: "cuidaplus-11255.firebaseapp.com",
  databaseURL: "https://cuidaplus-11255-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cuidaplus-11255",
  storageBucket: "cuidaplus-11255.firebasestorage.app",
  messagingSenderId: "312276662371",
  appId: "1:312276662371:web:6047aaf6aa412f2e446056"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o banco e o storage para usar no App.js
export const db = getDatabase(app);
export const storage = getStorage(app, "gs://cuidaplus-11255.appspot.com");
export const auth = getAuth(app);