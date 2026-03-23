import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, Check, Loader2, Star, Search, ArrowLeft } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Slider } from "../ui/slider";
import { useAuth } from "../../../hooks/useAuth";
import { getAllTeams, type Team } from "../../../services/teamService";
import { evaluateTeam, getEvaluation, type Evaluation } from "../../../services/evaluationService";
import { getAssignmentsByStaff } from "../../../services/assignmentService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { toast } from "sonner";

const CRITERIA = [
  { key: "innovation", label: "Innovation", color: "from-purple-500 to-violet-500" },
  { key: "feasibility", label: "Feasibility", color: "from-blue-500 to-cyan-500" },
  { key: "technicalDepth", label: "Technical Depth", color: "from-green-500 to-emerald-500" },
  { key: "presentation", label: "Presentation", color: "from-orange-500 to-amber-500" },
  { key: "impact", label: "Impact", color: "from-pink-500 to-rose-500" },
] as const;

type CriteriaKey = (typeof CRITERIA)[number]["key"];

export default function JuryEvaluation() {
  const { userProfile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [evaluated, setEvaluated] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Team | null>(null);
  const [scores, setScores] = useState<Record<CriteriaKey, number>>({ innovation: 5, feasibility: 5, technicalDepth: 5, presentation: 5, impact: 5 });
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        let ts = await getAllTeams();

        // Filter to show ONLY the teams assigned to this jury member
        // Check BOTH user doc's assignedTeams AND the assignments collection
        if (userProfile?.uid) {
          const assignedSet = new Set<string>();

          // Source 1: user doc's assignedTeams field
          const userDoc = await getDoc(doc(db, "users", userProfile.uid));
          const userData = userDoc.data();
          const userAssigned: string[] = userData?.assignedTeams || [];
          for (const id of userAssigned) assignedSet.add(id);

          // Source 2: assignments collection (fallback / additional source)
          try {
            const staffAssignments = await getAssignmentsByStaff(userProfile.uid);
            for (const a of staffAssignments) assignedSet.add(a.teamId);
          } catch {
            // Non-blocking — assignments collection may not exist yet
          }

          ts = assignedSet.size > 0
            ? ts.filter((t) => t.id && assignedSet.has(t.id))
            : []; // No teams assigned = show nothing
        }

        setTeams(ts);

        // Check which teams have already been evaluated by this jury member
        if (userProfile?.uid) {
          const evaluatedSet = new Set<string>();
          for (const t of ts) {
            const ev = await getEvaluation(t.id!, userProfile.uid);
            if (ev) evaluatedSet.add(t.id!);
          }
          setEvaluated(evaluatedSet);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, [userProfile]);

  const handleSelect = async (team: Team) => {
    setSelected(team);
    setRemarks("");
    setScores({ innovation: 5, feasibility: 5, technicalDepth: 5, presentation: 5, impact: 5 });
    if (userProfile?.uid) {
      const existing = await getEvaluation(team.id!, userProfile.uid);
      if (existing) {
        setScores({ innovation: existing.innovation, feasibility: existing.feasibility, technicalDepth: existing.technicalDepth, presentation: existing.presentation, impact: existing.impact });
        setRemarks(existing.remarks);
      }
    }
  };

  const totalScore = Object.values(scores).reduce((s, v) => s + v, 0);

  const handleSubmit = async () => {
    if (!selected || !userProfile?.uid) return;
    setSubmitting(true);
    try {
      await evaluateTeam({ teamId: selected.id!, teamName: selected.teamName, domain: selected.domain, juryId: userProfile.uid, ...scores, remarks });
      setEvaluated((prev) => new Set([...prev, selected.id!]));
      toast.success(`Evaluation submitted for ${selected.teamName}!`);
      setSelected(null);
    } catch (e: any) { toast.error(e.message); } finally { setSubmitting(false); }
  };

  // Filter teams by search
  const filtered = teams.filter((t) =>
    t.teamName.toLowerCase().includes(search.toLowerCase()) ||
    t.domain.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {!selected ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7 text-orange-400 shrink-0" />
              <div>
                <h2 className="text-lg sm:text-xl text-white font-bold">Teams to Evaluate</h2>
                <p className="text-gray-400 text-xs sm:text-sm">{evaluated.size} of {teams.length} evaluated</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams by name or domain..."
              className="pl-9 sm:pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm"
            />
          </div>

          {/* Progress bar */}
          {teams.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Progress</span>
                <span>{evaluated.size}/{teams.length} evaluated</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(evaluated.size / teams.length) * 100}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((team) => (
              <motion.div key={team.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <Card className={`p-4 sm:p-5 border cursor-pointer hover:bg-white/10 transition-all ${evaluated.has(team.id!) ? "bg-green-900/10 border-green-500/20" : "bg-white/5 border-white/10"}`} onClick={() => handleSelect(team)}>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm sm:text-base truncate">{team.teamName}</div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 mt-1 text-xs">{team.domain}</Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {evaluated.has(team.id!) && <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-xs hidden sm:flex"><Check className="w-3 h-3 mr-1" />Done</Badge>}
                      <Button size="sm" className={`text-xs ${evaluated.has(team.id!) ? "bg-white/10" : "bg-gradient-to-r from-orange-600 to-red-600"}`}>
                        {evaluated.has(team.id!) ? (
                          <span className="flex items-center gap-1"><Check className="w-3 h-3 sm:hidden" /><span className="hidden sm:inline">Re-evaluate</span><span className="sm:hidden">Edit</span></span>
                        ) : "Evaluate"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
            {filtered.length === 0 && teams.length > 0 && (
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <Search className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No teams match "{search}"</p>
              </Card>
            )}
            {teams.length === 0 && <Card className="bg-white/5 border-white/10 p-10 text-center"><p className="text-gray-400">No teams have been assigned to you yet. Please contact the admin.</p></Card>}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 sm:space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl text-white font-bold truncate">{selected.teamName}</h2>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">{selected.domain}</Badge>
            </div>
            <Button variant="outline" className="border-white/20 shrink-0" onClick={() => setSelected(null)}>
              <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /><span className="hidden sm:inline">Back</span>
            </Button>
          </div>

          <Card className="bg-white/5 border-white/10 p-4 sm:p-6 space-y-5 sm:space-y-6">
            {CRITERIA.map(({ key, label, color }) => (
              <div key={key}>
                <div className="flex justify-between mb-2">
                  <label className="text-gray-300 font-medium text-sm sm:text-base">{label}</label>
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${color} font-bold text-base sm:text-lg`}>{scores[key]}/10</span>
                </div>
                <Slider min={1} max={10} step={1} value={[scores[key]]} onValueChange={([v]) => setScores((p) => ({ ...p, [key]: v }))} className="w-full" />
              </div>
            ))}

            <div>
              <label className="text-gray-300 font-medium mb-2 block text-sm sm:text-base">Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Add any comments or feedback..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 text-sm resize-none"
              />
            </div>

            <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between">
              <div className="text-gray-300 text-sm sm:text-base">Total Score</div>
              <div className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">{totalScore}<span className="text-base sm:text-lg text-gray-400">/50</span></div>
            </div>

            <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <><Star className="w-4 h-4 mr-2" />Submit Evaluation</>}
            </Button>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
