"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient"; 

const capitalizeWords = (str: string) => str.replace(/\b\w/g, (c) => c.toUpperCase());

export default function GuestPage() {
  const params = useParams();
  const eventSlug = params.slug; 
  const [eventId, setEventId] = useState<number | null>(null);
  const [invalidEvent, setInvalidEvent] = useState(false);

  const [fullName, setFullName] = useState("");
  const [nickname, setNickname] = useState("");
  const [category, setCategory] = useState("Adults"); 
  const [photo, setPhoto] = useState<File | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(""); 
  
  const [rsvpList, setRsvpList] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [bgImageUrl, setBgImageUrl] = useState(""); 
  const [schedule, setSchedule] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

  // 1. GET THE EVENT ID (Runs only once when the page loads)
  useEffect(() => {
    const fetchEventId = async () => {
      const { data: eventData } = await supabase
        .from("events")
        .select("id")
        .eq("slug", eventSlug)
        .single();

      if (!eventData) {
        setInvalidEvent(true);
        setLoadingConfig(false);
        return;
      }
      setEventId(eventData.id);
    };

    if (eventSlug) fetchEventId();
  }, [eventSlug]);

  // 2. FETCH DATA & SUBSCRIBE (Runs only AFTER we have the eventId)
  useEffect(() => {
    if (!eventId) return; // Wait until Phase 1 is done!

    const fetchPartyData = async () => {
      const { data: config } = await supabase.from("raffle_config").select("*").eq("event_id", eventId).single();
      if (config) {
        setIsRegistrationOpen(config.entries_open);
        setBgImageUrl(config.portrait_url || "");
        setSchedule({ start: config.start_time, end: config.end_time });
      }
      
      const [rsvpRes, guestRes] = await Promise.all([
        supabase.from("rsvps").select("*").eq("event_id", eventId),
        supabase.from("guests").select("full_name").eq("event_id", eventId)
      ]);

      if (rsvpRes.data && guestRes.data) {
        const liveGuestNames = guestRes.data.map(g => g.full_name.toLowerCase().trim().replace(/\s+/g, ' '));
        const availableRsvps = rsvpRes.data.filter(
          rsvp => !liveGuestNames.includes(rsvp.full_name.toLowerCase().trim().replace(/\s+/g, ' '))
        );
        setRsvpList(availableRsvps);
      }
      setLoadingConfig(false);
    };

    fetchPartyData();

    // Secure WebSocket strictly for this event
    const subscription = supabase.channel(`config_${eventId}`)
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "raffle_config",
        filter: `event_id=eq.${eventId}` 
      }, (payload: any) => {
          setIsRegistrationOpen(payload.new.entries_open);
          setSchedule({ start: payload.new.start_time, end: payload.new.end_time });
      }).subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [eventId]);

  const handleNameInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = capitalizeWords(e.target.value);
    setFullName(val);
    if (val.length > 1) {
      const matches = rsvpList.filter(r => r.full_name.toLowerCase().includes(val.toLowerCase().replace(/\s+/g, ' ')));
      setSuggestions(matches);
      setShowSuggestions(true);
    } else setShowSuggestions(false);
  };

  const selectRsvp = (rsvp: any) => {
    setFullName(rsvp.full_name);
    setNickname(rsvp.nickname);
    setCategory(rsvp.category);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    if (!eventId) return; 

    if (!photo) { 
      setErrorMessage("Please take a selfie first! 📸"); 
      setIsSubmitting(false); 
      return; 
    }

    const cleanFullName = fullName.trim().replace(/\s+/g, ' ');

    const { data: existingGuests } = await supabase
      .from("guests")
      .select("id")
      .eq("event_id", eventId) 
      .ilike("full_name", cleanFullName)
      .limit(1);

    if (existingGuests && existingGuests.length > 0) {
      setErrorMessage("🚨 Whoops! Someone with that exact Full Name has already checked in!");
      setIsSubmitting(false);
      return; 
    }

    try {
      const fileExt = photo.name.split(".").pop();
      const filePath = `selfies/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("guest-photos").upload(filePath, photo);
      if (uploadError) throw uploadError;

      const photoUrl = supabase.storage.from("guest-photos").getPublicUrl(filePath).data.publicUrl;
      setUploadedPhotoUrl(photoUrl); 

      const guestStatus = category === "Host" ? "ineligible" : "eligible";

      const { error: insertError } = await supabase.from("guests").insert([
        { event_id: eventId, full_name: cleanFullName, nickname: nickname.trim(), category: category, photo_url: photoUrl, status: guestStatus },
      ]);
      
      if (insertError) throw insertError;
      
      setRsvpList(prev => prev.filter(r => r.full_name.toLowerCase().trim().replace(/\s+/g, ' ') !== cleanFullName.toLowerCase()));
      
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

  if (!isSuccess && (!isRegistrationOpen || (schedule.start && new Date() < new Date(schedule.start)) || (schedule.end && new Date() > new Date(schedule.end)))) {
    return (
      <div className="fixed inset-0 w-full flex flex-col items-center justify-center p-6 bg-gray-900 text-center">
        <div className="bg-black/60 backdrop-blur-lg p-8 rounded-[2rem] border border-white/20 shadow-2xl"><h1 className="text-5xl mb-4">🚫</h1><h2 className="text-2xl font-black text-white uppercase tracking-tighter">Door Registration Closed</h2></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-gray-900 flex flex-col overflow-hidden font-sans"> 
      {isSuccess ? (
        <div className="flex-1 w-full flex flex-col items-center justify-center p-4" style={{ backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none', backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2.5rem] shadow-2xl border-4 border-green-400 text-center animate-in zoom-in duration-500 max-w-sm w-full flex flex-col items-center relative">
            <h2 className="text-2xl font-black text-green-600 uppercase leading-none mb-4">You're Checked In!</h2>
            
            {/* --- FIX START --- */}
            {/* New Parent Container (square) controls position and animation */}
            <div className="relative w-40 h-40 mx-auto animate-bounce mb-4 group">
              
              {/* 1. The Circular Bubble (keeps overflow-hidden for image and banner) */}
              <div className="w-full h-full rounded-full overflow-hidden border-8 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)] bg-white relative z-0">
                {/* Image fills the circle cleanly */}
                <img src={uploadedPhotoUrl} className="w-full h-full object-cover" alt="Your Bubble" />
                <div className="absolute bottom-0 w-full bg-black/60 backdrop-blur-sm text-white font-black text-center py-1 text-xs uppercase">{nickname}</div>
              </div>

              {/* 2. The Unclipped Watermark (positioned relative to the parent, floats on top) */}
              {/* This is z-10 so it's over the border, and uses negative top/left to "pin" it outside the main circle slightly. Added subtle tilt for magic! */}
              <div className="absolute -top-1 -left-1 bg-blue-600 text-white font-black px-2.5 py-1 rounded-full text-[10px] uppercase shadow-xl border-2 border-white z-10 transform -rotate-12 transition-transform group-hover:rotate-0">
                {category}
              </div>
                
              {/* Subtle sheen overlay on hover */}
              <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity z-0"></div>
            </div>
            {/* --- FIX END --- */}

            <p className="text-gray-600 font-bold mb-6 text-sm">Look for your bubble on the big screen!</p>
            <button onClick={() => { setIsSuccess(false); setFullName(""); setNickname(""); setCategory("Adults"); setPhoto(null); }} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black text-sm uppercase shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 relative z-20">
              ➕ CHECK IN NEXT GUEST
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 w-full flex flex-col justify-between px-4 py-6" style={{ backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none', backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="text-center shrink-0 mb-4 pt-4">
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Live Door Registration</h1>
          </div>
          
          {errorMessage && <div className="bg-red-50 border-2 border-red-300 text-red-600 p-3 rounded-xl font-black text-center animate-bounce shadow-lg text-xs shrink-0 mb-2">{errorMessage}</div>}

          <div className="flex-1 min-h-0 flex flex-col justify-center space-y-3 max-w-sm mx-auto w-full pb-4">
            <div className="relative">
              <label className="block text-[10px] font-black text-white uppercase mb-1 ml-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Search Your Name</label>
              <input required type="text" placeholder="Start typing..." className="w-full p-3 bg-white/95 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-gray-800 text-sm shadow-lg" value={fullName} onChange={handleNameInput} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }} />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white mt-2 rounded-2xl shadow-2xl border-2 border-blue-200 overflow-hidden max-h-48 overflow-y-auto">
                  {suggestions.map((r, i) => (
                    <li key={i} onClick={() => selectRsvp(r)} className="p-4 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 flex justify-between items-center transition-colors">
                      <span className="font-black text-gray-800">{r.full_name}</span>
                      <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg uppercase">{r.category}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-white uppercase mb-1 ml-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Nickname (Shows on TV)</label>
              <input required type="text" className="w-full p-3 bg-white/95 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-gray-800 text-sm shadow-lg" value={nickname} onChange={(e) => setNickname(capitalizeWords(e.target.value))} />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-white uppercase mb-1 ml-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Guest Category</label>
              <select className="w-full p-3 bg-white/95 border-2 border-transparent rounded-2xl focus:border-blue-500 outline-none transition-all font-black text-gray-800 text-sm shadow-lg appearance-none cursor-pointer" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Adults">Adults</option>
                  <option value="Teens">Teens</option>
                  <option value="Kids">Kids</option>
              </select>
            </div>

            <div className="pt-1">
              <label className="block text-[10px] font-black text-white uppercase mb-1 ml-1 text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Identity Verification</label>
              <input required type="file" accept="image/*" capture="environment" id="photo-upload" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setPhoto(e.target.files[0]); }} />
              <label htmlFor="photo-upload" className={`w-full py-2.5 flex flex-col items-center justify-center rounded-2xl font-black transition-all cursor-pointer border-2 shadow-xl ${photo ? "bg-green-500 border-green-400 text-white" : "bg-white/95 border-blue-400 text-blue-600 hover:bg-white"}`}>
                <span className="text-xl mb-0.5">{photo ? "✅" : "📸"}</span>
                <span className="text-[10px]">{photo ? "PHOTO CAPTURED" : "TAKE SELFIE"}</span>
              </label>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className={`w-full max-w-sm mx-auto mt-2 py-4 rounded-full text-base font-black text-white shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-2 shrink-0 ${isSubmitting ? "bg-gray-400" : "bg-green-500 hover:bg-green-600 border-2 border-green-400"}`}>
            {isSubmitting ? "CHECKING IN..." : "CHECK IN & ENTER RAFFLE"}
          </button>
        </form>
      )}
    </div>
  );
}