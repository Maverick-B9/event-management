import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trophy, Loader2 } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { generateLeaderboard, type LeaderboardEntry } from "../../../services/evaluationService";

export default function JuryLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateLeaderboard().then(setLeaderboard).catch(() => { }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <div>
          <h2 className="text-2xl text-white font-bold">Team Rankings</h2>
          <p className="text-gray-400 text-sm">Average score across all jury evaluations</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>
      ) : leaderboard.length === 0 ? (
        <Card className="bg-white/5 border-white/10 p-10 text-center"><p className="text-gray-400">No evaluations submitted yet.</p></Card>
      ) : (
        leaderboard.map((entry) => (
          <motion.div key={entry.teamId} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: entry.rank * 0.04 }}>
            <Card className={`border-white/10 p-5 ${entry.rank <= 3 ? "bg-gradient-to-r from-yellow-900/20 to-transparent" : "bg-white/5"}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${entry.rank <= 3 ? "bg-gradient-to-br from-yellow-500 to-orange-500" : "bg-white/10 text-gray-300"}`}>
                  {entry.rank <= 3 ? (entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉") : entry.rank}
                </div>
                <div className="flex-1">
                  <div className="text-white font-semibold">{entry.teamName}</div>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 mt-1">{entry.domain}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{entry.totalScore}</div>
                  <div className="text-xs text-gray-400">/ 50</div>
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(entry.totalScore / 50) * 100}%` }} transition={{ duration: 0.8, delay: entry.rank * 0.04 }}
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500" />
              </div>
            </Card>
          </motion.div>
        ))
      )}
    </div>
  );
}
