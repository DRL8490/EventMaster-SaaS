"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function PrizesTab({ prizes, setPrizes, executeDbAction, uniqueReferrals }: any) {
  const [newPrizeName, setNewPrizeName] = useState("");
  const [newPrizeCategory, setNewPrizeCategory] = useState("All");
  const [draggedPrizeId, setDraggedPrizeId] = useState<number | null>(null);

  // FIXED: Base categories are clean, and we specifically filter out "Host" from referrals!
  const baseCategories = ["Adults", "Teens", "Kids"];
  const actualReferrals = uniqueReferrals?.filter((r: string) => r !== "All" && r.toLowerCase() !== "host") || [];
  
  const targetPoolOptions = ["All", ...baseCategories, ...actualReferrals];
  
  actualReferrals.forEach((ref: string) => {
      baseCategories.forEach((cat: string) => {
          targetPoolOptions.push(`${ref} - ${cat}`);
      });
  });

  const handleDragStart = (e: React.DragEvent, id: number) => { 
      setDraggedPrizeId(id); e.dataTransfer.effectAllowed = "move"; 
  };
  const handleDragOver = (e: React.DragEvent) => { 
      e.preventDefault(); e.dataTransfer.dropEffect = "move"; 
  };
  const handleDrop = async (e: React.DragEvent, targetId: number) => {
      e.preventDefault();
      if (draggedPrizeId === null || draggedPrizeId === targetId) return;
      const draggedIdx = prizes.findIndex((p: any) => p.id === draggedPrizeId);
      const targetIdx = prizes.findIndex((p: any) => p.id === targetId);
      const newPrizes = [...prizes];
      const [draggedItem] = newPrizes.splice(draggedIdx, 1);
      newPrizes.splice(targetIdx, 0, draggedItem);
      
      const updatedPrizes = newPrizes.map((p, i) => ({ ...p, draw_order: i + 1 }));
      setPrizes(updatedPrizes);
      setDraggedPrizeId(null);
      for (const p of updatedPrizes) { 
          await supabase.from("prizes").update({ draw_order: p.draw_order }).eq("id", p.id); 
      }
  };

  return (
    <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-black text-gray-800 uppercase mb-6 pb-4 border-b-2">🎁 Prize Inventory & Sequence</h2>
        
        <form onSubmit={(e) => { 
            e.preventDefault(); 
            executeDbAction(supabase.from("prizes").insert([{ name: newPrizeName, status: "unclaimed", category: newPrizeCategory, draw_order: prizes.length + 1 }])); 
            setNewPrizeName(""); 
        }} className="flex gap-4 mb-8 bg-yellow-50 p-6 rounded-2xl border border-yellow-200 flex-wrap items-center">
            <div className="flex flex-col flex-grow">
                <label className="text-[10px] font-black uppercase text-yellow-700 mb-1 ml-1">Prize Name</label>
                <input 
                    type="text" 
                    required 
                    placeholder="e.g. Grand Prize Bike..." 
                    className="p-4 rounded-xl border-2 border-yellow-200 font-bold outline-none focus:border-yellow-500" 
                    value={newPrizeName} 
                    onChange={e => setNewPrizeName(e.target.value)} 
                />
            </div>
            <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase text-yellow-700 mb-1 ml-1">Target Pool</label>
                <select 
                    value={newPrizeCategory} 
                    onChange={e => setNewPrizeCategory(e.target.value)} 
                    className="p-4 rounded-xl border-2 border-yellow-200 font-black outline-none bg-white"
                >
                    {targetPoolOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            </div>
            <button type="submit" className="bg-yellow-500 text-white font-black px-8 py-4 mt-5 rounded-xl shadow-md uppercase">Add Prize</button>
        </form>

        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-2">💡 Drag and drop the handles (☰) to reorder the live sequence!</p>
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                    <th className="p-4 rounded-tl-xl text-center w-12">Drag</th>
                    <th className="p-4 text-center w-20">Seq #</th>
                    <th className="p-4">Prize Name</th>
                    <th className="p-4 text-center">Target Pool</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center rounded-tr-xl">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {prizes.map((p: any) => (
                    <tr 
                        key={p.id} 
                        draggable 
                        onDragStart={(e) => handleDragStart(e, p.id)} 
                        onDragOver={handleDragOver} 
                        onDrop={(e) => handleDrop(e, p.id)} 
                        className={`hover:bg-yellow-50/50 transition-colors ${draggedPrizeId === p.id ? 'opacity-50 bg-gray-100' : ''}`}
                    >
                        <td className="p-4 text-center text-gray-400 hover:text-yellow-600 cursor-grab active:cursor-grabbing">
                            <span className="text-xl">☰</span>
                        </td>
                        <td className="p-4 text-center font-black text-blue-600 text-xl bg-blue-50/50">{p.draw_order}</td>
                        <td className="p-4 font-black text-gray-800 text-lg">{p.name}</td>
                        <td className="p-4 text-center">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-blue-200">{p.category || 'All'}</span>
                        </td>
                        <td className="p-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${p.status === 'claimed' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{p.status}</span>
                        </td>
                        <td className="p-4 text-center space-x-2">
                            {p.status === 'claimed' && <button onClick={() => executeDbAction(supabase.from("prizes").update({ status: "unclaimed" }).eq("id", p.id))} className="text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-500 hover:text-white px-3 py-2 rounded-lg transition-all">🔄 Reset</button>}
                            <button onClick={() => window.confirm("Delete?") && executeDbAction(supabase.from("prizes").delete().eq("id", p.id))} className="text-red-600 font-bold text-xs bg-red-50 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition-all">🗑️ Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
}