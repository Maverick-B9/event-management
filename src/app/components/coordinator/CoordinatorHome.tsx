import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, CheckCircle, Clock, XCircle, DoorOpen } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { getAllStudents } from "../../../services/studentService";
import { getAttendanceSummary } from "../../../services/attendanceService";
import { getAllTeams } from "../../../services/teamService";
import { useAuth } from "../../../hooks/useAuth";
import { subscribeUserRooms, type Room } from "../../../services/roomService";

interface CoordinatorHomeProps {
  onNavigate?: (tab: string) => void;
}

export default function CoordinatorHome({ onNavigate }: CoordinatorHomeProps) {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({ totalStudents: 0, present: 0, absent: 0, teams: 0 });
  const [loading, setLoading] = useState(true);
  const [myRooms, setMyRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsub = subscribeUserRooms(userProfile.uid, undefined, "coordinator", setMyRooms);
    return unsub;
  }, [userProfile]);

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

      {/* Room Allotment */}
      {myRooms.length > 0 && (
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
      )}
    </div>
  );
}
