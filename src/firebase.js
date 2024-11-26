import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB_wTtnR7BVhfx25VwfIv8mcIUcGg07e8c",
  authDomain: "nextgen-pemss.firebaseapp.com",
  projectId: "nextgen-pemss",
  storageBucket: "nextgen-pemss.firebasestorage.app",
  messagingSenderId: "671169830872",
  appId: "1:671169830872:web:227ff20b3bb2d74872dcad",
  measurementId: "G-7VYSTJJWRR"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
