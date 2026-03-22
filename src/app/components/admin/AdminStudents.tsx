import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Upload, Plus, Trash2, RefreshCw, Loader2, UserPlus, Download,
  FileSpreadsheet, Eye, CheckCircle, XCircle, AlertTriangle, Mail, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { getAllStudents, deleteStudent, registerStudent, type Student } from "../../../services/studentService";
import { forceChangeUserPassword } from "../../../services/adminService";
import { createTeam } from "../../../services/teamService";
import { sendWelcomeEmail, type EmailResult } from "../../../services/emailService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import Papa from "papaparse";
import { toast } from "sonner";
import * as XLSX from "xlsx";

/* -------------------------------------------------------
   Types for the Excel upload flow
------------------------------------------------------- */
interface ParsedRow {
  emailAddress: string;  // Column B
  teamName: string;      // Column C
  leaderName: string;    // Column D
  teamSize: number;      // Column E
  contactNo: string;     // Column F
  emailId: string;       // Column G — LOGIN EMAIL
  branch: string;        // Column H
  college: string;       // Column I
  domain: string;        // Column J
  paymentLink: string;   // Column K
  autoEmail: boolean;    // true if email was auto-generated
  valid: boolean;
  errors: string[];
}

interface UploadProgress {
  total: number;
  current: number;
  currentName: string;
  accountResults: { name: string; email: string; success: boolean; error?: string }[];
  emailResults: EmailResult[];
}

