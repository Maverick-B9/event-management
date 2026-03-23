import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gavel, Plus, Trash2, Loader2, Mail, RefreshCw, Download, Users, X, Search, Check } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { getStaffByRole, createStaffMember, deleteStaffMember, forceChangeUserPassword, updateAssignedTeams, type StaffMember } from "../../../services/adminService";
import { getAllTeams, type Team } from "../../../services/teamService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { toast } from "sonner";
import Papa from "papaparse";

export default function AdminJury() {
    const [jury, setJury] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Password Reset Modal State
    const [resetUser, setResetUser] = useState<StaffMember | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [resetting, setResetting] = useState(false);

    // Team Assignment Modal State
    const [assignUser, setAssignUser] = useState<StaffMember | null>(null);
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
    const [teamSearch, setTeamSearch] = useState("");
    const [savingAssignment, setSavingAssignment] = useState(false);
    const [loadingTeams, setLoadingTeams] = useState(false);

    const load = async () => {
        setLoading(true);
        try { setJury(await getStaffByRole("jury")); } catch { /* ignore */ } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!name || !email || !password) { toast.error("Fill all fields"); return; }
        setCreating(true);
        try {
            await createStaffMember({ name, email, role: "jury" }, password);
            toast.success("Jury member created!"); setName(""); setEmail(""); setPassword(""); setShowForm(false); load();
        } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
    };

    const handleDelete = async (j: StaffMember) => {
        if (!confirm(`Remove jury member ${j.name}?`)) return;
        try {
            await deleteStaffMember(j.id!, j.email, j.initialPassword);
            load();
            toast.success("Jury member removed");
        } catch (e: any) {
            toast.error(e.message);
        }
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

    /* ---- Team Assignment ---- */
    const openAssignModal = async (j: StaffMember) => {
        setAssignUser(j);
        setSelectedTeamIds(new Set(j.assignedTeams || []));
        setTeamSearch("");
        setLoadingTeams(true);
        try {
            setAllTeams(await getAllTeams());
        } catch {
            toast.error("Failed to load teams");
        } finally {
            setLoadingTeams(false);
        }
    };

    const toggleTeam = (teamId: string) => {
        setSelectedTeamIds((prev) => {
            const next = new Set(prev);
            if (next.has(teamId)) next.delete(teamId);
            else next.add(teamId);
            return next;
        });
    };

    const handleSaveAssignment = async () => {
        if (!assignUser?.id) return;
        setSavingAssignment(true);
        try {
            await updateAssignedTeams(assignUser.id, Array.from(selectedTeamIds));
            toast.success(`Teams assigned to ${assignUser.name}`);
            setAssignUser(null);
            load();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSavingAssignment(false);
        }
    };

    const filteredTeams = allTeams.filter((t) =>
        t.teamName.toLowerCase().includes(teamSearch.toLowerCase()) ||
        t.domain.toLowerCase().includes(teamSearch.toLowerCase())
    );

    const handleDownload = () => {
        if (jury.length === 0) { toast.error("No jury members to export"); return; }
        const rows = jury.map((j) => ({
            "User ID": j.id || "",
            "Name": j.name,
            "Email": j.email,
            "Role": j.role,
            "Assigned Teams": (j.assignedTeams || []).length,
            "Initial Password": j.initialPassword || "—",
        }));
        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "jury_credentials.csv"; a.click();
        URL.revokeObjectURL(url);
        toast.success("Jury credentials downloaded!");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Gavel className="w-6 h-6 text-orange-400" />
                    <h2 className="text-xl text-white font-semibold">Jury Members</h2>
                    <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40">{jury.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleDownload} className="bg-gradient-to-r from-orange-600 to-amber-600">
                        <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-orange-600 to-red-600">
                        <Plus className="w-4 h-4 mr-2" /> Add Jury Member
                    </Button>
                </div>
            </div>

            {showForm && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="bg-white/5 border-white/10 p-6 space-y-3">
                        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" disabled={creating} className="bg-gradient-to-r from-orange-600 to-red-600">
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                                </Button>
                                <Button type="button" onClick={() => setShowForm(false)} variant="outline" className="border-white/20">Cancel</Button>
                            </div>
                        </form>
                    </Card>
                </motion.div>
            )}

            {/* Password Reset Modal */}
            <AnimatePresence>
                {resetUser && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <Card className="bg-[#1a0a2e] border-orange-500/30 p-6 w-full max-w-sm">
                            <h3 className="text-white font-semibold mb-2">Change Password</h3>
                            <p className="text-gray-400 text-sm mb-4">Set a new password for {resetUser.name}</p>
                            <form onSubmit={(e) => { e.preventDefault(); handleForceReset(); }}>
                                <Input
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="New password"
                                    type="password"
                                    className="bg-white/5 border-white/10 text-white mb-4"
                                />
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={resetting} className="flex-1 bg-gradient-to-r from-orange-600 to-red-600">
                                        {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Password"}
                                    </Button>
                                    <Button type="button" onClick={() => setResetUser(null)} variant="outline" className="border-white/20 text-gray-300">Cancel</Button>
                                </div>
                            </form>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Team Assignment Modal */}
            <AnimatePresence>
                {assignUser && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
                                <div>
                                    <h3 className="text-lg text-white font-semibold flex items-center gap-2">
                                        <Users className="w-5 h-5 text-orange-400" /> Assign Teams
                                    </h3>
                                    <p className="text-sm text-gray-400 mt-0.5">for {assignUser.name}</p>
                                </div>
                                <button onClick={() => setAssignUser(null)} className="text-gray-400 hover:text-white p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="px-5 py-3 border-b border-white/10 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        value={teamSearch}
                                        onChange={(e) => setTeamSearch(e.target.value)}
                                        placeholder="Search teams..."
                                        className="pl-9 h-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-gray-500"
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                                    <span>{selectedTeamIds.size} of {allTeams.length} selected</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setSelectedTeamIds(new Set(allTeams.map((t) => t.id!)))} className="text-orange-400 hover:text-orange-300">Select All</button>
                                        <button onClick={() => setSelectedTeamIds(new Set())} className="text-gray-400 hover:text-white">Clear</button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-3">
                                {loadingTeams ? (
                                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-orange-400 animate-spin" /></div>
                                ) : filteredTeams.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8 text-sm">No teams found</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {filteredTeams.map((team) => {
                                            const isSelected = selectedTeamIds.has(team.id!);
                                            return (
                                                <button
                                                    key={team.id}
                                                    onClick={() => toggleTeam(team.id!)}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${isSelected ? "bg-orange-500/15 border border-orange-500/30" : "bg-white/5 border border-transparent hover:bg-white/10"}`}
                                                >
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${isSelected ? "bg-orange-500 border-orange-500" : "border-white/20"}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white text-sm font-medium truncate">{team.teamName}</div>
                                                        <div className="text-gray-400 text-xs">{team.domain}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 p-5 border-t border-white/10 shrink-0">
                                <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => setAssignUser(null)}>Cancel</Button>
                                <Button onClick={handleSaveAssignment} disabled={savingAssignment} className="bg-gradient-to-r from-orange-600 to-red-600">
                                    {savingAssignment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    Save Assignment
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-orange-400 animate-spin" /></div>
            ) : (
                <div className="space-y-2">
                    {jury.map((j, i) => (
                        <motion.div key={j.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card className="bg-white/5 border-white/10 p-4 flex flex-wrap items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                    {j.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium truncate">{j.name}</div>
                                    <div className="text-gray-400 text-sm flex items-center gap-1 truncate">
                                        <Mail className="w-3 h-3 shrink-0" />{j.email}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40">Jury</Badge>
                                    {(j.assignedTeams && j.assignedTeams.length > 0) ? (
                                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs">
                                            <Users className="w-3 h-3 mr-1" />{j.assignedTeams.length} teams
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/40 text-xs">
                                            All teams
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300" onClick={() => openAssignModal(j)} title="Assign teams">
                                        <Users className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300" onClick={() => setResetUser(j)} title="Change password">
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" onClick={() => handleDelete(j)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                    {jury.length === 0 && (
                        <Card className="bg-white/5 border-white/10 p-8 text-center">
                            <p className="text-gray-400">No jury members yet. Add one above.</p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
