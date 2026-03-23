import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export interface TeamMemberDetail {
    name: string;
    email: string;
    phone: string;
}

export interface Team {
    id?: string;
    teamName: string;
    members: string[]; // UIDs of authenticated members (usually just the leader)
    memberDetails?: TeamMemberDetail[]; // Manual entries for team members
    domain: string;
    room?: string;
    teamSize?: number;
    leaderName?: string;
    submissionLink?: string;
    createdAt?: any;
}

export async function createTeam(teamName: string, domain: string, leaderId: string, teamSize?: number, leaderName?: string): Promise<string> {
    const docRef = await addDoc(collection(db, "teams"), {
        teamName,
        domain,
        members: [leaderId],
        ...(teamSize != null && { teamSize }),
        ...(leaderName && { leaderName }),
        submissionLink: "",
        createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", leaderId), { teamId: docRef.id });
    return docRef.id;
}

export async function joinTeam(teamId: string, studentId: string) {
    const teamRef = doc(db, "teams", teamId);
    const snap = await getDoc(teamRef);
    if (!snap.exists()) throw new Error("Team not found");
    const team = snap.data() as Team;
    if (team.members.includes(studentId)) throw new Error("Already in this team");
    const maxSize = team.teamSize || 5; // Use teamSize from Firestore, fallback to 5
    if (team.members.length >= maxSize) throw new Error(`Team is full (max ${maxSize} members)`);
    await updateDoc(teamRef, { members: [...team.members, studentId] });
    await updateDoc(doc(db, "users", studentId), { teamId });
}

export async function getTeam(teamId: string): Promise<Team | null> {
    const snap = await getDoc(doc(db, "teams", teamId));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Team : null;
}

export async function getAllTeams(): Promise<Team[]> {
    const snap = await getDocs(collection(db, "teams"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
}

export async function updateTeamSubmission(teamId: string, submissionLink: string) {
    await updateDoc(doc(db, "teams", teamId), { submissionLink });
}

export async function updateTeamMembers(teamId: string, memberDetails: TeamMemberDetail[]) {
    await updateDoc(doc(db, "teams", teamId), { memberDetails });
}

export async function updateTeamRoom(teamId: string, room: string) {
    await updateDoc(doc(db, "teams", teamId), { room });
}

export async function getTeamByMember(studentId: string): Promise<Team | null> {
    const q = query(collection(db, "teams"), where("members", "array-contains", studentId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Team;
}
