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

  // Helper to apply Dynamic Colors
  const getThemeColors = () => {
    switch (theme) {
      case "blue": return { border: "border-blue-400", text: "text-blue-600", bg: "bg-blue-600", glow: "shadow-[0_0_30px_rgba(59,130,246,0.8)]" };
      case "pink": return { border: "border-pink-400", text: "text-pink-600", bg: "bg-pink-600", glow: "shadow-[0_0_30px_rgba(236,72,153,0.8)]" };
      case "dark": return { border: "border-gray-600", text: "text-gray-200", bg: "bg-gray-900", glow: "shadow-[0_0_30px_rgba(156,163,175,0.8)]" };
      default: return { border: "border-purple-400", text: "text-purple-600", bg: "bg-purple-900", glow: "shadow-[0_0_30px_rgba(168,85,247,0.8)]" }; 
    }
  };
  const themeStyles = getThemeColors();

  // Helper to apply Dynamic Shapes
  const getShapeClass = () => {
    switch (shape) {
      case "square": return "rounded-none";
      case "rounded": return "rounded-3xl";
      default: return "rounded-full"; 
    }
  };

  // 🛠️ DIAGNOSTIC: Monitor React State Changes
  useEffect(() => {
    console.log("🛠️ DIAGNOSTIC [State] -> Current Theme:", theme, "| Current Shape:", shape, "| Background URL:", bgImage);
  }, [theme, shape, bgImage]);

  // 1. GET THE EVENT ID & STYLING CONFIG
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);

    const fetchEventData = async () => {
      const { data: eventData } = await supabase.from("events").select("id").eq("slug", eventSlug).single();
      if (!eventData) {
        setInvalidEvent(true);
        return;
      }
      setEventId(eventData.id);

      console.log("🛠️ DIAGNOSTIC [DB Fetch] -> Requesting config for Event ID:", eventData.id);
      
      const { data: configData, error: configError } = await supabase.from("raffle_config").select("color_theme, card_shape, display_mode, landscape_url").eq("event_id", eventData.id).single();
      
      if (configError) {
          console.error("🛠️ DIAGNOSTIC [DB Error] -> Failed to fetch config:", configError);
      }
      
      if (configData) {
          console.log("🛠️ DIAGNOSTIC [DB Success] -> Initial Config Loaded:", configData);
          if (configData.color_theme) setTheme(configData.color_theme);
          if (configData.card_shape) setShape(configData.card_shape);
          if (configData.display_mode) setViewMode(configData.display_mode);
          
          if (configData.landscape_url && configData.landscape_url.trim() !== "") {
              setBgImage(configData.landscape_url);
          }
      }
    };

    if (eventSlug) fetchEventData();

    return () => window.removeEventListener("resize", handleResize);
  }, [eventSlug]);

  // 2. CONNECT TO WEBSOCKETS
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase.channel(`raffle_${eventId}`, {
        config: { broadcast: { ack: true } }
    });

    channel
      .on("broadcast", { event: "set_display" }, (payload) => {
        setDisplayMode(payload.payload.mode);
      })
      .on("broadcast", { event: "play_sound" }, (payload) => {
        try { 
          const sound = new Audio(`/${payload.payload.sound}`); 
          sound.currentTime = 0; 
          sound.play().catch(() => {}); 
        } catch(e) {}
      })
      .on("broadcast", { event: "timer_sync" }, (payload) => {
        setTimer(payload.payload.time);
        setTimerStatus(payload.payload.status);
      })
      .on("broadcast", { event: "show_game" }, (payload) => {
        setDisplayMode("games");
        setActiveGame({ name: payload.payload.name, winners: payload.payload.winners });
        setWinner(null); setIsSpinning(false); setShuffleData(null); setPrizeName(""); setTimerStatus("idle");
      })
      .on("broadcast", { event: "spin" }, async (payload) => {
        setDisplayMode("raffle"); 
        setWinner(null); setShuffleData(null); setIsSpinning(true); setPrizeName(payload.payload.prize); setTimerStatus("idle"); 
        
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
              clearInterval(shuffleInterval);
              setShuffleData(null);
              setWinner(payload.payload.winner);
              try { new Audio("/win.mp3").play().catch(() => {}); } catch(e) {}
            }
          }, 200);
        }, 1500);
      })
      .on("broadcast", { event: "show_prize" }, (payload) => {
        setDisplayMode("raffle"); 
        setWinner(null); setIsSpinning(false); setShuffleData(null); setPrizeName(payload.payload.prize); setTimerStatus("idle");
      })
      .on("broadcast", { event: "reset" }, () => {
        setWinner(null); setIsSpinning(false); setShuffleData(null); setPrizeName(""); setTimerStatus("idle");
        setDisplayMode(prev => prev === "games" ? "pregame" : prev);
        setActiveGame(null);
      })
      .subscribe();

    // LISTEN FOR LIVE CONFIG UPDATES
    const configSub = supabase.channel(`config_update_${eventId}`).on(
        "postgres_changes", 
        { event: "UPDATE", schema: "public", table: "raffle_config", filter: `event_id=eq.${eventId}` }, 
        (payload: any) => {
            console.log("🛠️ DIAGNOSTIC [WebSocket] -> Live Update Received from Admin:", payload.new);
            
            if (payload.new.color_theme) setTheme(payload.new.color_theme);
            if (payload.new.card_shape) setShape(payload.new.card_shape);
            if (payload.new.display_mode) setViewMode(payload.new.display_mode);
            
            if (payload.new.landscape_url !== undefined) {
                if (payload.new.landscape_url && payload.new.landscape_url.trim() !== "") {
                    setBgImage(payload.new.landscape_url);
                } else {
                    setBgImage(null);
                }
            }
        }
      ).subscribe((status) => {
          if (status === 'SUBSCRIBED') {
              console.log("🛠️ DIAGNOSTIC [WebSocket] -> Config channel successfully connected.");
          }
      });

    return () => { 
      supabase.removeChannel(channel); 
      supabase.removeChannel(configSub);
    };
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

  // 🛠️ DIAGNOSTIC: Check the computed styles right before rendering
  const computedMainStyle = {
    ...(bgImage ? { backgroundImage: `url('${bgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    cursor: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"10\" fill=\"%23a855f7\" opacity=\"0.8\"/><circle cx=\"16\" cy=\"16\" r=\"6\" fill=\"%23ffffff\"/></svg>') 16 16, auto" 
  };
  console.log("🛠️ DIAGNOSTIC [Render] -> Applying Inline Styles:", computedMainStyle);

  return (
    <div 
      className={`fixed inset-0 w-screen h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden ${!bgImage ? themeStyles.bg : "bg-gray-900"}`} 
      style={computedMainStyle}
    >
      
      {/* PREGAME BUBBLES */}
      {displayMode === "pregame" && eventId && <PregameBubbles eventId={eventId} shapeClass={getShapeClass()} themeStyles={themeStyles} />}

      {/* QR DISPLAY */}
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

      {displayMode === "raffle" && (
        <>
          {winner && !isSpinning && !shuffleData && (
            <div className="absolute inset-0 z-50 pointer-events-none transform scale-150 origin-center overflow-hidden">
              <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={800} gravity={0.15} />
            </div>
          )}

          <style dangerouslySetInnerHTML={{ __html: `@keyframes slotDrop { 0% { transform: translateY(-100%); opacity: 0; } 40% { opacity: 1; } 100% { transform: translateY(0); opacity: 1; } } .animate-slot { animation: slotDrop 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }` }} />

          {!isSpinning && !shuffleData && !winner && !prizeName && (
            <div className="bg-black/60 backdrop-blur-md border border-white/20 p-8 lg:p-12 rounded-[3rem] shadow-2xl text-center w-full max-w-5xl mx-auto z-10">
              <h1 className="text-4xl lg:text-6xl font-black text-white drop-shadow-xl uppercase tracking-widest mb-4 lg:mb-6">Party Master SaaS</h1>
              <p className="text-2xl lg:text-4xl text-blue-300 font-bold tracking-widest uppercase animate-pulse">Waiting for Emcee...</p>
            </div>
          )}

          {!isSpinning && !shuffleData && !winner && prizeName && (
            <div className="bg-yellow-400 text-yellow-900 py-12 px-8 lg:py-16 lg:px-12 rounded-[4rem] shadow-2xl text-center border-8 border-yellow-200 animate-in zoom-in duration-700 w-full max-w-5xl mx-auto flex flex-col items-center justify-center z-10 max-h-[90vh]">
              <p className="text-3xl lg:text-5xl font-bold uppercase tracking-widest text-yellow-800 mb-4 shrink-0">Upcoming Prize:</p>
              <h1 className="text-5xl md:text-6xl lg:text-8xl font-black uppercase tracking-tighter drop-shadow-lg break-words px-4 leading-tight shrink">🎁 {prizeName} 🎁</h1>
            </div>
          )}

          {(isSpinning || shuffleData || winner) && prizeName && (
            <div className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-full shadow-2xl font-black text-2xl lg:text-4xl uppercase tracking-widest mb-4 border-4 border-yellow-200 animate-in slide-in-from-top duration-500 z-10 text-center break-words max-w-[90%] leading-tight shrink-0">
              🎁 {prizeName} 🎁
            </div>
          )}

          {isSpinning && (
            <div className={`animate-bounce bg-white/95 backdrop-blur-xl p-12 lg:p-16 rounded-[4rem] shadow-2xl text-center border-8 ${themeStyles.border} w-full max-w-5xl mx-auto z-10 flex-1 flex items-center justify-center max-h-[60vh]`}>
              <h1 className={`text-6xl lg:text-8xl font-black ${themeStyles.text} uppercase tracking-tighter`}>🎰 Drawing...</h1>
            </div>
          )}

          {shuffleData && (
            <div className={`bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl border-8 ${themeStyles.border} w-full max-w-5xl transform scale-105 h-64 lg:h-80 flex items-center justify-center p-6 mx-auto z-10`}>
              <div key={shuffleData.key} className="flex items-center justify-center gap-6 lg:gap-10 w-full animate-slot">
                <img src={shuffleData.guest.photo_url} alt="Shuffle Guest" className={`w-40 h-40 lg:w-64 lg:h-64 object-cover border-4 ${themeStyles.border} ${getShapeClass()} shrink-0`} />
                <h1 className={`text-6xl lg:text-8xl xl:text-9xl font-black ${themeStyles.text} uppercase truncate pb-2`}>{shuffleData.guest.nickname}</h1>
              </div>
            </div>
          )}

          {winner && !isSpinning && !shuffleData && (
            <div className={`bg-white/95 backdrop-blur-xl p-8 lg:p-10 rounded-[3rem] shadow-2xl text-center border-8 border-green-400 animate-in zoom-in duration-700 w-full max-w-5xl flex flex-col items-center justify-center gap-2 lg:gap-4 mx-auto z-10 flex-1 min-h-0 max-h-[85vh]`}>
              <div className="text-4xl lg:text-6xl animate-bounce shrink-0">🎉🏆🎉</div>
              <h2 className="text-xl lg:text-3xl font-bold text-gray-500 uppercase tracking-widest shrink-0">Congratulations</h2>
              <h1 className={`text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-black ${themeStyles.text} uppercase py-1 truncate max-w-full shrink`}>{winner.nickname}!</h1>
              
              <div className="flex justify-center py-2 min-h-0 flex-1 overflow-hidden">
                <img src={winner.photo_url} alt="Winner" className={`h-full aspect-square max-h-[30vh] lg:max-h-[35vh] object-cover border-8 border-green-500 shadow-2xl ${getShapeClass()}`} />
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
          <div key={b.slotId} onAnimationIteration={() => handleIteration(b.slotId)} className={`absolute overflow-hidden flex items-center justify-center will-change-transform border-4 border-white ${themeStyles.glow} z-30 opacity-95 ${shapeClass}`} style={{ width: "220px", height: "220px", left: `${b.left}vw`, top: `120vh`, animation: `floatContinuous ${b.duration}s linear ${b.delay}s infinite` } as React.CSSProperties}>
            <img src={b.guest.photo_url} className="w-full h-full object-cover" alt="Guest Bubble" />
            <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm text-white font-black text-center py-2 flex flex-col items-center justify-center">
              <span className="text-base uppercase leading-none">{b.guest.nickname}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}