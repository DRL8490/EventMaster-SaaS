"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentBg, setCurrentBg] = useState("");

  useEffect(() => {
    // Detect if the user is on a phone/tablet or a large TV screen
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    const syncBackground = async () => {
        // 1. Initial Load: Grab the current background from the database
        const { data } = await supabase.from("raffle_config").select("landscape_url, portrait_url").single();
        if (data) {
            setCurrentBg(isMobile ? data.portrait_url : data.landscape_url);
        }

        // 2. Real-time Antenna: Listen for the Admin page to broadcast a new image
        const bgChannel = supabase.channel("bg_sync");
        bgChannel.on("broadcast", { event: "apply_bg" }, (payload) => {
          setCurrentBg(isMobile ? payload.payload.portrait : payload.payload.landscape);
        }).subscribe();
    };

    syncBackground();

    // Cleanup the antenna when the page closes
    return () => {
      supabase.channel("bg_sync").unsubscribe();
    };
  }, []);

return (
    <html lang="en">
      <body className={inter.className}>
        {/* FIX: Moved background to a behind-layer (-z-10) to allow scrolling! */}
        <div 
          className="fixed inset-0 -z-10 transition-all duration-1000 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${currentBg})` }}
        />
        
        {/* FIX: Relative wrapper that allows pages to be as tall as they need to be */}
        <div className="relative w-full min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}