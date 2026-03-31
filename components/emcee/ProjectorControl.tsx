"use client";
import React from "react";
import { useParams } from "next/navigation";

export default function ProjectorControl({ activeScreen, changeScreen, channel, setPrizeDisplayed, setTimerStatus }: any) {
  const params = useParams();
  const eventSlug = params?.slug || "";
  const baseUrl = "https://event-master-saas.vercel.app";

  return (
    // REDUCED PADDING: p-6 -> p-3 md:p-4
    <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl p-3 md:p-4 border-2 md:border-4 border-gray-800 flex flex-col">
        <h2 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-3">📺 Projector Screen Control</h2>
        
        {/* REDUCED GAP & MARGIN: gap-2 -> gap-1.5, mb-6 -> mb-3 */}
        <div className="flex overflow-x-auto gap-1.5 mb-3 pb-2 scrollbar-hide snap-x">
            {/* REDUCED BUTTON HEIGHT: py-4 -> py-2.5 */}
            <button onClick={() => changeScreen("pregame")} className={`snap-start flex-none min-w-[90px] px-3 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase transition-all ${activeScreen === "pregame" ? "bg-blue-600 text-white shadow-inner" : "bg-gray-100 text-gray-500 hover:bg-blue-100"}`}>🎈 Pregame</button>
            <button onClick={() => changeScreen("raffle")} className={`snap-start flex-none min-w-[90px] px-3 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase transition-all ${activeScreen === "raffle" ? "bg-yellow-500 text-yellow-900 shadow-inner" : "bg-gray-100 text-gray-500 hover:bg-yellow-100"}`}>🎟️ Raffle</button>
            <button onClick={() => changeScreen("games")} className={`snap-start flex-none min-w-[90px] px-3 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase transition-all ${activeScreen === "games" ? "bg-green-500 text-white shadow-inner" : "bg-gray-100 text-gray-500 hover:bg-green-100"}`}>🎲 Games</button>
            <button onClick={() => changeScreen("qr")} className={`snap-start flex-none min-w-[90px] px-3 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase transition-all ${activeScreen === "qr" ? "bg-purple-600 text-white shadow-inner" : "bg-gray-100 text-gray-500 hover:bg-purple-100"}`}>📱 QR Code</button>
            <button onClick={() => changeScreen("programme")} className={`snap-start flex-none min-w-[90px] px-3 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase transition-all ${activeScreen === "programme" ? "bg-gray-800 text-white shadow-inner" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>📅 Programme</button>
        </div>

        {/* REDUCED PREVIEW HEIGHT: h-72 -> h-48 md:h-64 */}
        <div className={`w-full bg-gray-900 rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 border-gray-800 relative shadow-inner transition-all ${activeScreen === "raffle" || activeScreen === "programme" ? "hidden" : "h-48 md:h-64"}`}>
            <div className="absolute top-2 left-2 bg-red-600 text-white text-[8px] md:text-[10px] font-black px-2 py-1 rounded z-20 flex items-center gap-2 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> PREVIEW
            </div>
            
            {activeScreen === "pregame" && (
                <div className="w-full h-full relative bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center overflow-hidden">
                    <div className="absolute w-20 h-20 bg-blue-400/30 rounded-full blur-sm top-10 left-10 animate-pulse"></div>
                    <div className="absolute w-32 h-32 bg-purple-400/20 rounded-full blur-md bottom-10 right-10 animate-bounce"></div>
                    <div className="absolute w-16 h-16 bg-pink-400/30 rounded-full blur-sm top-20 right-20 animate-pulse"></div>
                    <div className="absolute w-24 h-24 bg-blue-300/20 rounded-full blur-sm bottom-20 left-20 animate-bounce"></div>
                    <h2 className="text-white text-xl md:text-3xl font-black z-10 tracking-widest uppercase drop-shadow-lg opacity-80">Pregame Active</h2>
                </div>
            )}

            {activeScreen === "games" && (
                <div className="w-full h-full bg-green-50 flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-4xl md:text-6xl mb-2 animate-bounce">🎲</span>
                    <h2 className="text-lg md:text-2xl font-black text-green-800 uppercase tracking-widest">Party Game Active</h2>
                    <p className="text-green-600 font-bold text-xs md:text-sm mt-1 animate-pulse">Projecting rules to TV...</p>
                </div>
            )}

            {activeScreen === "qr" && (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center px-4 py-2 gap-6 md:gap-12">
                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-[8px] md:text-[10px] font-black text-gray-800 uppercase tracking-widest mb-1 md:mb-2">Winners QR</h2>
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${baseUrl}/${eventSlug}/memory`)}`} 
                            alt="Memory QR Preview" 
                            className="w-20 h-20 md:w-24 md:h-24 rounded-xl shadow-sm border-2 border-white" 
                        />
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-[8px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 md:mb-2">Photo Drop</h2>
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${baseUrl}/${eventSlug}/upload`)}`} 
                            alt="Upload QR Preview" 
                            className="w-20 h-20 md:w-24 md:h-24 rounded-xl shadow-sm border-2 border-white" 
                        />
                    </div>
                </div>
            )}
        </div>

        <div className="flex-grow flex flex-col mt-2 md:mt-4">
            {activeScreen === "raffle" && (
                <button onClick={async () => { if(channel) await channel.send({ type: "broadcast", event: "reset" }); setPrizeDisplayed(false); setTimerStatus("idle"); }} className="w-full py-3 md:py-4 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-xl text-[10px] md:text-xs font-bold uppercase shadow-sm mt-auto transition-all">
                    📺 Clear TV Screen (Set to Idle)
                </button>
            )}
        </div>
    </div>
  );
}