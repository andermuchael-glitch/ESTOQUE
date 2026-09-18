"use client";

import { useEffect } from "react";

const BASE_PATH = "/ESTOQUE";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          `${BASE_PATH}/sw.js`,
          { scope: `${BASE_PATH}/` }
        );
        await registration.update();
      } catch (error) {
        console.warn("Não foi possível registrar o PWA:", error);
      }
    };

    void register();
  }, []);

  return null;
}
