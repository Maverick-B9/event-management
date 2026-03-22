import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function ThemeApplier() {
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "event"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.theme) {
                    // The theme string is a Tailwind gradient, e.g., "from-purple-900 via-blue-900 to-gray-900"
                    document.body.className = `bg-gradient-to-br ${data.theme}`;
                    document.body.style.minHeight = "100vh";
                    document.body.style.backgroundAttachment = "fixed";
                } else {
                    // Default fallbacks
                    document.body.className = "bg-gradient-to-br from-[#0a0a0f] via-[#1a0a2e] to-[#0a0a0f]";
                    document.body.style.minHeight = "100vh";
                    document.body.style.backgroundAttachment = "fixed";
                }
            }
        });

        return () => unsub();
    }, []);

    return null;
}
