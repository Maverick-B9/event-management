import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link as LinkIcon, Loader2, Save, Search, Users, Gavel, UserCog, RefreshCw, Check, ChevronDown, ChevronRight, Layers, X } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { getAllTeams, type Team } from "../../../services/teamService";
import { getStaffByRole, type StaffMember } from "../../../services/adminService";
import { getAssignments, updateAssignment, assignJuryToDomain, type Assignment } from "../../../services/assignmentService";
import { toast } from "sonner";

interface TeamAssignmentState {
    teamId: string;
    teamName: string;
    domain: string;
    selectedJury: string[];
    selectedCoordinators: string[];
    dirty: boolean;
    saving: boolean;
}

export default function AdminAssignments() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [juryMembers, setJuryMembers] = useState<StaffMember[]>([]);
    const [coordinators, setCoordinators] = useState<StaffMember[]>([]);
    const [assignments, setAssignments] = useState<Map<string, Assignment>>(new Map());
    const [teamStates, setTeamStates] = useState<TeamAssignmentState[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
    const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

    // Domain-level jury assignment modal state
    const [domainJuryModal, setDomainJuryModal] = useState<string | null>(null);
    const [domainJurySelection, setDomainJurySelection] = useState<string[]>([]);
    const [domainJurySaving, setDomainJurySaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [t, j, c, a] = await Promise.all([
                getAllTeams(),
                getStaffByRole("jury"),
                getStaffByRole("coordinator"),
                getAssignments(),
            ]);
            setTeams(t);
            setJuryMembers(j);
            setCoordinators(c);

            const assignmentMap = new Map<string, Assignment>();
            for (const assignment of a) {
                assignmentMap.set(assignment.teamId, assignment);
            }
            setAssignments(assignmentMap);

            // Build state
            const states: TeamAssignmentState[] = t.map((team) => {
                const existing = assignmentMap.get(team.id!);
                return {
                    teamId: team.id!,
                    teamName: team.teamName,
                    domain: team.domain,
                    selectedJury: existing?.assignedJuryIds || [],
                    selectedCoordinators: existing?.assignedCoordinatorIds || [],
                    dirty: false,
                    saving: false,
                };
            });
            setTeamStates(states);
        } catch {
            toast.error("Failed to load assignment data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const toggleJury = (teamId: string, juryId: string) => {
        setTeamStates((prev) =>
            prev.map((ts) => {
                if (ts.teamId !== teamId) return ts;
                const selected = ts.selectedJury.includes(juryId)
                    ? ts.selectedJury.filter((id) => id !== juryId)
                    : [...ts.selectedJury, juryId];
                return { ...ts, selectedJury: selected, dirty: true };
            })
        );
    };

    const toggleCoordinator = (teamId: string, coordId: string) => {
        setTeamStates((prev) =>
            prev.map((ts) => {
                if (ts.teamId !== teamId) return ts;
                const selected = ts.selectedCoordinators.includes(coordId)
                    ? ts.selectedCoordinators.filter((id) => id !== coordId)
                    : [...ts.selectedCoordinators, coordId];
                return { ...ts, selectedCoordinators: selected, dirty: true };
            })
        );
    };

    const handleSave = async (teamId: string) => {
        const ts = teamStates.find((t) => t.teamId === teamId);
        if (!ts) return;

        setTeamStates((prev) =>
            prev.map((t) => (t.teamId === teamId ? { ...t, saving: true } : t))
        );

        try {
            await updateAssignment(teamId, {
                teamName: ts.teamName,
                assignedJuryIds: ts.selectedJury,
                assignedCoordinatorIds: ts.selectedCoordinators,
            });
            setTeamStates((prev) =>
                prev.map((t) => (t.teamId === teamId ? { ...t, dirty: false, saving: false } : t))
            );
            toast.success(`Assignment saved for ${ts.teamName}`);
        } catch (e: any) {
            toast.error("Failed to save: " + e.message);
            setTeamStates((prev) =>
                prev.map((t) => (t.teamId === teamId ? { ...t, saving: false } : t))
            );
        }
    };

    const filtered = teamStates.filter((ts) =>
        ts.teamName.toLowerCase().includes(search.toLowerCase()) ||
        ts.domain.toLowerCase().includes(search.toLowerCase())
    );

    // Group filtered teams by domain
    const domainGroups: { domain: string; teams: TeamAssignmentState[] }[] = (() => {
        const map = new Map<string, TeamAssignmentState[]>();
        for (const ts of filtered) {
            const d = ts.domain || "Uncategorized";
            if (!map.has(d)) map.set(d, []);
            map.get(d)!.push(ts);
        }
        return Array.from(map.entries())
            .map(([domain, teams]) => ({ domain, teams }))
            .sort((a, b) => a.domain.localeCompare(b.domain));
    })();

    const DOMAIN_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
        default: { bg: "from-cyan-500 to-blue-500", border: "border-cyan-500/30", text: "text-cyan-300", icon: "text-cyan-400" },
    };
    const getDomainColor = () => DOMAIN_COLORS.default;

    const toggleDomain = (domain: string) => {
        setExpandedDomains((prev) => {
            const next = new Set(prev);
            if (next.has(domain)) next.delete(domain);
            else next.add(domain);
            return next;
        });
    };

    // --- Domain-level jury assignment ---
    const openDomainJuryModal = (domain: string) => {
        // Pre-populate: a jury is checked if assigned to ALL teams in this domain
        const domainTeamStates = teamStates.filter(
            (ts) => ts.domain.toLowerCase() === domain.toLowerCase()
        );
        if (domainTeamStates.length === 0) {
            setDomainJurySelection([]);
        } else {
            const commonJury = juryMembers
                .filter((j) => domainTeamStates.every((ts) => ts.selectedJury.includes(j.id!)))
                .map((j) => j.id!);
            setDomainJurySelection(commonJury);
        }
        setDomainJuryModal(domain);
    };

    const toggleDomainJury = (juryId: string) => {
        setDomainJurySelection((prev) =>
            prev.includes(juryId)
                ? prev.filter((id) => id !== juryId)
                : [...prev, juryId]
        );
    };

    const handleDomainJurySave = async () => {
        if (!domainJuryModal) return;
        setDomainJurySaving(true);
        try {
            const allTeamData = teams.map((t) => ({ id: t.id!, teamName: t.teamName, domain: t.domain }));
            const count = await assignJuryToDomain(domainJuryModal, domainJurySelection, allTeamData);
            toast.success(`Assigned ${domainJurySelection.length} jury member(s) to ${count} team(s) in ${domainJuryModal}`);
            setDomainJuryModal(null);
            await load(); // Refresh all data
        } catch (e: any) {
            toast.error("Failed to save: " + e.message);
        } finally {
            setDomainJurySaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <LinkIcon className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-xl text-white font-semibold">Assignments</h2>
                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40">{teams.length} teams</Badge>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">{domainGroups.length} domains</Badge>
                </div>
                <Button onClick={load} variant="outline" className="border-white/20 px-3">
                    <RefreshCw className="w-4 h-4" />
                </Button>
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

            {/* Info */}
            <Card className="bg-cyan-900/20 border-cyan-500/30 p-4">
                <p className="text-sm text-cyan-200">
                    Teams are grouped by domain. Click a domain to expand and see all teams. Then click a team to assign jury members and coordinators.
                </p>
            </Card>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
            ) : domainGroups.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-8 text-center">
                    <p className="text-gray-400">No teams found. Create teams first to assign jury and coordinators.</p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {domainGroups.map((group, gi) => {
                        const color = getDomainColor();
                        const isExpanded = expandedDomains.has(group.domain);
                        const dirtyCount = group.teams.filter((t) => t.dirty).length;
                        const assignedCount = group.teams.filter((t) => t.selectedJury.length > 0 || t.selectedCoordinators.length > 0).length;

                        return (
                            <motion.div key={group.domain} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
                                <Card className={`overflow-hidden ${isExpanded ? "bg-white/[0.03] border-white/15" : "bg-white/5 border-white/10"}`}>
                                    {/* Domain Header */}
                                    <button
                                        onClick={() => toggleDomain(group.domain)}
                                        className="w-full p-4 sm:p-5 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className={`w-11 h-11 bg-gradient-to-br ${color.bg} rounded-xl flex items-center justify-center shrink-0`}>
                                            <Layers className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-semibold text-base truncate">{group.domain}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                {assignedCount}/{group.teams.length} teams assigned
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge className="bg-white/10 text-gray-300 border-white/10">
                                                {group.teams.length} team{group.teams.length !== 1 ? "s" : ""}
                                            </Badge>
                                            {dirtyCount > 0 && (
                                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-xs">
                                                    {dirtyCount} unsaved
                                                </Badge>
                                            )}
                                            {isExpanded
                                                ? <ChevronDown className="w-5 h-5 text-gray-400" />
                                                : <ChevronRight className="w-5 h-5 text-gray-400" />
                                            }
                                        </div>
                                    </button>

                                    {/* Domain-level Assign Jury button */}
                                    <div className="px-4 sm:px-5 pb-3 flex items-center gap-2 border-b border-white/5">
                                        <Button
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); openDomainJuryModal(group.domain); }}
                                            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-xs"
                                        >
                                            <Gavel className="w-3.5 h-3.5 mr-1.5" /> Assign Jury to Domain
                                        </Button>
                                        <span className="text-xs text-gray-500">Bulk assign jury to all {group.teams.length} teams</span>
                                    </div>

                                    {/* Expanded: teams in this domain */}
                                    {isExpanded && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-white/10">
                                            <div className="p-3 sm:p-4 space-y-3">
                                                {group.teams.map((ts) => (
                                                    <Card key={ts.teamId} className={`bg-white/5 border-white/10 overflow-hidden ${ts.dirty ? "ring-1 ring-cyan-500/50" : ""}`}>
                                                        {/* Team Row */}
                                                        <button
                                                            onClick={() => setExpandedTeam(expandedTeam === ts.teamId ? null : ts.teamId)}
                                                            className="w-full p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-white/5 transition-colors text-left"
                                                        >
                                                            <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
                                                                {ts.teamName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-white font-medium text-sm truncate">{ts.teamName}</div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                                                {ts.selectedJury.length > 0 && (
                                                                    <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 text-xs">
                                                                        <Gavel className="w-3 h-3 mr-1" />{ts.selectedJury.length}
                                                                    </Badge>
                                                                )}
                                                                {ts.selectedCoordinators.length > 0 && (
                                                                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">
                                                                        <UserCog className="w-3 h-3 mr-1" />{ts.selectedCoordinators.length}
                                                                    </Badge>
                                                                )}
                                                                {ts.dirty && (
                                                                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-xs">Unsaved</Badge>
                                                                )}
                                                                {expandedTeam === ts.teamId
                                                                    ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                                                    : <ChevronRight className="w-4 h-4 text-gray-400" />
                                                                }
                                                            </div>
                                                        </button>

                                                        {/* Expanded Assignment Panel */}
                                                        {expandedTeam === ts.teamId && (
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-white/10">
                                                                <div className="p-4 space-y-6">
                                                                    {/* Jury Selection */}
                                                                    <div>
                                                                        <h4 className="text-sm text-gray-300 font-medium mb-3 flex items-center gap-2">
                                                                            <Gavel className="w-4 h-4 text-orange-400" /> Assign Jury Members
                                                                        </h4>
                                                                        {juryMembers.length === 0 ? (
                                                                            <p className="text-gray-500 text-sm">No jury members created yet.</p>
                                                                        ) : (
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                {juryMembers.map((j) => {
                                                                                    const selected = ts.selectedJury.includes(j.id!);
                                                                                    return (
                                                                                        <button
                                                                                            key={j.id}
                                                                                            onClick={() => toggleJury(ts.teamId, j.id!)}
                                                                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                                                                                selected
                                                                                                    ? "border-orange-500/50 bg-orange-500/10 text-white"
                                                                                                    : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                                                                                            }`}
                                                                                        >
                                                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                                                                                                selected ? "bg-orange-500 border-orange-500" : "border-white/30"
                                                                                            }`}>
                                                                                                {selected && <Check className="w-3 h-3 text-white" />}
                                                                                            </div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="text-sm font-medium truncate">{j.name}</div>
                                                                                                <div className="text-xs text-gray-500 truncate">{j.email}</div>
                                                                                            </div>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Coordinator Selection */}
                                                                    <div>
                                                                        <h4 className="text-sm text-gray-300 font-medium mb-3 flex items-center gap-2">
                                                                            <UserCog className="w-4 h-4 text-purple-400" /> Assign Coordinators
                                                                        </h4>
                                                                        {coordinators.length === 0 ? (
                                                                            <p className="text-gray-500 text-sm">No coordinators created yet.</p>
                                                                        ) : (
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                {coordinators.map((c) => {
                                                                                    const selected = ts.selectedCoordinators.includes(c.id!);
                                                                                    return (
                                                                                        <button
                                                                                            key={c.id}
                                                                                            onClick={() => toggleCoordinator(ts.teamId, c.id!)}
                                                                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                                                                                selected
                                                                                                    ? "border-purple-500/50 bg-purple-500/10 text-white"
                                                                                                    : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                                                                                            }`}
                                                                                        >
                                                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                                                                                                selected ? "bg-purple-500 border-purple-500" : "border-white/30"
                                                                                            }`}>
                                                                                                {selected && <Check className="w-3 h-3 text-white" />}
                                                                                            </div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="text-sm font-medium truncate">{c.name}</div>
                                                                                                <div className="text-xs text-gray-500 truncate">{c.email}</div>
                                                                                            </div>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Save Button */}
                                                                    <div className="flex justify-end">
                                                                        <Button
                                                                            onClick={() => handleSave(ts.teamId)}
                                                                            disabled={!ts.dirty || ts.saving}
                                                                            className="bg-gradient-to-r from-cyan-600 to-blue-600"
                                                                        >
                                                                            {ts.saving
                                                                                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                                                : <Save className="w-4 h-4 mr-2" />
                                                                            }
                                                                            Save Assignment
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </Card>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Domain Jury Assignment Modal */}
            {domainJuryModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    onClick={() => setDomainJuryModal(null)}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-gray-900 border border-white/15 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10">
                            <div>
                                <h3 className="text-white font-semibold text-lg">Assign Jury to Domain</h3>
                                <p className="text-gray-400 text-sm mt-0.5">
                                    Select jury members for <span className="text-orange-400 font-medium">{domainJuryModal}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setDomainJuryModal(null)}
                                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Jury List */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-2">
                            {juryMembers.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-8">No jury members created yet.</p>
                            ) : (
                                juryMembers.map((j) => {
                                    const selected = domainJurySelection.includes(j.id!);
                                    return (
                                        <button
                                            key={j.id}
                                            onClick={() => toggleDomainJury(j.id!)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                                selected
                                                    ? "border-orange-500/50 bg-orange-500/10 text-white"
                                                    : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                                                selected ? "bg-orange-500 border-orange-500" : "border-white/30"
                                            }`}>
                                                {selected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{j.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{j.email}</div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-white/10 flex items-center justify-between gap-3">
                            <div className="text-sm text-gray-400">
                                {domainJurySelection.length} jury selected
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDomainJuryModal(null)}
                                    className="border-white/20 text-gray-300"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleDomainJurySave}
                                    disabled={domainJurySaving}
                                    className="bg-gradient-to-r from-orange-600 to-red-600"
                                >
                                    {domainJurySaving
                                        ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Saving...</>
                                        : <><Save className="w-4 h-4 mr-1.5" />Save Domain Assignment</>
                                    }
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
