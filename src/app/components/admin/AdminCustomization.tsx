import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Palette, Upload, Image, Loader2, X, CheckCircle } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { uploadLogo } from "../../../services/uploadService";
import { doc, onSnapshot, updateDoc, deleteField, setDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { updateEventSettings } from "../../../services/adminService";
import { toast } from "sonner";

const LOGO_TYPES = [
  { key: "college", label: "College Logo", color: "from-blue-600 to-cyan-600" },
  { key: "department", label: "Department Logo", color: "from-purple-600 to-pink-600" },
  { key: "club", label: "Club Logo", color: "from-green-600 to-teal-600" },
  { key: "event", label: "Event Logo", color: "from-orange-600 to-red-600" },
];

export default function AdminCustomization() {
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  // One separate ref per logo type
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load saved logos from Firestore on mount (Real-time)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "logos"), (snap) => {
      if (snap.exists()) setLogos(snap.data() as Record<string, string>);
    });
    return () => unsub();
  }, []);

  const handleFileChange = async (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate type
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be smaller than 5 MB"); return; }

    setUploading(type);
    let url = "";
    try {
      url = await uploadLogo(type, file);
      // Update specifically this field in Firestore
      await updateDoc(doc(db, "settings", "logos"), { [type]: url });
      toast.success(`${LOGO_TYPES.find((t) => t.key === type)?.label ?? type} uploaded successfully!`);
    } catch (err: any) {
      if (err.message.includes("not-found") || err.code === "not-found") {
        // If the document doesn't exist yet, we must use setDoc
        await setDoc(doc(db, "settings", "logos"), { [type]: url });
        toast.success(`${LOGO_TYPES.find((t) => t.key === type)?.label ?? type} uploaded successfully!`);
      } else {
        toast.error("Upload failed: " + err.message);
      }
    } finally {
      setUploading(null);
      if (fileRefs.current[type]) fileRefs.current[type]!.value = "";
    }
  };

  const triggerUpload = (key: string) => {
    fileRefs.current[key]?.click();
  };

  const removeLogo = async (key: string) => {
    try {
      await updateDoc(doc(db, "settings", "logos"), { [key]: deleteField() });
      toast.success("Logo removed");
    } catch (e: any) {
      toast.error("Failed to remove logo");
    }
  };

  const handleThemeChange = async (gradient: string) => {
    try {
      await updateEventSettings({ theme: gradient });
      toast.success("Theme updated globally! Applies immediately.");
    } catch (e: any) {
      toast.error("Failed to update theme: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logos section */}
      <Card className="bg-white/5 border-white/10 p-5 sm:p-6">
        <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
          <Image className="w-5 h-5 text-purple-400" /> Upload Logos
        </h3>
        <p className="text-gray-400 text-sm mb-5">Logos are saved and displayed across all portals. Max 5 MB per image.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LOGO_TYPES.map(({ key, label, color }) => (
            <div key={key} className="relative">
              {/* Hidden file input */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={(el) => { fileRefs.current[key] = el; }}
                onChange={(e) => handleFileChange(key, e)}
              />

              <div
                className="border-2 border-dashed border-white/10 rounded-xl p-5 text-center hover:border-white/30 hover:bg-white/5 transition-all group cursor-pointer"
                onClick={() => triggerUpload(key)}
              >
                {/* Preview or placeholder */}
                {logos[key] ? (
                  <div className="relative inline-block mb-3">
                    <img
                      src={logos[key]}
                      alt={label}
                      className="h-20 mx-auto object-contain rounded-lg"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeLogo(key); }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                      title="Remove"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className={`w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br ${color} opacity-30 flex items-center justify-center`}>
                    <Image className="w-8 h-8 text-white" />
                  </div>
                )}

                <div className="text-gray-300 text-sm font-medium mb-3">
                  {label}
                  {logos[key] && <CheckCircle className="w-3 h-3 text-green-400 inline ml-1.5" />}
                </div>

                {uploading === key ? (
                  <div className="flex items-center justify-center gap-2 text-purple-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </div>
                ) : (
                  <Button
                    size="sm"
                    className={`bg-gradient-to-r ${color} text-xs h-8 pointer-events-none mt-2`}
                    disabled={!!uploading}
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    {logos[key] ? "Replace" : "Upload"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Theme / Background */}
      <Card className="bg-white/5 border-white/10 p-5 sm:p-6">
        <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
          <Palette className="w-5 h-5 text-orange-400" /> UI Theme
        </h3>
        <p className="text-gray-400 text-sm mb-4">The app uses a dark futuristic glassmorphism theme by default.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: "Default Theme", gradient: "from-[#0a0a0f] via-[#1a0a2e] to-[#0a0a0f]" },
            { name: "Purple-Blue", gradient: "from-purple-900 to-blue-900" },
            { name: "Teal-Dark", gradient: "from-teal-900 to-gray-900" },
            { name: "Orange-Dark", gradient: "from-orange-900 to-gray-900" },
            { name: "Red-Dark", gradient: "from-red-900 to-gray-900" },
          ].map((theme) => (
            <button
              key={theme.name}
              onClick={() => handleThemeChange(theme.gradient)}
              className={`h-16 rounded-xl bg-gradient-to-br ${theme.gradient} border border-white/10 hover:border-white/40 hover:scale-105 transition-all text-white text-xs p-2 text-center font-medium`}
            >
              {theme.name}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
