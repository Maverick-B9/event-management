import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth as getSecondaryAuth, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { auth, db } from "../firebase/firebase";

export interface Student {
    id?: string;
    name: string;
    regNo: string;
    email: string;
    department: string;
    college?: string;
    mobile?: string;
    role: "student";
    teamId?: string;
    teamName?: string;
    teamSize?: number;
    domain?: string;
    paymentLink?: string;
    status: "active" | "inactive";
    submissionUrl?: string;
    initialPassword?: string;
    createdAt?: any;
}

export async function registerStudent(studentData: Omit<Student, "id" | "role" | "createdAt">, password: string) {
    // Read config from the primary app
    const config = auth.app.options;
    // Create a temporary secondary app to register the user without logging out the admin
    const tempAppName = `TempApp-${Date.now()}`;
    const tempApp = initializeApp(config, tempAppName);
    const tempAuth = getSecondaryAuth(tempApp);

    try {
        const cred = await createUserWithEmailAndPassword(tempAuth, studentData.email, password);
        const profile: Student = { ...studentData, role: "student", status: "active", initialPassword: password, createdAt: serverTimestamp() };
        await setDoc(doc(db, "users", cred.user.uid), profile);
        return { uid: cred.user.uid, ...profile };
    } catch (e: any) {
        if (e.code === "auth/email-already-in-use") {
            try {
                const cred = await signInWithEmailAndPassword(tempAuth, studentData.email, password);
                const profile: Student = { ...studentData, role: "student", status: "active", initialPassword: password, createdAt: serverTimestamp() };
                await setDoc(doc(db, "users", cred.user.uid), profile);
                return { uid: cred.user.uid, ...profile };
            } catch {
                throw new Error(`Email already in use, or password doesn't match old account.`);
            }
        }
        throw e;
    } finally {
        try { await tempAuth.signOut(); } catch { }
    }
}

export async function getStudent(uid: string) {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Student : null;
}

export async function getAllStudents(): Promise<Student[]> {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Student);
}

export async function updateStudent(uid: string, data: Partial<Student>) {
    await updateDoc(doc(db, "users", uid), data as Record<string, unknown>);
}

export async function deleteStudent(uid: string, email?: string, password?: string) {
    if (email && password) {
        const config = auth.app.options;
        const tempApp = initializeApp(config, `TempDelStud-${Date.now()}`);
        const tempAuth = getSecondaryAuth(tempApp);
        try {
            const cred = await signInWithEmailAndPassword(tempAuth, email, password);
            await deleteUser(cred.user);
        } catch {
        } finally {
            try { await tempAuth.signOut(); } catch { }
        }
    }

    // Cascade: Get student data to find their team before deleting
    try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
            const data = snap.data() as Student;
            if (data.teamId) {
                const teamRef = doc(db, "teams", data.teamId);
                const teamSnap = await getDoc(teamRef);
                if (teamSnap.exists()) {
                    const members = teamSnap.data().members || [];
                    const updatedMembers = members.filter((m: string) => m !== uid);
                    if (updatedMembers.length === 0) {
                        await deleteDoc(teamRef); // Team is empty, delete it
                    } else {
                        await updateDoc(teamRef, { members: updatedMembers }); // Remove member
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error cleaning up team logic:", e);
    }

    // Cascade: Delete attendance and food coupons
    try { await deleteDoc(doc(db, "attendance", uid)); } catch (e) { }
    try { await deleteDoc(doc(db, "foodCoupons", uid)); } catch (e) { }

    await deleteDoc(doc(db, "users", uid));
}

export async function resetStudentPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
}

export async function bulkUploadStudents(students: Array<Omit<Student, "id" | "role" | "createdAt">>, defaultPassword = "Welcome@123") {
    const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };
    for (const student of students) {
        try {
            await registerStudent({ ...student, initialPassword: defaultPassword }, defaultPassword);
            results.success++;
        } catch (e: any) {
            results.failed++;
            results.errors.push(`${student.email}: ${e.message}`);
        }
    }
    return results;
}
