"use client";
import React from "react";

export default function GamesControl({ games, playSound, channel, handleUploadGameProof }: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-green-400 rounded-3xl shadow-xl p-6 border-4 border-green-500">
          <h2 className="text-sm font-black text-green-900 uppercase tracking-widest mb-4">🎲 Party Games Control</h2>
          <div className="grid grid-cols-1 gap-4">
              {games.length === 0 ? (
                   <div className="bg-green-50 p-6 rounded-2xl border-4 border-green-200 text-center shadow-inner">
                      <h3 className="text-xl font-black text-green-800">No games loaded!</h3>
                      <p className="text-sm font-bold text-green-600 mt-1">Add them via the Admin Dashboard.</p>
                  </div>
              ) : (
                  games.map((game: any) => (
                      <div key={game.id} className={`p-4 rounded-2xl border-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4 shadow-sm transition-all ${game.status === 'done' ? 'bg-gray-100 border-gray-300 opacity-70' : 'bg-white border-green-200'}`}>
                          
                          <div className="flex items-center gap-4">
                              {game.proof_url && (
                                  <img src={game.proof_url} alt="Game Winners" className="w-14 h-14 rounded-xl object-cover border-2 border-green-400 shadow-sm" />
                              )}
                              <div>
                                  <h3 className={`font-black text-lg leading-tight ${game.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                      {game.name}
                                  </h3>
                                  <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${game.status === 'done' ? 'text-gray-400' : 'text-green-600'}`}>
                                      {game.num_winners} Winners
                                  </p>
                              </div>
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto">
                              
                              {/* AUTO-TOGGLE: Either ask for proof, OR show as completed */}
                              {game.status !== "done" ? (
                                  <div className="flex-1 md:flex-none">
                                      <input 
                                          type="file" accept="image/*" capture="environment" id={`proof-game-${game.id}`} className="hidden" 
                                          onChange={(e) => { if(e.target.files?.[0]) handleUploadGameProof(game.id, e.target.files[0]); }} 
                                      />
                                      <label htmlFor={`proof-game-${game.id}`} className="w-full h-full flex items-center justify-center bg-red-100 text-red-700 hover:bg-red-200 px-4 py-3 rounded-xl font-black text-xs uppercase transition-all shadow-sm border border-red-300 cursor-pointer animate-pulse">
                                          📸 Upload Proof
                                      </label>
                                  </div>
                              ) : (
                                  <span className="flex-1 md:flex-none text-center bg-gray-200 text-gray-500 px-6 py-3 rounded-xl font-black text-xs uppercase shadow-inner flex items-center justify-center">
                                      ✅ Completed
                                  </span>
                              )}

                              {/* THE SHOW BUTTON (Locked & Safeguarded if Done) */}
                              <button 
                                  disabled={game.status === "done"}
                                  onClick={async () => {
                                      if (game.status === "done") return; 
                                      playSound("dj-3.mp3");
                                      if (channel) await channel.send({ type: "broadcast", event: "show_game", payload: { name: game.name, winners: game.num_winners } });
                                  }} 
                                  className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs uppercase transition-all shadow-sm border ${
                                      game.status === "done" 
                                      ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed" 
                                      : "bg-green-100 text-green-800 hover:bg-green-500 hover:text-white border-green-300"
                                  }`}
                              >
                                  {game.status === "done" ? "🔒 Locked" : "📺 Show"}
                              </button>
                          </div>

                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
}