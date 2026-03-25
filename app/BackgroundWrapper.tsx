"use client";

import { useEffect, useState } from "react";
// This imports a tool to read the current URL
import { usePathname } from "next/navigation"; 
import { supabase } from "../lib/supabaseClient";

export default function BackgroundWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // e.g., returns "/guest" or "/admin"
  const [mainBgUrl, setMainBgUrl] = useState<string | null>(null);
  const [guestBgUrl, setGuestBgUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchBackgrounds = async () => {
      const { data } = await supabase
        .from("global_settings")
        .select("background_photo_url, guest_background_url")
        .eq("id", 1)
        .single();

      if (data) {
        setMainBgUrl(data.background_photo_url);
        setGuestBgUrl(data.guest_background_url);
      }
    };

    fetchBackgrounds();
  }, []);

  // THE LOGIC: Is the user on the guest page? 
  const isGuestPage = pathname?.startsWith("/guest");
  
  // Decide which URL to use based on the page
  const activeBackground = isGuestPage ? guestBgUrl : mainBgUrl;

  return (
    <div
      style={{
        backgroundImage: activeBackground ? `url(${activeBackground})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}