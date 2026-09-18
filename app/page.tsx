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

const INITIAL = [
  "NEOLATEX 3MM",
  "NEOLATEX 2MM BOLSO DE CARTEIRA",
  "MATERIAL DE MOUSE PAD",
  "MOUSE PAD ERGONÔMICO QUADRADO",
  "MOUSE PAD ERGONÔMICO GOTA",
  "APOIO DE TECLADO",
  "CAPA DE MALA",
  "FORRO PRETO IMPERMEÁVEL",
  "MATERIAL MOCHILA IMPERMEÁVEL",
  "MATERIAL ESTEIRA",
  "FORRO MARMITA",
  "FORRO DE COOLER",
  "MATERIAL CANGA",
  "FORRO WINE BAG",
];

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
\n  useEffect(() => {\n    if (!itemsReady) return;\n    setItems(current => current.map(item => ({ ...item, code: item.code || "" })));\n  }, [itemsReady]);\n
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

  function sendPdfReport() {
    const doc = new jsPDF();
    const margin = 14;
    let y = 18;

    doc.setFontSize(20);
    doc.text("RELATORIO DE ESTOQUE", margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(new Date().toLocaleString("pt-BR"), margin, y);
    y += 10;

    doc.setFontSize(12);
    doc.text(
      `Materiais: ${items.length} | Total de unidades: ${total} | Abaixo do minimo: ${lowItems.length} | Materiais OK: ${okCount}`,
      margin,
      y
    );
    y += 10;

    items.forEach((item, index) => {
      if (y > 278) {
        doc.addPage();
        y = 18;
      }
      const status =
        item.qty < item.min
          ? "ABAIXO DO MINIMO"
          : item.qty === item.min
            ? "NO LIMITE"
            : "OK";

      doc.setFontSize(11);
      doc.text(`${index + 1}. ${item.name}`, margin, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(
        `Estoque: ${item.qty} unidade(s) | Minimo: ${item.min} unidade(s) | Status: ${status}`,
        margin + 4,
        y
      );
      y += 7;
    });

    if (moves.length) {
      if (y > 260) {
        doc.addPage();
        y = 18;
      }
      y += 3;
      doc.setFontSize(13);
      doc.text("ULTIMAS MOVIMENTACOES", margin, y);
      y += 8;
      doc.setFontSize(10);

      moves.slice(0, 20).forEach(movement => {
        if (y > 278) {
          doc.addPage();
          y = 18;
        }
        doc.text(
          `${movement.date} - ${movement.name}: ${movement.delta > 0 ? "+" : ""}${movement.delta} unidade(s)`,
          margin,
          y
        );
        y += 6;
      });
    }

    const fileName = `relatorio-estoque-${new Date().toISOString().slice(0, 10)}.pdf`;
    const blob = doc.output("blob");
    const file = new File([blob], fileName, { type: "application/pdf" });

    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      navigator
        .share({
          title: "Relatório de estoque",
          text: "Relatório do estoque de materiais.",
          files: [file],
        })
        .catch(() => {});
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
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
            <div><span>Total de rolos</span><b>{total}</b></div>
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
            <div className="panel-head">
              <div>
                <h2>Relatórios de estoque</h2>
                <p>
                  Resumo atual do estoque, mínimos configurados e movimentações
                  recentes.
                </p>
              </div>
              <button onClick={() => setShowReports(false)}>Fechar</button>
            </div>

            <div className="report-summary">
              <div><span>Materiais cadastrados</span><b>{items.length}</b></div>
              <div><span>Total de rolos</span><b>{total}</b></div>
              <div>
                <span>Abaixo do mínimo</span>
                <b className={lowItems.length ? "danger" : "good"}>{lowItems.length}</b>
              </div>
              <div><span>Materiais OK</span><b className="good">{okCount}</b></div>
            </div>

            <div className="report-actions">
              <button className="report" onClick={sendPdfReport}>
                <FileText size={18} /> Gerar relatório PDF
              </button>
            </div>

            <div className="report-list">
              {items.map(item => (
                <div className="report-row" key={item.id}>
                  <span>{item.name}</span>
                  <b>{item.qty} / {item.min} rolos</b>
                  <small className={item.qty < item.min ? "danger" : "good"}>
                    {item.qty < item.min
                      ? "Abaixo do mínimo"
                      : item.qty === item.min
                        ? "No limite"
                        : "OK"}
                  </small>
                </div>
              ))}
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
