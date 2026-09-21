"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");

        if (Capacitor.getPlatform() === "android") {
          const { CapacitorBarcodeScanner } = await import("capacitor-barcode-scanner");
          setStarting(false);

          const result = await CapacitorBarcodeScanner.scan();

          if (!mounted) return;

          if (result?.result && result.code?.trim()) {
            onDetected(result.code.trim());
            onClose();
          } else if (mounted) {
            setError("Nenhum código foi lido.");
          }

          return;
        }

        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted) return;

        const scanner = new Html5Qrcode("estoque-barcode-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 180 },
            aspectRatio: 1.777,
          },
          async (decodedText: string) => {
            onDetected(decodedText.trim());
            try {
              await scanner.stop();
            } catch {}
            scanner.clear();
            onClose();
          },
          () => {}
        );

        if (mounted) setStarting(false);
      } catch (err) {
        console.error("Falha no leitor de código:", err);
        if (mounted) {
          setStarting(false);
          setError("Não foi possível abrir o leitor. Verifique a permissão da câmera e tente novamente.");
        }
      }
    };

    void start();

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => {
          try { scanner.clear(); } catch {}
        });
      }
    };
  }, [onClose, onDetected]);

  return (
    <section className="scanner-panel panel">
      <div className="panel-head">
        <div>
          <h2>Leitor de código</h2>
          <p>Aponte a câmera para um código de barras ou QR Code.</p>
        </div>
        <button onClick={onClose}><X size={16} /> Fechar</button>
      </div>
      <div className="scanner-box">
        <div id="estoque-barcode-reader" />
        {starting && <div className="scanner-message"><Camera size={18} /> Abrindo leitor…</div>}
        {error && (
          <div className="scanner-error">
            <Camera size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>
      <small className="scanner-note">No Android, a leitura usa o scanner nativo; no navegador, usa a câmera do dispositivo.</small>
    </section>
  );
}
