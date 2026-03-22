import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bell, Settings, ToggleLeft, ToggleRight, Loader2, Send, Calendar, MapPin, Users, Trash2 } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { createAnnouncement, getAnnouncements, deleteAnnouncement, type Announcement } from "../../../services/announcementService";
import { getEventSettings, updateEventSettings, type EventSettings } from "../../../services/adminService";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Props { announcementsOnly?: boolean; }

export default function AdminSettings({ announcementsOnly }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<"all" | "coordinator" | "jury" | "staff">("all");
  const [posting, setPosting] = useState(false);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    getAnnouncements().then(setAnnouncements).catch(() => { });
    if (!announcementsOnly) getEventSettings().then(setSettings).catch(() => { });
  }, [announcementsOnly]);

  const handlePost = async () => {
    if (!title.trim() || !description.trim()) { toast.error("Fill title and description"); return; }
    setPosting(true);
    try {
      await createAnnouncement(title.trim(), description.trim(), audience);
      toast.success("Announcement posted!");
      setTitle(""); setDescription(""); setAudience("all");
      setAnnouncements(await getAnnouncements());
    } catch (e: any) { toast.error(e.message); } finally { setPosting(false); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await deleteAnnouncement(id);
      toast.success("Announcement deleted");
      setAnnouncements(await getAnnouncements());
    } catch (e: any) {
      toast.error("Failed to delete announcement: " + e.message);
    }
  };

  const handleToggleRegistration = async () => {
    if (!settings) return;
    const updated = { ...settings, registrationOpen: !settings.registrationOpen };
    setSettings(updated);
    try { await updateEventSettings(updated); toast.success(`Registration ${updated.registrationOpen ? "opened" : "closed"}`); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try { await updateEventSettings(settings); toast.success("Settings saved!"); } catch (e: any) { toast.error(e.message); } finally { setSavingSettings(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Announcement composer */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-400" /> Post Announcement
        </h3>
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Announcement details..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 text-sm resize-none" />
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Audience</label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: "all" as const, label: "Everyone", active: "border-blue-500/50 bg-blue-500/20 text-white" },
                { value: "coordinator" as const, label: "Coordinators Only", active: "border-purple-500/50 bg-purple-500/20 text-white" },
                { value: "jury" as const, label: "Jury Only", active: "border-orange-500/50 bg-orange-500/20 text-white" },
                { value: "staff" as const, label: "Staff (Coord + Jury)", active: "border-green-500/50 bg-green-500/20 text-white" },
              ]).map((opt) => (
                <button key={opt.value} onClick={() => setAudience(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${audience === opt.value ? opt.active : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handlePost} disabled={posting} className="bg-gradient-to-r from-orange-600 to-red-600">
            {posting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Post Announcement
          </Button>
        </div>
      </Card>

      {/* Recent announcements list */}
      {announcements.length > 0 && (
        <Card className="bg-white/5 border-white/10 p-6">
          <h3 className="text-white font-semibold mb-4">Recent Announcements</h3>
          <div className="space-y-3">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="border-l-2 border-orange-500 pl-3 relative pr-8 group">
                <div className="flex items-center gap-2">
                  <div className="text-white text-sm font-medium">{a.title}</div>
                  {a.audience && a.audience !== "all" && (
                    <Badge className="bg-white/10 text-gray-300 border-white/10 text-[10px] px-1.5 py-0">
                      {a.audience === "coordinator" ? "Coord" : a.audience === "jury" ? "Jury" : "Staff"}
                    </Badge>
                  )}
                </div>
                <div className="text-gray-400 text-xs mt-1 line-clamp-1">{a.description}</div>
                {a.timestamp?.toDate && <div className="text-xs text-gray-500 mt-1">{formatDistanceToNow(a.timestamp.toDate(), { addSuffix: true })}</div>}
                <button
                  onClick={() => a.id && handleDeleteAnnouncement(a.id)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Event settings (only if not announcementsOnly) */}
      {!announcementsOnly && settings && (
        <>
          <Card className="bg-white/5 border-white/10 p-6">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-400" /> Event Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <div className="text-white font-medium">Registration</div>
                  <div className="text-gray-400 text-sm">Allow students to register</div>
                </div>
                <button onClick={handleToggleRegistration}>
                  {settings.registrationOpen
                    ? <ToggleRight className="w-8 h-8 text-green-400" />
                    : <ToggleLeft className="w-8 h-8 text-gray-500" />}
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <div className="text-white font-medium">Publish Leaderboard</div>
                  <div className="text-gray-400 text-sm">Make leaderboard visible to students</div>
                </div>
                <button onClick={async () => {
                  if (!settings) return;
                  const updated = { ...settings, leaderboardPublished: !settings.leaderboardPublished };
                  setSettings(updated);
                  try { await updateEventSettings(updated); toast.success(`Leaderboard ${updated.leaderboardPublished ? "published" : "hidden"}`); }
                  catch (e: any) { toast.error(e.message); }
                }}>
                  {settings.leaderboardPublished
                    ? <ToggleRight className="w-8 h-8 text-green-400" />
                    : <ToggleLeft className="w-8 h-8 text-gray-500" />}
                </button>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Event Name</label>
                <Input value={settings.eventName} onChange={(e) => setSettings({ ...settings, eventName: e.target.value })} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-300 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</label>
                  <Input type="date" value={settings.eventDate} onChange={(e) => setSettings({ ...settings, eventDate: e.target.value })} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="text-sm text-gray-300 mb-1 block flex items-center gap-1"><Users className="w-3 h-3" /> Max Team Size</label>
                  <Input type="number" min={1} max={10} value={settings.maxTeamSize} onChange={(e) => setSettings({ ...settings, maxTeamSize: parseInt(e.target.value) })} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block flex items-center gap-1"><MapPin className="w-3 h-3" /> Venue</label>
                <Input value={settings.venue} onChange={(e) => setSettings({ ...settings, venue: e.target.value })} placeholder="Event venue" className="bg-white/5 border-white/10 text-white placeholder:text-gray-500" />
              </div>
              <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-gradient-to-r from-green-600 to-teal-600">
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Settings
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
