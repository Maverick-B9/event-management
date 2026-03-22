import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bell, Loader2 } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { subscribeAnnouncements, type Announcement } from "../../../services/announcementService";
import { formatDistanceToNow } from "date-fns";

export default function CoordinatorAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = subscribeAnnouncements("coordinator", (data) => {
            setAnnouncements(data);
            setLoading(false);
        });
        return unsub;
    }, []);

    const audienceLabel = (aud: string) => {
        if (aud === "coordinator") return "Coordinators";
        if (aud === "staff") return "Staff";
        return null;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
                <Bell className="w-7 h-7 text-orange-400" />
                <h2 className="text-2xl text-white font-bold">Announcements</h2>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                </div>
            ) : announcements.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-10 text-center">
                    <Bell className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">No announcements yet.</p>
                </Card>
            ) : (
                announcements.map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="bg-white/5 border-white/10 p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center shrink-0">
                                    <Bell className="w-6 h-6 text-orange-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-white font-semibold">{a.title}</h3>
                                        {audienceLabel(a.audience) && (
                                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">{audienceLabel(a.audience)}</Badge>
                                        )}
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed">{a.description}</p>
                                    {a.timestamp?.toDate && (
                                        <div className="text-xs text-gray-500 mt-2">{formatDistanceToNow(a.timestamp.toDate(), { addSuffix: true })}</div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))
            )}
        </div>
    );
}
