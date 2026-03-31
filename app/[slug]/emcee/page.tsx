"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

import DjBoard from "../../../components/emcee/DjBoard";
import ProjectorControl from "../../../components/emcee/ProjectorControl";
import GamesControl from "../../../components/emcee/GamesControl";
import RaffleControl from "../../../components/emcee/RaffleControl";
import GuestRoster from "../../../components/emcee/GuestRoster";

// NEW SAAS FEATURE: Import Programme Tab
import ProgrammeTab from "../../../components/emcee/ProgrammeTab";

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
  
  // NEW SAAS FEATURE: Programme State
  const [programmeItems, setProgrammeItems] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);

  const [totalEntries, setTotalEntries] = useState(0);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [winnersCount, setWinnersCount] = useState(0);
  
  const [prizeDisplayed, setPrizeDisplayed] = useState(false);
  
  // UPDATED: Added "programme" to allowed types
  const [activeScreen, setActiveScreen] = useState<"pregame"|"raffle"|"games"|"qr"|"programme">("raffle");

  const [timer, setTimer] = useState(60);
  const [timerStatus, setTimerStatus] = useState<"idle" | "running" | "paused">("idle");
  const [pendingProofGuest, setPendingProofGuest] = useState<any>(null);

  useEffect(() => {
    const fetchEventData = async () => {
      const { data: eventData } = await supabase.from("events").select("id, passcode").eq("slug", eventSlug).single();
      if (!eventData) { setInvalidEvent(true); return; }
      setEventId(eventData.id);
      setEventPasscode(eventData.passcode);
      if (sessionStorage.getItem(`host_auth_${eventData.id}`) === "true") setIsAuthenticated(true);
    };
    if (eventSlug) fetchEventData();
  }, [eventSlug]);

  const fetchData = async () => {
    if (!eventId) return;
    setLoading(true);
    const { data: guestData } = await supabase.from("guests").select("*").eq("event_id", eventId); 
    const { data: rsvpData } = await supabase.from("rsvps").select("*").eq("event_id", eventId); 
    
    // UPDATED: Fetch Games AND Programme
    const { data: gameData } = await supabase.from("games").select("*").eq("event_id", eventId).order("id", { ascending: true });
    const { data: programmeData } = await supabase.from("programme_items").select("*").eq("event_id", eventId).order("order_index", { ascending: true });

    if (gameData) setGames(gameData);
    if (programmeData) setProgrammeItems(programmeData);

    if (guestData) {
      const rsvpList = rsvpData || []; 
      const guestsToUpdate: number[] = [];

      const mappedGuests = [...guestData].map(g => {
          const rsvp = rsvpList.find(r => r.full_name === g.full_name);
          const ref = g.referral ? g.referral : (rsvp ? (rsvp.referral || "") : "");
          let currentStatus = g.status;
          if (ref.toLowerCase() === "host" && currentStatus === "eligible") {
              guestsToUpdate.push(g.id);
              currentStatus = "ineligible";
          }
          return { ...g, referral: ref, status: currentStatus };
      });

      if (guestsToUpdate.length > 0) supabase.from("guests").update({ status: "ineligible" }).in("id", guestsToUpdate).then();

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

    const { data: prizeData } = await supabase.from("prizes").select("*").eq("event_id", eventId).eq("status", "unclaimed").order("draw_order", { ascending: true });
    if (prizeData) setUnclaimedPrizes(prizeData);
    setLoading(false);
  };

  // NEW SAAS FEATURE: Helper for Programme DB actions
  const executeDbAction = async (action: any) => {
    const { error } = await action;
    if (error) { alert("🚨 Database Error: " + error.message); console.error(error); }
    fetchData();
  };

  useEffect(() => {
    if (isAuthenticated && eventId) {
        fetchData();
        const raffleChannel = supabase.channel(`raffle_${eventId}`, { config: { broadcast: { ack: true } } });
        raffleChannel.subscribe((status) => { if (status === 'SUBSCRIBED') setChannel(raffleChannel); });
        return () => { supabase.removeChannel(raffleChannel); };
    }
  }, [isAuthenticated, eventId]);

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventPasscode && passcodeInput.toUpperCase() === eventPasscode.toUpperCase()) {
      sessionStorage.setItem(`host_auth_${eventId}`, "true"); 
      setIsAuthenticated(true);
    } else {
      setAuthError("Incorrect passcode!"); setPasscodeInput("");
    }
  };

  const pauseTimer = () => { setTimerStatus("paused"); channel?.send({ type: "broadcast", event: "timer_sync", payload: { time: timer, status: "paused" }}); };
  const resumeTimer = () => { setTimerStatus("running"); channel?.send({ type: "broadcast", event: "timer_sync", payload: { time: timer, status: "running" }}); };

  // UPDATED: Added programme to type signature
  const changeScreen = async (mode: "pregame" | "raffle" | "games" | "qr" | "programme") => {
    setActiveScreen(mode);
    // Note: Programme doesn't send anything to the TV, it's just for the Emcee!
    if (mode !== "programme" && channel) await channel.send({ type: "broadcast", event: "set_display", payload: { mode: mode } });
  };

  const playSound = async (soundFile: string) => { if (channel) await channel.send({ type: "broadcast", event: "play_sound", payload: { sound: soundFile } }); };

  const handleDemoReset = async () => {
    if (!window.confirm("🚨 WARNING: Reset all winners AND prizes back to 'Eligible/Unclaimed'?")) return;
    setLoading(true);
    await supabase.from("guests").update({ status: "eligible", prize_won: null, proof_url: null }).eq("event_id", eventId).eq("status", "won");
    await supabase.from("prizes").update({ status: "unclaimed" }).eq("event_id", eventId).eq("status", "claimed");
    await supabase.from("games").update({ status: "pending", proof_url: null }).eq("event_id", eventId).neq("id", 0);
    setPrizeDisplayed(false); setTimerStatus("idle"); fetchData();
  };

  const currentPrize = unclaimedPrizes.length > 0 ? unclaimedPrizes[0] : null;

  const handleShowPrize = async () => {
    if (!currentPrize) return alert("⚠️ No prizes available in the queue!");
    playSound("dj-2.mp3"); setActiveScreen("raffle"); setPrizeDisplayed(true);
    if (channel) await channel.send({ type: "broadcast", event: "show_prize", payload: { prize: currentPrize.name } });
  };

  const handleSpin = async () => {
    if (!prizeDisplayed) return alert("⚠️ You must Display the Prize on the TV first!");
    if (!currentPrize) return alert("⚠️ The prize queue is empty!");
    
    const prizeCat = currentPrize.category || "All";
    const eligiblePool = guests.filter((g) => {
        const isEligible = g.status === "eligible";
        const isNotHost = g.referral?.toLowerCase() !== "host";
        let matchesTarget = prizeCat === "All" || (prizeCat.includes(" - ") ? g.referral === prizeCat.split(" - ")[0] && g.category === prizeCat.split(" - ")[1] : g.category === prizeCat || g.referral === prizeCat);
        return isEligible && isNotHost && matchesTarget;
    });

    if (eligiblePool.length === 0) return alert(`⚠️ No eligible guests found for target pool: ${prizeCat}!`);
    const winner = eligiblePool[Math.floor(Math.random() * eligiblePool.length)];

    await supabase.from("guests").update({ status: "won", prize_won: currentPrize.name }).eq("id", winner.id);
    await supabase.from("prizes").update({ status: "claimed" }).eq("id", currentPrize.id);

    playSound("dj-4.mp3"); 
    setTimeout(() => { 
        playSound("dj-1.mp3"); setTimer(60); setTimerStatus("running");
        if (channel) channel.send({ type: "broadcast", event: "timer_sync", payload: { time: 60, status: "running" } });
    }, 5500); 

    setActiveScreen("raffle"); setPrizeDisplayed(false);
    if (channel) await channel.send({ type: "broadcast", event: "spin", payload: { winner, prize: currentPrize.name, prizeCategory: prizeCat } });
    fetchData(); 
  };

  const handleUploadProof = async (guestId: number, file: File) => {
    try {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `proofs/proof-${Date.now()}.${fileExt}`;
      await supabase.storage.from("guest-photos").upload(filePath, file);
      const { data: urlData } = supabase.storage.from("guest-photos").getPublicUrl(filePath);
      await supabase.from("guests").update({ proof_url: urlData.publicUrl }).eq("id", guestId);
      alert("✅ Proof saved successfully!"); setTimerStatus("idle"); fetchData(); 
    } catch (error: any) { alert("❌ Error: " + error.message); setLoading(false); }
  };

  const handleUploadGameProof = async (gameId: number, file: File) => {
    try {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `game-proofs/proof-${Date.now()}.${fileExt}`;
      await supabase.storage.from("guest-photos").upload(filePath, file);
      const { data: urlData } = supabase.storage.from("guest-photos").getPublicUrl(filePath);
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, proof_url: urlData.publicUrl, status: "done" } : g));
      await supabase.from("games").update({ proof_url: urlData.publicUrl, status: "done" }).eq("id", gameId);
      alert("✅ Game Winner Photo saved & Game Locked!"); fetchData(); 
    } catch (error: any) { alert("❌ Error: " + error.message); setLoading(false); }
  };

  const handleForfeit = async () => {
      if (!pendingProofGuest || !window.confirm(`Are you sure you want to FORFEIT the prize for ${pendingProofGuest.nickname}?`)) return;
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

          <ProjectorControl activeScreen={activeScreen} changeScreen={changeScreen} channel={channel} setPrizeDisplayed={setPrizeDisplayed} setTimerStatus={setTimerStatus} />

          {/* NEW SAAS FEATURE: Programme Tab rendering */}
          {activeScreen === "programme" && (
            <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-gray-200 animate-in slide-in-from-bottom-4 duration-300">
                <ProgrammeTab eventId={eventId} items={programmeItems} fetchData={fetchData} executeDbAction={executeDbAction} />
            </div>
          )}

          {activeScreen === "games" && <GamesControl games={games} playSound={playSound} channel={channel} handleUploadGameProof={handleUploadGameProof} />}

          {activeScreen === "raffle" && (
            <>
              <RaffleControl 
                totalEntries={totalEntries} eligibleCount={eligibleCount} winnersCount={winnersCount} pendingProofGuest={pendingProofGuest} 
                timerStatus={timerStatus} timer={timer} currentPrize={currentPrize} prizeDisplayed={prizeDisplayed} 
                handleShowPrize={handleShowPrize} handleSpin={handleSpin} pauseTimer={pauseTimer} resumeTimer={resumeTimer} 
                handleForfeit={handleForfeit} setTimerStatus={setTimerStatus} handleDemoReset={handleDemoReset} 
                isEvaluatingWinner={pendingProofGuest !== null}
              />
              <GuestRoster loading={loading} guests={guests} pendingProofGuest={pendingProofGuest} handleUploadProof={handleUploadProof} fetchData={fetchData} />
            </>
          )}
        </div>
      </div>
      <DjBoard playSound={playSound} />
    </div>
  );
}