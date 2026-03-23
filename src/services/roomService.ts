import {
    collection,
    doc,
    addDoc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    onSnapshot,
    type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export interface Room {
    id?: string;
    name: string;
    floor?: string;
    capacity?: number;
    assignedTeamIds: string[];
    assignedJuryIds: string[];
    assignedCoordinatorIds: string[];
    createdAt?: any;
    updatedAt?: any;
}

export async function createRoom(data: Pick<Room, "name" | "floor" | "capacity">) {
    await addDoc(collection(db, "rooms"), {
        ...data,
        assignedTeamIds: [],
        assignedJuryIds: [],
        assignedCoordinatorIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteRoom(id: string) {
    await deleteDoc(doc(db, "rooms", id));
}

export async function updateRoomAssignments(
    roomId: string,
    assignments: Pick<Room, "assignedTeamIds" | "assignedJuryIds" | "assignedCoordinatorIds">
) {
    await updateDoc(doc(db, "rooms", roomId), {
        ...assignments,
        updatedAt: serverTimestamp(),
    });
}

export function subscribeRooms(callback: (rooms: Room[]) => void): Unsubscribe {
    return onSnapshot(collection(db, "rooms"), (snap) => {
        const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Room);
        callback(rooms);
    });
}

/** Find rooms where a user is assigned — checks teamId, juryId, or coordinatorId */
export function subscribeUserRooms(
    userId: string,
    teamId: string | undefined,
    role: "student" | "jury" | "coordinator",
    callback: (rooms: Room[]) => void
): Unsubscribe {
    return onSnapshot(collection(db, "rooms"), (snap) => {
        const allRooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Room);
        const matched = allRooms.filter((r) => {
            if (role === "student" && teamId) {
                return (r.assignedTeamIds || []).includes(teamId);
            }
            if (role === "jury") {
                return (r.assignedJuryIds || []).includes(userId);
            }
            if (role === "coordinator") {
                return (r.assignedCoordinatorIds || []).includes(userId);
            }
            return false;
        });
        callback(matched);
    });
}
