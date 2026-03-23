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
    onSnapshot,
    type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export interface Evaluation {
    id?: string;
    teamId: string;
    teamName?: string;
    domain?: string;
    juryId: string;
    innovation: number;
    feasibility: number;
    technicalDepth: number;
    presentation: number;
    impact: number;
    totalScore: number;
    remarks: string;
    createdAt?: any;
}

export interface LeaderboardEntry {
    rank: number;
    teamId: string;
    teamName: string;
    domain: string;
    totalScore: number;
}

export async function evaluateTeam(evalData: Omit<Evaluation, "id" | "totalScore" | "createdAt">) {
    const totalScore =
        evalData.innovation +
        evalData.feasibility +
        evalData.technicalDepth +
        evalData.presentation +
        evalData.impact;

    const docRef = doc(db, "evaluations", `${evalData.teamId}_${evalData.juryId}`);
    await setDoc(docRef, {
        ...evalData,
        totalScore,
        createdAt: serverTimestamp(),
    });
    return totalScore;
}

export async function getEvaluation(teamId: string, juryId: string): Promise<Evaluation | null> {
    const snap = await getDoc(doc(db, "evaluations", `${teamId}_${juryId}`));
    return snap.exists() ? { id: snap.id, ...snap.data() } as Evaluation : null;
}

export async function getAllEvaluations(): Promise<Evaluation[]> {
    const snap = await getDocs(collection(db, "evaluations"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Evaluation);
}

export async function getEvaluationsByJury(juryId: string): Promise<Evaluation[]> {
    const q = query(collection(db, "evaluations"), where("juryId", "==", juryId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Evaluation);
}

export async function generateLeaderboard(): Promise<LeaderboardEntry[]> {
    const evaluations = await getAllEvaluations();
    // Average scores per team (multiple jury members may evaluate same team)
    const teamScores: Record<string, { total: number; count: number; name: string; domain: string }> = {};
    for (const ev of evaluations) {
        if (!teamScores[ev.teamId]) {
            teamScores[ev.teamId] = { total: 0, count: 0, name: ev.teamName || ev.teamId, domain: ev.domain || "" };
        }
        teamScores[ev.teamId].total += ev.totalScore;
        teamScores[ev.teamId].count += 1;
    }
    return Object.entries(teamScores)
        .map(([teamId, data]) => ({
            teamId,
            teamName: data.name,
            domain: data.domain,
            totalScore: Math.round(data.total / data.count),
            rank: 0,
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

export async function updateEvaluation(
    evalId: string,
    fields: Partial<Pick<Evaluation, "innovation" | "feasibility" | "technicalDepth" | "presentation" | "impact" | "remarks">>
) {
    const docRef = doc(db, "evaluations", evalId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Evaluation not found");
    const current = snap.data() as Evaluation;
    const merged = { ...current, ...fields };
    const totalScore =
        merged.innovation +
        merged.feasibility +
        merged.technicalDepth +
        merged.presentation +
        merged.impact;
    await updateDoc(docRef, { ...fields, totalScore });
}

export function subscribeEvaluations(callback: (evaluations: Evaluation[]) => void): Unsubscribe {
    return onSnapshot(collection(db, "evaluations"), (snap) => {
        const evals = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Evaluation);
        callback(evals);
    });
}

export async function deleteEvaluation(evalId: string): Promise<void> {
    await deleteDoc(doc(db, "evaluations", evalId));
}

