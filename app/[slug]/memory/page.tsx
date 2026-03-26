"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import html2canvas from "html2canvas";

export default function MemoryPage() {
  const params = useParams();
  
  const eventSlug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : "";

  const [eventId, setEventId] = useState<number | null>(null);
  const [eventName, setEventName] = useState("");
  const [invalidEvent, setInvalidEvent] = useState(false);

  const [raffleWinners, setRaffleWinners] = useState<any[]>([]);
  const [gameWinners, setGameWinners] = useState<any[]>([]);
  const [allGuests, setAllGuests] = useState<any[]>([]);
  const [guestUploads, setGuestUploads] = useState<any[]>([]); 
  
  const [loading, setLoading] = useState(true);

  // NEW: THE "SCREENSHOT" DOWNLOAD FUNCTION
  const captureAndDownload = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      // useCORS is critical here so it can read the Supabase images!
      const canvas = await html2canvas(element, { 
          useCORS: true, 
          backgroundColor: null, // Keeps rounded corners transparent
          scale: 3 // High resolution for Retina displays
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error capturing image:", error);
      alert("Oops! Couldn't capture the styled image. Try again!");
    }
  };

  // KEEP THE OLD FUNCTION FOR THE RAW GALLERY UPLOADS
  const handleRawDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank'); 
    }
  };

  useEffect(() => {
    if (!eventSlug) return;

    const fetchEventId = async () => {
      const { data: eventData, error } = await supabase.from("events").select("id, name").eq("slug", eventSlug).single();
      if (error || !eventData) {
        setInvalidEvent(true);
        setLoading(false);
        return;
      }
      setEventId(eventData.id);
      setEventName(eventData.name);
    };

    fetchEventId();
  }, [eventSlug]);

  useEffect(() => {
    if (!eventId) return;

    const fetchMemories = async () => {
      const { data: guests } = await supabase.from("guests").select("*").eq("event_id", eventId).order("id", { ascending: true });
      const { data: games } = await supabase.from("games").select("*").eq("event_id", eventId).order("id", { ascending: true });
      const { data: uploads } = await supabase.from("gallery_photos").select("*").eq("event_id", eventId).order("created_at", { ascending: false });

      if (guests) {
        setAllGuests(guests);
        setRaffleWinners(guests.filter((g: any) => g.status === "won" && g.proof_url));
      }

      if (games) {
        setGameWinners(games.filter((g: any) => g.proof_url));
      }
      if (uploads) setGuestUploads(uploads);

      setLoading(false);
    };
    
    fetchMemories();

    const channel = supabase.channel(`public:gallery_photos:event_id=eq.${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gallery_photos', filter: `event_id=eq.${eventId}` }, (payload) => {
          setGuestUploads((current) => [payload.new, ...current]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-gray-900 text-blue-400 font-black animate-pulse uppercase tracking-widest">Loading Memories...</div>;

  if (invalidEvent) return (
    <div className="fixed inset-0 w-full flex flex-col items-center justify-center p-6 bg-gray-900 text-center">
      <div className="bg-black/60 backdrop-blur-lg p-8 rounded-[2rem] border border-red-500/50 shadow-2xl max-w-2xl w-full">
        <h1 className="text-5xl mb-4">⚠️</h1>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Event Not Found</h2>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-900 font-sans text-white p-4 md:p-8 pb-20 selection:bg-purple-500">
      <div className="max-w-6xl mx-auto space-y-16">
        
        {/* HEADER */}
        <div className="text-center space-y-2 mt-6">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 uppercase tracking-tighter drop-shadow-sm">
            {eventName}
          </h1>
          <p className="text-gray-400 font-bold tracking-widest uppercase text-xs md:text-sm">Official Memory Gallery</p>
        </div>

        {/* SECTION 1: THE WINNERS */}
        <div className="space-y-6">
            <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-widest border-b-2 border-yellow-500/30 pb-2">🏆 Wall of Fame</h2>
            {raffleWinners.length === 0 && gameWinners.length === 0 && (
                <p className="text-gray-500 italic font-bold text-center py-8">Winners will appear here once the games begin!</p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                
                {/* RAFFLE WINNERS */}
                {raffleWinners.map(w => (
                    // 1. ADDED ID TO CAPTURE THE WHOLE CARD
                    <div id={`raffle-card-${w.id}`} key={`raffle-${w.id}`} className="bg-white p-2 md:p-3 rounded-2xl shadow-xl transform rotate-2 hover:rotate-0 transition-all group relative">
                        <div className="relative overflow-hidden rounded-xl border-2 border-gray-100">
                            <img src={w.proof_url} alt={w.nickname} className="w-full aspect-square object-cover" crossOrigin="anonymous" />
                            
                            {/* 2. ADDED DATA-HTML2CANVAS-IGNORE SO THE BUTTON DOESN'T SHOW IN THE SCREENSHOT */}
                            <div data-html2canvas-ignore="true" className="absolute top-2 right-2 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                <button 
                                    onClick={() => captureAndDownload(`raffle-card-${w.id}`, `${w.nickname}-Winner.png`)}
                                    className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm active:scale-90 shadow-lg text-xs md:text-sm"
                                    title="Download Card"
                                >
                                    ⬇️
                                </button>
                            </div>
                        </div>
                        <div className="pt-3 pb-1 text-center">
                            <p className="text-gray-900 font-black uppercase text-sm md:text-base leading-tight truncate">{w.nickname}</p>
                            <p className="text-blue-600 font-bold text-[10px] md:text-xs uppercase mt-0.5 truncate">{w.prize_won}</p>
                        </div>
                    </div>
                ))}

                {/* GAME WINNERS */}
                {gameWinners.map(g => (
                    <div id={`game-card-${g.id}`} key={`game-${g.id}`} className="bg-white p-2 md:p-3 rounded-2xl shadow-xl transform -rotate-2 hover:rotate-0 transition-all group relative">
                        <div className="relative overflow-hidden rounded-xl border-2 border-gray-100">
                            <img src={g.proof_url} alt={g.name} className="w-full aspect-square object-cover" crossOrigin="anonymous" />
                            <div data-html2canvas-ignore="true" className="absolute top-2 right-2 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                <button 
                                    onClick={() => captureAndDownload(`game-card-${g.id}`, `${g.name}-Winner.png`)}
                                    className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm active:scale-90 shadow-lg text-xs md:text-sm"
                                    title="Download Card"
                                >
                                    ⬇️
                                </button>
                            </div>
                        </div>
                        <div className="pt-3 pb-1 text-center">
                            <p className="text-gray-900 font-black uppercase text-sm md:text-base leading-tight truncate px-1">{g.name}</p>
                            <p className="text-green-600 font-bold text-[10px] md:text-xs uppercase mt-0.5">Game Winner</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* SECTION 2: LIVE GUEST GALLERY (STAYS AS RAW UPLOADS) */}
        <div className="space-y-6 pt-8">
            <div className="flex items-end justify-between border-b-2 border-purple-500/30 pb-2">
                <h2 className="text-2xl font-black text-purple-400 uppercase tracking-widest">📸 Live Gallery</h2>
                <a href={`/${eventSlug}/upload`} className="text-[10px] md:text-xs font-black bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest transition-colors mb-1">
                    + Add Photo
                </a>
            </div>
            
            {guestUploads.length === 0 ? (
                <div className="bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-3xl p-12 text-center mt-4">
                    <p className="text-4xl mb-3">📱</p>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Be the first to share a memory!</p>
                </div>
            ) : (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 pt-4">
                    {guestUploads.map((photo) => (
                        <div key={`photo-${photo.id}`} className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-lg border border-gray-700 bg-gray-800">
                            <img src={photo.photo_url} alt="Guest Upload" className="w-full h-auto object-cover" loading="lazy" crossOrigin="anonymous" />
                            
                            <div className="absolute top-2 right-2 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10">
                                <button 
                                    onClick={() => handleRawDownload(photo.photo_url, `PartyMaster-${photo.id}.jpg`)}
                                    className="bg-black/50 hover:bg-black/70 text-white p-2 md:p-2.5 rounded-full backdrop-blur-md active:scale-90 shadow-lg text-xs md:text-sm"
                                    title="Download Photo"
                                >
                                    ⬇️
                                </button>
                            </div>

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex items-end transition-all duration-300 opacity-100 translate-y-0 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0">
                                <p className="text-white font-black text-xs md:text-sm uppercase tracking-widest truncate drop-shadow-md pb-1">
                                    {photo.uploader_name || "Guest"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* SECTION 3: THE BUBBLE SQUAD (NOW DOWNLOADS THE FULL AVATAR+NAME) */}
        <div className="space-y-6 pt-8">
            <h2 className="text-2xl font-black text-blue-400 uppercase tracking-widest border-b-2 border-blue-500/30 pb-2">🫧 The Party Squad</h2>
            <div className="flex flex-wrap justify-center gap-5 md:gap-8 pt-4">
                {allGuests.map(g => (
                    // WRAPPED EVERYTHING IN A DIV TO SCREENSHOT THE BUBBLE AND THE TEXT TOGETHER
                    <div id={`bubble-card-${g.id}`} key={`guest-${g.id}`} className="flex flex-col items-center w-20 md:w-24 group relative p-1">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] bg-white relative">
                            <img src={g.photo_url} alt={g.nickname} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        </div>
                        
                        <div data-html2canvas-ignore="true" className="absolute -top-1 right-0 md:-right-2 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10">
                            <button 
                                onClick={() => captureAndDownload(`bubble-card-${g.id}`, `${g.nickname}-Avatar.png`)}
                                className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-md active:scale-90 shadow-lg text-[10px]"
                                title="Download Avatar"
                            >
                                ⬇️
                            </button>
                        </div>

                        <p className="mt-2 text-center text-[10px] md:text-xs font-black text-gray-300 uppercase tracking-wider truncate w-full">{g.nickname}</p>
                    </div>
                ))}
            </div>
            {allGuests.length === 0 && <p className="text-center text-gray-500 font-bold">No guests have arrived yet!</p>}
        </div>

      </div>
    </div>
  );
}