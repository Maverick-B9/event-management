import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

export type UserRole = "student" | "coordinator" | "jury" | "admin";

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    regNo?: string;
    department?: string;
    teamId?: string;
    domain?: string;
    status?: string;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUserProfile({ uid: firebaseUser.uid, ...userDoc.data() } as UserProfile);
                    } else {
                        setUserProfile(null);
                    }
                } catch {
                    setUserProfile(null);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
        setUserProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
