import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { User, Lock, Mail, Flame, Users, Gavel, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/firebase";
import { toast } from "sonner";
import type { UserRole } from "../../hooks/useAuth";
import GlobalLogo from "./GlobalLogo";
import GlobalTitle from "./GlobalTitle";

const roles = [
  { id: "student" as UserRole, label: "Student", icon: User, color: "from-blue-600 to-purple-600" },
  { id: "coordinator" as UserRole, label: "Coordinator", icon: Users, color: "from-purple-600 to-pink-600" },
  { id: "jury" as UserRole, label: "Jury", icon: Gavel, color: "from-orange-600 to-red-600" },
  { id: "admin" as UserRole, label: "Admin", icon: ShieldCheck, color: "from-green-600 to-teal-600" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      if (!userDoc.exists()) {
        setError("Account not found in system. Contact admin.");
        setLoading(false);
        return;
      }
      const profile = userDoc.data();
      const role: UserRole = profile.role;
      toast.success(`Welcome, ${profile.name || "User"}!`);
      navigate(`/${role}`);
    } catch (e: any) {
      const msg =
        e.code === "auth/invalid-credential" || e.code === "auth/user-not-found" || e.code === "auth/wrong-password"
          ? "Invalid email or password."
          : e.code === "auth/too-many-requests"
            ? "Too many attempts. Try again later."
            : "Login failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent overflow-hidden">
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-purple-400/30 rounded-full"
            animate={{ y: [0, -100, 0], x: Math.sin(i) * 50, opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 7 + (i % 5), repeat: Infinity, delay: i * 0.3 }}
            style={{ left: `${(i * 5.3) % 100}%`, top: `${(i * 7.1) % 100}%` }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl shadow-xl mb-4 p-4"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <GlobalLogo fallback={<Flame className="w-10 h-10 text-orange-400" />} />
            </motion.div>
            <h1 className="text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2 font-bold">
              <GlobalTitle fallback="Ignited Minds" />
            </h1>
            <p className="text-gray-400">A Stack Forge Ideathon</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <motion.button
                  key={role.id}
                  onClick={() => { setActiveRole(role.id); setError(""); }}
                  className={`relative p-4 rounded-xl backdrop-blur-md border-2 transition-all ${activeRole === role.id
                    ? "border-purple-500 bg-purple-500/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                  <div className="text-xs text-gray-300">{role.label}</div>
                </motion.button>
              );
            })}
          </div>

          {/* Login form */}
          <Card className="backdrop-blur-xl bg-white/5 border-white/10 shadow-2xl p-6">
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm text-gray-300">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="login-password" className="text-sm text-gray-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                ) : (
                  `Login as ${roles.find((r) => r.id === activeRole)?.label}`
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                onClick={() => {
                  if (!email) { setError("Enter your email first, then click forgot password."); return; }
                  sendPasswordResetEmail(auth, email)
                    .then(() => toast.success("Password reset email sent!"))
                    .catch(() => toast.error("Could not send reset email."));
                }}
              >
                Forgot password?
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
