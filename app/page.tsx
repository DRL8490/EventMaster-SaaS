"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function SuperAdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");
  
  const MASTER_PASSCODE = "FOUNDER2026"; 

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [compilingId, setCompilingId] = useState<number | null>(null);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [newClientEmail, setNewClientEmail] = useState(""); // NEW: Client Email State
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("super_admin_auth") === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcodeInput === MASTER_PASSCODE) {
      sessionStorage.setItem("super_admin_auth", "true");
      setIsAuthenticated(true);
    } else {
      setAuthError("Incorrect master passcode!");
      setPasscodeInput("");
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    if (data) setEvents(data);
    if (error) console.error("Error fetching events:", error);
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) fetchEvents();
  }, [isAuthenticated]);

  const handleSlugFormat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setNewSlug(formatted);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError("");

    try {
      // NEW: Added client_email to the insert payload
      const { data: newEvent, error: eventError } = await supabase
        .from("events")
        .insert([{ name: newName, slug: newSlug, passcode: newPasscode, client_email: newClientEmail || null }])
        .select()
        .single();

      if (eventError) {
        if (eventError.code === '23505') throw new Error("An event with that URL slug already exists!");
        throw eventError;
      }

      const { error: configError } = await supabase.from("raffle_config").insert([{ event_id: newEvent.id }]);
      if (configError) throw configError;

// TRIGGER EMAIL AUTOMATION
      const emailResponse = await fetch('/api/send-event-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventName: newName,
          eventSlug: newSlug,
          clientEmail: newClientEmail,
          passcode: newPasscode
        }),
      });

      if (!emailResponse.ok) {
        console.error("Database succeeded, but Email failed to send.");
      }

  const handleDeleteEvent = async (eventId: number, eventName: string) => {
    if (!window.confirm(`🚨 WARNING: Are you sure you want to completely delete "${eventName}"?`)) return;
    if (!window.confirm(`FINAL CHECK: This will permanently erase ALL guests, winners, settings, and RSVPs for this event. This CANNOT be undone. Proceed?`)) return;

    try {
      setLoading(true);
      await supabase.from("rsvps").delete().eq("event_id", eventId);
      await supabase.from("guests").delete().eq("event_id", eventId);
      await supabase.from("prizes").delete().eq("event_id", eventId);
      await supabase.from("games").delete().eq("event_id", eventId);
      await supabase.from("suppliers").delete().eq("event_id", eventId);
      await supabase.from("raffle_config").delete().eq("event_id", eventId);
      
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      
      fetchEvents();
    } catch (error: any) {
      alert("Error deleting event: " + error.message);
      setLoading(false);
    }
  };

  const handleCompileData = async (eventId: number, eventName: string) => {
    setCompilingId(eventId);
    try {
      const { data: guests } = await supabase.from("guests").select("*").eq("event_id", eventId).order("id", { ascending: true });
      const { data: games } = await supabase.from("games").select("*").eq("event_id", eventId).order("id", { ascending: true });
      
      let csvContent = "--- EVENT MASTER POST-EVENT REPORT ---\n\n";
      
      csvContent += "--- GUEST REGISTRY & WINNERS ---\n";
      csvContent += "Name,Nickname,Category,Status,Prize Won,Photo Link\n";
      if (guests && guests.length > 0) {
        guests.forEach(g => {
          const name = `"${g.full_name || ''}"`;
          const nickname = `"${g.nickname || ''}"`;
          const prize = `"${g.prize_won || ''}"`;
          const photo = `"${g.proof_url || g.photo_url || ''}"`; 
          csvContent += `${name},${nickname},${g.category},${g.status},${prize},${photo}\n`;
        });
      } else {
        csvContent += "No guests checked in.\n";
      }
      
      csvContent += "\n--- GAME RESULTS ---\n";
      csvContent += "Game Name,Status,Winner Photo Link\n";
      if (games && games.length > 0) {
        games.forEach(g => {
          const name = `"${g.name || ''}"`;
          const photo = `"${g.proof_url || ''}"`;
          csvContent += `${name},${g.status},${photo}\n`;
        });
      } else {
        csvContent += "No games played.\n";
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${eventName.replace(/\s+/g, '_')}_Master_Report.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error: any) {
      alert("Error compiling data: " + error.message);
    } finally {
      setCompilingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans z-[999]">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border-8 border-purple-500 animate-in zoom-in duration-300">
          <div className="text-6xl mb-4 animate-bounce">👑</div>
          <h1 className="text-2xl font-black text-gray-800 uppercase mb-2 leading-none">Super Admin</h1>
          <p className="text-gray-500 font-bold text-xs mb-6">Enter the master platform passcode.</p>
          {authError && <div className="bg-red-50 text-red-600 border-2 border-red-200 p-2 rounded-xl font-black text-xs mb-4 animate-bounce">{authError}</div>}
          <input type="password" value={passcodeInput} onChange={(e) => setPasscodeInput(e.target.value)} className="w-full text-center text-3xl font-black p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl mb-4 focus:border-purple-500 outline-none uppercase tracking-widest placeholder:text-gray-300" placeholder="•••••" />
          <button type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-2xl uppercase transition-all active:scale-95 shadow-xl">Enter God Mode</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="bg-gray-900 rounded-[3rem] shadow-2xl p-8 md:p-12 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest drop-shadow-lg relative z-10">Party Master SaaS</h1>
          <p className="text-purple-300 font-bold uppercase tracking-widest mt-2 relative z-10">Global Platform Dashboard</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CREATE NEW EVENT FORM */}
          <div className="lg:col-span-1 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border-4 border-purple-100 h-fit">
            <h2 className="text-2xl font-black text-purple-600 uppercase mb-6 tracking-widest">➕ New Event</h2>
            
            <form onSubmit={handleCreateEvent} className="space-y-4">
              {createError && <div className="bg-red-50 text-red-600 border-2 border-red-200 p-3 rounded-xl font-black text-xs animate-bounce">{createError}</div>}
              
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Event Name</label>
                <input required type="text" placeholder="e.g. Acme Corp Holiday" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-purple-500 outline-none transition-all font-bold text-gray-800" />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Client Email</label>
                <input required type="email" placeholder="client@email.com" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-purple-500 outline-none transition-all font-bold text-gray-800" />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">URL Slug</label>
                <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-2xl focus-within:border-purple-500 transition-all overflow-hidden">
                  <span className="pl-4 text-gray-400 font-bold text-sm">site.com/</span>
                  <input required type="text" placeholder="acme-party" value={newSlug} onChange={handleSlugFormat} className="w-full p-4 bg-transparent outline-none font-bold text-purple-600" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1 ml-1">Host Passcode</label>
                <input required type="text" placeholder="e.g. ACME2026" value={newPasscode} onChange={(e) => setNewPasscode(e.target.value.toUpperCase())} className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-purple-500 outline-none transition-all font-black text-gray-800 uppercase tracking-widest" />
              </div>

              <button type="submit" disabled={isCreating} className={`w-full py-4 rounded-2xl text-sm font-black text-white shadow-xl transition-all uppercase tracking-widest mt-2 ${isCreating ? "bg-gray-400" : "bg-purple-600 hover:bg-purple-700 active:scale-95"}`}>
                {isCreating ? "Spinning up Database..." : "Deploy Event"}
              </button>
            </form>
          </div>

          {/* ACTIVE EVENTS LIST */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-2xl font-black text-gray-800 uppercase mb-6 tracking-widest px-2">🚀 Active Tenants</h2>
            
            {loading ? (
              <div className="text-center p-12"><p className="text-purple-600 font-black animate-pulse uppercase tracking-widest">Loading Platform Data...</p></div>
            ) : events.length === 0 ? (
              <div className="bg-white p-12 rounded-[2.5rem] shadow-sm border-2 border-dashed border-gray-300 text-center">
                <p className="text-gray-400 font-bold uppercase">No events created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((event) => (
                  <div key={event.id} className="bg-white p-6 rounded-[2rem] shadow-lg border-2 border-gray-100 hover:border-purple-300 transition-colors group relative flex flex-col h-full">
                    
                    <div className="absolute top-4 right-4 bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">
                      ID: {event.id}
                    </div>

                    <h3 className="text-xl font-black text-gray-900 mb-1 pr-12 truncate">{event.name}</h3>
                    
                    {/* NEW: Full Vercel URL Display */}
                    <a href={`https://event-master-saas.vercel.app/${event.slug}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 font-bold text-xs mb-4 block truncate transition-colors">
                      https://event-master-saas.vercel.app/{event.slug}
                    </a>
                    
                    <div className="bg-gray-50 p-3 rounded-xl mb-4 border border-gray-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Passcode</p>
                      <p className="font-mono font-bold text-gray-700 tracking-widest">{event.passcode}</p>
                    </div>

                    {event.client_email && (
                      <p className="text-[10px] font-bold text-gray-400 mb-4 truncate">✉️ {event.client_email}</p>
                    )}

                    <div className="flex flex-col gap-2 mb-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quick Links</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Link href={`/${event.slug}`} target="_blank" className="text-center py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors">📺 Projector</Link>
                        <Link href={`/${event.slug}/guest`} target="_blank" className="text-center py-2 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold rounded-lg transition-colors">📱 Door</Link>
                        <Link href={`/${event.slug}/admin`} target="_blank" className="text-center py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors">⚙️ Admin</Link>
                        <Link href={`/${event.slug}/emcee`} target="_blank" className="text-center py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-xs font-bold rounded-lg transition-colors">🎤 Emcee</Link>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t-2 border-dashed border-gray-100 flex justify-between gap-2">
                        <button 
                            onClick={() => handleCompileData(event.id, event.name)} 
                            disabled={compilingId === event.id}
                            className="flex-1 bg-gray-800 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition-colors disabled:bg-gray-400"
                        >
                            {compilingId === event.id ? "⏳ Compiling..." : "📥 Compile Report"}
                        </button>
                        
                        <button 
                            onClick={() => handleDeleteEvent(event.id, event.name)} 
                            className="bg-red-50 hover:bg-red-500 text-red-500 hover:text-white text-sm font-black px-3 py-2 rounded-lg transition-colors"
                            title="Delete Event"
                        >
                            🗑️
                        </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}