"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  onDetected: (value: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const scannerRef = useRef<any>(null);
  const startedRef = useRef(false);
  const detectedRef = useRef(onDetected);
  const closeRef = useRef(onClose);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    detectedRef.current = onDetected;
    closeRef.current = onClose;
  }, [onDetected, onClose]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

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
            detectedRef.current(result.code.trim());
            closeRef.current();
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
            detectedRef.current(decodedText.trim());
            try {
              await scanner.stop();
            } catch {}
            scanner.clear();
            closeRef.current();
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
  }, []);

  function submitManualCode() {
    const code = manualCode.trim();
    if (!code) {
      setError("Digite um código para continuar.");
      return;
    }
    detectedRef.current(code);
    closeRef.current();
  }

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
      <div className="scanner-manual">
        <div className="scanner-manual-title">
          <b>Não conseguiu ler?</b>
          <span>Digite o código manualmente para continuar o cadastro.</span>
        </div>
        <div className="scanner-manual-row">
          <input
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") submitManualCode();
            }}
            placeholder="Digite o código de barras ou QR"
            inputMode="numeric"
          />
          <button type="button" onClick={submitManualCode}>Continuar</button>
        </div>
      </div>
      <small className="scanner-note">Se a câmera não funcionar, você pode informar o código manualmente. No Android, a leitura usa o scanner nativo; no navegador, usa a câmera do dispositivo.</small>
    </section>
  );
}
