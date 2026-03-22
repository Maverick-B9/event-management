import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function GlobalTitle({ fallback }: { fallback: string }) {
    const [title, setTitle] = useState<string | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "event"), (docSnap) => {
            if (docSnap.exists()) {
                setTitle(docSnap.data().eventName || null);
            }
        });
        return () => unsub();
    }, []);

    return <>{title || fallback}</>;
}
