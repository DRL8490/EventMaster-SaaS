"use client";
import React from "react";
import { supabase } from "../../lib/supabaseClient";

export default function GuestRoster({ loading, guests, pendingProofGuest, handleUploadProof, fetchData }: any) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-gray-200">
      <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">📋 Guest Roster & Proofs</h2>
      {loading ? <p className="text-center text-gray-500 font-bold py-8">Loading...</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                  <th className="p-3 rounded-tl-xl">Guest</th>
                  <th className="p-3 text-center">Referral</th>
                  <th className="p-3 text-center rounded-tr-xl">Status & Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guests.map((guest: any) => (
                <tr key={guest.id} className={`hover:bg-gray-50 ${pendingProofGuest && pendingProofGuest.id === guest.id ? 'bg-red-50' : ''}`}>
                  <td className="p-3 flex items-center gap-3">
                    <img src={guest.photo_url || ""} alt="Guest Selfie" className="w-12 h-12 rounded-xl object-cover border-2 shadow-sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-blue-600 text-lg leading-tight">{guest.nickname}</p>
                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[9px] font-black uppercase">{guest.category || 'Adults'}</span>
                      </div>
                      <p className="font-bold text-gray-400 text-xs mt-0.5">{guest.full_name}</p>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                      <span className="font-bold text-gray-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 text-[10px] uppercase tracking-widest">{guest.referral || "None"}</span>
                  </td>
                  <td className="p-3 text-center">
                    {guest.status === "won" ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-purple-200">🏆 {guest.prize_won}</span>
                        {guest.proof_url ? (
                            <img src={guest.proof_url} alt="Prize Proof" className="w-12 h-12 rounded-xl object-cover border-2 border-green-400 mt-1" />
                        ) : (
                            <div className="mt-1">
                                <input type="file" accept="image/*" capture="environment" id={`proof-${guest.id}`} className="hidden" onChange={(e) => { if(e.target.files?.[0]) handleUploadProof(guest.id, e.target.files[0]); }} />
                                <label htmlFor={`proof-${guest.id}`} className="bg-red-500 text-white shadow-md text-[10px] font-black px-4 py-2 rounded cursor-pointer border border-red-600 hover:bg-red-600 inline-block animate-pulse">📸 UPLOAD PROOF</label>
                            </div>
                        )}
                      </div>
                    ) : guest.status === "ineligible" ? (
                      <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] font-black uppercase border border-gray-300">Ineligible</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-black uppercase">Eligible</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}