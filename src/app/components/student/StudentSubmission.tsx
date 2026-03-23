import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "../../../hooks/useAuth";
import { updateStudent } from "../../../services/studentService";
import { getTeamByMember, updateTeamSubmission, type Team } from "../../../services/teamService";
import { toast } from "sonner";

export default function StudentSubmission() {
  const { userProfile } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => {
    if (userProfile?.uid) {
      getTeamByMember(userProfile.uid).then((t) => {
        setTeam(t);
        if (t?.submissionLink) setSubmissionUrl(t.submissionLink);
      }).catch(() => { });
    }
  }, [userProfile]);

  const handleSaveLink = async () => {
    if (!linkInput.trim() || !userProfile?.uid) return;
    setSavingLink(true);
    try {
      await updateStudent(userProfile.uid, { submissionUrl: linkInput.trim() });
      if (team?.id) await updateTeamSubmission(team.id, linkInput.trim());
      setSubmissionUrl(linkInput.trim());
      setLinkInput("");
      toast.success("Submission link saved!");
    } catch (e: any) { toast.error(e.message); } finally { setSavingLink(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {submissionUrl && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-green-900/20 border-green-500/30 p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-green-400 shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-green-400 font-semibold mb-1">Submission uploaded!</h3>
                <a href={submissionUrl} target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm flex items-center gap-1 break-all">
                  {submissionUrl} <ExternalLink className="w-4 h-4 shrink-0" />
                </a>
                <Button size="sm" variant="outline" className="mt-3 border-white/20" onClick={() => { setSubmissionUrl(""); setLinkInput(""); }}>
                  Replace Submission
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {!submissionUrl && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-white/5 border-white/10 p-6">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Link className="w-5 h-5 text-blue-400" /> Submit a Link
            </h3>
            <p className="text-gray-400 text-sm mb-3">Paste a Google Drive, GitHub, or Figma link</p>
            <div className="flex gap-2">
              <Input value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://drive.google.com/..." className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 flex-1" />
              <Button onClick={handleSaveLink} disabled={savingLink} className="bg-gradient-to-r from-blue-600 to-purple-600">
                {savingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {!team && (
        <Card className="bg-orange-900/20 border-orange-500/30 p-4">
          <p className="text-orange-300 text-sm">⚠️ You must be in a team before submitting. Go to "My Team" first.</p>
        </Card>
      )}
    </div>
  );
}

