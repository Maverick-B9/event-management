import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Home, Users, Settings, FileText, Palette, Target, UserCog, Gavel, LogOut, Flame, Megaphone, Menu, X, UsersRound, Link, Loader2, ClipboardList, DoorOpen } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router";
import { useAuth } from "../../../hooks/useAuth";
import GlobalLogo from "../GlobalLogo";
import GlobalTitle from "../GlobalTitle";

const AdminHome = lazy(() => import("./AdminHome"));
const AdminStudents = lazy(() => import("./AdminStudents"));
const AdminTeams = lazy(() => import("./AdminTeams"));
const AdminAssignments = lazy(() => import("./AdminAssignments"));
const AdminCoordinators = lazy(() => import("./AdminCoordinators"));
const AdminJury = lazy(() => import("./AdminJury"));
const AdminDomains = lazy(() => import("./AdminDomains"));
const AdminSettings = lazy(() => import("./AdminSettings"));
const AdminReports = lazy(() => import("./AdminReports"));
const AdminCustomization = lazy(() => import("./AdminCustomization"));
const AdminEvaluations = lazy(() => import("./AdminEvaluations"));
const AdminRooms = lazy(() => import("./AdminRooms"));

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "students", label: "Students", icon: Users },
    { id: "teams", label: "Teams", icon: UsersRound },
    { id: "assignments", label: "Assignments", icon: Link },
    { id: "coordinators", label: "Coordinators", icon: UserCog },
    { id: "jury", label: "Jury Members", icon: Gavel },
    { id: "evaluations", label: "Evaluations", icon: ClipboardList },
    { id: "domains", label: "Domains", icon: Target },
    { id: "rooms", label: "Rooms", icon: DoorOpen },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "customization", label: "Customization", icon: Palette },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = async () => { await signOut(); navigate("/login"); };
  const initials = userProfile?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "AD";
  const activeLabel = menuItems.find((i) => i.id === activeTab)?.label;

  const handleNav = (id: string) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-teal-600 rounded-lg flex items-center justify-center shrink-0">
            <GlobalLogo fallback={<Flame className="w-6 h-6 text-orange-400" />} />
          </div>
          <div><h2 className="text-sm text-white font-semibold"><GlobalTitle fallback="Ignited Minds" /></h2><p className="text-xs text-gray-400">Admin Portal</p></div>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${activeTab === item.id ? "bg-green-600 text-white shadow-lg shadow-green-500/30" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
                <Icon className="w-5 h-5 shrink-0" /><span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div className="p-4">
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{userProfile?.name || "Admin"}</div>
              <div className="text-xs text-gray-400">Super Admin</div>
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
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-green-950/30 to-black/30 backdrop-blur-xl border-r border-white/10 z-50 flex-col pb-20">
        <SidebarContent />
      </aside>

      {/* Mobile overlay sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-green-950/80 to-black/80 backdrop-blur-2xl border-r border-white/10 z-50 flex flex-col lg:hidden pb-20">
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

      {/* Main content area */}
      <div className="lg:ml-64">
        {/* Top header */}
        <div className="bg-black/20 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile */}
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white p-1 mr-1">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl text-white font-semibold truncate">{activeLabel}</h1>
              <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">Manage all aspects of the ideathon platform</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 shrink-0">Admin</Badge>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>}>
            {activeTab === "home" && <AdminHome />}
            {activeTab === "students" && <AdminStudents />}
            {activeTab === "teams" && <AdminTeams />}
            {activeTab === "assignments" && <AdminAssignments />}
            {activeTab === "coordinators" && <AdminCoordinators />}
            {activeTab === "jury" && <AdminJury />}
            {activeTab === "evaluations" && <AdminEvaluations />}
            {activeTab === "domains" && <AdminDomains />}
            {activeTab === "rooms" && <AdminRooms />}
            {activeTab === "announcements" && <AdminSettings announcementsOnly />}
            {activeTab === "reports" && <AdminReports />}
            {activeTab === "customization" && <AdminCustomization />}
            {activeTab === "settings" && <AdminSettings />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
