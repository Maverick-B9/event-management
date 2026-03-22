import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
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
const db = getFirestore(app);

async function cleanOrphans() {
    console.log("Fetching all users...");
    const usersSnap = await getDocs(collection(db, "users"));
    const validStudentIds = new Set();
    usersSnap.forEach(doc => {
        if (doc.data().role === "student") {
            validStudentIds.add(doc.id);
        }
    });
    console.log(`Found ${validStudentIds.size} valid students.`);

    // Clean Teams
    console.log("Checking teams...");
    const teamsSnap = await getDocs(collection(db, "teams"));
    let teamsDeleted = 0;
    for (const d of teamsSnap.docs) {
        const team = d.data();
        const hasValidMember = team.members?.some(m => validStudentIds.has(m));
        if (!hasValidMember) {
            await deleteDoc(d.ref);
            teamsDeleted++;
        }
    }
    console.log(`Deleted ${teamsDeleted} orphaned teams.`);

    // Clean Attendance
    console.log("Checking attendance...");
    const attSnap = await getDocs(collection(db, "attendance"));
    let attDeleted = 0;
    for (const d of attSnap.docs) {
        if (!validStudentIds.has(d.id)) {
            await deleteDoc(d.ref);
            attDeleted++;
        }
    }
    console.log(`Deleted ${attDeleted} orphaned attendance records.`);

    // Clean Food Coupons
    console.log("Checking food coupons...");
    const foodSnap = await getDocs(collection(db, "foodCoupons"));
    let foodDeleted = 0;
    for (const d of foodSnap.docs) {
        if (!validStudentIds.has(d.id)) {
            await deleteDoc(d.ref);
            foodDeleted++;
        }
    }
    console.log(`Deleted ${foodDeleted} orphaned food coupons.`);

    console.log("✅ Cleanup complete!");
    process.exit(0);
}

cleanOrphans();
