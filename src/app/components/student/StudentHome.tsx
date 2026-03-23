import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { Bell, Users, Trophy, Upload, Clock, CheckCircle, QrCode, Download, UtensilsCrossed, X, DoorOpen } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useAuth } from "../../../hooks/useAuth";
import { getAnnouncements, type Announcement } from "../../../services/announcementService";
import { getTeamByMember, type Team } from "../../../services/teamService";
import { getAttendance, getFoodCoupon, listenToAttendance, listenToFoodCoupon } from "../../../services/attendanceService";
import { formatDistanceToNow } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { subscribeUserRooms, type Room } from "../../../services/roomService";

export default function StudentHome() {
  const { userProfile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [attended, setAttended] = useState(false);
  const [foodRedeemed, setFoodRedeemed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedQr, setSelectedQr] = useState<"entry" | "food" | null>(null);
  const [myRooms, setMyRooms] = useState<Room[]>([]);

  const entryQrRef = useRef<SVGSVGElement>(null);
  const foodQrRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let unsubAttendance: (() => void) | undefined;
    let unsubFood: (() => void) | undefined;

    async function load() {
      try {
        const [ann] = await Promise.all([
          getAnnouncements(),
        ]);
        setAnnouncements(ann.slice(0, 3));

        if (userProfile?.uid) {
          const t = await getTeamByMember(userProfile.uid);
          setTeam(t);

          unsubAttendance = listenToAttendance(userProfile.uid, (record) => {
            setAttended(!!record?.present);
          });

          unsubFood = listenToFoodCoupon(userProfile.uid, (record) => {
            setFoodRedeemed(!!record?.redeemed);
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    if (userProfile) load();

    return () => {
      if (unsubAttendance) unsubAttendance();
      if (unsubFood) unsubFood();
    };
  }, [userProfile]);

  // Subscribe to room allotments
  useEffect(() => {
    if (!userProfile?.uid) return;
    const teamId = team?.id;
    const unsub = subscribeUserRooms(userProfile.uid, teamId, "student", (rooms) => {
      setMyRooms(rooms);
    });
    return unsub;
  }, [userProfile, team]);

  const downloadQR = (svgRef: React.RefObject<SVGSVGElement | null>, filename: string) => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 300;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement("a");
      a.download = filename;
      a.href = canvas.toDataURL("image/png");
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const steps = [
    { label: "Registered", done: true, icon: CheckCircle },
    { label: "Team Formed", done: !!team, icon: Users },
    { label: "Idea Submitted", done: !!team?.submissionLink, icon: Upload },
    { label: "Entry Marked", done: attended, icon: CheckCircle },
    { label: "Food Redeemed", done: foodRedeemed, icon: UtensilsCrossed },
  ];

  const uid = userProfile?.uid || "";

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/30 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl text-white font-bold mb-1">
                Welcome, {userProfile?.name?.split(" ")[0] || "Student"}! 🚀
              </h2>
              <p className="text-gray-300 text-sm sm:text-base">
                {userProfile?.department && <span>{userProfile.department} · </span>}
                {userProfile?.regNo && <span>Reg: {userProfile.regNo}</span>}
              </p>
              {userProfile?.domain && (
                <Badge className="mt-2 bg-purple-500/20 text-purple-300 border-purple-500/40">
                  Domain: {userProfile.domain}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Event Status</div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 mt-1">
                <CheckCircle className="w-3 h-3 mr-1" /> Registration Open
              </Badge>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Progress tracker */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-white/5 border-white/10 p-5 backdrop-blur-md">
          <h3 className="text-lg text-white font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" /> Event Progress
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className={`rounded-xl p-3 border text-center ${step.done ? "bg-green-500/10 border-green-500/30" : "bg-white/5 border-white/10"}`}>
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${step.done ? "text-green-400" : "text-gray-500"}`} />
                  <div className={`text-xs ${step.done ? "text-green-300" : "text-gray-500"}`}>{step.label}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* QR Codes */}
      {uid && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-white/5 border-white/10 p-5 backdrop-blur-md">
            <h3 className="text-lg text-white font-semibold mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-cyan-400" /> My QR Codes
            </h3>
            <p className="text-gray-400 text-sm mb-5">Show these to coordinators at the event. Each code can only be scanned once.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Event Entry QR */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="bg-white p-4 rounded-2xl shadow-lg shadow-purple-500/10 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setSelectedQr("entry")}
                >
                  <QRCodeSVG
                    ref={entryQrRef as any}
                    value={`entry:${uid}`}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center">
                  <div className="text-white font-semibold text-sm">🎫 Event Entry</div>
                  <div className="text-gray-400 text-xs mt-1">Scan at the gate for check-in</div>
                  {attended && <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/40 text-xs">✓ Already Checked In</Badge>}
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadQR(entryQrRef, `${userProfile?.regNo || uid}_entry_qr.png`)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" /> Download
                </Button>
              </div>

              {/* Food Coupon QR */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="bg-white p-4 rounded-2xl shadow-lg shadow-orange-500/10 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setSelectedQr("food")}
                >
                  <QRCodeSVG
                    ref={foodQrRef as any}
                    value={`food:${uid}`}
                    size={160}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center">
                  <div className="text-white font-semibold text-sm">🍱 Food Coupon</div>
                  <div className="text-gray-400 text-xs mt-1">Scan at the food counter once</div>
                  {foodRedeemed && <Badge className="mt-2 bg-orange-500/20 text-orange-400 border-orange-500/40 text-xs">✓ Already Redeemed</Badge>}
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadQR(foodQrRef, `${userProfile?.regNo || uid}_food_qr.png`)}
                  className="bg-gradient-to-r from-orange-600 to-amber-600 text-xs"
                >
                  <Download className="w-3 h-3 mr-1" /> Download
                </Button>
              </div>

            </div>
          </Card>
        </motion.div>
      )}

      {/* Team & Announcements side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-white/5 border-white/10 p-5 backdrop-blur-md h-full">
            <h3 className="text-lg text-white font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> My Team
            </h3>
            {loading ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : team ? (
              <div>
                <div className="text-xl text-white font-bold mb-1">{team.teamName}</div>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 mb-3">{team.domain}</Badge>
                <div className="text-sm text-gray-400">{team.memberDetails ? 1 + team.memberDetails.length : team.teamSize || team.members.length} member(s)</div>
                {team.submissionLink && (
                  <a href={team.submissionLink} target="_blank" rel="noopener noreferrer" className="mt-2 text-sm text-blue-400 hover:underline block">View Submission ↗</a>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No team yet. Go to &quot;My Team&quot; to create or join one.</div>
            )}
          </Card>
        </motion.div>

        {/* Recent announcements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-white/5 border-white/10 p-5 backdrop-blur-md h-full">
            <h3 className="text-lg text-white font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-400" /> Recent Announcements
            </h3>
            {loading ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : announcements.length === 0 ? (
              <div className="text-gray-400 text-sm">No announcements yet.</div>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="border-l-2 border-purple-500 pl-3">
                    <div className="text-white text-sm font-medium">{a.title}</div>
                    <div className="text-gray-400 text-xs mt-1 line-clamp-2">{a.description}</div>
                    {a.timestamp?.toDate && (
                      <div className="text-xs text-gray-500 mt-1">{formatDistanceToNow(a.timestamp.toDate(), { addSuffix: true })}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Room Allotment */}
      {myRooms.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="bg-gradient-to-br from-teal-900/30 to-cyan-900/30 border-teal-500/30 p-5 backdrop-blur-md">
            <h3 className="text-lg text-white font-semibold mb-3 flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-teal-400" /> Your Room Allotment
            </h3>
            <div className="space-y-2">
              {myRooms.map((room) => (
                <div key={room.id} className="flex items-center gap-3 p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center shrink-0">
                    <DoorOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold">{room.name}</div>
                    {room.floor && <div className="text-teal-300/80 text-xs">{room.floor}</div>}
                  </div>
                  <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-xs shrink-0">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                    </span>
                    Assigned
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* QR Code Modal */}
      {selectedQr && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedQr(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-6 rounded-3xl flex flex-col items-center gap-4 relative max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedQr(null)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors border border-white/20"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-gray-900 font-bold text-xl">
              {selectedQr === "entry" ? "Event Entry QR" : "Food Coupon QR"}
            </h3>
            <div className="bg-white p-2 rounded-2xl">
              <QRCodeSVG
                value={selectedQr === "entry" ? `entry:${uid}` : `food:${uid}`}
                size={260}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-gray-500 text-sm text-center">
              Show this code to the coordinator for scanning
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
