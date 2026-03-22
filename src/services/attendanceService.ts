import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";
import { db } from "../firebase/firebase";

export interface AttendanceRecord {
    studentId: string;
    present: boolean;
    timestamp?: any;
}

export interface FoodCouponRecord {
    studentId: string;
    redeemed: boolean;
    timestamp?: any;
}

export async function markAttendance(studentId: string) {
    const ref = doc(db, "attendance", studentId);
    const existing = await getDoc(ref);
    if (existing.exists() && existing.data().present) {
        throw new Error("Already checked in");
    }
    await setDoc(ref, {
        studentId,
        present: true,
        timestamp: serverTimestamp(),
    });
}

export async function getAttendance(studentId: string): Promise<AttendanceRecord | null> {
    const snap = await getDoc(doc(db, "attendance", studentId));
    return snap.exists() ? snap.data() as AttendanceRecord : null;
}

export function listenToAttendance(studentId: string, callback: (record: AttendanceRecord | null) => void) {
    return onSnapshot(doc(db, "attendance", studentId), (snap) => {
        callback(snap.exists() ? snap.data() as AttendanceRecord : null);
    });
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
    const snap = await getDocs(collection(db, "attendance"));
    return snap.docs.map((d) => d.data() as AttendanceRecord);
}

export async function getAttendanceSummary() {
    const all = await getAllAttendance();
    const present = all.filter((a) => a.present).length;
    return { total: all.length, present, absent: all.length - present };
}

// ── Food Coupon ──────────────────────────────────────────────────────────────

export async function markFoodCoupon(studentId: string) {
    const ref = doc(db, "foodCoupons", studentId);
    const existing = await getDoc(ref);
    if (existing.exists() && existing.data().redeemed) {
        throw new Error("Food coupon already redeemed");
    }
    await setDoc(ref, {
        studentId,
        redeemed: true,
        timestamp: serverTimestamp(),
    });
}

export async function getFoodCoupon(studentId: string): Promise<FoodCouponRecord | null> {
    const snap = await getDoc(doc(db, "foodCoupons", studentId));
    return snap.exists() ? snap.data() as FoodCouponRecord : null;
}

export function listenToFoodCoupon(studentId: string, callback: (record: FoodCouponRecord | null) => void) {
    return onSnapshot(doc(db, "foodCoupons", studentId), (snap) => {
        callback(snap.exists() ? snap.data() as FoodCouponRecord : null);
    });
}

export async function getAllFoodCoupons(): Promise<FoodCouponRecord[]> {
    const snap = await getDocs(collection(db, "foodCoupons"));
    return snap.docs.map((d) => d.data() as FoodCouponRecord);
}
