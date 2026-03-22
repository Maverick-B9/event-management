import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, Trophy, Target, CheckCircle, TrendingUp, Calendar, Award } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

export default function AdminHome() {
  const [stats, setStats] = useState({ totalStudents: 0, totalTeams: 0, totalEvaluations: 0, totalAttendance: 0 });
  const [domainData, setDomainData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for students count
    const unsubStudents = onSnapshot(
      query(collection(db, "users"), where("role", "==", "student")),
      (snap) => {
        setStats((prev) => ({ ...prev, totalStudents: snap.size }));
        setLoading(false);
      }
    );

    // Real-time listener for teams — also drives domain distribution
    const unsubTeams = onSnapshot(collection(db, "teams"), (snap) => {
      setStats((prev) => ({ ...prev, totalTeams: snap.size }));

      // Count teams per domain for the pie chart
      const domainCounts: Record<string, number> = {};
      snap.docs.forEach((doc) => {
        const domain = doc.data().domain as string | undefined;
        if (domain) {
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        }
      });
      const chartData = Object.entries(domainCounts).map(([name, value]) => ({ name, value }));
      setDomainData(chartData);
      setLoading(false);
    });

    // Real-time listener for evaluations count
    const unsubEvals = onSnapshot(collection(db, "evaluations"), (snap) => {
      setStats((prev) => ({ ...prev, totalEvaluations: snap.size }));
    });

    // Real-time listener for attendance count
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      setStats((prev) => ({ ...prev, totalAttendance: snap.size }));
    });

    return () => {
      unsubStudents();
      unsubTeams();
      unsubEvals();
      unsubAttendance();
    };
  }, []);

  const statCards = [
    { label: "Total Students", value: stats.totalStudents, icon: Users, color: "from-blue-600 to-cyan-600" },
    { label: "Teams Formed", value: stats.totalTeams, icon: Trophy, color: "from-purple-600 to-pink-600" },
    { label: "Evaluations", value: stats.totalEvaluations, icon: CheckCircle, color: "from-green-600 to-emerald-600" },
    { label: "Present Today", value: stats.totalAttendance, icon: Calendar, color: "from-orange-600 to-red-600" },
  ];

  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`bg-gradient-to-br ${s.color}/20 border-white/10 p-6 backdrop-blur-md`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-green-400" />
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    Live
                  </Badge>
                </div>
                <h3 className="text-gray-400 text-sm mb-1">{s.label}</h3>
                <p className="text-3xl text-white font-bold">{loading ? "—" : s.value}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10 p-6 backdrop-blur-md">
          <h3 className="text-xl text-white font-semibold mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" /> Domain Distribution
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 ml-auto text-xs">
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </Badge>
          </h3>
          {domainData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={domainData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {domainData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                  itemStyle={{ color: "#d1d5db" }}
                  formatter={(value: number) => [`${value} team${value !== 1 ? "s" : ""}`, "Count"]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-gray-500 text-sm">
              No teams created yet
            </div>
          )}
        </Card>

        <Card className="bg-white/5 border-white/10 p-6 backdrop-blur-md">
          <h3 className="text-xl text-white font-semibold mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-400" /> Platform Summary
          </h3>
          <div className="space-y-4">
            {[
              { label: "Registration Rate", value: stats.totalStudents > 0 ? 100 : 0, color: "from-blue-500 to-cyan-500" },
              { label: "Team Formation", value: stats.totalStudents > 0 ? Math.round((stats.totalTeams * 4 / stats.totalStudents) * 100) : 0, color: "from-purple-500 to-pink-500" },
              { label: "Attendance Rate", value: stats.totalStudents > 0 ? Math.round((stats.totalAttendance / stats.totalStudents) * 100) : 0, color: "from-green-500 to-emerald-500" },
              { label: "Evaluation Progress", value: stats.totalTeams > 0 ? Math.round((stats.totalEvaluations / stats.totalTeams) * 100) : 0, color: "from-orange-500 to-red-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-white">{Math.min(item.value, 100)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(item.value, 100)}%` }} transition={{ duration: 1 }}
                    className={`h-full rounded-full bg-gradient-to-r ${item.color}`} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
