"use client";
import React from "react";
import { useParams } from "next/navigation";

export default function ProjectorControl({ activeScreen, changeScreen, channel, setPrizeDisplayed, setTimerStatus }: any) {
  const params = useParams();
  const eventSlug = params?.slug || "";
  const baseUrl = "https://event-master-saas.vercel.app";

  return (
    // ULTRA-COMPACT: p-1, small borders, rounded-sm
    <div className="bg-white rounded-sm shadow-sm p-1.5 border border-gray-400 flex flex-col">
        <h2 className="text-[10px] font-bold text-gray-800 uppercase tracking-widest mb-1">📺 Projector Control</h2>
        
        {/* ULTRA-COMPACT: gap-1, mb-1 */}
        <div className="flex overflow-x-auto gap-1 mb-1 pb-1 scrollbar-hide snap-x">
            {/* ULTRA-COMPACT BUTTONS: py-1, px-2, rounded-sm */}
            <button onClick={() => changeScreen("pregame")} className={`snap-start flex-none min-w-[70px] px-2 py-1 rounded-sm font-bold text-[10px] uppercase transition-all ${activeScreen === "pregame" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-blue-100"}`}>🎈 Pregame</button>
            <button onClick={() => changeScreen("raffle")} className={`snap-start flex-none min-w-[70px] px-2 py-1 rounded-sm font-bold text-[10px] uppercase transition-all ${activeScreen === "raffle" ? "bg-yellow-500 text-yellow-900" : "bg-gray-100 text-gray-600 hover:bg-yellow-100"}`}>🎟️ Raffle</button>
            <button onClick={() => changeScreen("games")} className={`snap-start flex-none min-w-[70px] px-2 py-1 rounded-sm font-bold text-[10px] uppercase transition-all ${activeScreen === "games" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-green-100"}`}>🎲 Games</button>
            <button onClick={() => changeScreen("qr")} className={`snap-start flex-none min-w-[70px] px-2 py-1 rounded-sm font-bold text-[10px] uppercase transition-all ${activeScreen === "qr" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-purple-100"}`}>📱 QR Code</button>
            <button onClick={() => changeScreen("programme")} className={`snap-start flex-none min-w-[70px] px-2 py-1 rounded-sm font-bold text-[10px] uppercase transition-all ${activeScreen === "programme" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>📅 Programme</button>
        </div>

        {/* ULTRA-COMPACT PREVIEW: h-24 */}
        <div className={`w-full bg-gray-900 rounded-sm overflow-hidden border border-gray-600 relative transition-all ${activeScreen === "raffle" || activeScreen === "programme" ? "hidden" : "h-24 md:h-32"}`}>
            <div className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded z-20 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-white animate-pulse"></span> PREVIEW
            </div>
            
            {activeScreen === "pregame" && (
                <div className="w-full h-full relative bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center overflow-hidden">
                    <h2 className="text-white text-sm md:text-base font-black z-10 tracking-widest uppercase opacity-80">Pregame</h2>
                </div>
            )}

            {activeScreen === "games" && (
                <div className="w-full h-full bg-green-50 flex flex-col items-center justify-center p-1 text-center">
                    <h2 className="text-xs md:text-sm font-black text-green-800 uppercase">🎲 Game Active</h2>
                </div>
            )}

            {activeScreen === "qr" && (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center px-2 py-1 gap-4">
                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-[8px] font-bold text-gray-800 uppercase mb-0.5">Winners QR</h2>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${encodeURIComponent(`${baseUrl}/${eventSlug}/memory`)}`} alt="Memory QR" className="w-12 h-12 rounded-sm border border-gray-200" />
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <h2 className="text-[8px] font-bold text-blue-600 uppercase mb-0.5">Photo Drop</h2>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${encodeURIComponent(`${baseUrl}/${eventSlug}/upload`)}`} alt="Upload QR" className="w-12 h-12 rounded-sm border border-gray-200" />
                    </div>
                </div>
            )}
        </div>

        <div className="flex-grow flex flex-col mt-1">
            {activeScreen === "raffle" && (
                <button onClick={async () => { if(channel) await channel.send({ type: "broadcast", event: "reset" }); setPrizeDisplayed(false); setTimerStatus("idle"); }} className="w-full py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-sm text-[10px] font-bold uppercase transition-all border border-gray-300">
                    📺 Clear TV Screen
                </button>
            )}
        </div>
    </div>
  );
}