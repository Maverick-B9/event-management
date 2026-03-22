import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "../hooks/useAuth";
import ThemeApplier from "./components/ThemeApplier";

function App() {
  return (
    <AuthProvider>
      <div className="dark relative text-white min-h-screen pb-20">
        <ThemeApplier />
        <RouterProvider router={router} />
        <Toaster />

        {/* Global Developer Footer */}
        <footer className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-t border-white/10 py-3 px-4 md:px-6 flex justify-between items-center pointer-events-none">
          <div className="text-white/60 text-xs md:text-sm">
            <span className="font-semibold text-white/80">Ideathon</span> 2026
          </div>
          <div className="text-right">
            <p className="text-[11px] md:text-xs text-white/60 font-medium">Developed by Balaram B & Yashas N</p>
            <p className="text-[9px] md:text-[10px] text-white/40">Department of Computer Science and Engineering</p>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}

export default App;
