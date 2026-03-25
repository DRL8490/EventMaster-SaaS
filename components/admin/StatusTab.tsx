"use client";
import React from "react";

export default function StatusTab({ 
    registrationOpen, rsvpOpen, schedule, setSchedule, 
    handleToggleRegistration, handleToggleRsvp, handleSaveSchedule 
}: any) {
  return (
    <div className="animate-in fade-in duration-300 space-y-6">
        <h2 className="text-2xl font-black text-gray-800 uppercase mb-4 pb-4 border-b-2">Demo / Live Mode Bouncer</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-200 flex items-center justify-between gap-6">
                <div>
                    <p className="text-xl font-black text-gray-900">Live Registration</p>
                    <p className="text-gray-600 text-sm">Toggle /guest portal.</p>
                </div>
                <button onClick={handleToggleRegistration} className={`w-32 h-16 rounded-full p-2 flex transition-all duration-300 ${registrationOpen ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"}`}>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-black text-xs uppercase">{registrationOpen ? "Open" : "Closed"}</div>
                </button>
            </div>

            <div className="bg-purple-50 p-8 rounded-3xl border border-purple-200 flex items-center justify-between gap-6">
                <div>
                    <p className="text-xl font-black text-purple-900">Pre-Event RSVP</p>
                    <p className="text-gray-600 text-sm">Toggle /rsvp link.</p>
                </div>
                <button onClick={handleToggleRsvp} className={`w-32 h-16 rounded-full p-2 flex transition-all duration-300 ${rsvpOpen ? "bg-green-500 justify-end" : "bg-gray-300 justify-start"}`}>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-black text-xs uppercase">{rsvpOpen ? "Open" : "Closed"}</div>
                </button>
            </div>
        </div>

        <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 flex flex-col gap-6">
            <div>
                <p className="text-xl font-black text-blue-900">Automated Door Schedule</p>
                <p className="text-gray-600 text-sm">Automatically open/close the Live Door check-in based on time.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {["start", "end"].map((type) => (
                 <div key={type}>
                    <label className="block text-[11px] font-black text-blue-800 uppercase mb-2 ml-1">{type} Time</label>
                    <input 
                        type="datetime-local" 
                        value={schedule[type as "start"|"end"]} 
                        onChange={e => setSchedule({...schedule, [type]: e.target.value})} 
                        className="w-full p-4 rounded-xl border-2 border-blue-200 font-bold outline-none focus:border-blue-500" 
                    />
                 </div>
               ))}
            </div>
            <button onClick={handleSaveSchedule} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-lg">
                Save Schedule
            </button>
        </div>
    </div>
  );
}