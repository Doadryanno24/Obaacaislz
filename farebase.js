// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Config do Firebase que você passou
const firebaseConfig = {
  apiKey: "AIzaSyAainLslFveLtxVzBMhU3Og3-OrqQTW7Eg",
  authDomain: "unitv-box-367cc.firebaseapp.com",
  databaseURL: "https://unitv-box-367cc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "unitv-box-367cc",
  storageBucket: "unitv-box-367cc.appspot.com",
  messagingSenderId: "271556789962",
  appId: "1:271556789962:web:02b2a4e024cda215271633",
  measurementId: "G-6PBGQGH18Y"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta Firestore
export const db = getFirestore(app);