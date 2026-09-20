"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  CalendarDays,
  Camera,
  CloudOff,
  FileText,
  Home as HomeIcon,
  Menu,
  Minus,
  Moon,
  Package,
  PackagePlus,
  Plus,
  Search,
  Settings,
  Smartphone,
  Sun,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import BarcodeScanner from "../components/BarcodeScanner";
import NetworkStatus from "../components/NetworkStatus";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import { useOfflineStorage } from "../hooks/useOfflineStorage";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { queueSyncOperation } from "../lib/sync";

const INITIAL: string[] = [];

type Item = {
  id: number;
  name: string;
  qty: number;
  min: number;
  code: string;
};

type Move = {
  id: number;
  name: string;
  delta: number;
  date: string;
  itemId?: number;
};

const DEFAULT_ITEMS: Item[] = INITIAL.map((name, i) => ({
  id: i + 1,
  name,
  qty: 0,
  min: 1,
  code: "",
}));

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  const {
    value: items,
    setValue: setItems,
    hydrated: itemsReady,
  } = useOfflineStorage<Item[]>("estoque-items-v3", DEFAULT_ITEMS);

  const {
    value: moves,
    setValue: setMoves,
    hydrated: movesReady,
  } = useOfflineStorage<Move[]>("estoque-moves", []);

  const { pendingCount, syncing, lastSync, syncNow } = useOfflineSync();

  useEffect(() => {
    if (!itemsReady) return;
    setItems(current => current.map(item => ({ ...item, code: item.code || "" })));
  }, [itemsReady]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [showHistory, setShowHistory] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newQty, setNewQty] = useState("0");
  const [newMin, setNewMin] = useState("1");

  useEffect(() => {
    const authenticatedStorage = window.localStorage.getItem("estoque-authenticated") === "true";
    setAuthenticated(authenticatedStorage);
    setAuthReady(true);
  }, []);

  async function hashPassword(value: string) {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");

    const clean = email.trim().toLowerCase();
    if (!clean || !password) {
      setAuthError("Informe e-mail e senha.");
      return;
    }

    const stored = localStorage.getItem("estoque-user");
    const hashed = await hashPassword(password);

    if (showRegister) {
      if (password.length < 6) {
        setAuthError("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (stored) {
        setAuthError("Já existe um acesso neste aparelho. Entre com ele.");
        setShowRegister(false);
        return;
      }
      localStorage.setItem(
        "estoque-user",
        JSON.stringify({ email: clean, password: hashed })
      );
      localStorage.setItem("estoque-authenticated", "true");
      setAuthenticated(true);
      setPassword("");
      return;
    }

    if (!stored) {
      setAuthError("Nenhum acesso cadastrado neste aparelho. Clique em Criar acesso.");
      return;
    }

    try {
      const user = JSON.parse(stored);
      if (user.email === clean && user.password === hashed) {
        localStorage.setItem("estoque-authenticated", "true");
        setAuthenticated(true);
        setPassword("");
      } else {
        setAuthError("E-mail ou senha incorretos.");
      }
    } catch {
      setAuthError("Não foi possível validar o acesso.");
    }
  }

  function logout() {
    localStorage.removeItem("estoque-authenticated");
    setAuthenticated(false);
    setPassword("");
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return items.filter(item => {
      const matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.code || "").toLowerCase().includes(term);
      const matchesFilter = filter === "all" || item.qty < item.min;
      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  const lowItems = items.filter(item => item.qty < item.min);
  const total = items.reduce((sum, item) => sum + item.qty, 0);
  const okCount = items.length - lowItems.length;
  const today = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date());

  function move(id: number, delta: number) {
    const item = items.find(x => x.id === id);
    if (!item) return;

    setItems(current =>
      current.map(x =>
        x.id === id ? { ...x, qty: Math.max(0, x.qty + delta) } : x
      )
    );

    const movement: Move = {
      id: Date.now(),
      name: item.name,
      delta,
      itemId: item.id,
      date: new Date().toLocaleString("pt-BR"),
    };

    setMoves(current => [movement, ...current].slice(0, 200));

    queueSyncOperation("movement", {
      itemId: item.id,
      itemName: item.name,
      delta,
      createdAt: new Date().toISOString(),
    });
  }

  function adjust(id: number) {
    const item = items.find(x => x.id === id);
    if (!item) return;

    const value = window.prompt(
      `Quantidade atual (unidades) para ${item.name}:`,
      String(item.qty)
    );
    if (value === null) return;

    const qty = Math.max(0, Number(value));
    if (!Number.isFinite(qty)) return;

    const delta = qty - item.qty;
    setItems(current =>
      current.map(x => (x.id === id ? { ...x, qty } : x))
    );
    setMoves(current =>
      [
        {
          id: Date.now(),
          name: item.name,
          delta,
          itemId: item.id,
          date: new Date().toLocaleString("pt-BR"),
        },
        ...current,
      ].slice(0, 200)
    );

    queueSyncOperation("movement", {
      itemId: item.id,
      itemName: item.name,
      delta,
      quantityAfter: qty,
      createdAt: new Date().toISOString(),
    });
  }

  function setMin(id: number, value: number) {
    const min = Math.max(0, value);
    setItems(current =>
      current.map(item => (item.id === id ? { ...item, min } : item))
    );
    queueSyncOperation("minimum-updated", { itemId: id, min });
  }

  function setCode(id: number, code: string) {
    setItems(current =>
      current.map(item => (item.id === id ? { ...item, code } : item))
    );
  }

  function addMaterial(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim().toUpperCase();
    if (!name) return;

    const item: Item = {
      id: Date.now(),
      name,
      code: newCode.trim(),
      qty: Math.max(0, Number(newQty) || 0),
      min: Math.max(0, Number(newMin) || 0),
    };

    setItems(current => [...current, item]);
    queueSyncOperation("item-created", item as unknown as Record<string, unknown>);

    setNewName("");
    setNewCode("");
    setNewQty("0");
    setNewMin("1");
    setShowAddMaterial(false);
  }

  function handleScan(code: string) {
    const normalized = code.trim();
    const found = items.find(item => item.code && item.code === normalized);

    if (found) {
      setSearch(found.name);
      setFilter("all");
      return;
    }

    setNewCode(normalized);
    setShowAddMaterial(true);
  }

  function buildPdfReport() {
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();
    const dateLabel = now.toLocaleString("pt-BR");
    const fileName = `relatorio-estoque-${now.toISOString().slice(0, 10)}.pdf`;

    const addFooter = () => {
      const pages = doc.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(225, 230, 238);
        doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
        doc.setTextColor(115, 125, 140);
        doc.setFontSize(8);
        doc.text("ESTOQUE • Relatorio de materiais", margin, pageHeight - 7);
        doc.text(`Pagina ${page} de ${pages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
      }
    };

    // Cabecalho
    doc.setFillColor(9, 28, 58);
    doc.roundedRect(0, 0, pageWidth, 42, 0, 0, "F");
    doc.setFillColor(22, 131, 255);
    doc.roundedRect(margin, 9, 24, 24, 6, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("E", margin + 8.2, 25);
    doc.setFontSize(19);
    doc.text("RELATORIO DE ESTOQUE", margin + 32, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(190, 207, 230);
    doc.text("Visao geral dos materiais e situacao atual do estoque", margin + 32, 27);
    doc.text(dateLabel, pageWidth - margin, 18, { align: "right" });
    doc.text("Controle de materiais", pageWidth - margin, 27, { align: "right" });

    let y = 55;

    // Indicadores
    const cards = [
      ["MATERIAIS", String(items.length), [22, 131, 255]],
      ["UNIDADES", String(total), [24, 190, 140]],
      ["ATENCAO", String(lowItems.length), [238, 82, 91]],
      ["OK", String(okCount), [150, 91, 240]],
    ];
    const gap = 5;
    const cardWidth = (pageWidth - margin * 2 - gap * 3) / 4;

    cards.forEach(([label, value, rgb], index) => {
      const x = margin + index * (cardWidth + gap);
      doc.setFillColor(247, 249, 252);
      doc.setDrawColor(225, 230, 238);
      doc.roundedRect(x, y, cardWidth, 25, 4, 4, "FD");
      doc.setFillColor(Number(rgb[0]), Number(rgb[1]), Number(rgb[2]));
      doc.roundedRect(x, y, 3, 25, 2, 2, "F");
      doc.setTextColor(105, 116, 132);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(String(label), x + 9, y + 8);
      doc.setTextColor(25, 34, 48);
      doc.setFontSize(16);
      doc.text(String(value), x + 9, y + 19);
    });

    y += 36;
    doc.setTextColor(35, 45, 60);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SITUACAO DOS MATERIAIS", margin, y);
    y += 6;
    doc.setTextColor(110, 120, 135);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(
      lowItems.length
        ? `${lowItems.length} material(is) precisam de atencao por estarem abaixo do minimo.`
        : "Todos os materiais estao acima ou no minimo configurado.",
      margin,
      y
    );
    y += 9;

    const col = {
      material: margin,
      estoque: pageWidth - 73,
      minimo: pageWidth - 47,
      status: pageWidth - 24,
    };

    const drawTableHeader = () => {
      doc.setFillColor(235, 240, 247);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 2, 2, "F");
      doc.setTextColor(76, 88, 105);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("MATERIAL", col.material + 4, y + 6.5);
      doc.text("ESTOQUE", col.estoque, y + 6.5, { align: "right" });
      doc.text("MINIMO", col.minimo, y + 6.5, { align: "right" });
      doc.text("STATUS", col.status, y + 6.5, { align: "right" });
      y += 14;
    };

    drawTableHeader();

    items.forEach((item, index) => {
      if (y > pageHeight - 28) {
        doc.addPage();
        y = 18;
        drawTableHeader();
      }

      const isLow = item.qty < item.min;
      const isLimit = item.qty === item.min;
      const status = isLow ? "ATENCAO" : isLimit ? "NO LIMITE" : "OK";
      const statusColor = isLow ? [220, 63, 72] : isLimit ? [211, 139, 35] : [24, 170, 116];

      if (index % 2 === 0) {
        doc.setFillColor(250, 251, 253);
        doc.rect(margin, y - 4, pageWidth - margin * 2, 10, "F");
      }

      doc.setTextColor(35, 45, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const name = item.name.length > 58 ? `${item.name.slice(0, 55)}...` : item.name;
      doc.text(name, col.material + 4, y + 2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(70, 82, 100);
      doc.text(String(item.qty), col.estoque, y + 2, { align: "right" });
      doc.text(String(item.min), col.minimo, y + 2, { align: "right" });

      doc.setFillColor(Number(statusColor[0]), Number(statusColor[1]), Number(statusColor[2]));
      const statusWidth = status === "ATENCAO" ? 19 : status === "NO LIMITE" ? 24 : 10;
      doc.roundedRect(pageWidth - margin - statusWidth, y - 2, statusWidth, 7, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text(status, pageWidth - margin - statusWidth / 2, y + 2.8, { align: "center" });
      y += 10;
    });

    if (items.length === 0) {
      doc.setTextColor(110, 120, 135);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Nenhum material cadastrado.", margin + 4, y + 4);
      y += 14;
    }

    if (moves.length) {
      if (y > pageHeight - 82) {
        doc.addPage();
        y = 18;
      } else {
        y += 8;
      }

      doc.setTextColor(35, 45, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("MOVIMENTACOES RECENTES", margin, y);
      y += 6;
      doc.setTextColor(110, 120, 135);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("Ultimos lancamentos registrados no aplicativo.", margin, y);
      y += 9;

      moves.slice(0, 20).forEach((movement, index) => {
        if (y > pageHeight - 28) {
          doc.addPage();
          y = 18;
        }
        const sign = movement.delta > 0 ? "+" : "";
        const textLine = `${movement.date} • ${movement.name}: ${sign}${movement.delta} unidade(s)`;
        doc.setTextColor(movement.delta > 0 ? 24 : 210, movement.delta > 0 ? 150 : 70, movement.delta > 0 ? 105 : 80);
        doc.setFontSize(8);
        doc.text(textLine.length > 100 ? `${textLine.slice(0, 97)}...` : textLine, margin + 4, y);
        y += 7;
      });
    }

    addFooter();
    return {
      blob: doc.output("blob"),
      fileName,
    };
  }

  async function isNativeAndroid() {
    try {
      const { Capacitor } = await import("@capacitor/core");
      return Capacitor.getPlatform() === "android";
    } catch {
      return false;
    }
  }

  async function blobToBase64(blob: Blob) {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
  }

  async function sendPdfReport() {
    const { blob, fileName } = buildPdfReport();

    if (await isNativeAndroid()) {
      try {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const data = await blobToBase64(blob);

        await Filesystem.writeFile({
          path: "ESTOQUE/" + fileName,
          data,
          directory: Directory.Documents,
          recursive: true,
        });

        window.alert("PDF salvo em Documentos/ESTOQUE:\n" + fileName);
        return;
      } catch (error) {
        console.error("Falha ao salvar PDF no Android:", error);
        window.alert("Não foi possível salvar o PDF no aparelho. Tente novamente.");
        return;
      }
    }

    downloadPdfBlob(blob, fileName);
  }

  function downloadPdfBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function sharePdfReport() {
    const { blob, fileName } = buildPdfReport();

    if (await isNativeAndroid()) {
      try {
        const { Filesystem, Directory } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");
        const data = await blobToBase64(blob);

        await Filesystem.writeFile({
          path: fileName,
          data,
          directory: Directory.Cache,
        });

        const { uri } = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });

        await Share.share({
          title: "Relatório de estoque",
          text: "Relatório do estoque de materiais.",
          files: [uri],
          dialogTitle: "Compartilhar relatório",
        });
        return;
      } catch (error) {
        console.error("Falha ao compartilhar PDF no Android:", error);
        window.alert("Não foi possível abrir o compartilhamento do PDF.");
        return;
      }
    }

    const file = new File([blob], fileName, { type: "application/pdf" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: "Relatorio de estoque",
        text: "Relatorio do estoque de materiais.",
        files: [file],
      }).catch(() => {});
    } else {
      downloadPdfBlob(blob, fileName);
    }
  }

  function createBackup() {
    const backup = {
      version: 2,
      app: "ESTOQUE",
      createdAt: new Date().toISOString(),
      items,
      moves,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estoque-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function restoreBackup(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.items) || !Array.isArray(data.moves)) {
          throw new Error("Formato inválido");
        }

        const restored = data.items
          .filter(
            (item: any) =>
              item &&
              Number.isFinite(Number(item.id)) &&
              typeof item.name === "string"
          )
          .map((item: any) => ({
            id: Number(item.id),
            name: item.name,
            qty: Math.max(0, Number(item.qty) || 0),
            min: Math.max(0, Number(item.min) || 0),
            code: typeof item.code === "string" ? item.code : "",
          }));

        if (!restored.length) throw new Error("Backup sem materiais");

        setItems(restored);
        setMoves(data.moves);
        alert("Backup restaurado com sucesso.");
      } catch {
        alert(
          "Não foi possível restaurar este arquivo. Selecione um backup do ESTOQUE."
        );
      }
    };

    reader.readAsText(file);
  }

  if (!authReady || !itemsReady || !movesReady) return null;

  if (!authenticated) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-logo"><Boxes size={30} /></div>
          <h1>ESTOQUE</h1>
          <p>Controle de materiais por unidades</p>

          <form onSubmit={handleAuth}>
            <label>
              E-mail
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                autoComplete={showRegister ? "new-password" : "current-password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={showRegister ? "Mínimo 6 caracteres" : "Sua senha"}
              />
            </label>

            {authError && <div className="login-error">{authError}</div>}

            <button className="login-btn" type="submit">
              {showRegister ? "Criar acesso" : "Entrar"}
            </button>
          </form>

          <button
            className="login-switch"
            onClick={() => {
              setShowRegister(!showRegister);
              setAuthError("");
            }}
          >
            {showRegister ? "Já tenho acesso" : "Primeiro acesso? Criar acesso"}
          </button>

          <small>
            Seus dados permanecem neste aparelho. O aplicativo funciona offline
            e o backup pode ser usado para transferência.
          </small>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <PWAInstallPrompt />

      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="logo">
          <div className="logo-mark"><Boxes /></div>
          <div>
            <b>ESTOQUE</b>
            <span>CONTROLE DE MATERIAIS</span>
          </div>
        </div>

        <nav>
          <button className="nav-active" onClick={() => setMenuOpen(false)}>
            <HomeIcon />Início
          </button>
          <button onClick={() => setMenuOpen(false)}>
            <Package />Materiais
          </button>
          <button
            onClick={() => {
              setShowHistory(true);
              setShowReports(false);
              setShowSettings(false);
              setMenuOpen(false);
            }}
          >
            <ArrowLeftRight />Movimentações
          </button>
          <button
            onClick={() => {
              setShowReports(true);
              setShowHistory(false);
              setShowSettings(false);
              setMenuOpen(false);
            }}
          >
            <BarChart3 />Relatórios
          </button>
          <button
            onClick={() => {
              setShowSettings(true);
              setShowReports(false);
              setShowHistory(false);
              setMenuOpen(false);
            }}
          >
            <Settings />Configurações
          </button>
        </nav>

        <div className="sidebar-tip">
          <Boxes />
          <b>Organização hoje,<br />produção amanhã!</b>
        </div>

        <div className="sidebar-footer">
          ESTOQUE v2.0 PWA
          <br />
          <span>Offline-first</span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>

          <div>
            <h1>Bem-vindo!</h1>
            <p>
              Controle seu estoque de materiais por unidades de forma simples,
              rápida e offline.
            </p>
          </div>

          <div className="top-actions">
            <NetworkStatus />

            <div className="sync-status" title="Fila de sincronização">
              <CloudOff size={15} />
              <span>
                {syncing
                  ? "Sincronizando"
                  : pendingCount
                    ? `${pendingCount} pend.`
                    : "Local"}
              </span>
              {pendingCount > 0 && (
                <button onClick={() => void syncNow()} aria-label="Sincronizar agora">
                  ↻
                </button>
              )}
            </div>

            <button className="theme">
              <Sun size={17} />
              <Moon size={18} />
            </button>

            <button className="logout" onClick={logout}>Sair</button>

            <div className="date">
              <CalendarDays size={20} />
              <span>
                {today}
                <small>{lastSync ? `Última sync: ${lastSync}` : "Hoje"}</small>
              </span>
            </div>
          </div>
        </header>

        {lowItems.length > 0 && (
          <div className="alert">
            <AlertTriangle size={21} />
            <div>
              <b>Alerta de estoque baixo</b>
              <span>
                {lowItems.length} material(is) abaixo do estoque mínimo.
              </span>
            </div>
            <button onClick={() => setShowSettings(true)}>Ver limites</button>
          </div>
        )}

        <section className="stats">
          <div className="stat blue">
            <div className="stat-icon"><Boxes /></div>
            <div><span>Materiais cadastrados</span><b>{items.length}</b></div>
          </div>
          <div className="stat green">
            <div className="stat-icon"><Package /></div>
            <div><span>Total de unidades</span><b>{total}</b></div>
          </div>
          <div className="stat red">
            <div className="stat-icon"><AlertTriangle /></div>
            <div><span>Abaixo do mínimo</span><b>{lowItems.length}</b></div>
          </div>
          <div className="stat purple">
            <div className="stat-icon"><BarChart3 /></div>
            <div><span>Materiais OK</span><b>{okCount}</b></div>
          </div>
        </section>

        <div className="toolbar">
          <div className="search">
            <Search size={19} />
            <input
              placeholder="Buscar material ou código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            aria-label="Filtro de materiais"
            value={filter}
            onChange={e => setFilter(e.target.value as "all" | "low")}
          >
            <option value="all">Todos os materiais</option>
            <option value="low">Abaixo do mínimo</option>
          </select>

          <button className="scan-button" onClick={() => setShowScanner(true)}>
            <Camera size={18} /> Ler código
          </button>

          <button className="add" onClick={() => setShowAddMaterial(true)}>
            <Plus size={19} /> Adicionar material
          </button>
        </div>

        {showScanner && (
          <BarcodeScanner
            onDetected={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}

        {showAddMaterial && (
          <section className="panel add-material-panel add-material-modal">
            <div className="panel-head">
              <div>
                <h2>Novo material</h2>
                <p>Cadastre nome, código e quantidade inicial em unidades.</p>
              </div>
              <button onClick={() => setShowAddMaterial(false)}>Fechar</button>
            </div>

            <form className="add-material-form" onSubmit={addMaterial}>
              <label>
                Material
                <input
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex.: NEOLATEX 4MM"
                />
              </label>

              <label>
                Código de barras / QR
                <input
                  value={newCode}
                  onChange={e => setNewCode(e.target.value)}
                  placeholder="Opcional"
                />
              </label>

              <label>
                Unidades iniciais
                <input
                  type="number"
                  min="0"
                  value={newQty}
                  onChange={e => setNewQty(e.target.value)}
                />
              </label>

              <label>
                Mínimo de unidades
                <input
                  type="number"
                  min="0"
                  value={newMin}
                  onChange={e => setNewMin(e.target.value)}
                />
              </label>

              <button className="add-material-submit" type="submit">
                <Plus size={17} /> Cadastrar material
              </button>
            </form>
          </section>
        )}

        {showSettings && (
          <section className="panel settings">
            <div className="panel-head">
              <div>
                <h2>Configurações e backup</h2>
                <p>
                  Defina mínimos em unidades, códigos e proteja seus dados antes de trocar
                  de aparelho.
                </p>
              </div>
              <button onClick={() => setShowSettings(false)}>Fechar</button>
            </div>

            <div className="backup-box">
              <div>
                <b>Backup dos dados</b>
                <span>
                  Salve materiais, quantidades, códigos, mínimos e movimentações
                  em um arquivo.
                </span>
              </div>
              <div className="backup-actions">
                <button className="backup-btn" onClick={createBackup}>
                  ↓ Baixar backup
                </button>
                <label className="restore-btn">
                  ↥ Restaurar backup
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) restoreBackup(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            {filtered.map(item => (
              <div className="setting" key={item.id}>
                <div className="setting-main">
                  <span>{item.name}</span>
                  <small>{item.code ? `Código: ${item.code}` : "Sem código"}</small>
                </div>
                <div className="setting-fields">
                  <label>
                    Mín. unidades
                    <input
                      type="number"
                      min="0"
                      value={item.min}
                      onChange={e => setMin(item.id, Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Código
                    <input
                      value={item.code}
                      onChange={e => setCode(item.id, e.target.value)}
                      placeholder="Código"
                    />
                  </label>
                </div>
              </div>
            ))}
          </section>
        )}

        {showReports && (
          <section className="panel report-panel">
            <div className="report-hero">
              <div className="report-hero-icon"><FileText size={25} /></div>
              <div className="report-hero-copy">
                <div className="report-title-line">
                  <div>
                    <span className="report-kicker">VISÃO GERAL</span>
                    <h2>Relatório de estoque</h2>
                  </div>
                  <button className="report-close" onClick={() => setShowReports(false)}>Fechar</button>
                </div>
                <p>Veja rapidamente o que está disponível, o que está no limite e o que precisa de reposição.</p>
                <div className="report-meta">
                  <span><CalendarDays size={14} /> Atualizado agora</span>
                  <span className={lowItems.length ? "report-alert-badge" : "report-ok-badge"}>
                    {lowItems.length ? `${lowItems.length} material(is) em atenção` : "Estoque sob controle"}
                  </span>
                </div>
              </div>
            </div>

            <div className="report-summary">
              <div className="report-kpi blue">
                <div className="report-kpi-icon"><Boxes size={19} /></div>
                <span>Materiais</span>
                <b>{items.length}</b>
              </div>
              <div className="report-kpi green">
                <div className="report-kpi-icon"><Package size={19} /></div>
                <span>Unidades em estoque</span>
                <b>{total}</b>
              </div>
              <div className="report-kpi red">
                <div className="report-kpi-icon"><AlertTriangle size={19} /></div>
                <span>Precisam de atenção</span>
                <b>{lowItems.length}</b>
              </div>
              <div className="report-kpi purple">
                <div className="report-kpi-icon"><BarChart3 size={19} /></div>
                <span>Dentro do mínimo</span>
                <b>{okCount}</b>
              </div>
            </div>

            <div className="report-actions">
              <div className="report-actions-buttons">
                <button className="report" onClick={sendPdfReport}>
                  <FileText size={18} /> Baixar PDF
                </button>
                <button className="report secondary-report" onClick={sharePdfReport}>
                  Compartilhar PDF
                </button>
              </div>
            </div>

            <div className="report-section-head">
              <div>
                <h3>Situação dos materiais</h3>
                <p>O indicador mostra quanto do estoque atual cobre o mínimo configurado.</p>
              </div>
              <div className="report-legend">
                <span><i className="legend-dot ok" /> OK</span>
                <span><i className="legend-dot limit" /> No limite</span>
                <span><i className="legend-dot low" /> Atenção</span>
              </div>
            </div>

            <div className="report-list">
              {items.map(item => {
                const coverage = item.min > 0 ? Math.min(100, Math.round((item.qty / item.min) * 100)) : item.qty > 0 ? 100 : 0;
                const statusClass = item.qty < item.min ? "low" : item.qty === item.min ? "limit" : "ok";
                const statusLabel = item.qty < item.min ? "Abaixo do mínimo" : item.qty === item.min ? "No limite" : "OK";
                return (
                  <div className={`report-row ${statusClass}`} key={item.id}>
                    <div className="report-material">
                      <div className="report-material-icon"><Package size={16} /></div>
                      <div>
                        <b>{item.name}</b>
                        <small>{item.code ? `Código: ${item.code}` : "Sem código cadastrado"}</small>
                      </div>
                    </div>
                    <div className="report-quantity">
                      <b>{item.qty}</b>
                      <span>de {item.min} mín.</span>
                    </div>
                    <div className="report-progress">
                      <div className="report-progress-track">
                        <div className={`report-progress-fill ${statusClass}`} style={{ width: `${coverage}%` }} />
                      </div>
                      <small>{coverage}% do mínimo</small>
                    </div>
                    <span className={`report-status ${statusClass}`}>{statusLabel}</span>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="report-empty">
                  <Boxes size={26} />
                  <b>Nenhum material cadastrado</b>
                  <span>Adicione materiais para acompanhar a situação do estoque aqui.</span>
                </div>
              )}
            </div>
          </section>
        )}

        {showHistory && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Últimas movimentações</h2>
                <p>Histórico recente de entradas e saídas.</p>
              </div>
              <button onClick={() => setShowHistory(false)}>Fechar</button>
            </div>

            {moves.length === 0 ? (
              <p>Nenhuma movimentação ainda.</p>
            ) : (
              moves.slice(0, 30).map(movement => (
                <div className="move" key={movement.id}>
                  <span>{movement.name}</span>
                  <b className={movement.delta > 0 ? "in" : "out"}>
                    {movement.delta > 0 ? "+" : ""}
                    {movement.delta} unidade{Math.abs(movement.delta) !== 1 ? "s" : ""}
                  </b>
                  <small>{movement.date}</small>
                </div>
              ))
            )}
          </section>
        )}

        <section className="grid">
          {filtered.map(item => (
            <article
              className={item.qty < item.min ? "card low" : "card"}
              key={item.id}
            >
              <div className="cardtop">
                <div className="material-icon"><PackagePlus size={21} /></div>
                <div className="card-name">
                  <h3>{item.name}</h3>
                  <small className={item.qty < item.min ? "danger" : "good"}>
                    {item.qty < item.min
                      ? "⚠ Abaixo do mínimo"
                      : item.qty === item.min
                        ? "No limite mínimo"
                        : "Estoque disponível"}
                  </small>
                </div>
              </div>

              {item.code && (
                <div className="card-code">
                  <span>Código</span>
                  <b>{item.code}</b>
                </div>
              )}

              <div className="stock-values">
                <div>
                  <span>Estoque</span>
                  <strong className={item.qty < item.min ? "danger" : "good"}>
                    {item.qty}
                  </strong>
                </div>
                <div>
                  <span>Mínimo</span>
                  <strong>{item.min}</strong>
                </div>
              </div>

              <div className="card-actions">
                <button className="entry" onClick={() => move(item.id, 1)}>
                  <Plus size={15} /> Entrada
                </button>
                <button
                  className="exit"
                  onClick={() => move(item.id, -1)}
                  disabled={item.qty === 0}
                >
                  <Minus size={15} /> Saída
                </button>
                <button className="adjust" onClick={() => adjust(item.id)}>
                  <Settings size={14} /> Ajustar
                </button>
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="empty">
              <AlertTriangle />
              Nenhum material encontrado.
            </div>
          )}

          <button className="new-card" onClick={() => setShowAddMaterial(true)}>
            <Plus size={30} />
            <b>Adicionar novo material</b>
            <span>Cadastro offline</span>
          </button>
        </section>

        <footer>
          Controle simples, rápido e offline do estoque de materiais.
          <span className="footer-pwa"><Smartphone size={12} /> PWA ativo</span>
        </footer>
      </main>
    </div>
  );
}