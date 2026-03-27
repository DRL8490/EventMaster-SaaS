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

  // 1. Theme Helper
  const getThemeColors = () => {
    switch (theme) {
      case "blue": return { border: "border-blue-400", text: "text-blue-600", bg: "bg-blue-600", glow: "shadow-[0_0_30px_rgba(59,130,246,0.8)]" };
      case "pink": return { border: "border-pink-400", text: "text-pink-600", bg: "bg-pink-600", glow: "shadow-[0_0_30px_rgba(236,72,153,0.8)]" };
      case "dark": return { border: "border-gray-600", text: "text-gray-200", bg: "bg-gray-900", glow: "shadow-[0_0_30px_rgba(156,163,175,0.8)]" };
      default: return { border: "border-purple-400", text: "text-purple-600", bg: "bg-purple-900", glow: "shadow-[0_0_30px_rgba(168,85,247,0.8)]" }; 
    }
  };
  const themeStyles = getThemeColors();

  // 2. Shape Helper 
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

    // THIS IS WHAT RECEIVES THE LIVE UPDATES FROM THE ADMIN PAGE
    const configSub = supabase.channel(`config_update_${eventId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "raffle_config", filter: `event_id=eq.${eventId}` }, (payload: any) => {
        if (payload.new.color_theme) setTheme(payload.new.color_theme);
        if (payload.new.card_shape) setShape(payload.new.card_shape);
        if (payload.new.display_mode) setViewMode(payload.new.display_mode);
        if (payload.new.landscape_url !== undefined) setBgImage(payload.new.landscape_url && payload.new.landscape_url.trim() !== "" ? payload.new.landscape_url : null);
    }).subscribe();

    return () => { supabase.removeChannel(channel); supabase.removeChannel(configSub); };
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
      
      {/* 3. SHAPE CSS INJECTION */}
      <style dangerouslySetInnerHTML={{ __html: `
        .shape-star { clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }
        .shape-heart { mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'); mask-size: cover; mask-position: center; }
        .shape-cloud { mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.36 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>'); mask-size: cover; mask-position: center; transform: scale(1.1); }
      `}} />

      {displayMode === "pregame" && eventId && (
         <PregameBubbles eventId={eventId} shapeClass={getShapeClass()} themeStyles={themeStyles} />
      )}

      {/* QR DISPLAY */}
      {displayMode === "qr" && (
         <div className={`bg-white/95 backdrop-blur-xl p-8 lg:p-12 rounded-[3rem] shadow-2xl text-center border-8 ${themeStyles.border} animate-in zoom-in duration-700 w-full max-w-7xl mx-auto flex flex-col items-center z-10 max-h-[90vh]`}>
           <h1 className={`text-3xl lg:text-5xl xl:text-6xl font-black ${themeStyles.text} uppercase mb-8 lg:mb-10 drop-shadow-sm tracking-widest shrink-0`}>Scan to Relive the Magic!</h1>
         </div>
      )}

      {/* GAMES DISPLAY */}
      {displayMode === "games" && activeGame && (
         <div className="bg-green-400 text-green-900 py-8 px-8 lg:py-16 lg:px-12 rounded-[4rem] shadow-2xl text-center border-8 border-green-200 animate-in zoom-in w-full max-w-6xl mx-auto flex flex-col items-center justify-center relative z-10">
            <h1 className="text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-black uppercase tracking-tighter drop-shadow-lg mb-8 relative z-10">{activeGame.name}</h1>
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
                {/* SHAPE APPLIED TO SHUFFLE IMAGE */}
                <img src={shuffleData.guest.photo_url} alt="Shuffle Guest" className={`w-40 h-40 lg:w-64 lg:h-64 object-cover border-4 ${themeStyles.border} ${getShapeClass()} shrink-0`} />
                <h1 className={`text-6xl lg:text-8xl xl:text-9xl font-black ${themeStyles.text} uppercase truncate pb-2`}>{shuffleData.guest.nickname}</h1>
              </div>
            </div>
          )}

          {winner && !isSpinning && !shuffleData && (
            <div className={`bg-white/95 backdrop-blur-xl p-8 lg:p-10 rounded-[3rem] shadow-2xl text-center border-8 border-green-400 animate-in zoom-in duration-700 w-full max-w-5xl flex flex-col items-center justify-center gap-2 lg:gap-4 mx-auto z-10 flex-1 min-h-0 max-h-[85vh]`}>
              <div className="text-4xl lg:text-6xl animate-bounce shrink-0">🎉🏆🎉</div>
              <h1 className={`text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-black ${themeStyles.text} uppercase py-1 truncate max-w-full shrink`}>{winner.nickname}!</h1>
              
              <div className="flex justify-center py-2 min-h-0 flex-1 overflow-hidden">
                {/* SHAPE APPLIED TO WINNER IMAGE */}
                <img src={winner.photo_url} alt="Winner" className={`h-full aspect-square max-h-[30vh] lg:max-h-[35vh] object-cover border-8 border-green-500 shadow-2xl ${getShapeClass()}`} />
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

// --- SUB-COMPONENT: ISOLATED SAAS BUBBLES ---
function PregameBubbles({ eventId, shapeClass, themeStyles }: { eventId: number, shapeClass: string, themeStyles: any }) {
  const [guests, setGuests] = useState<any[]>([]);
  const guestsRef = useRef<any[]>([]);
  const nextGuestIndex = useRef(0);
  const [bubbles, setBubbles] = useState<any[]>([]);
  const priorityQueueRef = useRef<any[]>([]);
  
  const MAX_BUBBLES = 5; 

  useEffect(() => {
    const fetchGuests = async () => {
      const { data } = await supabase.from("guests").select("*").eq("event_id", eventId).order("id", { ascending: true });
      if (data) {
          setGuests(data);
          guestsRef.current = data;
      }
    };
    fetchGuests();

    const sub = supabase.channel(`realtime_guests_${eventId}`).on(
      "postgres_changes", 
      { event: "INSERT", schema: "public", table: "guests", filter: `event_id=eq.${eventId}` }, 
      (payload) => {
        setGuests((prev) => {
            const updated = [...prev, payload.new];
            guestsRef.current = updated;
            priorityQueueRef.current.push(payload.new);
            return updated;
        });
      }
    ).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [eventId]);

  useEffect(() => {
    if (guests.length > 0 && bubbles.length === 0) {
        const slotsToCreate = Math.min(MAX_BUBBLES, guests.length || MAX_BUBBLES);
        const initialBubbles = Array.from({ length: slotsToCreate }).map((_, i) => {
            const g = guests[nextGuestIndex.current % guests.length];
            nextGuestIndex.current++;
            return { slotId: i, guest: g, left: i * 17 + 8, duration: 14 + Math.random() * 8, delay: i * 3 };
        });
        setBubbles(initialBubbles);
    }
  }, [guests, bubbles.length]);

  const handleIteration = (slotId: number) => {
      if (guestsRef.current.length === 0) return;
      setBubbles(prev => prev.map(b => {
          if (b.slotId === slotId) {
              let nextG;
              if (priorityQueueRef.current.length > 0) nextG = priorityQueueRef.current.shift(); 
              else {
                  nextG = guestsRef.current[nextGuestIndex.current % guestsRef.current.length];
                  nextGuestIndex.current++;
              }
              return { ...b, guest: nextG }; 
          }
          return b;
      }));
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes floatContinuous { 0% { top: 120vh; opacity: 0; transform: scale(0.8); } 5% { opacity: 1; transform: scale(1); } 95% { opacity: 1; } 100% { top: -40vh; opacity: 0; } }` }} />

      <div className="absolute top-[10vh] w-full text-center z-50">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] uppercase tracking-widest px-4">
            Welcome to the Party!
          </h1>
          <p className="text-2xl md:text-4xl text-blue-300 font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-2 lg:mt-4">
            Get your phones ready to scan!
          </p>
      </div>
      
      {bubbles.map((b) => {
        if (!b.guest) return null;
        return (
          // Notice: The container is now separate from the image, preventing clipping bugs!
          <div key={b.slotId} onAnimationIteration={() => handleIteration(b.slotId)} className="absolute flex flex-col items-center justify-center will-change-transform z-30" style={{ width: "250px", left: `${b.left}vw`, top: `120vh`, animation: `floatContinuous ${b.duration}s linear ${b.delay}s infinite` } as React.CSSProperties}>
            
            {/* The Dynamic Shape */}
            <img src={b.guest.photo_url} className={`w-[200px] h-[200px] object-cover border-[6px] border-white shadow-2xl ${themeStyles.glow} ${shapeClass}`} alt="Guest Avatar" />
            
            {/* The Clean, Detached Name Badge */}
            <div className="mt-4 bg-white/95 backdrop-blur-md px-6 py-2 rounded-full shadow-2xl border-2 border-gray-200">
              <span className={`text-xl font-black uppercase tracking-widest ${themeStyles.text} leading-none block`}>
                {b.guest.nickname}
              </span>
            </div>

          </div>
        );
      })}
    </div>
  );
}