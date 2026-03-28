"use client";
import React from "react";

export default function RaffleControl({
  totalEntries, eligibleCount, winnersCount, pendingProofGuest,
  timerStatus, timer, currentPrize, prizeDisplayed, handleShowPrize,
  handleSpin, pauseTimer, resumeTimer, handleForfeit, setTimerStatus,
  handleDemoReset,
  // NEW: Catching the boolean we passed from the parent page
  isEvaluatingWinner 
}: any) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-100 shadow-sm">
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Total</p>
            <p className="text-3xl font-black text-blue-700">{totalEntries}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-xl border-2 border-green-100 shadow-sm">
            <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Eligible</p>
            <p className="text-3xl font-black text-green-700">{eligibleCount}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border-2 border-purple-100 shadow-sm">
            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Winners</p>
            <p className="text-3xl font-black text-purple-700">{winnersCount}</p>
        </div>
      </div>

      {pendingProofGuest && timerStatus === "idle" ? (
        <div className="bg-red-100 border-4 border-red-500 rounded-3xl p-8 text-center shadow-xl animate-pulse">
            <h1 className="text-3xl font-black text-red-600 uppercase mb-2">🚨 SYSTEM LOCKED 🚨</h1>
            <p className="text-red-800 font-bold">You must upload the Prize Photo for <span className="font-black text-xl">{pendingProofGuest.nickname}</span> on the roster below before spinning again!</p>
        </div>
      ) : (
        <div className="bg-yellow-400 rounded-3xl shadow-xl p-6 border-4 border-yellow-500">
          <h2 className="text-sm font-black text-yellow-900 uppercase tracking-widest mb-4">🎁 1. The Live Prize Queue</h2>
          
          <div className="bg-yellow-50 p-4 rounded-2xl border-4 border-yellow-200 text-center mb-6 shadow-inner">
              <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1">Up Next for Grab</p>
              {currentPrize ? (
                  <h3 className="text-2xl font-black text-gray-900">[{currentPrize.category || 'All'}] {currentPrize.name}</h3>
              ) : (
                  <h3 className="text-xl font-black text-gray-400">No Prizes Left in Queue!</h3>
              )}
          </div>
          
          <h2 className="text-sm font-black text-yellow-900 uppercase tracking-widest mb-4">📺 2. Display & Spin</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
              {/* FIXED: Added isEvaluatingWinner to the disabled condition */}
              <button 
                onClick={handleShowPrize} 
                disabled={!currentPrize || isEvaluatingWinner} 
                className="col-span-1 py-4 bg-yellow-100 text-yellow-800 border-2 border-yellow-300 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl text-xs font-black uppercase shadow-md transition-all active:scale-95"
              >
                  📺 Display Prize
              </button>
              
              <button onClick={handleSpin} disabled={!currentPrize || !prizeDisplayed || timerStatus !== "idle"} className={`col-span-2 py-4 rounded-2xl text-2xl font-black uppercase shadow-xl transition-all ${prizeDisplayed && timerStatus === "idle" ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed border-4 border-gray-200 grayscale'}`}>
                  🎰 {prizeDisplayed ? "SPIN WHEEL" : "LOCKED"}
              </button>
          </div>

          {timerStatus !== "idle" && pendingProofGuest && (
              <div className="bg-white border-4 border-red-500 rounded-2xl p-6 flex flex-col gap-4 mt-6">
                  <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                         <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Stage Countdown</span>
                         <span className={`text-5xl font-black ${timer === 0 ? 'text-gray-400' : 'text-red-600'}`}>⏱️ {timer}s</span>
                      </div>
                      <div className="flex gap-2">
                         {timerStatus === "running" ? (
                             <button onClick={pauseTimer} className="bg-gray-800 text-white font-black px-6 py-4 rounded-xl shadow-md hover:bg-gray-900 uppercase transition-all">⏸️ Pause</button>
                         ) : (
                             <button onClick={resumeTimer} disabled={timer === 0} className="bg-blue-500 text-white font-black px-6 py-4 rounded-xl shadow-md hover:bg-blue-600 uppercase transition-all disabled:opacity-50">▶️ Resume</button>
                         )}
                      </div>
                  </div>

                  <div className="border-t-2 border-gray-100 pt-4 mt-2">
                      <p className="text-sm font-bold text-gray-600 mb-3 text-center">Did <span className="text-black font-black uppercase">{pendingProofGuest.nickname}</span> make it to the stage?</p>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={handleForfeit} className="bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-300 font-black py-3 rounded-xl uppercase transition-all">
                              ❌ Forfeit (Redraw)
                          </button>
                          <button onClick={() => setTimerStatus("idle")} className="bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300 font-black py-3 rounded-xl uppercase transition-all">
                              ✅ Consider (Keep Prize)
                          </button>
                      </div>
                  </div>
              </div>
          )}

          <div className="pt-4 border-t-2 border-yellow-500/30 flex justify-end mt-4">
              <button onClick={handleDemoReset} className="py-2 px-6 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl text-xs font-black uppercase shadow-sm transition-all">🛠️ Full Demo Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}