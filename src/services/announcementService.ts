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
    timestamp?: any;
}

export async function createAnnouncement(
    title: string,
    description: string,
    audience: AnnouncementAudience = "all"
) {
    await addDoc(collection(db, "announcements"), {
        title,
        description,
        audience,
        timestamp: serverTimestamp(),
    });
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
    callback: (announcements: Announcement[]) => void
): Unsubscribe {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
        const filtered = all.filter((a) => {
            const aud = a.audience || "all";
            if (role === "admin") return true;
            if (role === "student") return aud === "all";
            if (role === "coordinator") return aud === "all" || aud === "coordinator" || aud === "staff";
            if (role === "jury") return aud === "all" || aud === "jury" || aud === "staff";
            return aud === "all";
        });
        callback(filtered);
    });
}
