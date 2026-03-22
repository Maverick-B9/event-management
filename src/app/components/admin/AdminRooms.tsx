import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { DoorOpen, Loader2, Plus, Trash2, Search, Save, Users, Gavel, UserCog, Check, X } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { createRoom, deleteRoom, updateRoomAssignments, subscribeRooms, type Room } from "../../../services/roomService";
import { getAllTeams, type Team } from "../../../services/teamService";
import { getStaffByRole, type StaffMember } from "../../../services/adminService";
import { toast } from "sonner";

export default function AdminRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [juryMembers, setJuryMembers] = useState<StaffMember[]>([]);
    const [coordinators, setCoordinators] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // New room form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [roomName, setRoomName] = useState("");
    const [roomFloor, setRoomFloor] = useState("");
    const [roomCapacity, setRoomCapacity] = useState("");
    const [creating, setCreating] = useState(false);

    // Assignment state
    const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
    const [localAssignments, setLocalAssignments] = useState<Record<string, { teams: string[]; jury: string[]; coordinators: string[] }>>({});
    const [savingRoom, setSavingRoom] = useState<string | null>(null);

    useEffect(() => {
        // Load teams and staff
        Promise.all([
            getAllTeams(),
            getStaffByRole("jury"),
            getStaffByRole("coordinator"),
        ]).then(([t, j, c]) => {
            setTeams(t);
            setJuryMembers(j);
            setCoordinators(c);
        });

        // Real-time rooms
        const unsub = subscribeRooms((data) => {
            setRooms(data);
            setLoading(false);
        });
        return unsub;
    }, []);

    // Sync local assignments whenever rooms change
    useEffect(() => {
        const assigns: Record<string, { teams: string[]; jury: string[]; coordinators: string[] }> = {};
        rooms.forEach((r) => {
            assigns[r.id!] = {
                teams: r.assignedTeamIds || [],
                jury: r.assignedJuryIds || [],
                coordinators: r.assignedCoordinatorIds || [],
            };
        });
        setLocalAssignments(assigns);
    }, [rooms]);

    const handleCreate = async () => {
        if (!roomName.trim()) { toast.error("Enter room name"); return; }
        setCreating(true);
        try {
            await createRoom({
                name: roomName.trim(),
                floor: roomFloor.trim() || undefined,
                capacity: roomCapacity ? parseInt(roomCapacity) : undefined,
            });
            toast.success("Room created!");
            setRoomName(""); setRoomFloor(""); setRoomCapacity("");
            setShowCreateForm(false);
        } catch (e: any) { toast.error(e.message); }
        finally { setCreating(false); }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this room?")) return;
        try {
            await deleteRoom(id);
            toast.success("Room deleted");
        } catch (e: any) { toast.error(e.message); }
    };

    const toggleAssignment = (roomId: string, type: "teams" | "jury" | "coordinators", id: string) => {
        setLocalAssignments((prev) => {
            const current = prev[roomId] || { teams: [], jury: [], coordinators: [] };
            const arr = current[type];
            const updated = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
            return { ...prev, [roomId]: { ...current, [type]: updated } };
        });
    };

    const isDirty = (roomId: string) => {
        const room = rooms.find((r) => r.id === roomId);
        const local = localAssignments[roomId];
        if (!room || !local) return false;
        return (
            JSON.stringify(room.assignedTeamIds || []) !== JSON.stringify(local.teams) ||
            JSON.stringify(room.assignedJuryIds || []) !== JSON.stringify(local.jury) ||
            JSON.stringify(room.assignedCoordinatorIds || []) !== JSON.stringify(local.coordinators)
        );
    };

    const handleSaveAssignments = async (roomId: string) => {
        const local = localAssignments[roomId];
        if (!local) return;
        setSavingRoom(roomId);
        try {
            await updateRoomAssignments(roomId, {
                assignedTeamIds: local.teams,
                assignedJuryIds: local.jury,
                assignedCoordinatorIds: local.coordinators,
            });
            toast.success("Room assignments saved!");
        } catch (e: any) { toast.error(e.message); }
        finally { setSavingRoom(null); }
    };

    const teamNameMap: Record<string, string> = {};
    teams.forEach((t) => { if (t.id) teamNameMap[t.id] = t.teamName; });
    const juryNameMap: Record<string, string> = {};
    juryMembers.forEach((j) => { if (j.id) juryNameMap[j.id] = j.name; });
    const coordNameMap: Record<string, string> = {};
    coordinators.forEach((c) => { if (c.id) coordNameMap[c.id] = c.name; });

    const filteredRooms = rooms.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.floor || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <DoorOpen className="w-6 h-6 text-teal-400" />
                    <h2 className="text-xl text-white font-semibold">Room Allocation</h2>
                    <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40">{rooms.length} rooms</Badge>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                        <span className="relative flex h-2 w-2 mr-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        Live
                    </Badge>
                </div>
                <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                    {showCreateForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {showCreateForm ? "Cancel" : "Add Room"}
                </Button>
            </div>

            {/* Create Room Form */}
            {showCreateForm && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="bg-teal-900/20 border-teal-500/30 p-6">
                        <h3 className="text-white font-semibold text-lg mb-4">Create New Room</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                            <div>
                                <label className="text-sm text-gray-300 mb-1 block">Room Name *</label>
                                <Input value={roomName} onChange={(e) => setRoomName(e.target.value)}
                                    placeholder="e.g. Room 101" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300 mb-1 block">Floor</label>
                                <Input value={roomFloor} onChange={(e) => setRoomFloor(e.target.value)}
                                    placeholder="e.g. Ground Floor" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300 mb-1 block">Capacity</label>
                                <Input type="number" value={roomCapacity} onChange={(e) => setRoomCapacity(e.target.value)}
                                    placeholder="e.g. 30" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                            </div>
                        </div>
                        <Button onClick={handleCreate} disabled={creating} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            Create Room
                        </Button>
                    </Card>
                </motion.div>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by room name or floor..."
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-teal-400 animate-spin" /></div>
            ) : filteredRooms.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-8 text-center">
                    <DoorOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">{rooms.length === 0 ? "No rooms created yet. Click \"Add Room\" to get started." : "No matching rooms found."}</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredRooms.map((room, i) => {
                        const local = localAssignments[room.id!] || { teams: [], jury: [], coordinators: [] };
                        const dirty = isDirty(room.id!);
                        return (
                            <motion.div key={room.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                <Card className={`bg-white/5 border-white/10 overflow-hidden ${dirty ? "ring-1 ring-teal-500/50" : ""}`}>
                                    {/* Room header */}
                                    <button
                                        onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id!)}
                                        className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            <DoorOpen className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-white font-medium truncate">{room.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {room.floor && <span className="text-gray-400 text-xs">{room.floor}</span>}
                                                {room.capacity && <Badge className="bg-white/10 text-gray-300 border-white/10 text-[10px]">Cap: {room.capacity}</Badge>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                            {local.teams.length > 0 && (
                                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs">
                                                    <Users className="w-3 h-3 mr-1" />{local.teams.length} Team{local.teams.length !== 1 ? "s" : ""}
                                                </Badge>
                                            )}
                                            {local.jury.length > 0 && (
                                                <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40 text-xs">
                                                    <Gavel className="w-3 h-3 mr-1" />{local.jury.length} Jury
                                                </Badge>
                                            )}
                                            {local.coordinators.length > 0 && (
                                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">
                                                    <UserCog className="w-3 h-3 mr-1" />{local.coordinators.length} Coord
                                                </Badge>
                                            )}
                                            {dirty && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-xs">Unsaved</Badge>}
                                        </div>
                                    </button>

                                    {/* Expanded: assign teams/jury/coordinators */}
                                    {expandedRoom === room.id && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-white/10">
                                            <div className="p-4 space-y-6">
                                                {/* Teams */}
                                                <div>
                                                    <h4 className="text-sm text-gray-300 font-medium mb-3 flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-blue-400" /> Assign Teams
                                                    </h4>
                                                    {teams.length === 0 ? (
                                                        <p className="text-gray-500 text-sm">No teams created yet.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                                            {teams.map((t) => {
                                                                const selected = local.teams.includes(t.id!);
                                                                return (
                                                                    <button key={t.id} onClick={() => toggleAssignment(room.id!, "teams", t.id!)}
                                                                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left text-sm ${selected ? "border-blue-500/50 bg-blue-500/10 text-white" : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-blue-500 border-blue-500" : "border-white/30"}`}>
                                                                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                                                                        </div>
                                                                        <span className="truncate">{t.teamName}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Jury */}
                                                <div>
                                                    <h4 className="text-sm text-gray-300 font-medium mb-3 flex items-center gap-2">
                                                        <Gavel className="w-4 h-4 text-orange-400" /> Assign Jury Members
                                                    </h4>
                                                    {juryMembers.length === 0 ? (
                                                        <p className="text-gray-500 text-sm">No jury members created yet.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {juryMembers.map((j) => {
                                                                const selected = local.jury.includes(j.id!);
                                                                return (
                                                                    <button key={j.id} onClick={() => toggleAssignment(room.id!, "jury", j.id!)}
                                                                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left text-sm ${selected ? "border-orange-500/50 bg-orange-500/10 text-white" : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-orange-500 border-orange-500" : "border-white/30"}`}>
                                                                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="font-medium truncate">{j.name}</div>
                                                                            <div className="text-xs text-gray-500 truncate">{j.email}</div>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Coordinators */}
                                                <div>
                                                    <h4 className="text-sm text-gray-300 font-medium mb-3 flex items-center gap-2">
                                                        <UserCog className="w-4 h-4 text-purple-400" /> Assign Coordinators
                                                    </h4>
                                                    {coordinators.length === 0 ? (
                                                        <p className="text-gray-500 text-sm">No coordinators created yet.</p>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {coordinators.map((c) => {
                                                                const selected = local.coordinators.includes(c.id!);
                                                                return (
                                                                    <button key={c.id} onClick={() => toggleAssignment(room.id!, "coordinators", c.id!)}
                                                                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left text-sm ${selected ? "border-purple-500/50 bg-purple-500/10 text-white" : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-purple-500 border-purple-500" : "border-white/30"}`}>
                                                                            {selected && <Check className="w-2.5 h-2.5 text-white" />}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="font-medium truncate">{c.name}</div>
                                                                            <div className="text-xs text-gray-500 truncate">{c.email}</div>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center justify-between">
                                                    <Button variant="outline" onClick={() => handleDelete(room.id!)}
                                                        className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete Room
                                                    </Button>
                                                    <Button onClick={() => handleSaveAssignments(room.id!)}
                                                        disabled={!dirty || savingRoom === room.id}
                                                        className="bg-gradient-to-r from-teal-600 to-cyan-600">
                                                        {savingRoom === room.id
                                                            ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                            : <Save className="w-4 h-4 mr-2" />
                                                        }
                                                        Save Assignments
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
