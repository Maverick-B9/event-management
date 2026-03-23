import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, getAuth as getSecondaryAuth, signInWithEmailAndPassword, deleteUser, updatePassword } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { auth, db } from "../firebase/firebase";

export type StaffRole = "coordinator" | "jury" | "admin";

export interface StaffMember {
    id?: string;
    name: string;
    email: string;
    role: StaffRole;
    assignedTeams?: string[];
    initialPassword?: string;
    createdAt?: any;
}

export interface Domain {
    id?: string;
    name: string;
}

export interface EventSettings {
    registrationOpen: boolean;
    leaderboardPublished: boolean;
    eventName: string;
    eventDate: string;
    venue: string;
    maxTeamSize: number;
    theme?: string;
}

// Staff management
export async function createStaffMember(
    data: Omit<StaffMember, "id" | "createdAt">,
    password: string
) {
    // Use a secondary Firebase app instance so creating staff doesn't sign out the admin
    const config = auth.app.options;
    const tempAppName = `TempStaffApp-${Date.now()}`;
    const tempApp = initializeApp(config, tempAppName);
    const tempAuth = getSecondaryAuth(tempApp);

    try {
        const cred = await createUserWithEmailAndPassword(tempAuth, data.email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
            ...data,
            initialPassword: password,
            createdAt: serverTimestamp(),
        });
        return cred.user.uid;
    } catch (e: any) {
        if (e.code === "auth/email-already-in-use") {
            try {
                const cred = await signInWithEmailAndPassword(tempAuth, data.email, password);
                await setDoc(doc(db, "users", cred.user.uid), {
                    ...data,
                    initialPassword: password,
                    createdAt: serverTimestamp(),
                });
                return cred.user.uid;
            } catch {
                throw new Error("Email already in use, or password doesn't match the old account.");
            }
        }
        throw e;
    } finally {
        try { await tempAuth.signOut(); } catch { }
    }
}

export async function resetStaffPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
}

export async function getStaffByRole(role: StaffRole): Promise<StaffMember[]> {
    const q = query(collection(db, "users"), where("role", "==", role));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StaffMember);
}

export async function deleteStaffMember(uid: string, email?: string, password?: string) {
    if (email && password) {
        const config = auth.app.options;
        const tempApp = initializeApp(config, `TempDel-${Date.now()}`);
        const tempAuth = getSecondaryAuth(tempApp);
        try {
            const cred = await signInWithEmailAndPassword(tempAuth, email, password);
            await deleteUser(cred.user);
        } catch {
            // Ignore if auth delete fails (maybe password was changed)
        } finally {
            try { await tempAuth.signOut(); } catch { }
        }
    }
    await deleteDoc(doc(db, "users", uid));
}

export async function forceChangeUserPassword(email: string, oldPassword: string, newPassword: string) {
    const config = auth.app.options;
    const tempApp = initializeApp(config, `TempPwd-${Date.now()}`);
    const tempAuth = getSecondaryAuth(tempApp);

    try {
        const cred = await signInWithEmailAndPassword(tempAuth, email, oldPassword);
        await updatePassword(cred.user, newPassword);
    } finally {
        try { await tempAuth.signOut(); } catch { }
    }
}

export async function updateAssignedTeams(juryId: string, teamIds: string[]) {
    await updateDoc(doc(db, "users", juryId), { assignedTeams: teamIds });
}

// Domain management
export async function createDomain(name: string) {
    await setDoc(doc(db, "domains", name.toLowerCase().replace(/\s+/g, "-")), { name });
}

export async function getDomains(): Promise<Domain[]> {
    const snap = await getDocs(collection(db, "domains"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Domain);
}

export async function deleteDomain(id: string) {
    await deleteDoc(doc(db, "domains", id));
}

// Event settings
export async function getEventSettings(): Promise<EventSettings> {
    const snap = await getDoc(doc(db, "settings", "event"));
    if (snap.exists()) return snap.data() as EventSettings;
    return {
        registrationOpen: true,
        leaderboardPublished: false,
        eventName: "Ignited Minds Ideathon",
        eventDate: "",
        venue: "",
        maxTeamSize: 5,
    };
}

export async function updateEventSettings(settings: Partial<EventSettings>) {
    await setDoc(doc(db, "settings", "event"), settings, { merge: true });
}

// Admin stats
export async function getAdminStats() {
    const [studentsSnap, teamsSnap, evaluationsSnap, attendanceSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "student"))),
        getDocs(collection(db, "teams")),
        getDocs(collection(db, "evaluations")),
        getDocs(collection(db, "attendance")),
    ]);
    return {
        totalStudents: studentsSnap.size,
        totalTeams: teamsSnap.size,
        totalEvaluations: evaluationsSnap.size,
        totalAttendance: attendanceSnap.size,
    };
}
