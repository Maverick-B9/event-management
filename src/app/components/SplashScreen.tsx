import { useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Sparkles, Flame } from "lucide-react";
import GlobalLogo from "./GlobalLogo";
import GlobalTitle from "./GlobalTitle";

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative min-h-screen bg-transparent overflow-hidden flex items-center justify-center">
      {/* Animated particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400 rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative"
        >
          {/* Glowing logo container */}
          <div className="relative inline-block">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-orange-600 rounded-full blur-3xl opacity-50"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Logo icon */}
            <motion.div
              className="relative bg-gradient-to-br from-purple-600 to-blue-600 p-8 rounded-3xl shadow-2xl w-40 h-40 flex items-center justify-center"
              initial={{ rotate: -180 }}
              animate={{ rotate: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <GlobalLogo fallback={<Flame className="w-24 h-24 text-orange-400" />} />
              <motion.div
                className="absolute top-0 right-0"
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
              >
                <Sparkles className="w-8 h-8 text-yellow-300" />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Title animation */}
        <motion.h1
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-8 text-5xl md:text-7xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-orange-400"
        >
          <GlobalTitle fallback="Ignited Minds" />
        </motion.h1>

        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-4 text-xl md:text-2xl text-gray-300"
        >
          A Stack Forge Ideathon
        </motion.p>

        {/* Loading animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-12 flex justify-center gap-2"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-purple-500 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
