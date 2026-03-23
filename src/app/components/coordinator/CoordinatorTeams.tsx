import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Users, Search, Loader2, ExternalLink, ChevronDown } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { useAuth } from "../../../hooks/useAuth";
import { getAllTeams, type Team } from "../../../services/teamService";
import { getAssignmentsByStaff } from "../../../services/assignmentService";

export default function CoordinatorTeams() {
  const { userProfile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");

  useEffect(() => {
    async function load() {
      if (!userProfile?.uid) return;
      try {
        let ts = await getAllTeams();

        // Filter to only assigned teams
        const assignedSet = new Set<string>();
        const assignedTeamIds: string[] = (userProfile as any).assignedTeams || [];
        for (const tid of assignedTeamIds) assignedSet.add(tid);

        try {
          const staffAssignments = await getAssignmentsByStaff(userProfile.uid);
          for (const a of staffAssignments) assignedSet.add(a.teamId);
        } catch {
          // Non-blocking
        }

        ts = assignedSet.size > 0 ? ts.filter((t) => t.id && assignedSet.has(t.id)) : [];
        setTeams(ts);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userProfile]);

  const uniqueDomains = Array.from(new Set(teams.map((t) => t.domain))).sort();

  const filtered = teams.filter((t) => {
    const matchesDomain = domainFilter === "all" || t.domain === domainFilter;
    const matchesSearch =
      t.teamName.toLowerCase().includes(search.toLowerCase()) ||
      t.domain.toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-400 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Users className="w-5 h-5 text-purple-400" />
        <h2 className="text-white font-semibold">Assigned Teams</h2>
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">{teams.length}</Badge>
      </div>

      {/* Domain Filter + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {uniqueDomains.length > 1 && (
          <div className="relative sm:w-52 shrink-0">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
            >
              <option value="all" className="bg-gray-900">All Domains</option>
              {uniqueDomains.map((d) => (
                <option key={d} value={d} className="bg-gray-900">{d}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm"
          />
        </div>
      </div>

      {teams.length === 0 ? (
        <Card className="bg-white/5 border-white/10 p-10 text-center">
          <p className="text-gray-400">No teams have been assigned to you yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((team, i) => (
            <motion.div key={team.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="bg-white/5 border-white/10 p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {team.teamName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{team.teamName}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs">{team.domain}</Badge>
                      <span className="text-xs text-gray-500">{team.members?.length || 0} member(s)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {team.submissionLink ? (
                      <a
                        href={team.submissionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors text-xs font-medium"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Submission
                      </a>
                    ) : (
                      <Badge className="bg-white/5 text-gray-500 border-white/10 text-xs">No submission</Badge>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && teams.length > 0 && (
            <div className="text-center text-gray-400 py-10">No teams match your search</div>
          )}
        </div>
      )}
    </div>
  );
}
