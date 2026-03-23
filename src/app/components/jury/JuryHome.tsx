import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trophy, ClipboardList, Loader2, DoorOpen } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { generateLeaderboard, type LeaderboardEntry } from "../../../services/evaluationService";
import { getAllTeams } from "../../../services/teamService";
import { getAllStudents } from "../../../services/studentService";
import { getAllEvaluations } from "../../../services/evaluationService";
import { useAuth } from "../../../hooks/useAuth";
import { subscribeUserRooms, type Room } from "../../../services/roomService";

export default function JuryHome() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({ teams: 0, students: 0, evaluations: 0 });
  const [loading, setLoading] = useState(true);
  const [topTeams, setTopTeams] = useState<LeaderboardEntry[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsub = subscribeUserRooms(userProfile.uid, undefined, "jury", setMyRooms);
    return unsub;
  }, [userProfile]);

  useEffect(() => {
    async function load() {
      try {
        const [teams, students, evaluations, lb] = await Promise.all([
          getAllTeams(), getAllStudents(), getAllEvaluations(), generateLeaderboard()
        ]);
        setStats({ teams: teams.length, students: students.length, evaluations: evaluations.length });
        setTopTeams(lb.slice(0, 3));
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Teams", value: stats.teams, color: "from-orange-600 to-red-600" },
          { label: "Total Students", value: stats.students, color: "from-purple-600 to-pink-600" },
          { label: "Evaluations Done", value: stats.evaluations, color: "from-green-600 to-emerald-600" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className={`bg-gradient-to-br ${s.color}/20 border-white/10 p-6 backdrop-blur-md`}>
              <div className="text-3xl text-white font-bold mb-1">{loading ? "—" : s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      {topTeams.length > 0 && (
        <Card className="bg-white/5 border-white/10 p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" /> Top 3 Teams
          </h3>
          <div className="space-y-3">
            {topTeams.map((t) => (
              <div key={t.teamId} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                <div className="text-2xl">{t.rank === 1 ? "🥇" : t.rank === 2 ? "🥈" : "🥉"}</div>
                <div className="flex-1">
                  <div className="text-white font-medium">{t.teamName}</div>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">{t.domain}</Badge>
                </div>
                <div className="text-white font-bold">{t.totalScore}/50</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Room Allotment */}
      {myRooms.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 border-teal-500/30 p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-teal-400" /> Your Room Allotment
            </h3>
            <div className="space-y-2">
              {myRooms.map((room) => (
                <div key={room.id} className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shrink-0">
                    <DoorOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold">{room.name}</div>
                    {room.floor && <div className="text-teal-300/80 text-xs">{room.floor}</div>}
                  </div>
                  <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-xs shrink-0">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                    </span>
                    Assigned
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
