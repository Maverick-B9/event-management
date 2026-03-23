import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, Plus, UserPlus, Target, Loader2, CheckCircle, Copy, Trash2, Save } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useAuth } from "../../../hooks/useAuth";
import { getTeamByMember, createTeam, joinTeam, updateTeamMembers } from "../../../services/teamService";
import type { Team, TeamMemberDetail } from "../../../services/teamService";
import { getDomains } from "../../../services/adminService";
import type { Domain } from "../../../services/adminService";
import { updateStudent } from "../../../services/studentService";
import { toast } from "sonner";

export default function StudentTeam() {
  const { userProfile } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [memberDetails, setMemberDetails] = useState<TeamMemberDetail[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "create" | "join">("view");
  const [teamName, setTeamName] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [joinTeamId, setJoinTeamId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [membersDirty, setMembersDirty] = useState(false);

  useEffect(() => {
    async function load() {
      if (!userProfile?.uid) return;
      try {
        const [t, d] = await Promise.all([getTeamByMember(userProfile.uid), getDomains()]);
        setTeam(t);
        if (t?.memberDetails) {
          setMemberDetails(t.memberDetails);
        }
        setDomains(d);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userProfile]);

  const handleCreate = async () => {
    if (!teamName.trim() || !selectedDomain) { toast.error("Enter team name and select domain"); return; }
    if (!userProfile?.uid) return;
    setSubmitting(true);
    try {
      const teamId = await createTeam(teamName.trim(), selectedDomain, userProfile.uid);
      await updateStudent(userProfile.uid, { domain: selectedDomain, teamId });
      const newTeam = await getTeamByMember(userProfile.uid);
      setTeam(newTeam);
      setMemberDetails([]);
      setMode("view");
      toast.success("Team created successfully!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!joinTeamId.trim()) { toast.error("Enter team ID"); return; }
    if (!userProfile?.uid) return;
    setSubmitting(true);
    try {
      await joinTeam(joinTeamId.trim(), userProfile.uid);
      const newTeam = await getTeamByMember(userProfile.uid);
      setTeam(newTeam);
      if (newTeam?.memberDetails) setMemberDetails(newTeam.memberDetails);
      setMode("view");
      toast.success("Joined team successfully!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMemberRow = () => {
    const maxSize = team?.teamSize || 5;
    if (memberDetails.length >= (maxSize - 1)) { toast.error(`Max ${maxSize} members per team (including leader)`); return; }
    setMemberDetails([...memberDetails, { name: "", email: "", phone: "" }]);
    setMembersDirty(true);
  };

  const handleUpdateMember = (index: number, field: keyof TeamMemberDetail, value: string) => {
    const updated = [...memberDetails];
    updated[index] = { ...updated[index], [field]: value };
    setMemberDetails(updated);
    setMembersDirty(true);
  };

  const handleRemoveMember = async (index: number) => {
    const updated = memberDetails.filter((_, i) => i !== index);
    setMemberDetails(updated);
    setMembersDirty(true);

    // Auto-save when removing a member (especially important when removing the last one)
    if (team?.id) {
      setSavingMembers(true);
      try {
        await updateTeamMembers(team.id, updated);
        setTeam({ ...team, memberDetails: updated });
        setMembersDirty(false);
        toast.success("Member removed and roster saved!");
      } catch (e: any) {
        toast.error("Failed to save: " + e.message);
      } finally {
        setSavingMembers(false);
      }
    }
  };

  const handleSaveMembers = async () => {
    if (!team?.id) return;
    // Validate
    if (memberDetails.some(m => !m.name.trim() || !m.phone.trim())) {
      toast.error("Please fill all member names and phones");
      return;
    }
    setSavingMembers(true);
    try {
      await updateTeamMembers(team.id, memberDetails);
      setTeam({ ...team, memberDetails });
      setMembersDirty(false);
      toast.success("Team roster saved!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingMembers(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {team ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl text-white font-bold">{team.teamName}</h2>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">{team.domain}</Badge>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between mb-6">
              <span className="text-gray-400 text-sm">Team ID: <span className="text-white font-mono">{team.id}</span></span>
              <button onClick={() => { navigator.clipboard.writeText(team.id!); toast.success("Team ID copied!"); }}>
                <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-white font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  Team Roster ({1 + memberDetails.length}/{team.teamSize || 5})
                </div>
                {(1 + memberDetails.length) < (team.teamSize || 5) && (
                  <Button onClick={handleAddMemberRow} size="sm" variant="outline" className="h-8 border-white/10 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Member
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {/* Leader Row */}
                <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-purple-500/30">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{userProfile?.name} (You)</div>
                    <div className="text-gray-400 text-xs truncate">{userProfile?.email}</div>
                  </div>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shrink-0">Leader</Badge>
                </div>

                {/* Other Members */}
                {memberDetails.map((member, i) => (
                  <div key={i} className="flex gap-3 bg-white/5 rounded-lg p-3 relative group">
                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">{i + 2}</div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={member.name}
                        onChange={(e) => handleUpdateMember(i, "name", e.target.value)}
                        placeholder="Full Name"
                        className="h-8 bg-white/5 border-white/10 text-white text-sm"
                      />
                      <div className="flex gap-2">
                        <Input
                          value={member.email}
                          onChange={(e) => handleUpdateMember(i, "email", e.target.value)}
                          placeholder="Email (optional)"
                          className="h-8 bg-white/5 border-white/10 text-white text-sm flex-1"
                        />
                        <Input
                          value={member.phone}
                          onChange={(e) => handleUpdateMember(i, "phone", e.target.value)}
                          placeholder="Phone / Reg No"
                          className="h-8 bg-white/5 border-white/10 text-white text-sm flex-1"
                        />
                      </div>
                    </div>
                    <button onClick={() => handleRemoveMember(i)} disabled={savingMembers} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 disabled:opacity-50">
                      {savingMembers ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              {(memberDetails.length > 0 || membersDirty) && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSaveMembers} disabled={savingMembers} className="bg-gradient-to-r from-purple-600 to-blue-600">
                    {savingMembers ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Roster
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      ) : (
        <>
          {mode === "view" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">You're not in a team yet</h3>
                <p className="text-gray-400 text-sm mb-6">Create a new team or join an existing one</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setMode("create")} className="bg-gradient-to-r from-purple-600 to-blue-600">
                    <Plus className="w-4 h-4 mr-2" /> Create Team
                  </Button>
                  <Button onClick={() => setMode("join")} variant="outline" className="border-white/20 text-gray-300">
                    <UserPlus className="w-4 h-4 mr-2" /> Join Team
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {mode === "create" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Create New Team</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">Team Name</label>
                    <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Enter team name" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-300 mb-2 block">Select Domain</label>
                    <div className="grid grid-cols-2 gap-2">
                      {domains.map((d) => (
                        <button key={d.id} onClick={() => setSelectedDomain(d.name)}
                          className={`p-3 rounded-lg border text-sm text-left transition-all ${selectedDomain === d.name ? "border-purple-500 bg-purple-500/20 text-white" : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                          <Target className="w-4 h-4 mb-1 inline mr-1" />{d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleCreate} disabled={submitting} className="bg-gradient-to-r from-purple-600 to-blue-600">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" />Create Team</>}
                    </Button>
                    <Button onClick={() => setMode("view")} variant="outline" className="border-white/20 text-gray-300">Cancel</Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {mode === "join" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="text-white font-semibold text-lg mb-4">Join Existing Team</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 mb-1 block">Team ID</label>
                    <Input value={joinTeamId} onChange={(e) => setJoinTeamId(e.target.value)} placeholder="Paste the team ID" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 font-mono" />
                    <p className="text-xs text-gray-500 mt-1">Get the Team ID from your team leader</p>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleJoin} disabled={submitting} className="bg-gradient-to-r from-purple-600 to-blue-600">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" />Join Team</>}
                    </Button>
                    <Button onClick={() => setMode("view")} variant="outline" className="border-white/20 text-gray-300">Cancel</Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
