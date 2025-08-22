// Import functions from the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";


// Your web app's Firebase configuration
// WARNING: Storing API keys directly in client-side code is a security risk.
// Consider using environment variables or a backend proxy for production.
const firebaseConfig = {
    apiKey: "AIzaSyAeHrxMwpArmteEWi4lIdTi54PYRDlLhks",
    authDomain: "dpflsite.firebaseapp.com",
    projectId: "dpflsite",
    storageBucket: "dpflsite.appspot.com",
    messagingSenderId: "884123413396",
    appId: "1:884123413396:web:fde6cb5f92bc1b23866fd81",
    measurementId: "G-5R72BVV5R7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
export { app, auth, db };
