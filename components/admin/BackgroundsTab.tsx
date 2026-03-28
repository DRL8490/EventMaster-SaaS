"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// PHASE 3 FIX: Added 'eventId' to the incoming props!
export default function BackgroundsTab({ eventId, bgUrls, files, setFiles, handleUpdateBackgrounds, uploadingBg }: any) {
  // SaaS Styling State
  const [theme, setTheme] = useState("purple");
  const [shape, setShape] = useState("bubble");
  const [mode, setMode] = useState("grid");
  const [savingStyles, setSavingStyles] = useState(false);

  // Fetch existing styling on load
  useEffect(() => {
    if (!eventId) return;
    const fetchStyles = async () => {
      const { data } = await supabase.from("raffle_config").select("color_theme, card_shape, display_mode").eq("event_id", eventId).single();
      if (data) {
        setTheme(data.color_theme || "purple");
        setShape(data.card_shape || "bubble");
        setMode(data.display_mode || "grid");
      }
    };
    fetchStyles();
  }, [eventId]);

  // Save styling back to Supabase
  const handleSaveStyles = async () => {
    setSavingStyles(true);
    await supabase.from("raffle_config").update({
      color_theme: theme,
      card_shape: shape,
      display_mode: mode
    }).eq("event_id", eventId);
    setSavingStyles(false);
    alert("✨ Styling preferences saved! The projector will update automatically.");
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-12">
        
        {/* SECTION 1: ORIGINAL BACKGROUND UPLOADS */}
        <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase mb-4 pb-4 border-b-2">Background Settings</h2>
            <div className="space-y-6 mb-6">
                {[
                { id: "landscape", label: "PC/TV Background (Landscape 16:9)", desc: "1920x1080px. Max 1MB.", color: "blue", url: bgUrls.landscape, file: files.landscape },
                { id: "portrait", label: "Phone Background (Portrait 9:16)", desc: "1080x1920px. Max 1MB.", color: "purple", url: bgUrls.portrait, file: files.portrait }
                ].map((upload: any) => (
                    <div key={upload.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <label className="block text-[13px] font-black text-gray-800 uppercase mb-2">{upload.label}</label>
                        <p className="text-xs text-gray-500 mb-4 font-bold">{upload.desc}</p>
                        {upload.url && !upload.file && <div className="mb-4 text-sm font-bold text-green-600">✅ Active</div>}
                        <input 
                            type="file" accept="image/*" 
                            onChange={e => setFiles({...files, [upload.id]: e.target.files?.[0] || null})} 
                            className={`w-full text-sm text-gray-500 cursor-pointer file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:font-black file:uppercase file:bg-${upload.color}-50 file:text-${upload.color}-700 hover:file:bg-${upload.color}-100`} 
                        />
                    </div>
                ))}
            </div>
            <button 
                onClick={handleUpdateBackgrounds} 
                disabled={uploadingBg || (!files.landscape && !files.portrait)} 
                className={`w-full py-5 rounded-2xl font-black text-2xl shadow-xl transition-all ${(uploadingBg || (!files.landscape && !files.portrait)) ? "bg-gray-300 text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"}`}
            >
                {uploadingBg ? "⏳ Uploading..." : "Upload & Apply Backgrounds"}
            </button>
        </div>

        {/* SECTION 2: NEW SAAS STYLING TOGGLES */}
        <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase mb-4 pb-4 border-b-2">Projector Styling (SaaS)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <label className="block text-[13px] font-black text-gray-800 uppercase mb-4">Color Theme</label>
                    <select value={theme} onChange={e => setTheme(e.target.value)} className="w-full p-3 rounded-xl border-2 border-gray-300 font-bold outline-none focus:border-purple-500 cursor-pointer">
                        <option value="purple">🔮 Royal Purple</option>
                        <option value="blue">🌊 Ocean Blue</option>
                        <option value="pink">🌸 Party Pink</option>
                        <option value="dark">🌌 Dark Mode</option>
                    </select>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <label className="block text-[13px] font-black text-gray-800 uppercase mb-4">Guest Avatar Shape</label>
                    <select value={shape} onChange={e => setShape(e.target.value)} className="w-full p-3 rounded-xl border-2 border-gray-300 font-bold outline-none focus:border-purple-500 cursor-pointer">
                        <option value="bubble">🫧 Bubble (Circle)</option>
                        <option value="rounded">🎴 Card (Rounded Square)</option>
                        <option value="square">⬛ Sharp Square</option>
                        <option value="star">⭐ Star</option>
                        <option value="heart">❤️ Heart</option>
                        <option value="cloud">☁️ Cloud</option>
                        <option value="cycle">🔄 Cycle All Shapes (3 mins)</option>
                    </select>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <label className="block text-[13px] font-black text-gray-800 uppercase mb-4">Gallery View</label>
                    <select value={mode} onChange={e => setMode(e.target.value)} className="w-full p-3 rounded-xl border-2 border-gray-300 font-bold outline-none focus:border-purple-500 cursor-pointer">
                        <option value="grid">🔲 Grid (Wall of Fame)</option>
                        <option value="carousel">🎠 Carousel (Sliding)</option>
                        <option value="masonry">🧱 Masonry (Waterfall)</option>
                        <option value="spotlight">🔦 Spotlight (Focus)</option>
                    </select>
                </div>
            </div>

            <button 
                onClick={handleSaveStyles} 
                disabled={savingStyles} 
                className={`w-full py-5 rounded-2xl font-black text-2xl shadow-xl transition-all ${savingStyles ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 active:scale-95"}`}
            >
                {savingStyles ? "⏳ Saving..." : "✨ Save Styling Settings"}
            </button>
        </div>

    </div>
  );
}