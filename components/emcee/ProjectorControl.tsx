"use client";
import React from "react";

export default function ProjectorControl({ activeScreen, changeScreen, channel, setPrizeDisplayed, setTimerStatus }: any) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border-4 border-gray-800 flex flex-col">
        <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">📺 Projector Screen Control</h2>
        <div className="grid grid-cols-4 gap-3 mb-6">
            <button onClick={() => changeScreen("pregame")} className={`py-4 rounded-xl font-black text-xs md:text-sm uppercase transition-all ${activeScreen === "pregame" ? "bg-blue-600 text-white shadow-inner" : "bg-gray-100 text-gray-500 hover:bg-blue-100"}`}>🎈 Pregame</button>
            <button onClick={() => changeScreen("raffle")} className={`py-4 rounded-xl font-black text-xs md:text-sm uppercase transition-all ${activeScreen === "raffle" ? "bg-yellow-500 text-yellow-900 shadow-inner" : "bg-gray-100 text-gray-500 hover:bg-yellow-100"}`}>🎰 Raffle</button>
            <button onClick={() => changeScreen("games")} className={`py-4 rounded-xl font-black text-xs md:text-sm uppercase transition-all ${activeScreen === "games" ? "bg-green-500 text-white shadow-inner" : "bg-gray-100 text-gray-500 hover:bg-green-100"}`}>🎲 Games</button>
            <button onClick={() => changeScreen("qr")} className={`py-4 rounded-xl font-black text-xs md:text-sm uppercase transition-all ${activeScreen === "qr" ? "bg-purple-600 text-white shadow-inner" : "bg-gray-100 text-gray-500 hover:bg-purple-100"}`}>📱 QR Code</button>
        </div>

        <div className={`w-full bg-gray-900 rounded-2xl overflow-hidden border-4 border-gray-800 relative shadow-inner transition-all ${activeScreen === "raffle" ? "hidden" : "h-72"}`}>
            <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded z-20 flex items-center gap-2 shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> PREVIEW
            </div>
            
            {activeScreen === "pregame" && (
                <div className="w-full h-full relative bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center overflow-hidden">
                    <div className="absolute w-20 h-20 bg-blue-400/30 rounded-full blur-sm top-10 left-10 animate-pulse"></div>
                    <div className="absolute w-32 h-32 bg-purple-400/20 rounded-full blur-md bottom-10 right-10 animate-bounce"></div>
                    <div className="absolute w-16 h-16 bg-pink-400/30 rounded-full blur-sm top-20 right-20 animate-pulse"></div>
                    <div className="absolute w-24 h-24 bg-blue-300/20 rounded-full blur-sm bottom-20 left-20 animate-bounce"></div>
                    <h2 className="text-white text-3xl font-black z-10 tracking-widest uppercase drop-shadow-lg opacity-80">Pregame Active</h2>
                </div>
            )}

            {activeScreen === "games" && (
                <div className="w-full h-full bg-green-50 flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-6xl mb-2 animate-bounce">🎲</span>
                    <h2 className="text-2xl font-black text-green-800 uppercase tracking-widest">Party Game Active</h2>
                    <p className="text-green-600 font-bold text-sm mt-2 animate-pulse">Projecting rules to TV...</p>
                </div>
            )}

            {/* UPGRADED QR PREVIEW */}
            {activeScreen === "qr" && (
                <div className="w-full h-full bg-gray-50 flex items-center justify-between px-12 py-4 gap-8">
                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-2">Winners QR</h2>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/memory' : '')}`} alt="Memory QR Preview" className="w-20 h-20 rounded-xl shadow-sm border-2 border-white" />
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Download/Upload</h2>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('https://drive.google.com/drive/folders/1i1ItVCpTjg-GVtwEbRLv9RJjAcgilGgS?usp=sharing')}`} alt="Drive QR Preview" className="w-20 h-20 rounded-xl shadow-sm border-2 border-white" />
                    </div>
                </div>
            )}
        </div>

        <div className="flex-grow flex flex-col mt-4">
            {activeScreen === "raffle" && (
                <button onClick={async () => { if(channel) await channel.send({ type: "broadcast", event: "reset" }); setPrizeDisplayed(false); setTimerStatus("idle"); }} className="w-full py-4 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-2xl text-xs font-bold uppercase shadow-sm mt-auto transition-all">
                    📺 Clear TV Screen (Set to Idle)
                </button>
            )}
        </div>
    </div>
  );
}