/* -------------------------------------------------------
   Component
------------------------------------------------------- */
export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const xlsxRef = useRef<HTMLInputElement>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add single student form state
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRegNo, setAddRegNo] = useState("");
  const [addDept, setAddDept] = useState("");
  const [addCollege, setAddCollege] = useState("");
  const [addMobile, setAddMobile] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [adding, setAdding] = useState(false);

  // Password Reset
  const [resetUser, setResetUser] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Excel Upload Preview
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [showResults, setShowResults] = useState(false);

  /* ---- Data Loading ---- */
  const load = async () => {
    setLoading(true);
    try { setStudents(await getAllStudents()); } catch { /* ignore */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = students.filter((s: Student) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.regNo?.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  /* ---- Single Student ---- */
  const handleDelete = async (student: Student) => {
    if (!confirm(`Delete ${student.name}? This cannot be undone.`)) return;
    try {
      await deleteStudent(student.id!, student.email, student.initialPassword);
      setStudents((prev: Student[]) => prev.filter((s: Student) => s.id !== student.id));
      toast.success("Student deleted");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleForceReset = async () => {
    if (!resetUser || !newPassword) return;
    if (!resetUser.initialPassword) {
      toast.error("Cannot reset: Missing original password for this account.");
      return;
    }
    setResetting(true);
    try {
      await forceChangeUserPassword(resetUser.email, resetUser.initialPassword, newPassword);
      await updateDoc(doc(db, "users", resetUser.id!), { initialPassword: newPassword });
      toast.success(`Password changed successfully for ${resetUser.name}`);
      setResetUser(null);
      setNewPassword("");
      load();
    } catch (e: any) {
      toast.error("Failed to change password: " + e.message);
    } finally {
      setResetting(false);
    }
  };

  const handleAddStudent = async () => {
    if (!addName || !addEmail || !addPassword) { toast.error("Name, email, and password are required"); return; }
    setAdding(true);
    try {
      await registerStudent({ name: addName, email: addEmail, regNo: addRegNo, department: addDept, college: addCollege, mobile: addMobile, status: "active" }, addPassword);
      toast.success("Student created successfully!");
      setAddName(""); setAddEmail(""); setAddRegNo(""); setAddDept(""); setAddCollege(""); setAddMobile(""); setAddPassword("");
      setShowAddForm(false);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setAdding(false); }
  };

  /* ---- Excel Parsing ---- */
  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

        // Build a normalizer: strip all spaces, dots, hyphens, underscores, parens and lowercase
        const normalize = (s: string) => s.toLowerCase().replace(/[\s.\-_()\/]/g, "");

        // Helper: find a column value by checking multiple normalized keywords
        const findCol = (row: Record<string, any>, keywords: string[]): string => {
          for (const key of Object.keys(row)) {
            const nk = normalize(key);
            for (const kw of keywords) {
              if (nk === normalize(kw) || nk.includes(normalize(kw))) {
                const val = String(row[key] ?? "").trim();
                if (val) return val;
              }
            }
          }
          return "";
        };

        // Helper: auto-generate email from leader name (with deduplication)
        const usedEmails = new Set<string>();
        const generateEmail = (name: string): string => {
          const parts = name.toLowerCase().trim().split(/\s+/).filter(Boolean);
          if (parts.length === 0) return `student.${Date.now()}@ignitedminds.com`;
          // Use first two parts max: firstname.lastname
          const slug = parts.slice(0, 2).join(".").replace(/[^a-z0-9.]/g, "");
          let candidate = `${slug}@ignitedminds.com`;
          let suffix = 2;
          while (usedEmails.has(candidate)) {
            candidate = `${slug}${suffix}@ignitedminds.com`;
            suffix++;
          }
          usedEmails.add(candidate);
          return candidate;
        };

        const rows: ParsedRow[] = jsonData.map((row) => {
          const errors: string[] = [];

          // Map columns — robust matching via normalized header keywords
          const emailAddress = findCol(row, ["Email address"]);
          const teamName = findCol(row, ["Team name"]);
          const leaderName = findCol(row, ["Team leader name"]);
          const teamSizeRaw = findCol(row, ["Team size"]) || "0";
          const contactRaw = findCol(row, ["Team leader contact no", "Contact no", "Contact number", "Phone", "Mobile"]);
          let emailId = findCol(row, ["Email ID", "Email Id"]);
          const branch = findCol(row, ["Branch"]);
          const college = findCol(row, ["College"]);
          const domain = findCol(row, ["Domain"]);
          const paymentLink = findCol(row, ["Pay for registration", "Payment Link", "Payment"]);

          // Clean contact number — remove spaces, +91, etc.
          const contactNo = contactRaw.replace(/[\s\-\+]/g, "").replace(/^91/, "").replace(/^0/, "");

          const teamSize = parseInt(teamSizeRaw, 10) || 0;

          // Auto-generate email if missing or invalid
          let autoEmail = false;
          if (!emailId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailId)) {
            if (leaderName) {
              emailId = generateEmail(leaderName);
              autoEmail = true;
            } else {
              errors.push("Missing Email ID and no leader name to generate one");
            }
          }

          // Validation (email is now always present if leaderName exists)
          if (!leaderName) errors.push("Missing Team leader name");
          if (!contactNo) errors.push("Missing contact no. (used as password)");
          else if (contactNo.length < 6) errors.push("Contact no. too short for password");
          if (!teamName) errors.push("Missing Team name");

          return {
            emailAddress,
            teamName,
            leaderName,
            teamSize,
            contactNo,
            emailId,
            branch,
            college,
            domain,
            paymentLink,
            autoEmail,
            valid: errors.length === 0,
            errors,
          };
        });

        // Filter out completely empty rows
        const nonEmpty = rows.filter((r) => r.emailId || r.leaderName || r.teamName);

        setParsedRows(nonEmpty);
        setShowPreview(true);
      } catch (err: any) {
        toast.error("Failed to parse Excel file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  /* ---- Bulk Upload Execution ---- */
  const handleConfirmUpload = async () => {
    const validRows = parsedRows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error("No valid rows to upload");
      return;
    }

    setUploading(true);
    setShowPreview(false);
    setShowResults(true);

    const progress: UploadProgress = {
      total: validRows.length,
      current: 0,
      currentName: "",
      accountResults: [],
      emailResults: [],
    };
    setUploadProgress({ ...progress });

    for (const row of validRows) {
      progress.current++;
      progress.currentName = row.leaderName;
      setUploadProgress({ ...progress });

      // 1. Create Firebase Auth account + Firestore doc
      let accountSuccess = false;
      try {
        const result = await registerStudent(
          {
            name: row.leaderName,
            email: row.emailId,
            regNo: "",
            department: row.branch,
            college: row.college,
            mobile: row.contactNo,
            teamName: row.teamName,
            teamSize: row.teamSize,
            domain: row.domain,
            paymentLink: row.paymentLink,
            status: "active",
          },
          row.contactNo, // password = phone number
        );

        accountSuccess = true;
        progress.accountResults.push({ name: row.leaderName, email: row.emailId, success: true });

        // 2. Auto-create team
        const uid = result?.uid;
        if (uid && row.teamName) {
          try {
            await createTeam(row.teamName, row.domain, uid, row.teamSize, row.leaderName);
          } catch {
            // Team creation might fail if team exists — non-blocking
          }
        }
      } catch (e: any) {
        progress.accountResults.push({ name: row.leaderName, email: row.emailId, success: false, error: e.message });
      }

      // 3. Send welcome email (only if account was created)
      if (accountSuccess) {
        try {
          const emailResult = await sendWelcomeEmail(
            row.emailId,
            row.leaderName,
            row.contactNo,
            row.teamName,
            row.domain,
          );
          progress.emailResults.push(emailResult);
        } catch (e: any) {
          progress.emailResults.push({ email: row.emailId, success: false, error: e.message });
        }
      }

      setUploadProgress({ ...progress });
    }

    setUploading(false);
    load();
    toast.success(`Upload complete: ${progress.accountResults.filter((r) => r.success).length}/${validRows.length} accounts created`);
  };

  /* ---- Download Credentials CSV ---- */
  const handleDownloadCredentials = () => {
    if (students.length === 0) { toast.error("No students to export"); return; }
    const rows = students.map((s: Student) => ({
      "Name": s.name,
      "Email (User ID)": s.email,
      "Department": s.department || "",
      "College": s.college || "",
      "Mobile": s.mobile || "",
      "Team": s.teamName || "",
      "Domain": s.domain || "",
      "Initial Password": s.initialPassword || "",
      "Status": s.status,
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "student_credentials.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Student credentials downloaded!");
  };

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, regNo, or email..." className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-gradient-to-r from-green-600 to-teal-600 flex-1 sm:flex-none">
            <UserPlus className="w-4 h-4 mr-2" /> Add Student
          </Button>
          <input ref={xlsxRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelFile} />
          <Button onClick={() => xlsxRef.current?.click()} disabled={uploading} className="bg-gradient-to-r from-purple-600 to-indigo-600 flex-1 sm:flex-none">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Import Excel
          </Button>
          <Button onClick={handleDownloadCredentials} className="bg-gradient-to-r from-orange-600 to-amber-600 flex-1 sm:flex-none">
            <Download className="w-4 h-4 mr-2" /> Credentials
          </Button>
          <Button onClick={load} variant="outline" className="border-white/20 px-3">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Add Single Student Form */}
      {showAddForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-white/5 border-white/10 p-6 space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-400" /> Add New Student
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full Name *" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
              <Input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} type="email" placeholder="Email Address *" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
              <Input value={addPassword} onChange={(e) => setAddPassword(e.target.value)} type="password" placeholder="Password *" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
              <Input value={addRegNo} onChange={(e) => setAddRegNo(e.target.value)} placeholder="Registration No" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
              <Input value={addDept} onChange={(e) => setAddDept(e.target.value)} placeholder="Department" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
              <Input value={addCollege} onChange={(e) => setAddCollege(e.target.value)} placeholder="College" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
              <Input value={addMobile} onChange={(e) => setAddMobile(e.target.value)} placeholder="Mobile Number" type="tel" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button onClick={() => setShowAddForm(false)} variant="ghost" className="text-gray-400 hover:text-white">Cancel</Button>
              <Button onClick={handleAddStudent} disabled={adding} className="bg-gradient-to-r from-green-600 to-teal-600">
                {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Create Student
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: students.length, color: "bg-blue-600/20 border-blue-500/30" },
          { label: "Active", value: students.filter((s: Student) => s.status === "active").length, color: "bg-green-600/20 border-green-500/30" },
          { label: "With Teams", value: students.filter((s: Student) => s.teamId).length, color: "bg-purple-600/20 border-purple-500/30" },
          { label: "Showing", value: filtered.length, color: "bg-orange-600/20 border-orange-500/30" },
        ].map((s) => (
          <Card key={s.label} className={`${s.color} p-4 backdrop-blur-md`}>
            <div className="text-2xl text-white font-bold">{loading ? "—" : s.value}</div>
            <div className="text-sm text-gray-400">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Student Table */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-green-400 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-white/5">
                  <TableHead className="text-gray-300 whitespace-nowrap">Name</TableHead>
                  <TableHead className="text-gray-300 whitespace-nowrap hidden sm:table-cell">Email</TableHead>
                  <TableHead className="text-gray-300 whitespace-nowrap hidden md:table-cell">Branch</TableHead>
                  <TableHead className="text-gray-300 whitespace-nowrap hidden md:table-cell">College</TableHead>
                  <TableHead className="text-gray-300 whitespace-nowrap hidden lg:table-cell">Mobile</TableHead>
                  <TableHead className="text-gray-300 whitespace-nowrap hidden lg:table-cell">Team</TableHead>
                  <TableHead className="text-gray-300 whitespace-nowrap hidden lg:table-cell">Domain</TableHead>
                  <TableHead className="text-gray-300 whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-gray-300 whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((student, i) => (
                  <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white whitespace-nowrap">{student.name}</TableCell>
                    <TableCell className="text-gray-400 text-sm hidden sm:table-cell">{student.email}</TableCell>
                    <TableCell className="text-gray-400 text-sm hidden md:table-cell">{student.department || "—"}</TableCell>
                    <TableCell className="text-gray-400 text-sm hidden md:table-cell">{student.college || "—"}</TableCell>
                    <TableCell className="text-gray-400 text-sm hidden lg:table-cell">{student.mobile || "—"}</TableCell>
                    <TableCell className="text-gray-400 text-sm hidden lg:table-cell">{student.teamName || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{student.domain ? <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">{student.domain}</Badge> : <span className="text-gray-500 text-xs">—</span>}</TableCell>
                    <TableCell>
                      <Badge className={student.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/40 text-xs" : "bg-gray-500/20 text-gray-400 border-gray-500/40 text-xs"}>
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-orange-400 hover:text-orange-300" onClick={() => setResetUser(student)} title="Change password">
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300" onClick={() => handleDelete(student)} title="Delete">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-gray-400 py-10">No students found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <div className="text-xs text-gray-500">
        Import from Excel with columns: <code className="bg-white/5 px-1 rounded">Email address, Team name, Team leader name, Team size, Contact no., Email ID, Branch, College, Domain, Payment Link</code>
      </div>

      {/* ====== PREVIEW MODAL ====== */}
      <AnimatePresence>
        {showPreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                <div>
                  <h3 className="text-xl text-white font-semibold flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-400" /> Preview Upload Data
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Review the data below before confirming. Password = Contact No.
                  </p>
                </div>
                <Button variant="ghost" className="text-gray-400 hover:text-white p-2" onClick={() => setShowPreview(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap gap-3 px-6 py-4 border-b border-white/10 shrink-0">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">
                  {parsedRows.length} Total Rows
                </Badge>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/40">
                  <CheckCircle className="w-3 h-3 mr-1" /> {validCount} Valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/40">
                    <XCircle className="w-3 h-3 mr-1" /> {invalidCount} Invalid
                  </Badge>
                )}
              </div>

              {/* Scrollable Table */}
              <div className="flex-1 overflow-auto px-6 py-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-gray-300 whitespace-nowrap w-8">#</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Team Leader Name</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Email ID (Login)</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Password (Phone)</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Team Name</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Size</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Branch</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">College</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Domain</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, i) => (
                      <TableRow key={i} className={`border-white/10 ${!row.valid ? "bg-red-500/5" : "hover:bg-white/5"}`}>
                        <TableCell className="text-gray-500 text-xs">{i + 1}</TableCell>
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <div className="group relative">
                              <XCircle className="w-4 h-4 text-red-400" />
                              <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-red-900/90 border border-red-500/30 text-red-200 text-xs p-2 rounded-lg whitespace-nowrap z-10 max-w-xs">
                                {row.errors.map((e, j) => <div key={j}>• {e}</div>)}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-white text-sm whitespace-nowrap">{row.leaderName || <span className="text-red-400">—</span>}</TableCell>
                        <TableCell className="text-blue-300 text-sm">
                          <span className="flex items-center gap-1">
                            {row.emailId || <span className="text-red-400">Missing</span>}
                            {row.autoEmail && <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 text-[10px] px-1.5 py-0">Auto</Badge>}
                          </span>
                        </TableCell>
                        <TableCell className="text-green-300 font-mono text-sm">{row.contactNo || <span className="text-red-400">—</span>}</TableCell>
                        <TableCell className="text-gray-300 text-sm whitespace-nowrap">{row.teamName || "—"}</TableCell>
                        <TableCell className="text-gray-400 text-sm text-center">{row.teamSize || "—"}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{row.branch || "—"}</TableCell>
                        <TableCell className="text-gray-400 text-sm whitespace-nowrap">{row.college || "—"}</TableCell>
                        <TableCell>{row.domain ? <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">{row.domain}</Badge> : <span className="text-gray-500 text-xs">—</span>}</TableCell>
                        <TableCell>
                          {row.paymentLink ? (
                            <a href={row.paymentLink} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 text-xs underline truncate block max-w-[120px]">View</a>
                          ) : <span className="text-gray-500 text-xs">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-white/10 shrink-0">
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {invalidCount} row(s) will be skipped
                  </div>
                )}
                <div className="flex gap-3 ml-auto">
                  <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => setShowPreview(false)}>Cancel</Button>
                  <Button onClick={handleConfirmUpload} disabled={validCount === 0} className="bg-gradient-to-r from-purple-600 to-indigo-600">
                    <Upload className="w-4 h-4 mr-2" /> Confirm Upload ({validCount} students)
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== UPLOAD PROGRESS / RESULTS MODAL ====== */}
      <AnimatePresence>
        {showResults && uploadProgress && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                <h3 className="text-xl text-white font-semibold flex items-center gap-2">
                  {uploading ? (
                    <><Loader2 className="w-5 h-5 text-purple-400 animate-spin" /> Uploading...</>
                  ) : (
                    <><CheckCircle className="w-5 h-5 text-green-400" /> Upload Complete</>
                  )}
                </h3>
                {!uploading && (
                  <Button variant="ghost" className="text-gray-400 hover:text-white p-2" onClick={() => { setShowResults(false); setUploadProgress(null); }}>
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Progress */}
              {uploading && (
                <div className="px-6 py-4 border-b border-white/10 space-y-3 shrink-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Processing: <span className="text-white">{uploadProgress.currentName}</span></span>
                    <span className="text-gray-400">{uploadProgress.current}/{uploadProgress.total}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Summary Stats */}
              <div className="flex flex-wrap gap-3 px-6 py-4 border-b border-white/10 shrink-0">
                <Badge className="bg-green-500/20 text-green-300 border-green-500/40">
                  <CheckCircle className="w-3 h-3 mr-1" /> {uploadProgress.accountResults.filter((r) => r.success).length} Accounts Created
                </Badge>
                {uploadProgress.accountResults.filter((r) => !r.success).length > 0 && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/40">
                    <XCircle className="w-3 h-3 mr-1" /> {uploadProgress.accountResults.filter((r) => !r.success).length} Account Failures
                  </Badge>
                )}
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">
                  <Mail className="w-3 h-3 mr-1" /> {uploadProgress.emailResults.filter((r) => r.success).length} Emails Sent
                </Badge>
                {uploadProgress.emailResults.filter((r) => !r.success).length > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40">
                    <AlertTriangle className="w-3 h-3 mr-1" /> {uploadProgress.emailResults.filter((r) => !r.success).length} Email Failures
                  </Badge>
                )}
              </div>

              {/* Results Table */}
              <div className="flex-1 overflow-auto px-6 py-4">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-gray-300 whitespace-nowrap">Name</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Email</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Account</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Email Sent</TableHead>
                      <TableHead className="text-gray-300 whitespace-nowrap">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadProgress.accountResults.map((r, i) => {
                      const emailResult = uploadProgress.emailResults[i];
                      return (
                        <TableRow key={i} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white text-sm">{r.name}</TableCell>
                          <TableCell className="text-gray-400 text-sm">{r.email}</TableCell>
                          <TableCell>
                            {r.success
                              ? <CheckCircle className="w-4 h-4 text-green-400" />
                              : <XCircle className="w-4 h-4 text-red-400" />
                            }
                          </TableCell>
                          <TableCell>
                            {emailResult
                              ? emailResult.success
                                ? <CheckCircle className="w-4 h-4 text-green-400" />
                                : <XCircle className="w-4 h-4 text-yellow-400" />
                              : r.success
                                ? <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                                : <span className="text-gray-500 text-xs">—</span>
                            }
                          </TableCell>
                          <TableCell className="text-red-400 text-xs max-w-[200px] truncate">
                            {r.error || emailResult?.error || ""}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Footer */}
              {!uploading && (
                <div className="flex justify-end p-6 border-t border-white/10 shrink-0">
                  <Button className="bg-gradient-to-r from-green-600 to-teal-600" onClick={() => { setShowResults(false); setUploadProgress(null); }}>
                    Done
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== PASSWORD RESET MODAL ====== */}
      {resetUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="bg-[#1a0a2e] border-blue-500/30 p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold mb-2">Change Password</h3>
            <p className="text-gray-400 text-sm mb-4">Set a new password for {resetUser.name}</p>
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              type="password"
              className="bg-white/5 border-white/10 text-white mb-4"
            />
            <div className="flex gap-2">
              <Button onClick={handleForceReset} disabled={resetting} className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600">
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Password"}
              </Button>
              <Button onClick={() => setResetUser(null)} variant="outline" className="border-white/20 text-gray-300">Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
