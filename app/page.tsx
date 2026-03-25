"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Confetti from "react-confetti";

export default function ProjectorPage() {
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

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    
    const channel = supabase.channel("raffle");

    channel
      .on("broadcast", { event: "set_display" }, (payload) => {
        setDisplayMode(payload.payload.mode);
      })
      .on("broadcast", { event: "play_sound" }, (payload) => {
        try { 
          const sound = new Audio(`/${payload.payload.sound}`); 
          sound.currentTime = 0; 
          sound.play().catch(() => {}); 
        } catch(e) {
          console.error("Audio error:", e);
        }
      })
      .on("broadcast", { event: "timer_sync" }, (payload) => {
        setTimer(payload.payload.time);
        setTimerStatus(payload.payload.status);
      })
      .on("broadcast", { event: "show_game" }, (payload) => {
        setDisplayMode("games");
        setActiveGame({ 
          name: payload.payload.name, 
          winners: payload.payload.winners 
        });
        setWinner(null); 
        setIsSpinning(false); 
        setShuffleData(null); 
        setPrizeName(""); 
        setTimerStatus("idle");
      })
      .on("broadcast", { event: "spin" }, async (payload) => {
        setDisplayMode("raffle"); 
        setWinner(null); 
        setShuffleData(null); 
        setIsSpinning(true); 
        setPrizeName(payload.payload.prize);
        setTimerStatus("idle"); 
        
        try { 
          new Audio("/spin.mp3").play().catch(() => {}); 
        } catch(e) {
          console.error("Audio error:", e);
        }

        const prizeCat = payload.payload.prizeCategory || "All";
        let query = supabase.from("guests").select("*").eq("status", "eligible");
        
        if (prizeCat !== "All") {
          query = query.eq("category", prizeCat);
        }

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
              
              try { 
                new Audio("/win.mp3").play().catch(() => {}); 
              } catch(e) {
                console.error("Audio error:", e);
              }
            }
          }, 200);
        }, 1500);
      })
      .on("broadcast", { event: "show_prize" }, (payload) => {
        setDisplayMode("raffle"); 
        setWinner(null); 
        setIsSpinning(false); 
        setShuffleData(null); 
        setPrizeName(payload.payload.prize); 
        setTimerStatus("idle");
      })
      .on("broadcast", { event: "reset" }, () => {
        setWinner(null); 
        setIsSpinning(false); 
        setShuffleData(null); 
        setPrizeName(""); 
        setTimerStatus("idle");
        
        if (displayMode === "games") {
             setDisplayMode("pregame");
             setActiveGame(null);
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [displayMode]);

  if (!audioUnlocked) {
    return (
      <div 
        onClick={() => setAudioUnlocked(true)} 
        className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center cursor-pointer z-[100] hover:bg-gray-800 transition-colors"
      >
        <div className="text-8xl mb-6 animate-bounce">🔈</div>
        <h1 className="text-5xl font-black text-white uppercase tracking-widest text-center animate-pulse px-10">
          Tap anywhere to Unlock Audio<br/>& Start Projector
        </h1>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 w-full flex flex-col items-center justify-center p-4 md:p-6 bg-transparent overflow-hidden" 
      style={{ cursor: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"32\" height=\"32\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"10\" fill=\"%23a855f7\" opacity=\"0.8\"/><circle cx=\"16\" cy=\"16\" r=\"6\" fill=\"%23ffffff\"/></svg>') 16 16, auto" }}
    >
      
      {displayMode === "pregame" && <PregameBubbles />}

      {/* THE NEW DUAL-MEMORY QR DISPLAY */}
      {displayMode === "qr" && (
        <div className="bg-white/95 backdrop-blur-xl p-10 md:p-16 rounded-[4rem] shadow-2xl text-center border-8 border-purple-400 animate-in zoom-in duration-700 w-[95%] max-w-7xl mx-auto flex flex-col items-center z-10">
          <h1 className="text-4xl md:text-6xl font-black text-purple-600 uppercase mb-12 drop-shadow-sm tracking-widest">
            Scan to Relive the Magic!
          </h1>
          
          {/* Using gap-16 md:gap-32 and justify-between to force them FAR apart on the projector */}
          <div className="flex flex-col md:flex-row items-stretch justify-between gap-16 md:gap-32 w-full px-4 md:px-12">
              
              {/* QR 1: Winners & Bubbles (Left Side) */}
              <div className="flex flex-col items-center justify-center bg-gray-50 p-8 md:p-10 rounded-3xl border-4 border-gray-200 shadow-inner w-full md:w-1/2">
                  <h2 className="text-3xl md:text-5xl font-black text-gray-800 uppercase tracking-widest mb-4">Winners QR</h2>
                  <p className="text-lg font-bold text-gray-500 uppercase tracking-widest mb-8">See all winners & guests!</p>
                  <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/memory' : '')}`} 
                      alt="Memory QR Code" 
                      className="w-64 h-64 md:w-96 md:h-96 rounded-2xl shadow-xl border-8 border-white transition-transform hover:scale-105" 
                  />
              </div>

              {/* QR 2: Google Drive (Right Side) */}
              <div className="flex flex-col items-center justify-center bg-blue-50 p-8 md:p-10 rounded-3xl border-4 border-blue-200 shadow-inner w-full md:w-1/2">
                  <h2 className="text-3xl md:text-5xl font-black text-blue-700 uppercase tracking-widest mb-4 whitespace-nowrap">Download / Upload</h2>
                  <p className="text-lg font-bold text-blue-500 uppercase tracking-widest mb-8">Share raw photos & videos!</p>
                  <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent('https://drive.google.com/drive/folders/1i1ItVCpTjg-GVtwEbRLv9RJjAcgilGgS?usp=sharing')}`} 
                      alt="Drive QR Code" 
                      className="w-64 h-64 md:w-96 md:h-96 rounded-2xl shadow-xl border-8 border-white transition-transform hover:scale-105" 
                  />
              </div>
              
          </div>
        </div>
      )}

      {/* GAMES PROJECTOR UI */}
      {displayMode === "games" && activeGame && (
        <div className="bg-green-400 text-green-900 py-10 px-8 md:py-16 md:px-12 rounded-[4rem] shadow-2xl text-center border-8 border-green-200 animate-in zoom-in duration-700 w-[95%] max-w-6xl mx-auto flex flex-col items-center justify-center relative overflow-hidden z-10 max-h-[90vh]">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none"></div>
            
            <span className="text-7xl md:text-8xl mb-4 md:mb-6 animate-bounce relative z-10">🎲</span>
            <p className="text-2xl md:text-4xl font-bold uppercase tracking-widest text-green-800 mb-4 md:mb-6 relative z-10">
              Get Ready to Play:
            </p>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter drop-shadow-lg mb-8 relative z-10 leading-tight break-words max-w-full px-4">
                {activeGame.name}
            </h1>
            
            <div className="bg-white/95 px-8 py-4 md:px-12 md:py-5 rounded-full border-4 border-green-500 shadow-xl relative z-10 animate-pulse mt-auto flex-shrink-0">
                <p className="text-2xl md:text-4xl font-black text-green-700 uppercase tracking-widest">
                    Looking for {activeGame.winners} {activeGame.winners === 1 ? 'Winner' : 'Winners'}!
                </p>
            </div>
        </div>
      )}

      {/* RAFFLE PROJECTOR UI */}
      {displayMode === "raffle" && (
        <>
          {winner && !isSpinning && !shuffleData && (
            <div className="absolute inset-0 z-50 pointer-events-none transform scale-150 origin-center overflow-hidden">
              <Confetti 
                width={windowSize.width} 
                height={windowSize.height} 
                recycle={false} 
                numberOfPieces={800} 
                gravity={0.15} 
              />
            </div>
          )}

          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes slotDrop { 
                0% { transform: translateY(-100%); opacity: 0; } 
                40% { opacity: 1; } 
                100% { transform: translateY(0); opacity: 1; } 
              } 
              .animate-slot { 
                animation: slotDrop 0.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; 
              }
            `
          }} />

          {/* IDLE RAFFLE STATE */}
          {!isSpinning && !shuffleData && !winner && !prizeName && (
            <div className="bg-black/40 backdrop-blur-sm border border-white/20 p-12 rounded-[3rem] shadow-2xl text-center w-full max-w-5xl mx-auto shrink min-h-0">
              <h1 className="text-6xl font-black text-white drop-shadow-xl uppercase tracking-widest mb-6">Nyla&apos;s 5th Birthday</h1>
              <p className="text-4xl text-blue-300 font-bold tracking-widest uppercase animate-pulse">Waiting for Emcee...</p>
            </div>
          )}

          {/* SHOWING PRIZE NAME ONLY */}
          {!isSpinning && !shuffleData && !winner && prizeName && (
            <div className="bg-yellow-400 text-yellow-900 py-16 px-12 rounded-[4rem] shadow-2xl text-center border-8 border-yellow-200 animate-in zoom-in duration-700 w-[90%] max-w-5xl mx-auto flex flex-col items-center justify-center">
              <p className="text-5xl font-bold uppercase tracking-widest text-yellow-800 mb-4">Upcoming Prize:</p>
              <h1 className="text-7xl font-black uppercase tracking-tighter drop-shadow-lg break-words px-4 leading-tight">
                🎁 {prizeName} 🎁
              </h1>
            </div>
          )}

          {/* FLOATING PRIZE HEADER DURING SPIN/WIN */}
          {(isSpinning || shuffleData || winner) && prizeName && (
            <div className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-full shadow-2xl font-black text-4xl uppercase tracking-widest mb-4 border-4 border-yellow-200 animate-in slide-in-from-top duration-500 z-10 text-center break-words max-w-[90%] leading-tight">
              🎁 {prizeName} 🎁
            </div>
          )}

          {/* SPINNING ANIMATION */}
          {isSpinning && (
            <div className="animate-bounce bg-white/90 backdrop-blur-md p-16 rounded-[4rem] shadow-2xl text-center border-8 border-blue-500 w-full max-w-5xl mx-auto z-10">
              <h1 className="text-8xl font-black text-blue-600 uppercase tracking-tighter">🎰 Drawing...</h1>
            </div>
          )}

          {/* SLOT MACHINE SHUFFLE */}
          {shuffleData && (
            <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl border-8 border-blue-400 w-full max-w-4xl transform scale-105 h-72 flex items-center justify-center p-6 mx-auto z-10">
              <div key={shuffleData.key} className="flex items-center justify-center gap-8 w-full animate-slot">
                <img 
                  src={shuffleData.guest.photo_url} 
                  alt="Shuffle Guest" 
                  className="w-56 h-56 object-cover rounded-3xl border-4 border-blue-500" 
                />
                <h1 className="text-8xl font-black text-blue-600 uppercase truncate pb-2">
                  {shuffleData.guest.nickname}
                </h1>
              </div>
            </div>
          )}

          {/* WINNER ANNOUNCEMENT */}
          {winner && !isSpinning && !shuffleData && (
            <div className="bg-white/95 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl text-center border-8 border-green-400 animate-in zoom-in duration-700 w-[90%] max-w-4xl flex flex-col items-center justify-center gap-3 mx-auto z-10 max-h-[85vh]">
              <div className="text-5xl animate-bounce">🎉🏆🎉</div>
              <h2 className="text-2xl font-bold text-gray-500 uppercase tracking-widest">Congratulations</h2>
              <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 uppercase py-1 truncate max-w-full">
                {winner.nickname}!
              </h1>
              
              <div className="flex justify-center py-2">
                <img 
                  src={winner.photo_url} 
                  alt="Winner" 
                  className="max-h-[25vh] aspect-square object-cover rounded-full border-8 border-blue-500 shadow-2xl" 
                />
              </div>
              
              {/* STAGE COUNTDOWN TIMER */}
              {timerStatus !== "idle" && (
                <div className={`mt-4 px-12 py-4 rounded-full border-4 ${timerStatus === "paused" ? "bg-gray-200 border-gray-400 text-gray-600" : "bg-red-100 border-red-500 text-red-600 animate-pulse"}`}>
                    <p className="text-sm font-black uppercase tracking-widest leading-none mb-1 text-center">Time to Claim</p>
                    <p className="text-5xl font-black tracking-widest text-center">⏱️ {timer}s</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}

// --- SUB-COMPONENT: CONTINUOUS NON-OVERLAPPING LANE BUBBLES ---
function PregameBubbles() {
  const [guests, setGuests] = useState<any[]>([]);
  const guestsRef = useRef<any[]>([]);
  const nextGuestIndex = useRef(0);
  const [bubbles, setBubbles] = useState<any[]>([]);
  const priorityQueueRef = useRef<any[]>([]);
  
  const MAX_BUBBLES = 5; 

  useEffect(() => {
    const fetchGuests = async () => {
      const { data } = await supabase.from("guests").select("*").order("id", { ascending: true });
      if (data) {
          setGuests(data);
          guestsRef.current = data;
      }
    };
    
    fetchGuests();

    const sub = supabase.channel("realtime_guests").on(
      "postgres_changes", 
      { event: "INSERT", schema: "public", table: "guests" }, 
      (payload) => {
        setGuests((prev) => {
            const updated = [...prev, payload.new];
            guestsRef.current = updated;
            priorityQueueRef.current.push(payload.new);
            return updated;
        });
      }
    ).subscribe();

    return () => { 
      supabase.removeChannel(sub); 
    };
  }, []);

  useEffect(() => {
    if (guests.length > 0 && bubbles.length === 0) {
        const slotsToCreate = Math.min(MAX_BUBBLES, guests.length || MAX_BUBBLES);
        
        const initialBubbles = Array.from({ length: slotsToCreate }).map((_, i) => {
            const g = guests[nextGuestIndex.current % guests.length];
            nextGuestIndex.current++;
            return {
                slotId: i,
                guest: g,
                left: i * 17 + 8, 
                duration: 14 + Math.random() * 8, 
                delay: i * 3, 
            };
        });
        
        setBubbles(initialBubbles);
    }
  }, [guests, bubbles.length]);

  const handleIteration = (slotId: number) => {
      if (guestsRef.current.length === 0) return;
      
      setBubbles(prev => prev.map(b => {
          if (b.slotId === slotId) {
              let nextG;
              if (priorityQueueRef.current.length > 0) {
                  nextG = priorityQueueRef.current.shift(); 
              } else {
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
      
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes floatContinuous {
            0% { top: 120vh; opacity: 0; transform: scale(0.8); }
            5% { opacity: 1; transform: scale(1); }
            95% { opacity: 1; }
            100% { top: -40vh; opacity: 0; }
          }
        `
      }} />

      <div className="absolute top-10 w-full text-center z-50">
          <h1 className="text-6xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] uppercase tracking-widest">
            Welcome to the Party!
          </h1>
          <p className="text-3xl text-blue-300 font-bold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-2">
            Get your phones ready to scan!
          </p>
      </div>
      
      {bubbles.map((b) => {
        if (!b.guest) return null;

        return (
          <div 
            key={b.slotId} 
            onAnimationIteration={() => handleIteration(b.slotId)}
            className={`absolute rounded-full overflow-hidden flex items-center justify-center will-change-transform border-4 border-white shadow-[0_0_30px_rgba(59,130,246,0.8)] z-30 opacity-95`}
            style={{
              width: "240px",
              height: "240px",
              left: `${b.left}vw`, 
              top: `120vh`,
              animation: `floatContinuous ${b.duration}s linear ${b.delay}s infinite`, 
            } as React.CSSProperties}
          >
            <img 
              src={b.guest.photo_url} 
              className="w-full h-full object-cover" 
              alt="Guest Bubble" 
            />

            <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm text-white font-black text-center py-2 flex flex-col items-center justify-center">
              <span className="text-base uppercase leading-none">{b.guest.nickname}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}