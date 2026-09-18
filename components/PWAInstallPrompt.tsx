"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);\n  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIos(isIos && !standalone);

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setInstallEvent(null);
      setVisible(false);
    });

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setInstallEvent(null);
  }

  if (dismissed || (!visible && !ios)) return null;

  return (
    <aside className="pwa-install" aria-live="polite">
      <button className="pwa-close" onClick={() => { setVisible(false); setDismissed(true); }} aria-label="Fechar">
        <X size={16} />
      </button>
      <div className="pwa-install-icon"><Download size={19} /></div>
      <div className="pwa-install-copy">
        <b>Instale o ESTOQUE</b>
        {installEvent ? (
          <span>Use como aplicativo e continue trabalhando mesmo sem internet.</span>
        ) : (
          <span>No iPhone/iPad, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</span>
        )}
      </div>
      {installEvent && <button className="pwa-install-btn" onClick={install}>Instalar</button>}
    </aside>
  );
}
