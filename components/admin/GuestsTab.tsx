"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function GuestsTab({ guests, fetchData, executeDbAction, stats, uniqueReferrals }: any) {
  const [guestFilter, setGuestFilter] = useState("All");
  const [guestReferralFilter, setGuestReferralFilter] = useState("All"); 
  
  // NEW SAAS FEATURE: Search State
  const [searchQuery, setSearchQuery] = useState("");
  
  const filterCategories = ["All", "Adults", "Teens", "Kids"];

  const filteredGuests = guests.filter((g: any) => {
      const matchCat = guestFilter === "All" || g.category === guestFilter;
      const matchRef = guestReferralFilter === "All" || g.referral === guestReferralFilter;
      // NEW SAAS FEATURE: Search Logic (Checks both names)
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = (g.full_name?.toLowerCase().includes(searchLower) || g.nickname?.toLowerCase().includes(searchLower));
      
      return matchCat && matchRef && matchSearch;
  });

  return (
    <div className="animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 flex-wrap gap-4">
            <h2 className="text-2xl font-black text-gray-800 uppercase">📋 Live Guest Roster</h2>
            <button onClick={fetchData} className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg">🔄 Refresh Roster</button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center mb-8">
            {[ 
                {l: "Total", v: stats.total, c: "blue"}, 
                {l: "Eligible", v: stats.eligible, c: "green"}, 
                {l: "Winners", v: stats.winners, c: "purple"} 
            ].map(s => (
               <div key={s.l} className={`bg-${s.c}-50 p-4 rounded-xl border border-${s.c}-100`}>
                   <p className={`text-[10px] font-bold text-${s.c}-500 uppercase tracking-wider`}>{s.l}</p>
                   <p className={`text-4xl font-black text-${s.c}-700`}>{s.v}</p>
               </div>
            ))}
        </div>

        {/* UPDATED UI: Added the Search Bar to the filter section */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 mb-6 flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Search Guests</p>
                <div className="relative">
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder="Search by name..." 
                        className="w-full p-3 rounded-xl border-2 border-gray-200 font-bold outline-none focus:border-blue-500 bg-white pr-10" 
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")} 
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-200 hover:bg-red-500 hover:text-white text-gray-600 rounded-full w-6 h-6 flex items-center justify-center font-black text-sm transition-all shadow-sm"
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-[1.5]">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Filter by Category</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {filterCategories.map(cat => {
                        const count = cat === "All" ? guests.length : guests.filter((g: any) => g.category === cat).length;
                        return (
                            <button 
                                key={cat} onClick={() => setGuestFilter(cat)} 
                                className={`px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all ${guestFilter === cat ? 'bg-blue-600 text-white shadow-md scale-105' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                            >
                                {cat} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>
            
            <div className="flex-1">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Filter by Group</p>
                <select value={guestReferralFilter} onChange={(e) => setGuestReferralFilter(e.target.value)} className="w-full p-3 rounded-xl border-2 border-gray-200 font-bold outline-none focus:border-blue-500 bg-white cursor-pointer">
                    {uniqueReferrals?.map((ref: string) => <option key={ref} value={ref}>{ref}</option>)}
                </select>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                        <th className="p-4 rounded-tl-xl w-24">Photo</th>
                        <th className="p-4 w-1/4">Details <span className="text-blue-600 font-black ml-2">(Showing: {filteredGuests.length})</span></th>
                        <th className="p-4 text-center">Category</th>
                        <th className="p-4 text-center">Group</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 rounded-tr-xl text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredGuests.map((g: any) => (
                        <tr key={g.id} className="hover:bg-gray-50">
                            <td className="p-4"><img src={g.photo_url} alt="Selfie" className="w-16 h-16 rounded-xl object-cover border-2 shadow-sm" /></td>
                            <td className="p-4"><p className="font-black text-blue-600 text-xl">{g.nickname}</p><p className="font-medium text-gray-500 text-sm">{g.full_name}</p></td>
                            <td className="p-4 text-center">
                                <select value={g.category || "Adults"} onChange={(e) => executeDbAction(supabase.from("guests").update({ category: e.target.value }).eq("id", g.id))} className="bg-gray-100 border-2 border-gray-200 hover:border-blue-400 rounded-lg p-2 text-xs font-black uppercase text-gray-700 outline-none cursor-pointer transition-all">
                                    <option value="Adults">Adults</option>
                                    <option value="Teens">Teens</option>
                                    <option value="Kids">Kids</option>
                                </select>
                            </td>
                            <td className="p-4 text-center"><span className="font-bold text-gray-600 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">{g.referral || "None"}</span></td>
                            <td className="p-4 text-center">
                                <select 
                                    value={g.status || "eligible"} 
                                    onChange={(e) => executeDbAction(supabase.from("guests").update({ status: e.target.value }).eq("id", g.id))} 
                                    className={`font-black uppercase px-3 py-1 rounded-full text-xs outline-none cursor-pointer border ${g.status === "won" ? "bg-purple-100 text-purple-700 border-purple-200" : g.status === "ineligible" ? "bg-gray-200 text-gray-600 border-gray-300" : "bg-green-100 text-green-700 border-green-200"}`}
                                >
                                    <option value="eligible">Eligible</option>
                                    <option value="ineligible">Ineligible</option>
                                    <option value="won">🏆 Winner</option>
                                </select>
                            </td>
                            <td className="p-4 text-center">
                                <button onClick={() => window.confirm(`Delete ${g.nickname}?`) && executeDbAction(supabase.from("guests").delete().eq("id", g.id))} className="text-red-600 font-bold text-sm bg-red-50 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg transition-all">🗑️ Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredGuests.length === 0 && <p className="text-center text-gray-400 font-bold py-10">No guests match this filter.</p>}
        </div>
    </div>
  );
}