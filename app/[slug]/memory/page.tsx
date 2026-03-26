"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { toPng } from "html-to-image";

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

  // FESTIVE WATERMARK COMPONENTS
  const LargeWatermark = () => (
    <div className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-400 text-white text-[8px] md:text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg transform rotate-3 border-2 border-white z-0 pointer-events-none drop-shadow-md tracking-widest uppercase">
      🎉 Nyla's 5th Birthday 🎈
    </div>
  );

  const TinyWatermark = () => (
    <div className="absolute top-0 -right-2 bg-gradient-to-r from-pink-500 to-yellow-400 text-white text-[5px] md:text-[6px] font-black px-1.5 py-0.5 rounded-full shadow-sm transform rotate-6 border border-white z-0 pointer-events-none whitespace-nowrap tracking-wider">
      🎉 NYLA'S 5TH
    </div>
  );

  // THE ULTIMATE iOS SAFARI FIX: Base64 Swap + Cache Busting
  const captureAndDownload = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const btn = element.querySelector('button');
    const oldIcon = btn?.innerText;
    if (btn) btn.innerText = "⏳";

    try {
      // 1. SAFARI BYPASS: Convert all Supabase images to trusted local Base64 strings first
      const images = Array.from(element.getElementsByTagName('img'));
      const originalSrcs = images.map(img => img.src);

      await Promise.all(images.map(async (img) => {
        if (img.src.startsWith('http')) {
          try {
            const res = await fetch(img.src, { mode: 'cors', cache: 'no-cache' });
            const blob = await res.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                img.src = reader.result as string;
                resolve(true);
              };
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.warn("Could not pre-fetch image for iOS bypass", err);
          }
        }
      }));

      // 2. Take the screenshot (Safari will now trust the Base64 images!)
      const dataUrl = await toPng(element, {
          cacheBust: true, 
          pixelRatio: 3, 
          filter: (node) => {
              const el = node as HTMLElement;
              if (el?.hasAttribute && el.hasAttribute('data-ignore')) {
                  return false;
              }
              return true;
          }
      });

      // 3. Put the original Supabase URLs back so the live site stays fast
      images.forEach((img, index) => {
        img.src = originalSrcs[index];
      });

      // 4. Download!
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error("Error capturing image:", error);
      alert("Oops! Couldn't capture the styled image. Try again!");
    } finally {
      if (btn && oldIcon) btn.innerText = oldIcon;
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
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-yellow-400 uppercase tracking-tighter drop-shadow-sm">
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
                    <div id={`raffle-card-${w.id}`} key={`raffle-${w.id}`} className="bg-white p-2 md:p-3 rounded-2xl shadow-xl transform rotate-2 hover:rotate-0 transition-all group relative">
                        <div className="relative overflow-hidden rounded-xl border-2 border-gray-100 bg-white">
                            <img src={w.proof_url} alt={w.nickname} className="w-full aspect-square object-cover" crossOrigin="anonymous" />
                            
                            <LargeWatermark />

                            <div data-ignore="true" className="absolute top-2 left-2 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                <button 
                                    onClick={() => captureAndDownload(`raffle-card-${w.id}`, `Nylas5th-${w.nickname}-Winner.png`)}
                                    className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm active:scale-90 shadow-lg text-xs md:text-sm"
                                    title="Download Card"
                                >
                                    ⬇️
                                </button>
                            </div>
                        </div>
                        <div className="pt-3 pb-1 text-center bg-white">
                            <p className="text-gray-900 font-black uppercase text-sm md:text-base leading-tight truncate">{w.nickname}</p>
                            <p className="text-pink-500 font-bold text-[10px] md:text-xs uppercase mt-0.5 truncate">{w.prize_won}</p>
                        </div>
                    </div>
                ))}

                {/* GAME WINNERS */}
                {gameWinners.map(g => (
                    <div id={`game-card-${g.id}`} key={`game-${g.id}`} className="bg-white p-2 md:p-3 rounded-2xl shadow-xl transform -rotate-2 hover:rotate-0 transition-all group relative">
                        <div className="relative overflow-hidden rounded-xl border-2 border-gray-100 bg-white">
                            <img src={g.proof_url} alt={g.name} className="w-full aspect-square object-cover" crossOrigin="anonymous" />
                            
                            <LargeWatermark />

                            <div data-ignore="true" className="absolute top-2 left-2 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                <button 
                                    onClick={() => captureAndDownload(`game-card-${g.id}`, `Nylas5th-${g.name}-Winner.png`)}
                                    className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm active:scale-90 shadow-lg text-xs md:text-sm"
                                    title="Download Card"
                                >
                                    ⬇️
                                </button>
                            </div>
                        </div>
                        <div className="pt-3 pb-1 text-center bg-white">
                            <p className="text-gray-900 font-black uppercase text-sm md:text-base leading-tight truncate px-1">{g.name}</p>
                            <p className="text-pink-500 font-bold text-[10px] md:text-xs uppercase mt-0.5">Game Winner</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* SECTION 2: LIVE GUEST GALLERY */}
        <div className="space-y-6 pt-8">
            <div className="flex items-end justify-between border-b-2 border-pink-500/30 pb-2">
                <h2 className="text-2xl font-black text-pink-400 uppercase tracking-widest">📸 Live Gallery</h2>
                <a href={`/${eventSlug}/upload`} className="text-[10px] md:text-xs font-black bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest transition-colors mb-1 shadow-md border border-white/20">
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
                        <div id={`live-card-${photo.id}`} key={`photo-${photo.id}`} className="break-inside-avoid relative group rounded-2xl overflow-hidden shadow-lg border-2 border-pink-500/30 bg-gray-800">
                            <img src={photo.photo_url} alt="Guest Upload" className="w-full h-auto object-cover block" loading="lazy" crossOrigin="anonymous" />
                            
                            <LargeWatermark />

                            <div data-ignore="true" className="absolute top-2 left-2 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10">
                                <button 
                                    onClick={() => captureAndDownload(`live-card-${photo.id}`, `Nylas5th-Memory-${photo.id}.png`)}
                                    className="bg-black/50 hover:bg-black/70 text-white p-2 md:p-2.5 rounded-full backdrop-blur-md active:scale-90 shadow-lg text-xs md:text-sm"
                                    title="Download Photo"
                                >
                                    ⬇️
                                </button>
                            </div>

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex items-end transition-all duration-300">
                                <p className="text-white font-black text-xs md:text-sm uppercase tracking-widest truncate drop-shadow-md pb-1">
                                    {photo.uploader_name || "Guest"}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* SECTION 3: THE BUBBLE SQUAD (FIXED PADDING FOR CUTOFF) */}
        <div className="space-y-6 pt-8">
            <h2 className="text-2xl font-black text-blue-400 uppercase tracking-widest border-b-2 border-blue-500/30 pb-2">🫧 The Party Squad</h2>
            <div className="flex flex-wrap justify-center gap-2 md:gap-4 pt-4">
                {allGuests.map(g => (
                    {/* ADDED p-4 pt-6 pr-6 to expand the camera's bounding box and stop the cutoff! */}
                    <div id={`bubble-card-${g.id}`} key={`guest-${g.id}`} className="flex flex-col items-center w-auto group relative p-4 pt-6 pr-6 bg-transparent">
                        
                        <div className="relative">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-4 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] bg-white relative">
                                <img src={g.photo_url} alt={g.nickname} className="w-full h-full object-cover" crossOrigin="anonymous" />
                            </div>
                            
                            <TinyWatermark />
                        </div>

                        <div data-ignore="true" className="absolute top-1 left-0 md:-left-2 transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10">
                            <button 
                                onClick={() => captureAndDownload(`bubble-card-${g.id}`, `Nylas5th-${g.nickname}-Avatar.png`)}
                                className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-md active:scale-90 shadow-lg text-[10px]"
                                title="Download Avatar"
                            >
                                ⬇️
                            </button>
                        </div>

                        <p className="mt-2 text-center text-[10px] md:text-xs font-black text-gray-300 uppercase tracking-wider truncate w-20 md:w-24">{g.nickname}</p>
                    </div>
                ))}
            </div>
            {allGuests.length === 0 && <p className="text-center text-gray-500 font-bold">No guests have arrived yet!</p>}
        </div>

      </div>
    </div>
  );
}