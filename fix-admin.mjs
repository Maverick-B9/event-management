import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { config } from "dotenv";

config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function fixAdmin() {
    const adminEmail = "admin@ignitedminds.com";
    const adminPass = "admin123456";
    try {
        console.log("Signing in as admin...");
        const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
        const uid = cred.user.uid;

        console.log("Setting Firestore document for...", uid);
        await setDoc(doc(db, "users", uid), {
            uid,
            name: "System Admin",
            email: adminEmail,
            role: "admin",
            status: "active",
            createdAt: serverTimestamp(),
        });
        console.log("✅ Admin Firestore document created successfully!");
    } catch (e) {
        console.error("Error fixing admin:", e);
    }
    process.exit(0);
}

fixAdmin();
