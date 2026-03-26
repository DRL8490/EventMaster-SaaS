"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";

export default function UploadPage() {
  const params = useParams();
  
  // Safely extract the slug to avoid Next.js race conditions
  const eventSlug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : "";

  const [eventId, setEventId] = useState<number | null>(null);
  const [eventName, setEventName] = useState("");
  const [invalidEvent, setInvalidEvent] = useState(false);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [uploaderName, setUploaderName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // 1. FETCH EVENT DETAILS
  useEffect(() => {
    if (!eventSlug) return;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name")
        .eq("slug", eventSlug)
        .single();

      if (error || !data) {
        setInvalidEvent(true);
      } else {
        setEventId(data.id);
        setEventName(data.name);
      }
      setLoading(false);
    };

    fetchEvent();
  }, [eventSlug]);

  // 2. HANDLE THE PHOTO UPLOAD
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !eventId) return;

    setUploading(true);
    setUploadError("");

    try {
      // Create a unique file name to prevent overwriting
      const fileExt = file.name.split('.').pop() || 'jpg';
      const uniqueFileName = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload the raw file into your Supabase Storage Bucket
      const { error: storageError } = await supabase.storage
        .from("event_galleries")
        .upload(uniqueFileName, file, { cacheControl: '3600', upsert: false });

      if (storageError) throw storageError;

      // Ask Supabase for the permanent public URL to this specific image
      const { data: publicUrlData } = supabase.storage
        .from("event_galleries")
        .getPublicUrl(uniqueFileName);

      const photoUrl = publicUrlData.publicUrl;

      // Save the database record so the gallery knows it belongs to this party
      const { error: dbError } = await supabase
        .from("gallery_photos")
        .insert([{
          event_id: eventId,
          photo_url: photoUrl,
          uploader_name: uploaderName.trim() || "Anonymous Guest"
        }]);

      if (dbError) throw dbError;

      // Show the success screen!
      setSuccess(true);
      setFile(null);
      setUploaderName("");

    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadError(error.message || "Failed to upload photo. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-gray-900 text-purple-400 font-black animate-pulse uppercase tracking-widest">Loading Portal...</div>;
  
  if (invalidEvent) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-900 p-4">
      <div className="bg-red-900/50 border border-red-500 p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl">
        <h1 className="text-5xl mb-4">⚠️</h1>
        <h2 className="text-xl font-black text-white uppercase mb-2">Event Not Found</h2>
        <p className="text-red-200 text-sm font-bold">Please check the link and try again.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-900 p-4 font-sans text-white flex flex-col items-center justify-center selection:bg-purple-500 pb-12">
      <div className="w-full max-w-md space-y-8">
        
        {/* HEADER */}
        <div className="text-center space-y-2 mt-4">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 uppercase tracking-tighter drop-shadow-sm px-2 break-words">
            {eventName}
          </h1>
          <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Photo Drop Portal</p>
        </div>

        {/* CONDITIONAL RENDER: UPLOAD FORM OR SUCCESS SCREEN */}
        {success ? (
          <div className="bg-gray-800 p-8 rounded-[2.5rem] border border-green-500/50 shadow-2xl text-center space-y-6 animate-in zoom-in duration-300">
            <div className="text-6xl animate-bounce">📸</div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">Got It!</h2>
              <p className="text-gray-400 font-bold text-sm mt-2">Your memory has been securely saved.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => setSuccess(false)} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-2xl uppercase transition-all active:scale-95">
                Upload Another
              </button>
              <Link href={`/${eventSlug}/memory`} className="w-full py-4 bg-gray-700 hover:bg-gray-600 text-white font-black text-sm rounded-2xl uppercase transition-all active:scale-95 block text-center">
                View Memory Gallery
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="bg-gray-800 p-6 md:p-8 rounded-[2.5rem] border border-gray-700 shadow-2xl space-y-6">
            
            {uploadError && (
              <div className="bg-red-900/50 border border-red-500 p-3 rounded-xl text-red-200 text-xs font-bold text-center">
                {uploadError}
              </div>
            )}

            <div>
              <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Your Name (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. Uncle Bob" 
                value={uploaderName}
                onChange={e => setUploaderName(e.target.value)}
                className="w-full p-4 bg-gray-900 border-2 border-gray-700 rounded-2xl focus:border-purple-500 outline-none transition-all font-bold text-white placeholder:text-gray-600" 
              />
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Select Photo</label>
              <div className="relative group">
                <input 
                  required
                  type="file" 
                  accept="image/*"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full p-8 border-2 border-dashed rounded-2xl text-center transition-all ${file ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600 bg-gray-900 group-hover:border-purple-400 group-hover:bg-gray-800'}`}>
                  {file ? (
                    <div className="space-y-2">
                      <span className="text-4xl block">✅</span>
                      <span className="text-purple-400 font-bold text-xs md:text-sm block truncate px-2">{file.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-4xl block">📱</span>
                      <span className="text-gray-400 font-bold text-xs md:text-sm block">Tap to open Camera Roll</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={uploading || !file} 
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl mt-4 ${uploading || !file ? "bg-gray-700 text-gray-500" : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:scale-[1.02] active:scale-95"}`}
            >
              {uploading ? "⏳ Uploading..." : "Upload to Memory Gallery"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}