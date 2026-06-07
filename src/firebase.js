import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBEy_FwNqy8XTpz4TqZHB3IV0iQ42tU1uk",
  authDomain: "tarunabangsa-281a3.firebaseapp.com",
  projectId: "tarunabangsa-281a3",
  storageBucket: "tarunabangsa-281a3.firebasestorage.app",
  messagingSenderId: "45933941257",
  appId: "1:45933941257:web:db494a9a313513ad8bded8",
  databaseURL: "https://tarunabangsa-281a3-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
