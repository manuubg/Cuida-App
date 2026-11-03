import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCXHBFDahCxPlaxw-oILvzKLpVZlUsq_1E",
  authDomain: "cuidaplus-11255.firebaseapp.com",
  databaseURL: "https://cuidaplus-11255-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cuidaplus-11255",
  storageBucket: "cuidaplus-11255.firebasestorage.app",
  messagingSenderId: "312276662371",
  appId: "1:312276662371:web:6047aaf6aa412f2e446056"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const storage = getStorage(app);

function createAuth() {
  if (Platform.OS === "web") return getAuth(app);

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (error.code !== "auth/already-initialized") throw error;
    return getAuth(app);
  }
}

export const auth = createAuth();