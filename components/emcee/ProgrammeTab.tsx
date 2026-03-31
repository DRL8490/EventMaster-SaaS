"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ProgrammeTab({ eventId, items, fetchData, executeDbAction }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: "", time_label: "", description: "" });

  // NEW SAAS FEATURE: Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sort items safely by order_index
  const sortedItems = [...(items || [])].sort((a, b) => a.order_index - b.order_index);

  const resetForm = () => {
      setFormData({ title: "", time_label: "", description: "" });
      setIsAdding(false);
      setEditingId(null);
  };

  const handleSave = async () => {
      if (!formData.title) return alert("Title is required!");

      if (editingId) {
          await executeDbAction(supabase.from("programme_items").update({
              title: formData.title,
              time_label: formData.time_label,
              description: formData.description
          }).eq("id", editingId));
      } else {
          // Put new items at the bottom of the list
          const nextOrderIndex = sortedItems.length > 0 ? sortedItems[sortedItems.length - 1].order_index + 1 : 0;
          await executeDbAction(supabase.from("programme_items").insert([{
              event_id: eventId,
              title: formData.title,
              time_label: formData.time_label,
              description: formData.description,
              order_index: nextOrderIndex
          }]));
      }
      resetForm();
  };

  // --- DRAG AND DROP LOGIC ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      // Slight delay to allow the ghost image to generate before fading the original
      setTimeout(() => {
          (e.target as HTMLElement).style.opacity = "0.4";
      }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
      (e.target as HTMLElement).style.opacity = "1";
      setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === dropIndex) return;

      // 1. Create a copy of the array and reorder it locally
      const newItems = [...sortedItems];
      const [draggedItem] = newItems.splice(draggedIndex, 1);
      newItems.splice(dropIndex, 0, draggedItem);

      // 2. Loop through the newly ordered array and update any rows where the index changed
      for (let i = 0; i < newItems.length; i++) {
          if (newItems[i].order_index !== i) {
              await supabase.from("programme_items").update({ order_index: i }).eq("id", newItems[i].id);
          }
      }
      
      // 3. Refresh the UI with the final database state
      fetchData();
  };

  return (
    <div className="animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2">
            <h2 className="text-2xl font-black text-gray-800 uppercase">📅 Event Programme</h2>
            <button 
                onClick={() => { resetForm(); setIsAdding(true); }} 
                className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-all shadow-md"
            >
                + Add Item
            </button>
        </div>

        {/* ADD / EDIT FORM */}
        {(isAdding || editingId) && (
            <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100 mb-6 shadow-inner animate-in slide-in-from-top-2">
                <h3 className="font-black text-blue-800 uppercase mb-4 text-sm tracking-widest">{editingId ? "Edit Item" : "New Programme Item"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Title / Activity</label>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full p-3 rounded-xl border-2 border-blue-200 font-bold outline-none focus:border-blue-500" placeholder="e.g. Welcome Remarks" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Time / Duration</label>
                        <input type="text" value={formData.time_label} onChange={(e) => setFormData({...formData, time_label: e.target.value})} className="w-full p-3 rounded-xl border-2 border-blue-200 font-bold outline-none focus:border-blue-500" placeholder="e.g. 5:00 PM or 15 mins" />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Notes / Description (Optional)</label>
                        <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-3 rounded-xl border-2 border-blue-200 font-medium outline-none focus:border-blue-500" placeholder="e.g. Host introduces the parents..." rows={2} />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={resetForm} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition-all">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-md transition-all">✅ Save Item</button>
                </div>
            </div>
        )}

        {/* DRAGGABLE PROGRAMME LIST */}
        <div className="space-y-3">
            {sortedItems.map((item, index) => (
                <div 
                    key={item.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="bg-white border-2 border-gray-100 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300 cursor-grab active:cursor-grabbing"
                >
                    
                    {/* UPDATED Left Side: Drag Handle & Order Number */}
                    <div className="flex items-center gap-4 w-full md:w-auto border-b md:border-b-0 pb-3 md:pb-0 border-gray-100">
                        <span className="text-gray-300 hover:text-gray-500 font-black text-2xl px-1">⋮⋮</span>
                        <div className="bg-blue-100 border-2 border-blue-200 text-blue-700 font-black w-10 h-10 rounded-full flex items-center justify-center shadow-inner text-lg">
                            {index + 1}
                        </div>
                    </div>

                    {/* Middle: Info */}
                    <div className="flex-1 w-full text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                            {item.time_label && <span className="bg-blue-100 text-blue-800 font-black text-xs px-2 py-1 rounded-md uppercase tracking-widest w-max mx-auto md:mx-0 border border-blue-200">{item.time_label}</span>}
                            <h4 className="font-black text-lg text-gray-800">{item.title}</h4>
                        </div>
                        {item.description && <p className="text-sm font-medium text-gray-500">{item.description}</p>}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex gap-2 w-full md:w-auto justify-center">
                        <button onClick={() => { setEditingId(item.id); setFormData({ title: item.title, time_label: item.time_label || "", description: item.description || "" }); setIsAdding(false); }} className="text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg transition-all border border-blue-100 hover:border-blue-600">✏️ Edit</button>
                        <button onClick={() => window.confirm(`Delete ${item.title}?`) && executeDbAction(supabase.from("programme_items").delete().eq("id", item.id))} className="text-red-600 font-bold text-xs bg-red-50 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg transition-all border border-red-100 hover:border-red-500">🗑️</button>
                    </div>
                </div>
            ))}
            
            {sortedItems.length === 0 && !isAdding && (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-4xl mb-2">📝</p>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Schedule is empty</p>
                </div>
            )}
        </div>
    </div>
  );
}