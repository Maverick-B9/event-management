import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { Upload, FileText, Link, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useAuth } from "../../../hooks/useAuth";
import { uploadStudentFile } from "../../../services/uploadService";
import { updateStudent } from "../../../services/studentService";
import { getTeamByMember, updateTeamSubmission, type Team } from "../../../services/teamService";
import { toast } from "sonner";

export default function StudentSubmission() {
  const { userProfile } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState(userProfile?.submissionUrl || "");
  const [linkInput, setLinkInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile?.uid) {
      getTeamByMember(userProfile.uid).then(setTeam).catch(() => { });
    }
    if (userProfile?.submissionUrl) setSubmissionUrl(userProfile.submissionUrl);
  }, [userProfile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.uid) return;
    const maxMB = 20;
    if (file.size > maxMB * 1024 * 1024) { toast.error(`File too large (max ${maxMB}MB)`); return; }
    setUploading(true);
    try {
      const url = await uploadStudentFile(userProfile.uid, file);
      await updateStudent(userProfile.uid, { submissionUrl: url });
      if (team?.id) await updateTeamSubmission(team.id, url);
      setSubmissionUrl(url);
      toast.success("File uploaded successfully!");
    } catch (e: any) { toast.error("Upload failed: " + e.message); } finally { setUploading(false); }
  };

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
        <>
          {/* File upload */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-400" /> Upload File
              </h3>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.ppt,.pptx,.doc,.docx,.zip" onChange={handleFileUpload} />
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center cursor-pointer hover:border-purple-500/50 hover:bg-purple-500/5 transition-all"
              >
                {uploading ? (
                  <><Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-3" />
                    <p className="text-gray-300">Uploading to Firebase Storage...</p></>
                ) : (
                  <><FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-300">Click to upload pitch deck or project file</p>
                    <p className="text-gray-500 text-sm mt-1">PDF, PPT, PPTX, DOC, DOCX, ZIP (max 20MB)</p></>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Or submit link */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <Link className="w-5 h-5 text-blue-400" /> Or Submit a Link
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
        </>
      )}

      {!team && (
        <Card className="bg-orange-900/20 border-orange-500/30 p-4">
          <p className="text-orange-300 text-sm">⚠️ You must be in a team before submitting. Go to "My Team" first.</p>
        </Card>
      )}
    </div>
  );
}
