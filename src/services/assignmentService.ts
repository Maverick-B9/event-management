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

/**
 * After saving to the assignments collection, rebuild each affected
 * jury/coordinator's `assignedTeams` on their user doc so the jury
 * and coordinator portals pick up the change.
 */
async function syncAssignedTeamsToUsers(): Promise<void> {
    const allAssignments = await getAssignments();

    // Build mapping: staffId → Set<teamId>
    const juryTeams = new Map<string, Set<string>>();
    const coordTeams = new Map<string, Set<string>>();

    for (const a of allAssignments) {
        for (const jId of a.assignedJuryIds) {
            if (!juryTeams.has(jId)) juryTeams.set(jId, new Set());
            juryTeams.get(jId)!.add(a.teamId);
        }
        for (const cId of a.assignedCoordinatorIds) {
            if (!coordTeams.has(cId)) coordTeams.set(cId, new Set());
            coordTeams.get(cId)!.add(a.teamId);
        }
    }

    // Fetch all jury + coordinator users so we can also clear stale entries
    const [jurySnap, coordSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "jury"))),
        getDocs(query(collection(db, "users"), where("role", "==", "coordinator"))),
    ]);

    const updates: Promise<void>[] = [];

    for (const d of jurySnap.docs) {
        const teamIds = juryTeams.get(d.id);
        updates.push(
            updateDoc(doc(db, "users", d.id), {
                assignedTeams: teamIds ? Array.from(teamIds) : [],
            })
        );
    }

    for (const d of coordSnap.docs) {
        const teamIds = coordTeams.get(d.id);
        updates.push(
            updateDoc(doc(db, "users", d.id), {
                assignedTeams: teamIds ? Array.from(teamIds) : [],
            })
        );
    }

    await Promise.all(updates);
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

    // Sync the assignedTeams arrays on all jury/coordinator user docs
    await syncAssignedTeamsToUsers();
}

export async function deleteAssignment(teamId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, "assignments", teamId));
    } catch {
        // Assignment may not exist — that's fine
    }
    await syncAssignedTeamsToUsers();
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
