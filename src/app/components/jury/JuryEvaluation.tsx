import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, Check, Loader2, Star, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Slider } from "../ui/slider";
import { useAuth } from "../../../hooks/useAuth";
import { getAllTeams, type Team } from "../../../services/teamService";
import { evaluateTeam, getEvaluation, type Evaluation } from "../../../services/evaluationService";
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

  useEffect(() => {
    async function load() {
      try {
        const ts = await getAllTeams();
        setTeams(ts);
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-orange-400 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {!selected ? (
        <>
          <div className="flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-orange-400" />
            <div>
              <h2 className="text-xl text-white font-bold">Teams to Evaluate</h2>
              <p className="text-gray-400 text-sm">{evaluated.size} of {teams.length} evaluated</p>
            </div>
          </div>
          <div className="space-y-3">
            {teams.map((team) => (
              <motion.div key={team.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <Card className={`p-5 border cursor-pointer hover:bg-white/10 transition-all ${evaluated.has(team.id!) ? "bg-green-900/10 border-green-500/20" : "bg-white/5 border-white/10"}`} onClick={() => handleSelect(team)}>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-white font-semibold">{team.teamName}</div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 mt-1">{team.domain}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {evaluated.has(team.id!) && <Badge className="bg-green-500/20 text-green-400 border-green-500/40"><Check className="w-3 h-3 mr-1" />Evaluated</Badge>}
                      <Button size="sm" className={evaluated.has(team.id!) ? "bg-white/10" : "bg-gradient-to-r from-orange-600 to-red-600"}>
                        {evaluated.has(team.id!) ? "Re-evaluate" : "Evaluate"}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
            {teams.length === 0 && <Card className="bg-white/5 border-white/10 p-10 text-center"><p className="text-gray-400">No teams found.</p></Card>}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl text-white font-bold">{selected.teamName}</h2>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">{selected.domain}</Badge>
            </div>
            <Button variant="outline" className="border-white/20" onClick={() => setSelected(null)}>Back</Button>
          </div>

          <Card className="bg-white/5 border-white/10 p-6 space-y-6">
            {CRITERIA.map(({ key, label, color }) => (
              <div key={key}>
                <div className="flex justify-between mb-2">
                  <label className="text-gray-300 font-medium">{label}</label>
                  <span className={`text-transparent bg-clip-text bg-gradient-to-r ${color} font-bold text-lg`}>{scores[key]}/10</span>
                </div>
                <Slider min={1} max={10} step={1} value={[scores[key]]} onValueChange={([v]) => setScores((p) => ({ ...p, [key]: v }))} className="w-full" />
              </div>
            ))}

            <div>
              <label className="text-gray-300 font-medium mb-2 block">Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder="Add any comments or feedback..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 text-sm resize-none"
              />
            </div>

            <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between">
              <div className="text-gray-300">Total Score</div>
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">{totalScore}<span className="text-lg text-gray-400">/50</span></div>
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
