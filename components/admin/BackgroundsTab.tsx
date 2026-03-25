"use client";
import React from "react";

export default function BackgroundsTab({ bgUrls, files, setFiles, handleUpdateBackgrounds, uploadingBg }: any) {
  return (
    <div className="animate-in fade-in duration-300 space-y-8">
        <h2 className="text-2xl font-black text-gray-800 uppercase mb-4 pb-4 border-b-2">Background Settings</h2>
        {[
          { id: "landscape", label: "PC/TV Background (Landscape 16:9)", desc: "1920x1080px. Max 1MB.", color: "blue", url: bgUrls.landscape, file: files.landscape },
          { id: "portrait", label: "Phone Background (Portrait 9:16)", desc: "1080x1920px. Max 1MB.", color: "purple", url: bgUrls.portrait, file: files.portrait }
        ].map((upload: any) => (
            <div key={upload.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                <label className="block text-[13px] font-black text-gray-800 uppercase mb-2">{upload.label}</label>
                <p className="text-xs text-gray-500 mb-4 font-bold">{upload.desc}</p>
                {upload.url && !upload.file && <div className="mb-4 text-sm font-bold text-green-600">✅ Active</div>}
                <input 
                    type="file" accept="image/*" 
                    onChange={e => setFiles({...files, [upload.id]: e.target.files?.[0] || null})} 
                    className={`w-full text-sm text-gray-500 cursor-pointer file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:font-black file:uppercase file:bg-${upload.color}-50 file:text-${upload.color}-700 hover:file:bg-${upload.color}-100`} 
                />
            </div>
        ))}
        <button 
            onClick={handleUpdateBackgrounds} 
            disabled={uploadingBg || (!files.landscape && !files.portrait)} 
            className={`w-full py-5 rounded-2xl font-black text-2xl shadow-xl transition-all ${(uploadingBg || (!files.landscape && !files.portrait)) ? "bg-gray-300 text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"}`}
        >
            {uploadingBg ? "⏳ Uploading..." : "Upload & Apply Backgrounds"}
        </button>
    </div>
  );
}