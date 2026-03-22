import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ClipboardList, Loader2, Search, Save, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { subscribeEvaluations, updateEvaluation, type Evaluation } from "../../../services/evaluationService";
import { getStaffByRole, type StaffMember } from "../../../services/adminService";
import { toast } from "sonner";

interface GroupedEval {
    teamId: string;
    teamName: string;
    domain: string;
    evaluations: Evaluation[];
    avgScore: number;
}

export default function AdminEvaluations() {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [juryMap, setJuryMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
    const [editingEval, setEditingEval] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Evaluation>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Load jury member names
        getStaffByRole("jury").then((jury) => {
            const map: Record<string, string> = {};
            jury.forEach((j) => { if (j.id) map[j.id] = j.name; });
            setJuryMap(map);
        });

        // Real-time evaluations
        const unsub = subscribeEvaluations((evals) => {
            setEvaluations(evals);
            setLoading(false);
        });
        return unsub;
    }, []);

    // Group evaluations by team
    const grouped: GroupedEval[] = (() => {
        const map: Record<string, GroupedEval> = {};
        for (const ev of evaluations) {
            if (!map[ev.teamId]) {
                map[ev.teamId] = {
                    teamId: ev.teamId,
                    teamName: ev.teamName || ev.teamId,
                    domain: ev.domain || "",
                    evaluations: [],
                    avgScore: 0,
                };
            }
            map[ev.teamId].evaluations.push(ev);
        }
        return Object.values(map).map((g) => {
            const total = g.evaluations.reduce((sum, e) => sum + e.totalScore, 0);
            g.avgScore = g.evaluations.length > 0 ? Math.round(total / g.evaluations.length) : 0;
            return g;
        }).sort((a, b) => b.avgScore - a.avgScore);
    })();

    const filtered = grouped.filter((g) =>
        g.teamName.toLowerCase().includes(search.toLowerCase()) ||
        g.domain.toLowerCase().includes(search.toLowerCase())
    );

    const startEdit = (ev: Evaluation) => {
        setEditingEval(ev.id!);
        setEditForm({
            innovation: ev.innovation,
            feasibility: ev.feasibility,
            technicalDepth: ev.technicalDepth,
            presentation: ev.presentation,
            impact: ev.impact,
            remarks: ev.remarks,
        });
    };

    const handleSave = async () => {
        if (!editingEval) return;
        setSaving(true);
        try {
            await updateEvaluation(editingEval, editForm);
            toast.success("Score updated!");
            setEditingEval(null);
        } catch (e: any) {
            toast.error("Failed to update: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const scoreFields: { key: keyof Pick<Evaluation, "innovation" | "feasibility" | "technicalDepth" | "presentation" | "impact">; label: string }[] = [
        { key: "innovation", label: "Innovation" },
        { key: "feasibility", label: "Feasibility" },
        { key: "technicalDepth", label: "Technical" },
        { key: "presentation", label: "Presentation" },
        { key: "impact", label: "Impact" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <ClipboardList className="w-6 h-6 text-yellow-400" />
                    <h2 className="text-xl text-white font-semibold">Evaluations</h2>
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40">
                        {evaluations.length} scores
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                        <span className="relative flex h-2 w-2 mr-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        Live
                    </Badge>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by team name or domain..."
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-yellow-400 animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-8 text-center">
                    <p className="text-gray-400">{evaluations.length === 0 ? "No evaluations yet. Jury members haven't submitted any scores." : "No matching evaluations found."}</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map((group, i) => (
                        <motion.div key={group.teamId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                            <Card className="bg-white/5 border-white/10 overflow-hidden">
                                {/* Team header */}
                                <button
                                    onClick={() => setExpandedTeam(expandedTeam === group.teamId ? null : group.teamId)}
                                    className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {group.teamName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white font-medium truncate">{group.teamName}</div>
                                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">{group.domain}</Badge>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40">
                                            Avg: {group.avgScore}/50
                                        </Badge>
                                        <Badge className="bg-white/10 text-gray-300 border-white/10 text-xs">
                                            {group.evaluations.length} score{group.evaluations.length !== 1 ? "s" : ""}
                                        </Badge>
                                        {expandedTeam === group.teamId
                                            ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                            : <ChevronRight className="w-4 h-4 text-gray-400" />
                                        }
                                    </div>
                                </button>

                                {/* Expanded: individual evaluations */}
                                {expandedTeam === group.teamId && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-white/10">
                                        <div className="p-4 space-y-4">
                                            {group.evaluations.map((ev) => (
                                                <div key={ev.id} className="bg-white/5 rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white text-sm font-medium">
                                                                Jury: {juryMap[ev.juryId] || ev.juryId}
                                                            </span>
                                                            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 text-xs">
                                                                Total: {ev.totalScore}/50
                                                            </Badge>
                                                        </div>
                                                        {editingEval === ev.id ? (
                                                            <div className="flex gap-2">
                                                                <Button size="sm" onClick={handleSave} disabled={saving}
                                                                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-xs h-7 px-2">
                                                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                                                                    Save
                                                                </Button>
                                                                <Button size="sm" variant="outline" onClick={() => setEditingEval(null)}
                                                                    className="border-white/20 text-xs h-7 px-2">
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button size="sm" variant="outline" onClick={() => startEdit(ev)}
                                                                className="border-white/20 text-xs h-7 px-2">
                                                                <Pencil className="w-3 h-3 mr-1" /> Edit
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {scoreFields.map((f) => (
                                                            <div key={f.key}>
                                                                <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">{f.label}</label>
                                                                {editingEval === ev.id ? (
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        max={10}
                                                                        value={editForm[f.key] ?? 0}
                                                                        onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: Math.min(10, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                                                        className="bg-white/10 border-white/20 text-white text-center h-8 text-sm"
                                                                    />
                                                                ) : (
                                                                    <div className="text-white text-center font-semibold bg-white/5 rounded px-2 py-1.5 text-sm">
                                                                        {ev[f.key]}/10
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {ev.remarks && (
                                                        <div className="mt-2 text-xs text-gray-400">
                                                            <span className="text-gray-500">Remarks:</span> {ev.remarks}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
