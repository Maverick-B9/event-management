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
