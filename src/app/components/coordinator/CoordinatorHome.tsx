import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { getAllStudents } from "../../../services/studentService";
import { getAttendanceSummary } from "../../../services/attendanceService";
import { getAllTeams } from "../../../services/teamService";

interface CoordinatorHomeProps {
  onNavigate?: (tab: string) => void;
}

export default function CoordinatorHome({ onNavigate }: CoordinatorHomeProps) {
  const [stats, setStats] = useState({ totalStudents: 0, present: 0, absent: 0, teams: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [students, attendance, teams] = await Promise.all([
          getAllStudents(),
          getAttendanceSummary(),
          getAllTeams(),
        ]);
        setStats({
          totalStudents: students.length,
          present: attendance.present,
          absent: students.length - attendance.present,
          teams: teams.length,
        });
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, []);

  const cards = [
    { label: "Total Students", value: stats.totalStudents, icon: Users, color: "from-blue-600 to-cyan-600" },
    { label: "Present Today", value: stats.present, icon: CheckCircle, color: "from-green-600 to-emerald-600" },
    { label: "Absent", value: stats.absent, icon: XCircle, color: "from-red-600 to-orange-600" },
    { label: "Teams Formed", value: stats.teams, icon: Users, color: "from-purple-600 to-pink-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`bg-gradient-to-br ${card.color}/20 border-white/10 p-6 backdrop-blur-md`}>
                <Icon className="w-8 h-8 text-white/60 mb-3" />
                <div className="text-3xl text-white font-bold mb-1">{loading ? "—" : card.value}</div>
                <div className="text-sm text-gray-400">{card.label}</div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card className="bg-white/5 border-white/10 p-6">
        <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div
            onClick={() => onNavigate?.("scanner")}
            className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center cursor-pointer hover:bg-purple-500/20 transition-colors"
          >
            <CheckCircle className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-white text-sm font-medium">Scan QR Code</div>
            <div className="text-gray-400 text-xs">Mark attendance via camera</div>
          </div>
          <div
            onClick={() => onNavigate?.("participants")}
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center cursor-pointer hover:bg-blue-500/20 transition-colors"
          >
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-white text-sm font-medium">View Participants</div>
            <div className="text-gray-400 text-xs">Search and manage students</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
            <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-white text-sm font-medium">Attendance Rate</div>
            <div className="text-white font-bold text-lg">
              {!loading && stats.totalStudents > 0 ? `${Math.round((stats.present / stats.totalStudents) * 100)}%` : "—"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
