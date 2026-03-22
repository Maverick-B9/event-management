import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, Search, ChevronDown, ChevronUp, Loader2, Link2, Phone, Mail, User, RefreshCw } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { getAllTeams, type Team } from "../../../services/teamService";
import { getAllStudents, type Student } from "../../../services/studentService";
import { toast } from "sonner";

export default function AdminTeams() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [t, s] = await Promise.all([getAllTeams(), getAllStudents()]);
            setTeams(t);
            setStudents(s);
        } catch {
            toast.error("Failed to load teams");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const studentMap = new Map(students.map((s) => [s.id, s]));

    const filtered = teams.filter((t) =>
        t.teamName.toLowerCase().includes(search.toLowerCase()) ||
        t.domain.toLowerCase().includes(search.toLowerCase())
    );

    const toggleExpand = (teamId: string) => {
        setExpandedTeam(expandedTeam === teamId ? null : teamId);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-indigo-400" />
                    <h2 className="text-xl text-white font-semibold">Teams</h2>
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40">{teams.length}</Badge>
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

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                    { label: "Total Teams", value: teams.length, color: "bg-indigo-600/20 border-indigo-500/30" },
                    { label: "With Submissions", value: teams.filter((t) => t.submissionLink).length, color: "bg-green-600/20 border-green-500/30" },
                    { label: "Showing", value: filtered.length, color: "bg-orange-600/20 border-orange-500/30" },
                ].map((s) => (
                    <Card key={s.label} className={`${s.color} p-4 backdrop-blur-md`}>
                        <div className="text-2xl text-white font-bold">{loading ? "—" : s.value}</div>
                        <div className="text-sm text-gray-400">{s.label}</div>
                    </Card>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((team, i) => (
                        <motion.div key={team.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                            <Card className="bg-white/5 border-white/10 overflow-hidden">
                                {/* Team Header */}
                                <button
                                    onClick={() => toggleExpand(team.id!)}
                                    className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {team.teamName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-white font-medium truncate">{team.teamName}</div>
                                        <div className="text-gray-400 text-sm flex items-center gap-2">
                                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">{team.domain}</Badge>
                                            <span className="text-xs">{team.members.length + (team.memberDetails?.length || 0)} members</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {team.submissionLink && (
                                            <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-xs">
                                                <Link2 className="w-3 h-3 mr-1" />Submitted
                                            </Badge>
                                        )}
                                        {expandedTeam === team.id
                                            ? <ChevronUp className="w-5 h-5 text-gray-400" />
                                            : <ChevronDown className="w-5 h-5 text-gray-400" />
                                        }
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                {expandedTeam === team.id && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-white/10">
                                        <div className="p-4 space-y-4">
                                            {/* Team ID */}
                                            <div className="text-xs text-gray-500">
                                                Team ID: <code className="bg-white/5 px-1 rounded text-gray-300">{team.id}</code>
                                            </div>

                                            {/* Submission */}
                                            {team.submissionLink && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Link2 className="w-4 h-4 text-green-400 shrink-0" />
                                                    <a href={team.submissionLink} target="_blank" rel="noreferrer"
                                                        className="text-green-400 hover:text-green-300 underline truncate">
                                                        {team.submissionLink}
                                                    </a>
                                                </div>
                                            )}

                                            {/* Registered Members (from auth) */}
                                            <div>
                                                <h4 className="text-sm text-gray-300 font-medium mb-2 flex items-center gap-2">
                                                    <User className="w-4 h-4 text-blue-400" /> Registered Members
                                                </h4>
                                                <div className="space-y-2">
                                                    {team.members.map((uid, idx) => {
                                                        const student = studentMap.get(uid);
                                                        return (
                                                            <div key={uid} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                                                                <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-300 text-xs font-bold shrink-0">{idx + 1}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-white text-sm font-medium truncate">{student?.name || uid}</div>
                                                                    <div className="text-gray-400 text-xs truncate">
                                                                        {student?.email || "—"}
                                                                        {student?.college && <span> · {student.college}</span>}
                                                                        {student?.mobile && <span> · {student.mobile}</span>}
                                                                    </div>
                                                                </div>
                                                                {idx === 0 && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-xs shrink-0">Leader</Badge>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Team Member Details (added by participants) */}
                                            {team.memberDetails && team.memberDetails.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm text-gray-300 font-medium mb-2 flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-purple-400" /> Additional Members (added by participant)
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {team.memberDetails.map((member, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                                                                <div className="w-7 h-7 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-300 text-xs font-bold shrink-0">{idx + 1}</div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-white text-sm font-medium truncate">{member.name || "—"}</div>
                                                                    <div className="text-gray-400 text-xs flex flex-wrap items-center gap-2">
                                                                        {member.email && (
                                                                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span>
                                                                        )}
                                                                        {member.phone && (
                                                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </Card>
                        </motion.div>
                    ))}
                    {filtered.length === 0 && (
                        <Card className="bg-white/5 border-white/10 p-8 text-center">
                            <p className="text-gray-400">No teams found</p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
