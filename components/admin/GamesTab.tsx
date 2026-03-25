"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function GamesTab({ games, executeDbAction }: any) {
  const [newGameName, setNewGameName] = useState("");
  const [newNumWinners, setNewNumWinners] = useState<number | "">(1);

  const handleAddGame = async (e: React.FormEvent) => {
      e.preventDefault();
      await executeDbAction(supabase.from("games").insert([{ name: newGameName, num_winners: newNumWinners }]));
      setNewGameName("");
      setNewNumWinners(1);
  };

  return (
    <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-black text-gray-800 uppercase mb-6 pb-4 border-b-2">🎲 Party Games Manager</h2>
        
        <form onSubmit={handleAddGame} className="flex gap-4 mb-8 bg-green-50 p-6 rounded-2xl border border-green-200 flex-wrap items-center">
            <div className="flex flex-col flex-grow">
                <label className="text-[10px] font-black uppercase text-green-700 mb-1 ml-1">Game Name & Rules</label>
                <input 
                    type="text" required 
                    placeholder="e.g. Stop Dance (Kids)..." 
                    className="p-4 rounded-xl border-2 border-green-200 font-bold outline-none focus:border-green-500" 
                    value={newGameName} 
                    onChange={e => setNewGameName(e.target.value)} 
                />
            </div>
            <div className="flex flex-col w-32">
                <label className="text-[10px] font-black uppercase text-green-700 mb-1 ml-1"># of Winners</label>
                <input 
                    type="number" required min="1" 
                    className="p-4 rounded-xl border-2 border-green-200 font-black outline-none bg-white text-center" 
                    value={newNumWinners} 
                    onChange={e => setNewNumWinners(parseInt(e.target.value) || "")} 
                />
            </div>
            <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-black px-8 py-4 mt-5 rounded-xl shadow-md uppercase transition-all">Add Game</button>
        </form>

        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                    <th className="p-4 rounded-tl-xl">Game Name</th>
                    <th className="p-4 text-center w-32">Winners</th>
                    <th className="p-4 text-center rounded-tr-xl w-32">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {games.map((g: any) => (
                    <tr key={g.id} className="hover:bg-green-50/50 transition-colors">
                        <td className="p-4 font-black text-gray-800 text-lg">{g.name}</td>
                        <td className="p-4 text-center font-black text-blue-600 text-xl bg-blue-50/50">{g.num_winners}</td>
                        <td className="p-4 text-center">
                            <button onClick={() => window.confirm("Delete this game?") && executeDbAction(supabase.from("games").delete().eq("id", g.id))} className="text-red-600 font-bold text-xs bg-red-50 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition-all">🗑️ Delete</button>
                        </td>
                    </tr>
                ))}
                {games.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-gray-400 font-bold">No games added yet.</td></tr>
                )}
            </tbody>
        </table>
    </div>
  );
}