import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Search, CheckCircle, XCircle, Loader2, QrCode } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getAllStudents, type Student } from "../../../services/studentService";
import { getAttendance } from "../../../services/attendanceService";
import { markAttendance } from "../../../services/attendanceService";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

export default function CoordinatorParticipants() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedQr, setSelectedQr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const studs = await getAllStudents();
        setStudents(studs);
        const records: Record<string, boolean> = {};
        for (const s of studs) {
          if (s.id) { const att = await getAttendance(s.id); records[s.id] = !!att?.present; }
        }
        setAttendance(records);
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.regNo?.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleMarkAttendance = async (studentId: string) => {
    try {
      await markAttendance(studentId);
      setAttendance((prev) => ({ ...prev, [studentId]: true }));
      toast.success("Attendance marked!");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, regNo, or email..." className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
      </div>

      {/* QR Modal */}
      {selectedQr && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedQr(null)}>
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold">Student QR Code</h3>
            <div className="bg-white p-4 rounded-xl"><QRCodeSVG value={selectedQr} size={200} /></div>
            <p className="text-gray-400 text-xs font-mono">{selectedQr}</p>
            <Button onClick={() => setSelectedQr(null)} variant="outline" className="border-white/20">Close</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((student, i) => (
            <motion.div key={student.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="bg-white/5 border-white/10 p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">{student.name}</div>
                    <div className="text-gray-400 text-sm">{student.regNo} · {student.department}</div>
                  </div>
                  {student.teamId && <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">{student.teamId.slice(0, 6)}...</Badge>}
                  <div className="flex items-center gap-2 ml-auto">
                    {attendance[student.id!] ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                        <CheckCircle className="w-3 h-3 mr-1" /> Present
                      </Badge>
                    ) : (
                      <>
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
                          <XCircle className="w-3 h-3 mr-1" /> Absent
                        </Badge>
                        <Button size="sm" onClick={() => handleMarkAttendance(student.id!)} className="bg-green-600 hover:bg-green-700 h-7 text-xs">Mark Present</Button>
                      </>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setSelectedQr(student.id!)} className="border-white/20 h-7 w-7 p-0">
                      <QrCode className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && <div className="text-center text-gray-400 py-10">No students found</div>}
        </div>
      )}
    </div>
  );
}
