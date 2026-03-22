import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Home, Users, Upload, Trophy, Bell, LogOut, Flame, Menu, X } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router";
import { useAuth } from "../../../hooks/useAuth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { toast } from "sonner";
import StudentHome from "./StudentHome";
import StudentTeam from "./StudentTeam";
import StudentSubmission from "./StudentSubmission";
import StudentLeaderboard from "./StudentLeaderboard";
import StudentAnnouncements from "./StudentAnnouncements";
import GlobalLogo from "../GlobalLogo";
import GlobalTitle from "../GlobalTitle";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prevLeaderboardStatus = useRef<boolean | null>(null);

  // Real-time leaderboard live notification
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "event"), (snap) => {
      const published = snap.data()?.leaderboardPublished === true;
      if (prevLeaderboardStatus.current !== null && published !== prevLeaderboardStatus.current) {
        if (published) {
          toast.success("🏆 Leaderboard is now LIVE!", { description: "Check the Leaderboard tab to see rankings." });
        } else {
          toast.info("Leaderboard has been hidden by the admin.");
        }
      }
      prevLeaderboardStatus.current = published;
    });
    return unsub;
  }, []);

  const menuItems = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "team", label: "My Team", icon: Users },
    { id: "submission", label: "Submission", icon: Upload },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
    { id: "announcements", label: "Announcements", icon: Bell },
  ];

  const handleLogout = async () => { await signOut(); navigate("/login"); };
  const initials = userProfile?.name
    ? userProfile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";
  const activeLabel = menuItems.find((i) => i.id === activeTab)?.label;

  const handleNav = (id: string) => { setActiveTab(id); setSidebarOpen(false); };

  const SidebarContent = () => (
    <>
      <div className="p-6 flex-1">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <GlobalLogo fallback={<Flame className="w-6 h-6 text-orange-400" />} />
          </div>
          <div><h2 className="text-sm text-white font-semibold"><GlobalTitle fallback="Ignited Minds" /></h2><p className="text-xs text-gray-400">Student Portal</p></div>
        </div>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${activeTab === item.id ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                <Icon className="w-5 h-5 shrink-0" /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="p-4">
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{userProfile?.name || "Student"}</div>
              <div className="text-xs text-gray-400 truncate">{userProfile?.regNo || userProfile?.email}</div>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="w-full border-white/10 text-gray-300 hover:bg-red-500/20 hover:text-red-400">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </Card>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-transparent">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-purple-950/30 to-black/30 backdrop-blur-xl border-r border-white/10 z-50 flex-col pb-20 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-purple-950/80 to-black/80 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col lg:hidden pb-20 overflow-y-auto">
              <div className="flex justify-end p-4">
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <div className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white p-1 mr-1">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl text-white font-semibold truncate">{activeLabel}</h1>
              <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Welcome back, {userProfile?.name?.split(" ")[0] || "Student"}!</p>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 shrink-0">Student</Badge>
          </div>
        </div>

        {/* Mobile bottom nav for quick switching */}
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-black/80 backdrop-blur-xl border-t border-white/10 z-30 flex">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${activeTab === item.id ? "text-purple-400" : "text-gray-500"}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6 pb-20 lg:pb-6">
          {activeTab === "home" && <StudentHome />}
          {activeTab === "team" && <StudentTeam />}
          {activeTab === "submission" && <StudentSubmission />}
          {activeTab === "leaderboard" && <StudentLeaderboard />}
          {activeTab === "announcements" && <StudentAnnouncements />}
        </div>
      </div>
    </div>
  );
}
