/**
 * Seed Script — Ignited Minds Ideathon Platform
 * 
 * This script auto-creates:
 *  1. A Firebase Auth user (admin)
 *  2. The corresponding Firestore user profile (role: "admin")
 *  3. Sample event settings document
 *  4. Sample domains (6 preset)
 *
 * Usage:
 *   node seed.mjs
 *
 * Prerequisites:
 *   1. Fill in your .env file first
 *   2. node >= 18
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { config } from "dotenv";

// Load .env
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

console.log("\n🔥 Ignited Minds — Firebase Seed Script\n");

try {
    // --- Admin user ---
    console.log("Creating admin account...\n");
    const adminName = "System Admin";
    const adminEmail = "admin@ignitedminds.com";
    const adminPass = "admin123456";

    const userCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
    const uid = userCred.user.uid;

    await setDoc(doc(db, "users", uid), {
        uid,
        name: adminName,
        email: adminEmail,
        role: "admin",
        status: "active",
        createdAt: serverTimestamp(),
    });

    console.log(`\n✅ Admin created: ${adminEmail} (uid: ${uid})`);

    // --- Event settings ---
    await setDoc(doc(db, "settings", "event"), {
        eventName: "Ignited Minds Ideathon 2025",
        eventDate: "2025-04-01",
        venue: "Main Auditorium",
        registrationOpen: true,
        maxTeamSize: 5,
        updatedAt: serverTimestamp(),
    });
    console.log("✅ Event settings created");

    // --- Default domains ---
    const domains = [
        "Artificial Intelligence",
        "Cybersecurity",
        "Web & App Development",
        "IoT & Embedded Systems",
        "Blockchain",
        "Sustainability & Green Tech",
    ];

    for (const name of domains) {
        await addDoc(collection(db, "domains"), { name, createdAt: serverTimestamp() });
    }
    console.log(`✅ ${domains.length} domains created`);

    console.log("\n🎉 Seed complete! You can now log in at /login with your admin credentials.\n");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPass}\n`);
} catch (err) {
    if (err.code === "auth/email-already-in-use") {
        console.log("\n⚠️  Admin email already exists — skipping user creation.");
        console.log("    Event settings and domains may have already been seeded.\n");
    } else {
        console.error("\n❌ Error:", err.message, "\n");
    }
} finally {
    process.exit(0);
}
