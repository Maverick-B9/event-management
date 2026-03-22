import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { UserCog, Plus, Trash2, Loader2, Mail, RefreshCw, Download } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { getStaffByRole, createStaffMember, deleteStaffMember, forceChangeUserPassword, type StaffMember } from "../../../services/adminService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { toast } from "sonner";
import Papa from "papaparse";

export default function AdminCoordinators() {
    const [coordinators, setCoordinators] = useState<StaffMember[]>([]);
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

    const load = async () => {
        setLoading(true);
        try { setCoordinators(await getStaffByRole("coordinator")); } catch { /* ignore */ } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!name || !email || !password) { toast.error("Fill all fields"); return; }
        setCreating(true);
        try {
            await createStaffMember({ name, email, role: "coordinator" }, password);
            toast.success("Coordinator created!"); setName(""); setEmail(""); setPassword(""); setShowForm(false); load();
        } catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
    };

    const handleDelete = async (c: StaffMember) => {
        if (!confirm(`Remove coordinator ${c.name}?`)) return;
        try {
            await deleteStaffMember(c.id!, c.email, c.initialPassword);
            load();
            toast.success("Coordinator removed");
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
            // We must also update the Firestore document so we know the new password next time!
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

    const handleDownload = () => {
        if (coordinators.length === 0) { toast.error("No coordinators to export"); return; }
        const rows = coordinators.map((c) => ({
            "User ID": c.id || "",
            "Name": c.name,
            "Email": c.email,
            "Role": c.role,
            "Initial Password": c.initialPassword || "—",
        }));
        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "coordinator_credentials.csv"; a.click();
        URL.revokeObjectURL(url);
        toast.success("Coordinator credentials downloaded!");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <UserCog className="w-6 h-6 text-purple-400" />
                    <h2 className="text-xl text-white font-semibold">Coordinators</h2>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">{coordinators.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleDownload} className="bg-gradient-to-r from-orange-600 to-amber-600">
                        <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-purple-600 to-pink-600">
                        <Plus className="w-4 h-4 mr-2" /> Add Coordinator
                    </Button>
                </div>
            </div>

            {showForm && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="bg-white/5 border-white/10 p-6 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" type="password" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleCreate} disabled={creating} className="bg-gradient-to-r from-purple-600 to-pink-600">
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
                            </Button>
                            <Button onClick={() => setShowForm(false)} variant="outline" className="border-white/20">Cancel</Button>
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* Password Reset Modal */}
            {resetUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <Card className="bg-[#1a0a2e] border-purple-500/30 p-6 w-full max-w-sm">
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
                            <Button onClick={handleForceReset} disabled={resetting} className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600">
                                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Password"}
                            </Button>
                            <Button onClick={() => setResetUser(null)} variant="outline" className="border-white/20 text-gray-300">Cancel</Button>
                        </div>
                    </Card>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
            ) : (
                <div className="space-y-2">
                    {coordinators.map((c, i) => (
                        <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                            <Card className="bg-white/5 border-white/10 p-4 flex flex-wrap items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium truncate">{c.name}</div>
                                    <div className="text-gray-400 text-sm flex items-center gap-1 truncate">
                                        <Mail className="w-3 h-3 shrink-0" />{c.email}
                                    </div>
                                </div>
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">Coordinator</Badge>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300" onClick={() => setResetUser(c)} title="Change password">
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-8 w-8 p-0" onClick={() => handleDelete(c)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                    {coordinators.length === 0 && (
                        <Card className="bg-white/5 border-white/10 p-8 text-center">
                            <p className="text-gray-400">No coordinators yet. Add one above.</p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
