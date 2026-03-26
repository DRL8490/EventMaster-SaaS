"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient"; 

const capitalizeWords = (str: string) => str.replace(/\b\w/g, (c) => c.toUpperCase());

export default function RsvpPage() {
  const params = useParams();
  const eventSlug = params.slug;

  const [eventId, setEventId] = useState<number | null>(null);
  const [eventName, setEventName] = useState("");
  const [invalidEvent, setInvalidEvent] = useState(false);

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [category, setCategory] = useState("Adults"); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [bgImageUrl, setBgImageUrl] = useState(""); 
  const [isRsvpOpen, setIsRsvpOpen] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // 1. GET THE EVENT ID & NAME (Runs only once)
  useEffect(() => {
    const fetchEventId = async () => {
      const { data: eventData } = await supabase
        .from("events")
        .select("id, name")
        .eq("slug", eventSlug)
        .single();

      if (!eventData) {
        setInvalidEvent(true);
        setLoadingConfig(false);
        return;
      }
      setEventId(eventData.id);
      setEventName(eventData.name);
    };

    if (eventSlug) fetchEventId();
  }, [eventSlug]);

  // 2. FETCH CONFIG & SUBSCRIBE (Runs after we have the eventId)
  useEffect(() => {
    if (!eventId) return;

    const fetchConfig = async () => {
      const { data } = await supabase.from("raffle_config").select("portrait_url, rsvp_open").eq("event_id", eventId).single();
      if (data) {
          setBgImageUrl(data.portrait_url || "");
          setIsRsvpOpen(data.rsvp_open !== false); 
      }
      setLoadingConfig(false);
    };
    fetchConfig();

    // SAAS WEBSOCKET: Listen only for this specific event's config changes
    const subscription = supabase.channel(`config_${eventId}`).on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "raffle_config",
        filter: `event_id=eq.${eventId}`
    }, (payload: any) => {
        if (payload.new.rsvp_open !== undefined) {
            setIsRsvpOpen(payload.new.rsvp_open);
        }
    }).subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    if (!eventId) return;

    try {
      // SAAS INSERT: Tag the RSVP with the correct eventId!
      const { error } = await supabase.from("rsvps").insert([
        { event_id: eventId, full_name: fullName, nickname: nickname, category: category },
      ]);
      
      if (error) throw error;
      setIsSuccess(true);
    } catch (error: any) { 
      setErrorMessage(error.message); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  if (loadingConfig) return <div className="fixed inset-0 w-full flex items-center justify-center bg-gray-50"><p className="font-black text-blue-600 animate-pulse uppercase tracking-widest text-xl">Loading...</p></div>;

  if (invalidEvent) return (
    <div className="fixed inset-0 w-full flex flex-col items-center justify-center p-6 bg-gray-900 text-center">
      <div className="bg-black/60 backdrop-blur-lg p-8 rounded-[2rem] border border-red-500/50 shadow-2xl">
        <h1 className="text-5xl mb-4">⚠️</h1>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Event Not Found</h2>
        <p className="text-gray-400 mt-2 font-bold text-sm">Check the URL and try again.</p>
      </div>
    </div>
  );

  // The Bouncer: Block access if RSVPs are closed
  if (!isSuccess && !isRsvpOpen) {
    return (
      <div className="fixed inset-0 w-full flex flex-col items-center justify-center p-6 bg-gray-900 text-center">
        <div className="bg-black/60 backdrop-blur-lg p-8 rounded-[2rem] border border-white/20 shadow-2xl">
            <h1 className="text-5xl mb-4">🚫</h1>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">RSVP Closed</h2>
            <p className="text-gray-300 mt-2 font-bold text-sm">We are no longer accepting online RSVPs for {eventName}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-gray-900 flex flex-col overflow-hidden font-sans"> 
      {isSuccess ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-4" style={{ backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none', backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl border-4 border-green-400 text-center animate-in zoom-in duration-500 max-w-sm w-full flex flex-col items-center">
            <h2 className="text-2xl font-black text-green-600 uppercase leading-none mb-4">RSVP Confirmed!</h2>
            <div className="text-6xl mb-4 animate-bounce">💌</div>
            
            {/* DYNAMIC EVENT NAME IN SUCCESS MESSAGE */}
            <p className="text-gray-600 font-bold mb-6 text-sm">Your name is on the VIP list. We can't wait to celebrate {eventName} with you!</p>
            
            <button onClick={() => { setIsSuccess(false); setFullName(""); setNickname(""); setCategory("Adults"); }} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black text-sm uppercase shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              ➕ RSVP NEXT GUEST
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 w-full flex flex-col justify-between px-4 py-6" style={{ backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none', backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="text-center shrink-0 mb-4 pt-4">
            
            {/* DYNAMIC EVENT NAME ON FORM */}
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{eventName}</h1>
            
            <p className="text-yellow-300 font-black mt-2 uppercase tracking-widest text-xs drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Pre-Event RSVP Form</p>
          </div>
          
          {errorMessage && <div className="bg-red-50 border-2 border-red-300 text-red-600 p-3 rounded-xl font-black text-center animate-bounce shadow-lg text-xs shrink-0 mb-2">{errorMessage}</div>}

          <div className="flex-1 min-h-0 flex flex-col justify-center space-y-4 max-w-sm mx-auto w-full pb-4">
            <div>
              <label className="block text-xs font-black text-white uppercase mb-1 ml-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Full Name</label>
              <input required type="text" placeholder="e.g. Noel Brita" className="w-full p-4 bg-white/95 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-gray-800 text-base shadow-lg" value={fullName} onChange={(e) => setFullName(capitalizeWords(e.target.value))} />
            </div>
            
            <div>
              <label className="block text-xs font-black text-white uppercase mb-1 ml-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Preferred Nickname</label>
              <input required type="text" placeholder="e.g. Noel" className="w-full p-4 bg-white/95 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-gray-800 text-base shadow-lg" value={nickname} onChange={(e) => setNickname(capitalizeWords(e.target.value))} />
            </div>
            
            <div>
              <label className="block text-xs font-black text-white uppercase mb-1 ml-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Category</label>
              <select className="w-full p-4 bg-white/95 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-gray-800 text-base shadow-lg appearance-none cursor-pointer" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Adults">Adults</option>
                  <option value="Teens">Teens</option>
                  <option value="Kids">Kids</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className={`w-full max-w-sm mx-auto mt-2 py-4 rounded-full text-base font-black text-white shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-2 shrink-0 ${isSubmitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 border-2 border-blue-400"}`}>
            {isSubmitting ? "SAVING..." : "SUBMIT RSVP"}
          </button>
        </form>
      )}
    </div>
  );
}