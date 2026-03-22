import { useState } from "react";
import { motion } from "motion/react";
import { FileText, Download, Loader2, Trophy, Users, CheckCircle } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { getAllStudents } from "../../../services/studentService";
import { getAllTeams } from "../../../services/teamService";
import { generateLeaderboard } from "../../../services/evaluationService";
import { getAllAttendance } from "../../../services/attendanceService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function AdminReports() {
  const [loading, setLoading] = useState<string | null>(null);

  const exportStudentsPDF = async () => {
    setLoading("students-pdf");
    try {
      const students = await getAllStudents();
      const doc = new jsPDF();
      doc.text("Ignited Minds – Student Report", 14, 16);
      autoTable(doc, {
        startY: 22,
        head: [["Reg No", "Name", "Email", "Department", "Domain", "Team ID", "Status"]],
        body: students.map((s) => [s.regNo || "", s.name, s.email, s.department || "", s.domain || "", s.teamId || "", s.status]),
        styles: { fontSize: 8 },
      });
      doc.save("students_report.pdf");
      toast.success("Student report downloaded!");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(null); }
  };

  const exportAttendancePDF = async () => {
    setLoading("attendance-pdf");
    try {
      const [attendance, students] = await Promise.all([getAllAttendance(), getAllStudents()]);
      const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
      const doc = new jsPDF();
      doc.text("Ignited Minds – Attendance Report", 14, 16);
      autoTable(doc, {
        startY: 22,
        head: [["Student ID", "Name", "Reg No", "Status", "Time"]],
        body: attendance.map((a) => {
          const s = studentMap[a.studentId];
          return [a.studentId, s?.name || "—", s?.regNo || "—", a.present ? "Present" : "Absent", a.timestamp?.toDate?.().toLocaleString() || "—"];
        }),
        styles: { fontSize: 8 },
      });
      doc.save("attendance_report.pdf");
      toast.success("Attendance report downloaded!");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(null); }
  };

  const exportLeaderboardPDF = async () => {
    setLoading("leaderboard-pdf");
    try {
      const lb = await generateLeaderboard();
      const doc = new jsPDF();
      doc.text("Ignited Minds – Final Leaderboard", 14, 16);
      autoTable(doc, {
        startY: 22,
        head: [["Rank", "Team Name", "Domain", "Total Score"]],
        body: lb.map((e) => [e.rank, e.teamName, e.domain, `${e.totalScore}/50`]),
        styles: { fontSize: 9 },
      });
      doc.save("leaderboard.pdf");
      toast.success("Leaderboard downloaded!");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(null); }
  };

  const exportStudentsExcel = async () => {
    setLoading("students-excel");
    try {
      const students = await getAllStudents();
      const ws = XLSX.utils.json_to_sheet(students.map((s) => ({ "Reg No": s.regNo, Name: s.name, Email: s.email, Department: s.department, Domain: s.domain || "", "Team ID": s.teamId || "", Status: s.status })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, "students.xlsx");
      toast.success("Excel exported!");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(null); }
  };

  const exportStudentsCSV = async () => {
    setLoading("students-csv");
    try {
      const students = await getAllStudents();
      const rows = [["Reg No", "Name", "Email", "Department", "Domain", "Team ID", "Status"], ...students.map((s) => [s.regNo || "", s.name, s.email, s.department || "", s.domain || "", s.teamId || "", s.status])];
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "students.csv"; a.click();
      toast.success("CSV exported!");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(null); }
  };

  const reports = [
    { id: "students-pdf", label: "Student List", format: "PDF", icon: Users, color: "from-blue-600 to-cyan-600", handler: exportStudentsPDF },
    { id: "students-excel", label: "Student List", format: "Excel", icon: Users, color: "from-green-600 to-emerald-600", handler: exportStudentsExcel },
    { id: "students-csv", label: "Student List", format: "CSV", icon: Users, color: "from-purple-600 to-violet-600", handler: exportStudentsCSV },
    { id: "attendance-pdf", label: "Attendance Report", format: "PDF", icon: CheckCircle, color: "from-orange-600 to-red-600", handler: exportAttendancePDF },
    { id: "leaderboard-pdf", label: "Final Leaderboard", format: "PDF", icon: Trophy, color: "from-yellow-600 to-orange-600", handler: exportLeaderboardPDF },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-7 h-7 text-green-400" />
        <div>
          <h2 className="text-xl text-white font-bold">Reports & Export</h2>
          <p className="text-gray-400 text-sm">Export data as PDF, Excel, or CSV</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-white/5 border-white/10 p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color}/20 flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-1">{r.label}</h3>
                <Badge className="bg-white/10 text-gray-300 border-white/10 mb-4">{r.format}</Badge>
                <Button onClick={r.handler} disabled={loading === r.id} className={`w-full bg-gradient-to-r ${r.color}`}>
                  {loading === r.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                  Download {r.format}
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
