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

/**
 * Bulk-assign jury members to ALL teams in a specific domain.
 * Preserves existing coordinator assignments on each team.
 * Also writes `assignedDomains` on each jury user doc for quick lookup.
 */
export async function assignJuryToDomain(
    domain: string,
    juryIds: string[],
    allTeams: { id: string; teamName: string; domain: string }[]
): Promise<number> {
    const domainTeams = allTeams.filter(
        (t) => t.domain.toLowerCase() === domain.toLowerCase()
    );

    if (domainTeams.length === 0) return 0;

    // Load existing assignments so we preserve coordinator selections
    const existingAssignments = await getAssignments();
    const assignmentMap = new Map<string, Assignment>();
    for (const a of existingAssignments) {
        assignmentMap.set(a.teamId, a);
    }

    // Upsert assignment for each team in the domain
    const writes: Promise<void>[] = [];
    for (const team of domainTeams) {
        const existing = assignmentMap.get(team.id);
        writes.push(
            setDoc(doc(db, "assignments", team.id), {
                teamId: team.id,
                teamName: team.teamName,
                assignedJuryIds: juryIds,
                assignedCoordinatorIds: existing?.assignedCoordinatorIds || [],
                updatedAt: serverTimestamp(),
            }, { merge: true })
        );
    }
    await Promise.all(writes);

    // Sync the assignedTeams arrays on all jury/coordinator user docs
    await syncAssignedTeamsToUsers();

    // Write assignedDomains on each jury user doc
    // Build a full domain→juryIds map from all assignments (including the ones we just wrote)
    const updatedAssignments = await getAssignments();
    const juryDomains = new Map<string, Set<string>>();

    for (const a of updatedAssignments) {
        const team = allTeams.find((t) => t.id === a.teamId);
        if (!team) continue;
        for (const jId of a.assignedJuryIds) {
            if (!juryDomains.has(jId)) juryDomains.set(jId, new Set());
            juryDomains.get(jId)!.add(team.domain);
        }
    }

    const domainUpdates: Promise<void>[] = [];
    const jurySnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "jury"))
    );
    for (const d of jurySnap.docs) {
        const domains = juryDomains.get(d.id);
        domainUpdates.push(
            updateDoc(doc(db, "users", d.id), {
                assignedDomains: domains ? Array.from(domains) : [],
            })
        );
    }
    await Promise.all(domainUpdates);

    return domainTeams.length;
}
