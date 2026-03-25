"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

import StatusTab from "../../components/admin/StatusTab";
import RsvpsTab from "../../components/admin/RsvpsTab";
import GuestsTab from "../../components/admin/GuestsTab";
import PrizesTab from "../../components/admin/PrizesTab";
import SuppliersTab from "../../components/admin/SuppliersTab";
import BackgroundsTab from "../../components/admin/BackgroundsTab";
// FIXED: Added Games Component
import GamesTab from "../../components/admin/GamesTab";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");
  const CORRECT_PASSCODE = "NYLA4+1";

  useEffect(() => {
    if (sessionStorage.getItem("host_auth") === "true") setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput.toUpperCase() === CORRECT_PASSCODE) {
      sessionStorage.setItem("host_auth", "true");
      setIsAuthenticated(true);
    } else {
      setAuthError("Incorrect passcode!");
      setPasscodeInput("");
    }
  };

  const [activeTab, setActiveTab] = useState("games"); // Defaulting to games to test!
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");

  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [rsvpOpen, setRsvpOpen] = useState(true);
  const [schedule, setSchedule] = useState({ start: "", end: "" });
  const [bgUrls, setBgUrls] = useState({ portrait: "", landscape: "" });
  const [files, setFiles] = useState<{ portrait: File | null; landscape: File | null }>({ portrait: null, landscape: null });
  const [uploadingBg, setUploadingBg] = useState(false);

  const [guests, setGuests] = useState<any[]>([]);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  // FIXED: Added Games State
  const [games, setGames] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, eligible: 0, winners: 0 });

  // FIXED: Added Games to navigation tabs
  const tabs = [
    { id: "status", title: "🚧 Status" },
    { id: "rsvps", title: "💌 RSVPs" },
    { id: "guests", title: "📋 Live Roster" },
    { id: "prizes", title: "🎁 Prizes" },
    { id: "games", title: "🎲 Games" },
    { id: "suppliers", title: "📦 Suppliers" },
    { id: "backgrounds", title: "🖼️ Backgrounds" },
  ];

  const toLocalISO = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const fetchData = async () => {
    setLoading(true);
    setDbError("");

    // FIXED: Added games fetch
    const [configRes, guestRes, prizeRes, rsvpRes, supplierRes, gameRes] = await Promise.all([
        supabase.from("raffle_config").select("*").single(),
        supabase.from("guests").select("*"),
        supabase.from("prizes").select("*"),
        supabase.from("rsvps").select("*"),
        supabase.from("suppliers").select("*, supplier_payments(*)"),
        supabase.from("games").select("*").order("id", { ascending: true })
    ]);

    if (configRes.data) {
        setRegistrationOpen(configRes.data.entries_open);
        setRsvpOpen(configRes.data.rsvp_open !== false);
        setBgUrls({ portrait: configRes.data.portrait_url || "", landscape: configRes.data.landscape_url || "" });
        setSchedule({ start: toLocalISO(configRes.data.start_time), end: toLocalISO(configRes.data.end_time) });
    }

    if (guestRes.data && rsvpRes.data) {
        const rsvpList = rsvpRes.data;
        const guestsToUpdate: number[] = [];

        const mappedGuests = [...guestRes.data].sort((a, b) => a.id - b.id).map(g => {
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

        setGuests(mappedGuests);
        setStats({
            total: mappedGuests.length,
            eligible: mappedGuests.filter(g => g.status === "eligible").length,
            winners: mappedGuests.filter(g => g.status === "won").length
        });
    } else if (guestRes.error) {
        setDbError(guestRes.error.message);
    }

    if (prizeRes.data) setPrizes([...prizeRes.data].sort((a, b) => (a.draw_order || 0) - (b.draw_order || 0)));
    if (rsvpRes.data) setRsvps([...rsvpRes.data].sort((a, b) => b.id - a.id));
    if (supplierRes.data) setSuppliers([...supplierRes.data].sort((a, b) => b.id - a.id));
    if (gameRes.data) setGames(gameRes.data); // FIXED: Set games state

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const executeDbAction = async (action: any) => {
    const { error } = await action;
    if (error) { alert("🚨 Database Error: " + error.message); console.error("Full Error:", error); }
    fetchData();
  };

  const handleToggleRegistration = async () => {
    await executeDbAction(supabase.from("raffle_config").update({ entries_open: !registrationOpen }).eq("id", 1));
    setRegistrationOpen(!registrationOpen);
  };
  const handleToggleRsvp = async () => {
    await executeDbAction(supabase.from("raffle_config").update({ rsvp_open: !rsvpOpen }).eq("id", 1));
    setRsvpOpen(!rsvpOpen);
  };
  const handleSaveSchedule = async () => {
    const { error } = await supabase.from("raffle_config").update({
        start_time: schedule.start ? new Date(schedule.start).toISOString() : null,
        end_time: schedule.end ? new Date(schedule.end).toISOString() : null
    }).eq("id", 1);
    alert(error ? "❌ Error: " + error.message : "✅ Schedule Saved!");
  };
  const handleUpdateBackgrounds = async () => {
    setUploadingBg(true);
    try {
        const uploadFile = async (file: File | null, prefix: string) => {
            if (!file) return null;
            const name = `${prefix}-${Date.now()}.${file.name.split('.').pop()}`;
            await supabase.storage.from('backgrounds').upload(name, file);
            return supabase.storage.from('backgrounds').getPublicUrl(name).data.publicUrl;
        };
        const newLand = await uploadFile(files.landscape, 'landscape') || bgUrls.landscape;
        const newPort = await uploadFile(files.portrait, 'portrait') || bgUrls.portrait;
        await supabase.from("raffle_config").update({ landscape_url: newLand, portrait_url: newPort }).eq("id", 1);
        await supabase.channel("bg_sync").send({ type: "broadcast", event: "apply_bg", payload: { landscape: newLand, portrait: newPort } });
        setBgUrls({ landscape: newLand, portrait: newPort });
        setFiles({ portrait: null, landscape: null });
        alert("✅ Backgrounds Applied!");
    } catch (e: any) { alert("❌ Error: " + e.message); }
    finally { setUploadingBg(false); }
  };

  const uniqueReferrals = ["All", ...Array.from(new Set([...rsvps, ...guests].map((r: any) => r.referral).filter(Boolean))) as string[]];

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
    <div className="min-h-screen w-full bg-transparent p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl">
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border-2 border-gray-200">
          <h1 className="text-4xl font-black text-blue-600 uppercase text-center">⚙️ Admin Command Center</h1>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8 p-2 bg-white border-2 border-gray-200 rounded-[2rem] shadow-lg">
            {tabs.map(tab => (
                <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id)} 
                    className={`px-4 md:px-6 py-2 md:py-3 rounded-full font-black text-xs md:text-sm transition-all flex-grow text-center ${activeTab === tab.id ? "bg-blue-600 text-white shadow-xl scale-105" : "text-gray-500 hover:bg-blue-50"}`}
                >
                    {tab.title}
                </button>
            ))}
        </div>

        {dbError && <div className="bg-red-100 border-l-8 border-red-600 p-6 mb-6 rounded-xl shadow-md font-mono text-red-700">{dbError}</div>}

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-6 md:p-8 border-2 border-gray-200 min-h-[400px]">
            {loading ? <p className="text-center text-gray-500 font-bold py-10">Loading Data...</p> : (
                <>
                    {activeTab === "status" && <StatusTab registrationOpen={registrationOpen} rsvpOpen={rsvpOpen} schedule={schedule} setSchedule={setSchedule} handleToggleRegistration={handleToggleRegistration} handleToggleRsvp={handleToggleRsvp} handleSaveSchedule={handleSaveSchedule} />}
                    {activeTab === "rsvps" && <RsvpsTab rsvps={rsvps} fetchData={fetchData} executeDbAction={executeDbAction} uniqueReferrals={uniqueReferrals} />}
                    {activeTab === "guests" && <GuestsTab guests={guests} stats={stats} fetchData={fetchData} executeDbAction={executeDbAction} uniqueReferrals={uniqueReferrals} />}
                    {activeTab === "prizes" && <PrizesTab prizes={prizes} setPrizes={setPrizes} executeDbAction={executeDbAction} uniqueReferrals={uniqueReferrals} />}
                    
                    {/* FIXED: Drop in the Games tab */}
                    {activeTab === "games" && <GamesTab games={games} executeDbAction={executeDbAction} />}
                    
                    {activeTab === "suppliers" && <SuppliersTab suppliers={suppliers} executeDbAction={executeDbAction} />}
                    {activeTab === "backgrounds" && <BackgroundsTab bgUrls={bgUrls} files={files} setFiles={setFiles} handleUpdateBackgrounds={handleUpdateBackgrounds} uploadingBg={uploadingBg} />}
                </>
            )}
        </div>
      </div>
    </div>
  );
}