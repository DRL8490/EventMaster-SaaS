"use client";
import React from "react";

export default function DjBoard({ playSound }: any) {
  return (
    <div className="w-[15%] h-screen sticky top-0 bg-gray-900 border-l-8 border-gray-800 flex flex-col p-4 shadow-2xl z-50">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 text-center border-b-2 border-gray-800 pb-4">🎛️ DJ Board</h2>
        <div className="flex flex-col gap-4 flex-grow justify-start">
            <button onClick={() => playSound("dj-1.mp3")} className="py-6 flex flex-col items-center justify-center bg-red-500 hover:bg-red-600 rounded-2xl shadow-[0_6px_0_rgb(185,28,28)] active:shadow-none active:translate-y-1 transition-all text-white uppercase">
                <span className="text-3xl mb-1">🚨</span><span className="text-[10px] font-black tracking-widest">Airhorn</span>
            </button>
            <button onClick={() => playSound("dj-2.mp3")} className="py-6 flex flex-col items-center justify-center bg-blue-500 hover:bg-blue-600 rounded-2xl shadow-[0_6px_0_rgb(29,78,216)] active:shadow-none active:translate-y-1 transition-all text-white uppercase">
                <span className="text-3xl mb-1">🎶</span><span className="text-[10px] font-black tracking-widest">Beat Drop</span>
            </button>
            <button onClick={() => playSound("dj-3.mp3")} className="py-6 flex flex-col items-center justify-center bg-green-500 hover:bg-green-600 rounded-2xl shadow-[0_6px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition-all text-white uppercase">
                <span className="text-3xl mb-1">👏</span><span className="text-[10px] font-black tracking-widest">Cheer</span>
            </button>
            <button onClick={() => playSound("dj-4.mp3")} className="py-6 flex flex-col items-center justify-center bg-yellow-400 hover:bg-yellow-500 rounded-2xl shadow-[0_6px_0_rgb(161,98,7)] active:shadow-none active:translate-y-1 transition-all text-yellow-900 uppercase">
                <span className="text-3xl mb-1">🥁</span><span className="text-[10px] font-black tracking-widest">Drumroll</span>
            </button>
        </div>
    </div>
  );
}