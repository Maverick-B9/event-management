import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trophy, Loader2, Lock } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { generateLeaderboard, type LeaderboardEntry } from "../../../services/evaluationService";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

export default function StudentLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [published, setPublished] = useState<boolean | null>(null);

  // Real-time listener for leaderboard published setting
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "event"), (snap) => {
      const data = snap.data();
      setPublished(data?.leaderboardPublished === true);
    });
    return unsub;
  }, []);

  // Load leaderboard data only when published
  useEffect(() => {
    if (published !== true) {
      setLoading(false);
      return;
    }
    setLoading(true);
    generateLeaderboard()
      .then(setLeaderboard)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [published]);

  const rankColors = ["from-yellow-500 to-orange-500", "from-gray-400 to-gray-500", "from-orange-600 to-orange-700"];
  const rankBadge = (rank: number) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  // Not yet published
  if (published === false) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <div>
            <h2 className="text-2xl text-white font-bold">Leaderboard</h2>
            <p className="text-gray-400 text-sm">Teams ranked by total evaluation score</p>
          </div>
        </div>
        <Card className="bg-white/5 border-white/10 p-10 text-center">
          <Lock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400 text-lg font-medium mb-1">Leaderboard Not Published Yet</p>
          <p className="text-gray-500 text-sm">The leaderboard will be visible once the admin publishes it. Check back later.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <div>
          <h2 className="text-2xl text-white font-bold">Leaderboard</h2>
          <p className="text-gray-400 text-sm">Teams ranked by total evaluation score</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : leaderboard.length === 0 ? (
        <Card className="bg-white/5 border-white/10 p-10 text-center">
          <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No evaluations yet. Check back after jury evaluation.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <motion.div
              key={entry.teamId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: entry.rank * 0.05 }}
            >
              <Card className={`border-white/10 p-5 backdrop-blur-md overflow-hidden relative ${entry.rank <= 3 ? "bg-gradient-to-r from-yellow-900/20 to-transparent" : "bg-white/5"}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${entry.rank <= 3 ? `bg-gradient-to-br ${rankColors[entry.rank - 1]}` : "bg-white/10 text-gray-300"}`}>
                    {entry.rank <= 3 ? rankBadge(entry.rank) : entry.rank}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold text-lg">{entry.teamName}</div>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 mt-1">{entry.domain}</Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{entry.totalScore}</div>
                    <div className="text-xs text-gray-400">/ 50 points</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(entry.totalScore / 50) * 100}%` }}
                    transition={{ duration: 0.8, delay: entry.rank * 0.05 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                  />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
