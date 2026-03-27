"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

import DjBoard from "../../../components/emcee/DjBoard";
import ProjectorControl from "../../../components/emcee/ProjectorControl";
import GamesControl from "../../../components/emcee/GamesControl";
import RaffleControl from "../../../components/emcee/RaffleControl";
import GuestRoster from "../../../components/emcee/GuestRoster";

export default function EmceePage() {
  const params = useParams();
  const eventSlug = params.slug;
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventPasscode, setEventPasscode] = useState<string | null>(null);
  const [invalidEvent, setInvalidEvent] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  const [guests, setGuests] = useState<any[]>([]);
  const [unclaimedPrizes, setUnclaimedPrizes] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);

  const [totalEntries, setTotalEntries] = useState(0);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [winnersCount, setWinnersCount] = useState(0);
  
  const [prizeDisplayed, setPrizeDisplayed] = useState(false);
  
  // NEW SAAS FEATURE: Added 'roulette' to active screen states
  const [activeScreen, setActiveScreen] = useState<"pregame"|"raffle"|"games"|"qr"|"roulette">("raffle");

  const [timer, setTimer] = useState(60);
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">("idle");
  const [pendingProofGuest, setPendingProofGuest] = useState<any>(null);

  // 1. GET THE EVENT ID & PASSCODE FROM SUPABASE
  useEffect(() => {
    const fetchEventData = async () => {
      const { data: eventData } = await supabase
        .from("events")
        .select("id, passcode")
        .eq("slug", eventSlug)
        .single();

      if (!eventData) {
        setInvalidEvent(true);
        return;
      }
      setEventId(eventData.id);
      setEventPasscode(eventData.passcode);

      // Check if they already logged into THIS specific event previously
      if (sessionStorage.getItem(`host_auth_${eventData.id}`) === "true") {
          setIsAuthenticated(true);
      }
    };

    if (eventSlug) fetchEventData();
  }, [eventSlug]);


  // 2. FETCH DATA
  const fetchData = async () => {
    if (!eventId) return;
    setLoading(true);
    
    // SAAS QUERY: Only fetch data for THIS specific event
    const { data: guestData, error: guestError } = await supabase.from("guests").select("*").eq("event_id", eventId); 
    const { data: rsvpData } = await supabase.from("rsvps").select("*").eq("event_id", eventId); 
    const { data: gameData } = await supabase.from("games").select("*").eq("event_id", eventId).order("id", { ascending: true });

    if (gameData) setGames(gameData);

    if (guestError) {
        console.error(guestError.message); 
    } else if (guestData) {
      const rsvpList = rsvpData || []; 
      const guestsToUpdate: number[] = [];

      const mappedGuests = [...guestData].map(g => {
          const rsvp = rsvpList.find(r => r.full_name === g.full_name);
          const ref = rsvp ? (rsvp.referral || "") : "";
          let currentStatus = g.status;
          
          if (ref.toLowerCase() === "host" && currentStatus === "eligible") {
              guestsToUpdate.push(g.id);
              currentStatus = "ineligible";
          }
          return { ...g, referral: ref, status: currentStatus };
      });

      if (guestsToUpdate.length > 0) {
          supabase.from("guests").update({ status: "ineligible" }).in("id", guestsToUpdate).then();
      }

      const sortedGuests = mappedGuests.sort((a, b) => {
        const aNeedsProof = a.status === "won" && !a.proof_url;
        const bNeedsProof = b.status === "won" && !b.proof_url;
        if (aNeedsProof && !bNeedsProof) return -1;
        if (!aNeedsProof && bNeedsProof) return 1;
        if (a.status === "won" && b.status !== "won") return -1;
        if (b.status === "won" && a.status !== "won") return 1;
        return b.id - a.id; 
      });

      setGuests(sortedGuests);
      setTotalEntries(sortedGuests.length);
      setEligibleCount(sortedGuests.filter((g) => g.status === "eligible").length);
      setWinnersCount(sortedGuests.filter((g) => g.status === "won").length);

      const missingProof = sortedGuests.find(g => g.status === "won" && !g.proof_url);
      setPendingProofGuest(missingProof || null);
    }

    const { data: prizeData, error: prizeError } = await supabase
        .from("prizes")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "unclaimed")
        .order("draw_order", { ascending: true });
        
    if (prizeError && prizeError.code !== "42P01") console.error("Error:", prizeError);
    else if (prizeData) { setUnclaimedPrizes(prizeData); }
    
    setLoading(false);
  };

  // 3. BULLETPROOF WEBSOCKET CONNECTION
  useEffect(() => {
    if (isAuthenticated && eventId) {
        fetchData();
        
        // ADDED ACK: TRUE to force Supabase to guarantee message delivery
        const raffleChannel = supabase.channel(`raffle_${eventId}`, {
            config: { broadcast: { ack: true } }
        });

        // RACE CONDITION FIX: Do not activate the channel until Supabase says 'SUBSCRIBED'
        raffleChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                setChannel(raffleChannel);
            }
        });

        return () => { supabase.removeChannel(raffleChannel); };
    }
  }, [isAuthenticated, eventId]);

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (timerStatus === "running" && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          const next = prev - 1;
          if (channel) channel.send({ type: "broadcast", event: "timer_sync", payload: { time: next, status: "running" } });
          return next;
        });
      }, 1000);
    } else if (timer === 0 && timerStatus === "running") {
      setTimerStatus("paused"); 
      if (channel) channel.send({ type: "broadcast", event: "timer_sync", payload: { time: 0, status: "idle" } });
    }
    return () => clearInterval(interval);
  }, [timerStatus, timer, channel]);

  // LOGIN HANDLER
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventPasscode && passcodeInput.toUpperCase() === eventPasscode.toUpperCase()) {
      sessionStorage.setItem(`host_auth_${eventId}`, "true"); 
      setIsAuthenticated(true);
    } else {
      setAuthError("Incorrect passcode!");
      setPasscodeInput("");
    }
  };

  const pauseTimer = () => { setTimerStatus("paused"); channel?.send({ type: "broadcast", event: "timer_sync", payload: { time: timer, status: "paused" }}); };
  const resumeTimer = () => { setTimerStatus("running"); channel?.send({ type: "broadcast", event: "timer_sync", payload: { time: timer, status: "running" }}); };

  // CLEANED UP BUGGY PAYLOAD (Now handles Roulette)
  const changeScreen = async (mode: "pregame" | "raffle" | "games" | "qr" | "roulette") => {
    setActiveScreen(mode);
    if (channel) {
        await channel.send({ type: "broadcast", event: "set_display", payload: { mode: mode } });
    }
    // Also save roulette state to database so late joiners see it
    if (eventId) {
      await supabase.from('raffle_config').update({ show_roulette: mode === "roulette" }).eq('event_id', eventId);
    }
  };

  const playSound = async (soundFile: string) => {
    if (channel) await channel.send({ type: "broadcast", event: "play_sound", payload: { sound: soundFile } });
  };

  const handleDemoReset = async () => {
    if (!window.confirm("🚨 WARNING: Reset all winners AND prizes back to 'Eligible/Unclaimed'?")) return;
    setLoading(true);
    await supabase.from("guests").update({ status: "eligible", prize_won: null, proof_url: null }).eq("event_id", eventId).eq("status", "won");
    await supabase.from("prizes").update({ status: "unclaimed" }).eq("event_id", eventId).eq("status", "claimed");
    await supabase.from("games").update({ status: "pending", proof_url: null }).eq("event_id", eventId).neq("id", 0);

    setPrizeDisplayed(false);
    setTimerStatus("idle");
    fetchData();
  };

  const currentPrize = unclaimedPrizes.length > 0 ? unclaimedPrizes[0] : null;

  const handleShowPrize = async () => {
    if (!currentPrize) return alert("⚠️ No prizes available in the queue!");
    playSound("dj-2.mp3"); 
    setActiveScreen("raffle");
    setPrizeDisplayed(true);
    if (channel) await channel.send({ type: "broadcast", event: "show_prize", payload: { prize: currentPrize.name } });
  };

  const handleSpin = async () => {
    if (!prizeDisplayed && activeScreen !== "roulette") return alert("⚠️ You must Display the Prize on the TV first!");
    if (!currentPrize) return alert("⚠️ The prize queue is empty!");
    
    const prizeCat = currentPrize.category || "All";

    const eligiblePool = guests.filter((g) => {
        const isEligible = g.status === "eligible";
        const isNotHost = g.referral?.toLowerCase() !== "host";
        
        let matchesTarget = false;
        if (prizeCat === "All") {
            matchesTarget = true;
        } else if (prizeCat.includes(" - ")) {
            const [targetRef, targetCat] = prizeCat.split(" - ");
            matchesTarget = (g.referral === targetRef) && (g.category === targetCat);
        } else {
            matchesTarget = (g.category === prizeCat) || (g.referral === prizeCat);
        }

        return isEligible && isNotHost && matchesTarget;
    });

    if (eligiblePool.length === 0) return alert(`⚠️ No eligible guests found for target pool: ${prizeCat}!`);

    const winner = eligiblePool[Math.floor(Math.random() * eligiblePool.length)];

    const { error: guestError } = await supabase.from("guests").update({ status: "won", prize_won: currentPrize.name }).eq("id", winner.id);
    if (guestError) return alert("❌ Error updating winner.");
    await supabase.from("prizes").update({ status: "claimed" }).eq("id", currentPrize.id);

    playSound("dj-4.mp3"); 
    
    setTimeout(() => { 
        playSound("dj-1.mp3"); 
        setTimer(60);
        setTimerStatus("running");
        if (channel) channel.send({ type: "broadcast", event: "timer_sync", payload: { time: 60, status: "running" } });
    }, 5500); 

    setActiveScreen("raffle");
    setPrizeDisplayed(false);
    
    if (channel) await channel.send({ type: "broadcast", event: "spin", payload: { winner, prize: currentPrize.name, prizeCategory: prizeCat } });
    fetchData(); 
  };

  const handleUploadProof = async (guestId: number, file: File) => {
    try {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `proofs/proof-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("guest-photos").upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from("guest-photos").getPublicUrl(filePath);
      const { error: updateError } = await supabase.from("guests").update({ proof_url: urlData.publicUrl }).eq("id", guestId);
      if (updateError) throw updateError;
      
      alert("✅ Proof saved successfully!");
      setTimerStatus("idle");
      fetchData(); 
    } catch (error: any) { 
      alert("❌ Error: " + error.message); 
      setLoading(false);
    }
  };

  const handleUploadGameProof = async (gameId: number, file: File) => {
    try {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `game-proofs/proof-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("guest-photos").upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from("guest-photos").getPublicUrl(filePath);

      setGames(prev => prev.map(g => g.id === gameId ? { ...g, proof_url: urlData.publicUrl, status: "done" } : g));

      const { error: updateError } = await supabase.from("games").update({ proof_url: urlData.publicUrl, status: "done" }).eq("id", gameId);
      if (updateError) throw updateError;
      
      alert("✅ Game Winner Photo saved & Game Locked!");
      fetchData(); 
    } catch (error: any) { 
      alert("❌ Error: " + error.message); 
      setLoading(false);
    }
  };

  const handleForfeit = async () => {
      if (!pendingProofGuest || !window.confirm(`Are you sure you want to FORFEIT the prize for ${pendingProofGuest.nickname}? This will return the prize to the pool.`)) return;
      
      setLoading(true);
      await supabase.from("guests").update({ status: "eligible", prize_won: null }).eq("id", pendingProofGuest.id);
      await supabase.from("prizes").update({ status: "unclaimed" }).eq("name", pendingProofGuest.prize_won).eq("event_id", eventId);
      
      setTimerStatus("idle");
      if (channel) await channel.send({ type: "broadcast", event: "reset" });
      fetchData();
  };

  if (invalidEvent) return <div className="fixed inset-0 bg-black flex items-center justify-center text-red-500 text-4xl font-black uppercase">Event Not Found</div>;

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans z-[999]">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border-8 border-blue-500 animate-in zoom-in duration-300">
          <div className="text-6xl mb-4 animate-bounce">🔐</div>
          <h1 className="text-2xl font-black text-gray-800 uppercase mb-2 leading-none">Restricted Access</h1>
          <p className="text-gray-500 font-bold text-xs mb-6">Enter the host passcode to continue.</p>
          {authError && <div className="bg-red-50 text-red-600 border-2 border-red-200 p-2 rounded-xl font-black text-xs mb-4 animate-bounce">{authError}</div>}
          <input type="password" value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} className="w-full text-center text-3xl font-black p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl mb-4 focus:border-blue-500 outline-none uppercase tracking-widest placeholder:text-gray-300" placeholder="•••••" />
          <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl uppercase transition-all active:scale-95 shadow-xl">Unlock Dashboard</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-gray-100 font-sans">
      <div className="w-[85%] p-4 md:p-8 overflow-y-auto pb-20 flex flex-col items-center">
        <div className="w-full max-w-5xl space-y-6">
          
          <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-gray-200">
            <h1 className="text-3xl font-black text-blue-600 uppercase text-center tracking-widest">🎤 Emcee Director</h1>
          </div>

          <ProjectorControl 
            activeScreen={activeScreen} 
            changeScreen={changeScreen} 
            channel={channel} 
            setPrizeDisplayed={setPrizeDisplayed} 
            setTimerStatus={setTimerStatus} 
          />

          {/* NEW SAAS FEATURE: Roulette Wheel Trigger */}
          <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-gray-200 text-center">
             <button 
                onClick={() => changeScreen(activeScreen === "roulette" ? "raffle" : "roulette")} 
                className={`px-8 py-4 rounded-xl font-black text-xl shadow-xl transition-all ${activeScreen === "roulette" ? "bg-red-600 text-white hover:bg-red-700" : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"}`}
             >
                {activeScreen === "roulette" ? "🛑 Close Roulette Wheel" : "🎡 Send Roulette to Projector"}
             </button>
          </div>

          {activeScreen === "games" && (
            <GamesControl 
              games={games} 
              playSound={playSound} 
              channel={channel} 
              handleUploadGameProof={handleUploadGameProof} 
            />
          )}

          {activeScreen === "raffle" && (
            <>
              <RaffleControl 
                totalEntries={totalEntries} 
                eligibleCount={eligibleCount} 
                winnersCount={winnersCount} 
                pendingProofGuest={pendingProofGuest} 
                timerStatus={timerStatus} 
                timer={timer} 
                currentPrize={currentPrize} 
                prizeDisplayed={prizeDisplayed} 
                handleShowPrize={handleShowPrize} 
                handleSpin={handleSpin} 
                pauseTimer={pauseTimer} 
                resumeTimer={resumeTimer} 
                handleForfeit={handleForfeit} 
                setTimerStatus={setTimerStatus} 
                handleDemoReset={handleDemoReset} 
              />

              <GuestRoster 
                loading={loading} 
                guests={guests} 
                pendingProofGuest={pendingProofGuest} 
                handleUploadProof={handleUploadProof} 
                fetchData={fetchData} 
              />
            </>
          )}
        </div>
      </div>

      <DjBoard playSound={playSound} />
    </div>
  );
}