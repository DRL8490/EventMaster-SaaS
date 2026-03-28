"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import Confetti from "react-confetti";

export default function ProjectorPage() {
  const params = useParams();
  const eventSlug = params?.slug || "";
  const [eventId, setEventId] = useState<number | null>(null);
  const [invalidEvent, setInvalidEvent] = useState(false);

  // SAAS CONFIG STATE
  const [theme, setTheme] = useState("purple");
  const [shape, setShape] = useState("bubble");
  const [viewMode, setViewMode] = useState("grid");
  const [bgImage, setBgImage] = useState<string | null>(null);

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [displayMode, setDisplayMode] = useState<"pregame" | "raffle" | "qr" | "games">("raffle");
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const [winner, setWinner] = useState<any>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [shuffleData, setShuffleData] = useState<{ guest: any; key: number } | null>(null);
  const [prizeName, setPrizeName] = useState("");

  const [activeGame, setActiveGame] = useState<{name: string, winners: number} | null>(null);
  const [timer, setTimer] = useState(60);
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">("idle");

  const baseUrl = "https://event-master-saas.vercel.app";
  const [allGuests, setAllGuests] = useState<any[]>([]);

  // NEW SAAS FEATURE: Dynamic Shape State for Cycling
  const [currentDisplayShape, setCurrentDisplayShape] = useState("bubble");

  // 1. Theme Helper
  const getThemeColors = () => {
    switch (theme) {
      case "blue": return { border: "border-blue-400", text: "text-blue-600", bg: "bg-blue-600", glow: "drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]" };
      case "pink": return { border: "border-pink-400", text: "text-pink-600", bg: "bg-pink-600", glow: "drop-shadow-[0_0_20px_rgba(236,72,153,0.8)]" };
      case "dark": return { border: "border-gray-600", text: "text-gray-200", bg: "bg-gray-900", glow: "drop-shadow-[0_0_20px_rgba(156,163,175,0.8)]" };
      default: return { border: "border-purple-400", text: "text-purple-600", bg: "bg-purple-900", glow: "drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]" }; 
    }
  };
  const themeStyles = getThemeColors();

  // 2. Shape Cycling Logic
  useEffect(() => {
    if (shape === "cycle") {
      const shapesList = ["bubble", "rounded", "square", "star", "heart", "cloud"];
      let idx = 0;
      setCurrentDisplayShape(shapesList[idx]);

      const interval = setInterval(() => {
        idx = (idx + 1) % shapesList.length;
        setCurrentDisplayShape(shapesList[idx]);
      }, 180000); // 3 minutes in milliseconds

      return () => clearInterval(interval);
    } else {
      setCurrentDisplayShape(shape);
    }
  }, [shape]);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);

    const fetchEventData = async () => {
      const { data: eventData } = await supabase.from("events").select("id").eq("slug", eventSlug).single();
      if (!eventData) { setInvalidEvent(true); return; }
      setEventId(eventData.id);

      const { data: configData } = await supabase.from("raffle_config").select("color_theme, card_shape, display_mode, landscape_url").eq("event_id", eventData.id).single();
      if (configData) {
          if (configData.color_theme) setTheme(configData.color_theme);
          if (configData.card_shape) setShape(configData.card_shape);
          if (configData.display_mode) setViewMode(configData.display_mode);
          if (configData.landscape_url && configData.landscape_url.trim() !== "") setBgImage(configData.landscape_url);
      }

      const { data: guestsData } = await supabase.from("guests").select("*").eq("event_id", eventData.id).eq("status", "eligible");
      if (guestsData) setAllGuests(guestsData);
    };

    if (eventSlug) fetchEventData();
    return () => window.removeEventListener("resize", handleResize);
  }, [eventSlug]);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase.channel(`raffle_${eventId}`, { config: { broadcast: { ack: true } } });
    channel
      .on("broadcast", { event: "set_display" }, (payload) => setDisplayMode(payload.payload.mode))
      .on("broadcast", { event: "play_sound" }, (payload) => { try { const sound = new Audio(`/${payload.payload.sound}`); sound.currentTime = 0; sound.play().catch(() => {}); } catch(e) {} })
      .on("broadcast", { event: "timer_sync" }, (payload) => { setTimer(payload.payload.time); setTimerStatus(payload.payload.status); })
      .on("broadcast", { event: "show_game" }, (payload) => { setDisplayMode("games"); setActiveGame({ name: payload.payload.name, winners: payload.payload.winners }); setWinner(null); setIsSpinning(false); setShuffleData(null); setPrizeName(""); setTimerStatus("idle"); })
      .on("broadcast", { event: "spin" }, async (payload) => {
        setDisplayMode("raffle"); setWinner(null); setShuffleData(null); setIsSpinning(true); setPrizeName(payload.payload.prize); setTimerStatus("idle"); 
        try { new Audio("/spin.mp3").play().catch(() => {}); } catch(e) {}

        const prizeCat = payload.payload.prizeCategory || "All";
        let query = supabase.from("guests").select("*").eq("event_id", eventId).eq("status", "eligible");
        if (prizeCat !== "All") query = query.eq("category", prizeCat);
        const { data } = await query;
        const pool = data && data.length > 0 ? data : [payload.payload.winner];

        setTimeout(() => {
          setIsSpinning(false);
          let shuffleCount = 0;
          const maxShuffles = 20;
          const shuffleInterval = setInterval(() => {
            const randomPerson = pool[Math.floor(Math.random() * pool.length)];
            setShuffleData({ guest: randomPerson, key: Math.random() });
            shuffleCount++;
            if (shuffleCount >= maxShuffles) {
              clearInterval(shuffleInterval); setShuffleData(null); setWinner(payload.payload.winner);
              try { new Audio("/win.mp3").play().catch(() => {}); } catch(e) {}
            }
          }, 200);
        }, 1500);
      })
      .on("broadcast", { event: "show_prize" }, (payload) => { setDisplayMode("raffle"); setWinner(null); setIsSpinning(false); setShuffleData(null); setPrizeName(payload.payload.prize); setTimerStatus("idle"); })
      .on("broadcast", { event: "reset" }, () => { setWinner(null); setIsSpinning(false); setShuffleData(null); setPrizeName(""); setTimerStatus("idle"); setDisplayMode(prev => prev === "games" ? "pregame" : prev); setActiveGame(null); })
      .subscribe();

    const configSub = supabase.channel(`config_update_${eventId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "raffle_config", filter: `event_id=eq.${eventId}` }, (payload: any) => {
        if (payload.new.color_theme) setTheme(payload.new.color_theme);
        if (payload.new.card_shape) setShape(payload.new.card_shape);
        if (payload.new.display_mode) setViewMode(payload.new.display_mode);
        if (payload.new.landscape_url !== undefined) setBgImage(payload.new.landscape_url && payload.new.landscape_url.trim() !== "" ? payload.new.landscape_url : null);
    }).subscribe();

    // RESTORED: WebSocket listener to instantly add new guests to the big screen!
    const guestSub = supabase.channel(`guest_updates_${eventId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "guests", filter: `event_id=eq.${eventId}` },
      (payload: any) => {
        if (payload.new.status === "eligible") {
          setAllGuests(prev => [...prev, payload.new]);
        }
      }
    ).subscribe();

    return () => { supabase.removeChannel(channel); supabase.removeChannel(configSub); supabase.removeChannel(guestSub); };
  }, [eventId]); 

  if (invalidEvent) return <div className="fixed inset-0 bg-black flex items-center justify-center text-red-500 text-4xl font-black uppercase">Event Not Found</div>;

  if (!audioUnlocked) {
    return (
      <div onClick={() => setAudioUnlocked(true)} className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center cursor-pointer z-[100] hover:bg-gray-800 transition-colors">
        <div className="text-8xl mb-6 animate-bounce">🔈</div>
        <h1 className="text-5xl font-black text-white uppercase tracking-widest text-center animate-pulse px-10">Tap anywhere to Unlock Audio<br/>& Start Projector</h1>
      </div>
    );
  }

  const computedMainStyle = {
    ...(bgImage ? { backgroundImage: `url('${bgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    cursor: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"10\" fill=\"%23a855f7\" opacity=\"0.8\"/><circle cx=\"16\" cy=\"16\" r=\"6\" fill=\"%23ffffff\"/></svg>') 16 16, auto" 
  };

  return (
    <div className={`fixed inset-0 w-screen h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden ${!bgImage ? themeStyles.bg : "bg-gray-900"}`} style={computedMainStyle}>
      
      {/* GLOBAL CSS WITH STICKER-TRIM ILLUSION */}
      <style dangerouslySetInnerHTML={{ __html: `
        .shape-star { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
        .shape-heart { mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'); mask-size: cover; mask-position: center; }
        .shape-cloud { mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.36 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>'); mask-size: cover; mask-position: center; transform: scale(1.1); }
        
        .custom-shape-wrapper {
            filter: drop-shadow(6px 0px 0px white) 
                    drop-shadow(-6px 0px 0px white) 
                    drop-shadow(0px 6px 0px white) 
                    drop-shadow(0px -6px 0px white);
        }
      `}} />

      {displayMode === "pregame" && eventId && (
         <PregameBubbles eventId={eventId} shape={currentDisplayShape} themeStyles={themeStyles} viewMode={viewMode} allGuests={allGuests} />
      )}

      {/* RESTORED: Full QR DISPLAY with QR Codes and Flexbox Layout */}
      {displayMode === "qr" && (
         <div className={`bg-white/95 backdrop-blur-xl p-8 lg:p-12 rounded-[3rem] shadow-2xl text-center border-8 ${themeStyles.border} animate-in zoom-in duration-700 w-full max-w-7xl mx-auto flex flex-col items-center z-10 max-h-[90vh]`}>
            <h1 className={`text-3xl lg:text-5xl xl:text-6xl font-black ${themeStyles.text} uppercase mb-8 lg:mb-10 drop-shadow-sm tracking-widest shrink-0`}>
              Scan to Relive the Magic!
            </h1>
            
            <div className="flex flex-col md:flex-row items-stretch justify-center gap-8 lg:gap-16 w-full flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col items-center justify-center bg-gray-50 p-6 lg:p-8 rounded-3xl border-4 border-gray-200 shadow-inner flex-1 max-h-full">
                    <h2 className="text-2xl lg:text-4xl font-black text-gray-800 uppercase tracking-widest mb-2 shrink-0">Memory Gallery</h2>
                    <p className="text-sm lg:text-base font-bold text-gray-500 uppercase tracking-widest mb-4 lg:mb-6 shrink-0">See all winners & guests!</p>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${baseUrl}/${eventSlug}/memory`)}`} alt="Memory QR" className="w-48 h-48 lg:w-72 lg:h-72 object-contain rounded-2xl shadow-xl border-8 border-white transition-transform hover:scale-105 shrink min-h-0" />
                </div>

                <div className="flex flex-col items-center justify-center bg-blue-50 p-6 lg:p-8 rounded-3xl border-4 border-blue-200 shadow-inner flex-1 max-h-full">
                    <h2 className="text-2xl lg:text-4xl font-black text-blue-700 uppercase tracking-widest mb-2 whitespace-nowrap shrink-0">Photo Drop</h2>
                    <p className="text-sm lg:text-base font-bold text-blue-500 uppercase tracking-widest mb-4 lg:mb-6 shrink-0">Share your favorite moments!</p>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${baseUrl}/${eventSlug}/upload`)}`} alt="Upload QR" className="w-48 h-48 lg:w-72 lg:h-72 object-contain rounded-2xl shadow-xl border-8 border-white transition-transform hover:scale-105 shrink min-h-0" />
                </div>
            </div>
         </div>
      )}

      {/* RESTORED: Full GAMES DISPLAY with Winner Counts */}
      {displayMode === "games" && activeGame && (
          <div className="bg-green-400 text-green-900 py-8 px-8 lg:py-16 lg:px-12 rounded-[4rem] shadow-2xl text-center border-8 border-green-200 animate-in zoom-in duration-700 w-full max-w-6xl mx-auto flex flex-col items-center justify-center relative z-10 max-h-[90vh]">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none"></div>
              <span className="text-6xl lg:text-8xl mb-4 animate-bounce relative z-10 shrink-0">🎲</span>
              <p className="text-xl lg:text-3xl font-bold uppercase tracking-widest text-green-800 mb-4 relative z-10 shrink-0">Get Ready to Play:</p>
              <h1 className="text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tighter drop-shadow-lg mb-8 relative z-10 leading-tight break-words max-w-full px-4 shrink">{activeGame.name}</h1>
              <div className="bg-white/95 px-8 py-4 lg:px-12 lg:py-5 rounded-full border-4 border-green-500 shadow-xl relative z-10 animate-pulse mt-auto shrink-0">
                  <p className="text-xl lg:text-3xl font-black text-green-700 uppercase tracking-widest">Looking for {activeGame.winners} {activeGame.winners === 1 ? 'Winner' : 'Winners'}!</p>
              </div>
          </div>
      )}

      {/* RAFFLE DISPLAY */}
      {displayMode === "raffle" && (
        <>
          {winner && !isSpinning && !shuffleData && <div className="absolute inset-0 z-50 pointer-events-none transform scale-150 origin-center overflow-hidden"><Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={800} gravity={0.15} /></div>}
          <style dangerouslySetInnerHTML={{ __html: `@keyframes slotDrop { 0% { transform: translateY(-100%); opacity: 0; } 40% { opacity: 1; } 100% { transform: translateY(0); opacity: 1; } } .animate-slot { animation: slotDrop 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }` }} />

          {!isSpinning && !shuffleData && !winner && !prizeName && (
            <div className="bg-black/60 backdrop-blur-md border border-white/20 p-8 lg:p-12 rounded-[3rem] shadow-2xl text-center w-full max-w-5xl mx-auto z-10">
              <h1 className="text-4xl lg:text-6xl font-black text-white drop-shadow-xl uppercase tracking-widest mb-4">Party Master SaaS</h1>
              <p className="text-2xl lg:text-4xl text-blue-300 font-bold tracking-widest uppercase animate-pulse">Waiting for Emcee...</p>
            </div>
          )}

          {!isSpinning && !shuffleData && !winner && prizeName && (
            <div className="bg-yellow-400 text-yellow-900 py-12 px-8 lg:py-16 lg:px-12 rounded-[4rem] shadow-2xl text-center border-8 border-yellow-200 animate-in zoom-in duration-700 w-full max-w-5xl mx-auto flex flex-col items-center justify-center z-10">
              <p className="text-3xl lg:text-5xl font-bold uppercase tracking-widest text-yellow-800 mb-4">Upcoming Prize:</p>
              <h1 className="text-5xl md:text-6xl lg:text-8xl font-black uppercase tracking-tighter drop-shadow-lg shrink">🎁 {prizeName} 🎁</h1>
            </div>
          )}

          {isSpinning && (
            <div className={`animate-bounce bg-white/95 backdrop-blur-xl p-12 lg:p-16 rounded-[4rem] shadow-2xl text-center border-8 ${themeStyles.border} w-full max-w-5xl mx-auto z-10 flex-1 flex items-center justify-center`}>
              <h1 className={`text-6xl lg:text-8xl font-black ${themeStyles.text} uppercase tracking-tighter`}>🎰 Drawing...</h1>
            </div>
          )}

          {shuffleData && (
            <div className={`bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl border-8 ${themeStyles.border} w-full max-w-5xl transform scale-105 h-64 lg:h-80 flex items-center justify-center p-6 mx-auto z-10`}>
              <div key={shuffleData.key} className="flex items-center justify-center gap-6 lg:gap-10 w-full animate-slot">
                
                <GuestAvatar src={shuffleData.guest.photo_url} className="w-40 h-40 lg:w-64 lg:h-64 shrink-0" shape={currentDisplayShape} glow={themeStyles.glow} />
                <h1 className={`text-6xl lg:text-8xl xl:text-9xl font-black ${themeStyles.text} uppercase truncate pb-2`}>{shuffleData.guest.nickname}</h1>
              
              </div>
            </div>
          )}

          {/* RESTORED: Full Winner Display with Countdown Timer */}
          {winner && !isSpinning && !shuffleData && (
            <div className={`bg-white/95 backdrop-blur-xl p-8 lg:p-10 rounded-[3rem] shadow-2xl text-center border-8 border-green-400 animate-in zoom-in duration-700 w-full max-w-5xl flex flex-col items-center justify-center gap-2 lg:gap-4 mx-auto z-10 flex-1 min-h-0 max-h-[85vh]`}>
              <div className="text-4xl lg:text-6xl animate-bounce shrink-0">🎉🏆🎉</div>
              <h2 className="text-xl lg:text-3xl font-bold text-gray-500 uppercase tracking-widest shrink-0">Congratulations</h2>
              <h1 className={`text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-black ${themeStyles.text} uppercase py-1 truncate max-w-full shrink`}>{winner.nickname}!</h1>
              
              <div className="flex justify-center py-2 min-h-0 flex-1 overflow-hidden">
                <GuestAvatar src={winner.photo_url} className="h-full aspect-square max-h-[30vh] lg:max-h-[35vh]" shape={currentDisplayShape} glow="drop-shadow-[0_0_40px_rgba(74,222,128,1)]" />
              </div>
              
              {timerStatus !== "idle" && (
                <div className={`mt-2 lg:mt-4 px-10 py-3 lg:py-4 rounded-full border-4 shrink-0 ${timerStatus === "paused" ? "bg-gray-200 border-gray-400 text-gray-600" : "bg-red-100 border-red-500 text-red-600 animate-pulse"}`}>
                    <p className="text-xs lg:text-sm font-black uppercase tracking-widest leading-none mb-1 text-center">Time to Claim</p>
                    <p className="text-4xl lg:text-5xl font-black tracking-widest text-center">⏱️ {timer}s</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}

// --- SUB-COMPONENT: PREGAME BUBBLES WITH GALLERY MODES ---
function PregameBubbles({ eventId, shape, themeStyles, viewMode, allGuests }: { eventId: number, shape: string, themeStyles: any, viewMode: string, allGuests: any[] }) {
  const [bubbles, setBubbles] = useState<any[]>([]);
  const guestsRef = useRef<any[]>([]);
  const nextGuestIndex = useRef(0);
  const priorityQueueRef = useRef<any[]>([]);
  const MAX_BUBBLES = 5; 

  useEffect(() => {
    guestsRef.current = allGuests;
    if (allGuests.length > 0 && bubbles.length === 0 && viewMode === "grid") {
        const slotsToCreate = Math.min(MAX_BUBBLES, allGuests.length || MAX_BUBBLES);
        const initialBubbles = Array.from({ length: slotsToCreate }).map((_, i) => {
            const g = allGuests[nextGuestIndex.current % allGuests.length];
            nextGuestIndex.current++;
            return { slotId: i, guest: g, left: i * 17 + 8, duration: 14 + Math.random() * 8, delay: i * 3 };
        });
        setBubbles(initialBubbles);
    }
  }, [allGuests, bubbles.length, viewMode]);

  const handleIteration = (slotId: number) => {
      if (guestsRef.current.length === 0 || viewMode !== "grid") return;
      setBubbles(prev => prev.map(b => {
          if (b.slotId === slotId) {
              let nextG;
              if (priorityQueueRef.current.length > 0) nextG = priorityQueueRef.current.shift(); 
              else { nextG = guestsRef.current[nextGuestIndex.current % guestsRef.current.length]; nextGuestIndex.current++; }
              return { ...b, guest: nextG }; 
          }
          return b;
      }));
  };

  // NEW SAAS FIX: Shared Header that always renders, preventing "blank" screens
  const WelcomeHeader = () => (
      <div className="absolute top-[10vh] w-full text-center z-50 pointer-events-none">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] uppercase tracking-widest px-4">Welcome to the Party!</h1>
          {allGuests.length === 0 && (
             <p className="text-2xl md:text-4xl text-blue-300 font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-2 lg:mt-4 animate-pulse">Waiting for guests to join...</p>
          )}
      </div>
  );

  if (viewMode === "carousel") {
    return (
      <div className="absolute inset-0 z-30">
         <WelcomeHeader />
         <div className="absolute inset-x-0 bottom-20 z-40 px-10">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-8 pb-8 pt-4 scrollbar-hide items-end h-80">
               {allGuests.map(g => (
                  <div key={g.id} className="snap-center shrink-0 animate-in slide-in-from-bottom duration-500">
                     <GuestAvatar src={g.photo_url} className="w-56 h-56" shape={shape} glow="drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
                     <p className="text-center text-white font-black uppercase mt-4 text-2xl drop-shadow-md">{g.nickname}</p>
                  </div>
               ))}
            </div>
         </div>
      </div>
    );
  }

  if (viewMode === "masonry") {
    return (
      <div className="absolute inset-0 z-30 p-12 overflow-hidden bg-black/40 backdrop-blur-sm">
         <WelcomeHeader />
         <div className="columns-3 md:columns-5 lg:columns-7 gap-6 space-y-6 mt-32">
            {allGuests.map(g => (
               <div key={g.id} className="relative group animate-in fade-in duration-1000">
                  <GuestAvatar src={g.photo_url} className="w-full aspect-square" shape={shape} glow="drop-shadow-xl" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-1 rounded-full border border-white/30">
                    <p className="text-white font-black text-xs uppercase">{g.nickname}</p>
                  </div>
               </div>
            ))}
         </div>
      </div>
    );
  }

  if (viewMode === "spotlight") {
    const latestGuest = allGuests[allGuests.length - 1];
    const olderGuests = allGuests.slice(0, -1);
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-md">
         <WelcomeHeader />
         <div className="absolute inset-0 flex flex-wrap justify-center items-center gap-4 opacity-30 blur-[2px] p-8 mt-32">
            {olderGuests.map(g => (
               <GuestAvatar key={g.id} src={g.photo_url} className="w-32 h-32" shape={shape} />
            ))}
         </div>
         {latestGuest && (
           <div className="relative z-50 animate-in zoom-in duration-500 flex flex-col items-center mt-20">
              <div className="absolute -inset-20 bg-white/20 blur-3xl rounded-full" />
              <GuestAvatar src={latestGuest.photo_url} className="w-96 h-96" shape={shape} glow="drop-shadow-[0_0_60px_rgba(255,255,255,0.8)]" />
              <div className="mt-8 bg-white text-black px-12 py-4 rounded-full shadow-2xl">
                 <p className="font-black text-4xl uppercase tracking-widest">{latestGuest.nickname}</p>
                 <p className="text-center font-bold text-gray-500 uppercase">Just Joined!</p>
              </div>
           </div>
         )}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes floatContinuous { 0% { top: 120vh; opacity: 0; transform: scale(0.8); } 5% { opacity: 1; transform: scale(1); } 95% { opacity: 1; } 100% { top: -40vh; opacity: 0; } }` }} />
      <WelcomeHeader />
      {bubbles.map((b) => {
        if (!b.guest) return null;
        return (
          <div key={b.slotId} onAnimationIteration={() => handleIteration(b.slotId)} className="absolute flex flex-col items-center justify-center will-change-transform z-30" style={{ width: "250px", left: `${b.left}vw`, top: `120vh`, animation: `floatContinuous ${b.duration}s linear ${b.delay}s infinite` } as React.CSSProperties}>
            <GuestAvatar src={b.guest.photo_url} className="w-[200px] h-[200px]" shape={shape} glow={themeStyles.glow} />
            <div className="mt-4 bg-white/95 backdrop-blur-md px-6 py-2 rounded-full shadow-2xl border-2 border-gray-200">
              <span className={`text-xl font-black uppercase tracking-widest ${themeStyles.text} leading-none block`}>{b.guest.nickname}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- NEW SAAS COMPONENT: UNIFIED AVATAR RENDERER ---
function GuestAvatar({ src, className, shape, glow = "" }: { src: string, className: string, shape: string, glow?: string }) {
  const isCustom = ["star", "heart", "cloud"].includes(shape);
  
  const getShapeClass = () => {
    switch (shape) {
      case "square": return "rounded-none";
      case "rounded": return "rounded-3xl";
      case "star": return "shape-star";
      case "heart": return "shape-heart";
      case "cloud": return "shape-cloud";
      default: return "rounded-full"; 
    }
  };

  // If it's a custom mask (Star, Heart, Cloud), wrap it in our 4-sided drop-shadow trick
  if (isCustom) {
    return (
      <div className={`custom-shape-wrapper inline-flex ${glow}`}>
        <img src={src} className={`${className} object-cover bg-white ${getShapeClass()}`} alt="Guest" />
      </div>
    );
  }

  // If it's a standard shape (Bubble, Rounded, Square), just use a standard 6px CSS border
  return (
    <img src={src} className={`${className} object-cover border-[6px] border-white bg-white ${glow} ${getShapeClass()}`} alt="Guest" />
  );
}