"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SuppliersTab({ suppliers, executeDbAction }: { suppliers: any[], executeDbAction: any }) {
  // These states used to clutter the main page. Now they live ONLY here!
  const [newSupplier, setNewSupplier] = useState({ supply_name: "", description: "", supplier_name: "", contacts: "", assigned_to: "", full_amount: "", due_date: "" });
  const [activePaymentModal, setActivePaymentModal] = useState<number | null>(null);
  const [newPayment, setNewPayment] = useState({ amount: "", due_date: "", date_paid: "", payment_via: "Cash" });
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [editSupplierData, setEditSupplierData] = useState({ description: "", contacts: "", due_date: "" });

  const handleAddSupplier = async (e: React.FormEvent) => {
      e.preventDefault();
      await executeDbAction(supabase.from("suppliers").insert([{ ...newSupplier, due_date: newSupplier.due_date || null }]));
      setNewSupplier({ supply_name: "", description: "", supplier_name: "", contacts: "", assigned_to: "", full_amount: "", due_date: "" });
  };

  const handleAddPayment = async (e: React.FormEvent) => {
      e.preventDefault();
      await executeDbAction(supabase.from("supplier_payments").insert([{ 
          supplier_id: activePaymentModal, amount: newPayment.amount, due_date: newPayment.due_date || null, date_paid: newPayment.date_paid || null, payment_via: newPayment.payment_via 
      }]));
      setActivePaymentModal(null);
      setNewPayment({ amount: "", due_date: "", date_paid: "", payment_via: "Cash" });
  };

  const handleEditSupplierClick = (sup: any) => {
      setEditingSupplierId(sup.id);
      setEditSupplierData({ description: sup.description || "", contacts: sup.contacts || "", due_date: sup.due_date || "" });
  };

  const handleSaveSupplier = async (id: number) => {
      await executeDbAction(supabase.from("suppliers").update({ description: editSupplierData.description, contacts: editSupplierData.contacts, due_date: editSupplierData.due_date || null }).eq("id", id));
      setEditingSupplierId(null);
  };

  const getAlertStatus = (dueDate: string, balance: number) => {
      if (!dueDate || balance <= 0) return null;
      const today = new Date();
      const due = new Date(dueDate);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { label: "🔴 OVERDUE", color: "text-red-600 bg-red-100 border-red-200" };
      if (diffDays <= 7) return { label: "🟡 DUE SOON", color: "text-yellow-700 bg-yellow-100 border-yellow-300" };
      return null;
  };

  const totalBudget = suppliers.reduce((sum, s) => sum + Number(s.full_amount), 0);
  const totalPaid = suppliers.reduce((sum, s) => sum + (s.supplier_payments?.reduce((ps: number, p: any) => ps + Number(p.amount), 0) || 0), 0);
  const totalBalance = totalBudget - totalPaid;

  return (
    <div className="animate-in fade-in duration-300">
        <h2 className="text-2xl font-black text-gray-800 uppercase mb-6 pb-4 border-b-2">📦 Supplier & Budget Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-3xl text-center shadow-sm">
                <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Total Budget</p>
                <p className="text-4xl font-black text-blue-800">₱{totalBudget.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 border-2 border-green-200 p-6 rounded-3xl text-center shadow-sm">
                <p className="text-xs font-black text-green-500 uppercase tracking-widest mb-1">Total Paid</p>
                <p className="text-4xl font-black text-green-800">₱{totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl text-center shadow-sm">
                <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-1">Total Balance</p>
                <p className="text-4xl font-black text-red-800">₱{totalBalance.toLocaleString()}</p>
            </div>
        </div>

        <form onSubmit={handleAddSupplier} className="bg-purple-50 p-6 rounded-3xl border border-purple-200 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-full mb-2"><h3 className="font-black text-purple-800 uppercase tracking-widest text-sm">➕ Add New Supplier</h3></div>
            <div><label className="text-[10px] font-black uppercase text-purple-600 ml-1">Supply Name *</label><input required type="text" className="w-full p-3 rounded-xl border-2 border-purple-200 font-bold outline-none focus:border-purple-500" value={newSupplier.supply_name} onChange={e => setNewSupplier({...newSupplier, supply_name: e.target.value})} /></div>
            <div><label className="text-[10px] font-black uppercase text-purple-600 ml-1">Supplier/Company Name</label><input type="text" className="w-full p-3 rounded-xl border-2 border-purple-200 font-bold outline-none focus:border-purple-500" value={newSupplier.supplier_name} onChange={e => setNewSupplier({...newSupplier, supplier_name: e.target.value})} /></div>
            <div><label className="text-[10px] font-black uppercase text-purple-600 ml-1">Assigned To (Host)</label><input type="text" className="w-full p-3 rounded-xl border-2 border-purple-200 font-bold outline-none focus:border-purple-500" value={newSupplier.assigned_to} onChange={e => setNewSupplier({...newSupplier, assigned_to: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-purple-600 ml-1">Description / Notes</label><input type="text" className="w-full p-3 rounded-xl border-2 border-purple-200 font-bold outline-none focus:border-purple-500" value={newSupplier.description} onChange={e => setNewSupplier({...newSupplier, description: e.target.value})} /></div>
            <div><label className="text-[10px] font-black uppercase text-purple-600 ml-1">Contact Info</label><input type="text" className="w-full p-3 rounded-xl border-2 border-purple-200 font-bold outline-none focus:border-purple-500" value={newSupplier.contacts} onChange={e => setNewSupplier({...newSupplier, contacts: e.target.value})} /></div>
            <div><label className="text-[10px] font-black uppercase text-purple-600 ml-1">Master Due Date</label><input type="date" className="w-full p-3 rounded-xl border-2 border-purple-200 font-bold outline-none focus:border-purple-500" value={newSupplier.due_date} onChange={e => setNewSupplier({...newSupplier, due_date: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="text-[10px] font-black uppercase text-purple-600 ml-1">Full Amount Due (₱)</label><input required type="number" className="w-full p-3 rounded-xl border-2 border-purple-200 font-black text-lg outline-none focus:border-purple-500" value={newSupplier.full_amount} onChange={e => setNewSupplier({...newSupplier, full_amount: e.target.value})} /></div>
            <div className="col-span-full flex items-end"><button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black p-4 rounded-xl uppercase shadow-md transition-all">Save Supplier</button></div>
        </form>

        <div className="space-y-6">
            {suppliers.length === 0 && <p className="text-center text-gray-400 font-bold py-10">No suppliers added yet.</p>}
            {suppliers.map(sup => {
                const totalPaid = sup.supplier_payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
                const balance = Number(sup.full_amount) - totalPaid;
                const alert = getAlertStatus(sup.due_date, balance);

                return (
                <div key={sup.id} className="bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b-2 border-gray-100">
                        <div>
                            <div className="flex items-center gap-3 mb-1"><h3 className="text-2xl font-black text-gray-800 uppercase">{sup.supply_name}</h3>{alert && <span className={`px-2 py-1 rounded border text-[10px] font-black tracking-widest ${alert.color} animate-pulse`}>{alert.label}</span>}</div>
                            <p className="font-bold text-gray-500 text-sm">Vendor: <span className="text-blue-600">{sup.supplier_name || "N/A"}</span> | Host: <span className="text-purple-600">{sup.assigned_to || "N/A"}</span></p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Financials</p>
                            <p className="font-black text-xl text-gray-800">₱{Number(sup.full_amount).toLocaleString()}</p>
                            <p className={`font-bold text-sm ${balance <= 0 ? 'text-green-500' : 'text-red-500'}`}>{balance <= 0 ? "✅ Fully Paid" : `Balance: ₱${balance.toLocaleString()}`}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-2xl text-sm font-medium text-gray-600 relative">
                            {editingSupplierId === sup.id ? (
                                <div className="space-y-3">
                                    <div><label className="text-[10px] font-black uppercase text-gray-500">Notes</label><input type="text" className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold" value={editSupplierData.description} onChange={e => setEditSupplierData({...editSupplierData, description: e.target.value})} /></div>
                                    <div><label className="text-[10px] font-black uppercase text-gray-500">Contact</label><input type="text" className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold" value={editSupplierData.contacts} onChange={e => setEditSupplierData({...editSupplierData, contacts: e.target.value})} /></div>
                                    <div><label className="text-[10px] font-black uppercase text-gray-500">Master Due Date</label><input type="date" className="w-full p-2 border-2 border-gray-300 rounded-lg font-bold" value={editSupplierData.due_date} onChange={e => setEditSupplierData({...editSupplierData, due_date: e.target.value})} /></div>
                                    <div className="flex gap-2"><button onClick={() => handleSaveSupplier(sup.id)} className="bg-green-500 text-white font-bold px-3 py-1 rounded-lg text-xs">Save</button><button onClick={() => setEditingSupplierId(null)} className="bg-gray-300 text-gray-700 font-bold px-3 py-1 rounded-lg text-xs">Cancel</button></div>
                                </div>
                            ) : (
                                <>
                                    <button onClick={() => handleEditSupplierClick(sup)} className="absolute top-2 right-2 text-blue-500 hover:text-blue-700 text-xs font-black bg-white px-2 py-1 rounded border shadow-sm transition-all">✏️ Edit Details</button>
                                    <p><strong>📝 Notes:</strong> {sup.description || "None"}</p><p className="mt-2"><strong>📞 Contact:</strong> {sup.contacts || "None"}</p><p className="mt-2"><strong>📅 Due Date:</strong> {sup.due_date || "Not set"}</p>
                                </>
                            )}
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 relative">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-black text-blue-800 uppercase text-xs tracking-widest">💳 Payment Logs</h4>
                                <button onClick={() => setActivePaymentModal(activePaymentModal === sup.id ? null : sup.id)} className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700">+ Add Payment</button>
                            </div>
                            {activePaymentModal === sup.id && (
                                <form onSubmit={handleAddPayment} className="bg-white p-4 rounded-xl shadow-lg border-2 border-blue-200 mb-4 animate-in zoom-in-95 duration-200">
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div><label className="text-[10px] font-black uppercase text-gray-500">Amount Paid</label><input required type="number" className="w-full p-2 rounded-lg border-2 border-gray-200 text-sm font-bold outline-none" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} /></div>
                                        <div><label className="text-[10px] font-black uppercase text-gray-500">Method</label><select className="w-full p-2 rounded-lg border-2 border-gray-200 text-sm font-bold outline-none bg-white" value={newPayment.payment_via} onChange={e => setNewPayment({...newPayment, payment_via: e.target.value})}><option>GCash</option><option>Maya</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option></select></div>
                                        <div><label className="text-[10px] font-black uppercase text-gray-500">Due Date</label><input type="date" className="w-full p-2 rounded-lg border-2 border-gray-200 text-sm font-bold outline-none" value={newPayment.due_date} onChange={e => setNewPayment({...newPayment, due_date: e.target.value})} /></div>
                                        <div><label className="text-[10px] font-black uppercase text-gray-500">Date Paid</label><input type="date" className="w-full p-2 rounded-lg border-2 border-gray-200 text-sm font-bold outline-none" value={newPayment.date_paid} onChange={e => setNewPayment({...newPayment, date_paid: e.target.value})} /></div>
                                    </div>
                                    <div className="flex gap-2"><button type="submit" className="flex-1 bg-green-500 text-white font-black text-xs py-2 rounded-lg">Save Payment</button><button type="button" onClick={() => setActivePaymentModal(null)} className="flex-1 bg-gray-200 text-gray-600 font-black text-xs py-2 rounded-lg">Cancel</button></div>
                                </form>
                            )}
                            {(!sup.supplier_payments || sup.supplier_payments.length === 0) ? (
                                <p className="text-xs text-blue-400 font-bold italic">No payments logged yet.</p>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {sup.supplier_payments.map((p: any) => (
                                        <div key={p.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center text-sm border border-gray-100">
                                            <div><p className="font-black text-green-600">₱{Number(p.amount).toLocaleString()} <span className="text-gray-400 font-medium text-xs ml-1">via {p.payment_via}</span></p><p className="text-[10px] font-bold text-gray-400 uppercase">Paid: {p.date_paid || "TBD"} {p.due_date && `| Due: ${p.due_date}`}</p></div>
                                            <button onClick={() => window.confirm("Delete payment?") && executeDbAction(supabase.from("supplier_payments").delete().eq("id", p.id))} className="text-red-400 hover:text-red-600 text-xs font-bold">🗑️</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 text-right"><button onClick={() => window.confirm(`Delete completely?`) && executeDbAction(supabase.from("suppliers").delete().eq("id", sup.id))} className="text-red-500 hover:bg-red-50 text-xs font-bold px-3 py-1 rounded-lg transition-all">🗑️ Delete Supplier</button></div>
                </div>
            )})}
        </div>
    </div>
  );
}