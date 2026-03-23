import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    orderBy,
    query,
    serverTimestamp,
    onSnapshot,
    type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export type AnnouncementAudience = "all" | "coordinator" | "jury" | "staff";

export interface Announcement {
    id?: string;
    title: string;
    description: string;
    audience: AnnouncementAudience;
    targetDomains?: string[];
    timestamp?: any;
}

export async function createAnnouncement(
    title: string,
    description: string,
    audience: AnnouncementAudience = "all",
    targetDomains?: string[]
) {
    const data: Record<string, any> = {
        title,
        description,
        audience,
        timestamp: serverTimestamp(),
    };
    if (targetDomains && targetDomains.length > 0) {
        data.targetDomains = targetDomains;
    }
    await addDoc(collection(db, "announcements"), data);
}

export async function getAnnouncements(): Promise<Announcement[]> {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
}

export async function deleteAnnouncement(id: string) {
    if (!id) return;
    await deleteDoc(doc(db, "announcements", id));
}

/**
 * Subscribe to announcements filtered by role.
 * - "student" sees only audience === "all"
 * - "coordinator" sees "all", "coordinator", "staff"
 * - "jury" sees "all", "jury", "staff"
 * - "admin" sees everything
 */
export function subscribeAnnouncements(
    role: "student" | "coordinator" | "jury" | "admin",
    callback: (announcements: Announcement[]) => void,
    userDomains?: string[]
): Unsubscribe {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
        const filtered = all.filter((a) => {
            const aud = a.audience || "all";
            // Role filter
            let passesRole = false;
            if (role === "admin") passesRole = true;
            else if (role === "student") passesRole = aud === "all";
            else if (role === "coordinator") passesRole = aud === "all" || aud === "coordinator" || aud === "staff";
            else if (role === "jury") passesRole = aud === "all" || aud === "jury" || aud === "staff";
            else passesRole = aud === "all";

            if (!passesRole) return false;

            // Domain filter: if announcement targets specific domains, only show to matching users
            if (a.targetDomains && a.targetDomains.length > 0 && role !== "admin") {
                if (!userDomains || userDomains.length === 0) return false;
                return a.targetDomains.some((d) => userDomains.includes(d));
            }

            return true;
        });
        callback(filtered);
    });
}
