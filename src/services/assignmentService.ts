import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export interface Assignment {
    id?: string;
    teamId: string;
    teamName: string;
    assignedJuryIds: string[];
    assignedCoordinatorIds: string[];
    updatedAt?: any;
}

export async function getAssignments(): Promise<Assignment[]> {
    const snap = await getDocs(collection(db, "assignments"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Assignment);
}

export async function getAssignmentByTeam(teamId: string): Promise<Assignment | null> {
    const snap = await getDoc(doc(db, "assignments", teamId));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Assignment : null;
}

export async function updateAssignment(
    teamId: string,
    data: Pick<Assignment, "teamName" | "assignedJuryIds" | "assignedCoordinatorIds">
) {
    await setDoc(doc(db, "assignments", teamId), {
        teamId,
        ...data,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

export async function getAssignmentsByStaff(staffId: string): Promise<Assignment[]> {
    const [jurySnap, coordSnap] = await Promise.all([
        getDocs(query(collection(db, "assignments"), where("assignedJuryIds", "array-contains", staffId))),
        getDocs(query(collection(db, "assignments"), where("assignedCoordinatorIds", "array-contains", staffId))),
    ]);
    const map = new Map<string, Assignment>();
    for (const d of jurySnap.docs) map.set(d.id, { id: d.id, ...d.data() } as Assignment);
    for (const d of coordSnap.docs) map.set(d.id, { id: d.id, ...d.data() } as Assignment);
    return Array.from(map.values());
}
