import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Target, Plus, Trash2, Loader2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { getDomains, createDomain, deleteDomain, type Domain } from "../../../services/adminService";
import { toast } from "sonner";

export default function AdminDomains() {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState("");
    const [creating, setCreating] = useState(false);

    const load = async () => { setLoading(true); try { setDomains(await getDomains()); } catch { /* ignore */ } finally { setLoading(false); } };
    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if (!newDomain.trim()) { toast.error("Enter domain name"); return; }
        setCreating(true);
        try { await createDomain(newDomain.trim()); setNewDomain(""); load(); toast.success("Domain created!"); }
        catch (e: any) { toast.error(e.message); } finally { setCreating(false); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete domain "${name}"?`)) return;
        try { await deleteDomain(id); load(); toast.success("Domain deleted"); } catch (e: any) { toast.error(e.message); }
    };

    const DOMAIN_COLORS = ["from-purple-500 to-violet-500", "from-blue-500 to-cyan-500", "from-green-500 to-emerald-500", "from-orange-500 to-amber-500", "from-pink-500 to-rose-500", "from-red-500 to-orange-500"];

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl text-white font-semibold">Manage Domains</h2>
            </div>

            <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="text-white font-medium mb-3">Add New Domain</h3>
                <div className="flex gap-2">
                    <Input value={newDomain} onChange={(e) => setNewDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder="e.g. AI & Machine Learning" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 flex-1" />
                    <Button onClick={handleCreate} disabled={creating} className="bg-gradient-to-r from-purple-600 to-blue-600">
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" />Add</>}
                    </Button>
                </div>
            </Card>

            {loading ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {domains.map((d, i) => (
                        <motion.div key={d.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                            <Card className="bg-white/5 border-white/10 p-4 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${DOMAIN_COLORS[i % DOMAIN_COLORS.length]} flex items-center justify-center shrink-0`}>
                                    <Target className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white flex-1 font-medium">{d.name}</span>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" onClick={() => handleDelete(d.id!, d.name)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </Card>
                        </motion.div>
                    ))}
                    {domains.length === 0 && <div className="col-span-2 text-center text-gray-400 py-8">No domains yet. Add one above.</div>}
                </div>
            )}
        </div>
    );
}
