"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function RsvpsTab({ eventId, rsvps, fetchData, executeDbAction, uniqueReferrals }: any) {
  const [rsvpFilter, setRsvpFilter] = useState("All");
  const [rsvpReferralFilter, setRsvpReferralFilter] = useState("All");
  const [editingRsvpId, setEditingRsvpId] = useState<number | null>(null);
  const [editRsvpData, setEditRsvpData] = useState({ full_name: "", nickname: "", category: "Adults", referral: "" });
  
  const filterCategories = ["All", "Adults", "Teens", "Kids"];

  const handleEditRsvpClick = (rsvp: any) => {
      setEditingRsvpId(rsvp.id);
      setEditRsvpData({ full_name: rsvp.full_name, nickname: rsvp.nickname, category: rsvp.category, referral: rsvp.referral || "" });
  };

  const handleSaveRsvp = async (id: number) => {
      // SAAS LOCK: Ensure we only update if the eventId matches!
      await executeDbAction(supabase.from("rsvps").update(editRsvpData).eq("id", id).eq("event_id", eventId));
      setEditingRsvpId(null);
  };

  const filteredRsvps = rsvps.filter((r: any) => {
      const matchCat = rsvpFilter === "All" || r.category === rsvpFilter;
      const matchRef = rsvpReferralFilter === "All" || r.referral === rsvpReferralFilter;
      return matchCat && matchRef;
  });

  return (
    <div className="animate-in fade-in duration-300">
        
        <datalist id="referral-list">
            {uniqueReferrals.filter((r: string) => r !== "All").map((ref: string) => (
                <option key={ref} value={ref} />
            ))}
        </datalist>

        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 flex-wrap gap-4">
            <h2 className="text-2xl font-black text-gray-800 uppercase">💌 Pre-Event RSVPs</h2>
            <button onClick={fetchData} className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">🔄 Refresh RSVPs</button>
        </div>

        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-6 flex flex-col md:flex-row gap-6">
            <div className="flex-1">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Filter by Category</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {filterCategories.map(cat => {
                        const count = cat === "All" ? rsvps.length : rsvps.filter((r: any) => r.category === cat).length;
                        return (
                            <button 
                                key={cat} onClick={() => setRsvpFilter(cat)} 
                                className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all ${rsvpFilter === cat ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                            >
                                {cat} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="flex-1">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Filter by Group</p>
                <select value={rsvpReferralFilter} onChange={(e) => setRsvpReferralFilter(e.target.value)} className="w-full p-3 rounded-xl border-2 border-gray-200 font-bold outline-none focus:border-blue-500 bg-white cursor-pointer">
                    {uniqueReferrals.map((ref: string) => <option key={ref} value={ref}>{ref}</option>)}
                </select>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                        <th className="p-4 rounded-tl-xl w-1/3">Guest Details <span className="text-blue-600 font-black ml-2">(Showing: {filteredRsvps.length})</span></th>
                        <th className="p-4 text-center">Category</th>
                        <th className="p-4">Group</th>
                        <th className="p-4 rounded-tr-xl text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredRsvps.map((r: any) => (
                        <tr key={r.id} className="hover:bg-gray-50">
                            {editingRsvpId === r.id ? (
                                <>
                                    <td className="p-4 space-y-2">
                                        <input type="text" value={editRsvpData.full_name} onChange={e => setEditRsvpData({...editRsvpData, full_name: e.target.value})} className="w-full p-2 border-2 border-blue-300 rounded-lg text-sm font-bold" placeholder="Full Name" />
                                        <input type="text" value={editRsvpData.nickname} onChange={e => setEditRsvpData({...editRsvpData, nickname: e.target.value})} className="w-full p-2 border-2 border-blue-300 rounded-lg text-sm font-bold text-blue-600" placeholder="Nickname" />
                                    </td>
                                    <td className="p-4 text-center">
                                        <select value={editRsvpData.category} onChange={e => setEditRsvpData({...editRsvpData, category: e.target.value})} className="p-2 border-2 border-blue-300 rounded-lg text-xs font-black uppercase">
                                            <option value="Adults">Adults</option><option value="Teens">Teens</option><option value="Kids">Kids</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <input list="referral-list" value={editRsvpData.referral} onChange={e => setEditRsvpData({...editRsvpData, referral: e.target.value})} placeholder="Type or Select..." className="w-full p-2 border-2 border-blue-300 rounded-lg text-sm font-bold" />
                                    </td>
                                    <td className="p-4 text-center space-x-2">
                                        <button onClick={() => handleSaveRsvp(r.id)} className="bg-green-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-600">Save</button>
                                        <button onClick={() => setEditingRsvpId(null)} className="bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td className="p-4"><p className="font-black text-blue-600 text-xl">{r.nickname}</p><p className="font-medium text-gray-500 text-sm">{r.full_name}</p></td>
                                    <td className="p-4 text-center"><span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-black uppercase">{r.category}</span></td>
                                    <td className="p-4"><span className="font-bold text-gray-600 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">{r.referral || "None"}</span></td>
                                    <td className="p-4 text-center space-x-2">
                                        <button onClick={() => handleEditRsvpClick(r)} className="text-blue-600 font-bold text-sm bg-blue-50 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-lg transition-all">✏️ Edit</button>
                                        
                                        {/* SAAS LOCK: Ensure we only delete if the eventId matches! */}
                                        <button onClick={() => window.confirm(`Delete RSVP?`) && executeDbAction(supabase.from("rsvps").delete().eq("id", r.id).eq("event_id", eventId))} className="text-red-600 font-bold text-sm bg-red-50 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg transition-all">🗑️</button>
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredRsvps.length === 0 && <p className="text-center text-gray-400 font-bold py-10">No RSVPs match this filter.</p>}
        </div>
    </div>
  );
}