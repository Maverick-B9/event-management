import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { QrCode, Camera, CheckCircle, XCircle, Loader2, StopCircle, UtensilsCrossed, Users, Shield, Hash } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Html5QrcodeScanner } from "html5-qrcode";
import { markAttendance, getAttendance, markFoodCoupon, getFoodCoupon } from "../../../services/attendanceService";
import { getStudent } from "../../../services/studentService";
import { getTeam } from "../../../services/teamService";
import { toast } from "sonner";

type ScanMode = "entry" | "food";

interface ScanResult {
  studentId: string;
  name: string;
  regNo: string;
  status: "success" | "duplicate" | "error";
  message: string;
  mode: ScanMode;
  teamName?: string;
  leaderName?: string;
  teamSize?: number;
}

export default function CoordinatorScanner() {
  const [mode, setMode] = useState<ScanMode>("entry");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const startScanner = () => {
    setScanning(true);
    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            videoConstraints: { facingMode: { ideal: "environment" } }
          },
          false
        );
        scanner.render(
          async (decodedText) => {
            if (processing) return;
            setProcessing(true);
            await handleScan(decodedText);
            setProcessing(false);
          },
          () => { }
        );
        scannerRef.current = scanner;
      } catch (e) {
        toast.error("Camera not available");
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => { });
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // Stop scanner when mode changes
  useEffect(() => {
    stopScanner();
    setLastResult(null);
  }, [mode]);

  useEffect(() => () => { stopScanner(); }, []);

  const extractUid = (raw: string, expectedMode: ScanMode): string | null => {
    if (expectedMode === "entry") {
      if (raw.startsWith("entry:")) return raw.slice(6);
      // backward compat: plain uid
      if (!raw.startsWith("food:")) return raw;
      return null;
    } else {
      if (raw.startsWith("food:")) return raw.slice(5);
      return null;
    }
  };

  // Fetch team info for a student
  const fetchTeamInfo = async (student: { teamId?: string; teamName?: string; teamSize?: number; name?: string }) => {
    let teamName = student.teamName || "";
    let leaderName = "";
    let teamSize = student.teamSize || 0;

    if (student.teamId) {
      try {
        const team = await getTeam(student.teamId);
        if (team) {
          teamName = team.teamName || teamName;
          leaderName = team.leaderName || "";
          teamSize = team.teamSize || teamSize;
        }
      } catch {
        // Team fetch failed — use student-level data
      }
    }

    // Fallback: if leaderName not in team doc, use student name
    if (!leaderName) leaderName = student.name || "";

    return { teamName, leaderName, teamSize };
  };

  const handleScan = async (raw: string) => {
    stopScanner(); // Stop scanning immediately to prevent multiple popups for the same code
    const studentId = extractUid(raw, mode);
    if (!studentId) {
      toast.error(`This QR is not a ${mode === "entry" ? "entry" : "food coupon"} code`);
      setLastResult({ studentId: raw, name: "Unknown", regNo: "", status: "error", message: `Wrong QR type. Expected ${mode} code.`, mode });
      return;
    }

    try {
      if (mode === "entry") {
        const existing = await getAttendance(studentId);
        if (existing?.present) {
          const student = await getStudent(studentId);
          const teamInfo = student ? await fetchTeamInfo(student) : { teamName: "", leaderName: "", teamSize: 0 };
          setLastResult({ studentId, name: student?.name || studentId, regNo: student?.regNo || "", status: "duplicate", message: "Already checked in!", mode, ...teamInfo });
          toast.warning("Student already checked in!");
          return;
        }
        await markAttendance(studentId);
        const student = await getStudent(studentId);
        const teamInfo = student ? await fetchTeamInfo(student) : { teamName: "", leaderName: "", teamSize: 0 };
        setLastResult({ studentId, name: student?.name || studentId, regNo: student?.regNo || "", status: "success", message: "Entry marked!", mode, ...teamInfo });
        toast.success(`✅ ${student?.name || studentId} checked in!`);
      } else {
        const existing = await getFoodCoupon(studentId);
        if (existing?.redeemed) {
          const student = await getStudent(studentId);
          const teamInfo = student ? await fetchTeamInfo(student) : { teamName: "", leaderName: "", teamSize: 0 };
          setLastResult({ studentId, name: student?.name || studentId, regNo: student?.regNo || "", status: "duplicate", message: "Food already redeemed!", mode, ...teamInfo });
          toast.warning("Food coupon already used!");
          return;
        }
        await markFoodCoupon(studentId);
        const student = await getStudent(studentId);
        const teamInfo = student ? await fetchTeamInfo(student) : { teamName: "", leaderName: "", teamSize: 0 };
        setLastResult({ studentId, name: student?.name || studentId, regNo: student?.regNo || "", status: "success", message: "Food coupon redeemed!", mode, ...teamInfo });
        toast.success(`🍱 ${student?.name || studentId} food served!`);
      }
    } catch (e: any) {
      setLastResult({ studentId, name: studentId, regNo: "", status: "error", message: e.message, mode });
      toast.error("Error: " + e.message);
    }
  };

  const modeConfig = {
    entry: { label: "Event Entry", icon: CheckCircle, color: "from-purple-600 to-blue-600", activeClass: "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md" },
    food: { label: "Food Coupon", icon: UtensilsCrossed, color: "from-orange-600 to-amber-600", activeClass: "bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md" },
  };

  const resultColorClass = lastResult?.status === "success"
    ? lastResult.mode === "entry" ? "bg-green-900/20 border-green-500/30" : "bg-orange-900/20 border-orange-500/30"
    : lastResult?.status === "duplicate" ? "bg-yellow-900/20 border-yellow-500/30" : "bg-red-900/20 border-red-500/30";

  const resultBadgeClass = lastResult?.status === "success"
    ? lastResult.mode === "entry" ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-orange-500/20 text-orange-400 border-orange-500/40"
    : lastResult?.status === "duplicate" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" : "bg-red-500/20 text-red-400 border-red-500/40";

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Mode Toggle */}
      <Card className="bg-white/5 border-white/10 p-4">
        <h3 className="text-white text-sm font-medium mb-3 text-center">Select Scan Mode</h3>
        <div className="grid grid-cols-2 gap-3">
          {(["entry", "food"] as ScanMode[]).map((m) => {
            const cfg = modeConfig[m];
            const Icon = cfg.icon;
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${isActive ? cfg.activeClass : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-center text-xs text-gray-500">
          {mode === "entry" ? "Scanning: 🎫 Event Entry QR codes" : "Scanning: 🍱 Food Coupon QR codes"}
        </div>
      </Card>

      {/* Last scan result */}
      {lastResult && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className={`p-5 border ${resultColorClass}`}>
            {/* Status Row */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {lastResult.status === "success" ? (
                lastResult.mode === "entry" ? <CheckCircle className="w-10 h-10 text-green-400 shrink-0" /> : <UtensilsCrossed className="w-10 h-10 text-orange-400 shrink-0" />
              ) : lastResult.status === "duplicate" ? (
                <XCircle className="w-10 h-10 text-yellow-400 shrink-0" />
              ) : (
                <XCircle className="w-10 h-10 text-red-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-lg truncate">{lastResult.name}</div>
                {lastResult.regNo && <div className="text-gray-400 text-sm">{lastResult.regNo}</div>}
                <Badge className={`mt-1 ${resultBadgeClass}`}>{lastResult.message}</Badge>
              </div>
              <Badge className="text-xs bg-white/10 text-gray-300 border-white/20 capitalize">{lastResult.mode}</Badge>
            </div>

            {/* Team Info Section */}
            {(lastResult.teamName || lastResult.teamSize) && lastResult.status !== "error" && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-300">Team Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {lastResult.teamName && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Team Name</div>
                      <div className="text-white font-bold text-base truncate">{lastResult.teamName}</div>
                    </div>
                  )}
                  {lastResult.leaderName && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Leader
                      </div>
                      <div className="text-white font-semibold text-sm truncate">{lastResult.leaderName}</div>
                    </div>
                  )}
                  {lastResult.teamSize != null && lastResult.teamSize > 0 && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Hash className="w-3 h-3" /> Team Size
                      </div>
                      <div className="text-white font-bold text-lg">{lastResult.teamSize} <span className="text-gray-400 text-xs font-normal">members</span></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Camera scanner */}
      <Card className="bg-white/5 border-white/10 p-5">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-purple-400" />
          {modeConfig[mode].label} Scanner
        </h3>
        {!scanning ? (
          <div className="text-center py-8">
            {mode === "entry"
              ? <QrCode className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              : <UtensilsCrossed className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            }
            <p className="text-gray-400 mb-4 text-sm">
              {mode === "entry" ? "Scan student Event Entry QR codes" : "Scan student Food Coupon QR codes"}
            </p>
            <Button onClick={startScanner} className={`bg-gradient-to-r ${modeConfig[mode].color}`}>
              <Camera className="w-4 h-4 mr-2" /> {lastResult ? "Scan Next QR Code" : `Start ${modeConfig[mode].label} Scanner`}
            </Button>
          </div>
        ) : (
          <div>
            <div id="qr-reader" className="w-full rounded-xl overflow-hidden" />
            {processing && (
              <div className="flex items-center gap-2 text-purple-400 mt-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </div>
            )}
            <Button onClick={stopScanner} variant="outline" className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10">
              <StopCircle className="w-4 h-4 mr-2" /> Stop Scanner
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
