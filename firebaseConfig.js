import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Credenciais corretas alinhadas com o seu banco da Europa:
const firebaseConfig = {
  apiKey: "AIzaSyCXHBFDahCxPlaxw-oILvzKLpVZ1Usq_1E", // Cole a chave completa aqui
  authDomain: "cuidaplus-11255.firebaseapp.com",
  databaseURL: "https://cuidaplus-11255-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cuidaplus-11255",
  storageBucket: "cuidaplus-11255.firebasestorage.app",
  messagingSenderId: "312276662371",
  appId: "1:312276662371:web:6047aaf6aa412f2e446056"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta o banco para usar no App.js
export const db = getDatabase(app);