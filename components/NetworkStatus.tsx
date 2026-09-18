"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export default function NetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <div className={online ? "network-status online" : "network-status offline"} aria-live="polite">
      {online ? <Wifi size={14} /> : <WifiOff size={14} />}
      <span>{online ? "Online" : "Offline"}</span>
    </div>
  );
}
