import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function GlobalLogo({ fallback }: { fallback: React.ReactNode }) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "logos"), (docSnap) => {
            if (docSnap.exists()) {
                const logos = docSnap.data();
                setLogoUrl(logos.event || logos.college || logos.department || logos.club || null);
            } else {
                setLogoUrl(null);
            }
        });
        return () => unsub();
    }, []);

    return logoUrl ? (
        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5 rounded-lg" />
    ) : (
        <>{fallback}</>
    );
}
