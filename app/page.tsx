"use client";

import {useEffect,useMemo,useState} from "react";
import {PackagePlus,Minus,Plus,Search,History,AlertTriangle,Boxes,Settings,Home as HomeIcon,Package,ArrowLeftRight,BarChart3,Menu,X,CalendarDays,Moon,Sun} from "lucide-react";

const INITIAL=["NEOLATEX 3MM","NEOLATEX 2MM BOLSO DE CARTEIRA","MATERIAL DE MOUSE PAD","MOUSE PAD ERGONÔMICO QUADRADO","MOUSE PAD ERGONÔMICO GOTA","APOIO DE TECLADO","CAPA DE MALA","FORRO PRETO IMPERMEÁVEL","MATERIAL MOCHILA IMPERMEÁVEL","MATERIAL ESTEIRA","FORRO MARMITA","FORRO DE COOLER","MATERIAL CANGA","FORRO WINE BAG"];

type Item={id:number;name:string;qty:number;min:number};
type Move={id:number;name:string;delta:number;date:string};

export default function Home(){
 const [authenticated,setAuthenticated]=useState(false);
 const [authReady,setAuthReady]=useState(false);
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [authError,setAuthError]=useState("");
 const [showRegister,setShowRegister]=useState(false);
 const [items,setItems]=useState<Item[]>([]);
 const [moves,setMoves]=useState<Move[]>([]);
 const [search,setSearch]=useState("");
 const [showHistory,setShowHistory]=useState(false);
 const [showSettings,setShowSettings]=useState(false);
 const [menuOpen,setMenuOpen]=useState(false);

 useEffect(()=>{
   setAuthenticated(localStorage.getItem("estoque-authenticated")==="true");
   setAuthReady(true);
 },[]);
 async function hashPassword(value:string){
   const data=new TextEncoder().encode(value);
   const hash=await crypto.subtle.digest("SHA-256",data);
   return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
 }
 async function handleAuth(e:React.FormEvent){
   e.preventDefault();
   setAuthError("");
   const clean=email.trim().toLowerCase();
   if(!clean||!password){setAuthError("Informe e-mail e senha.");return;}
   const stored=localStorage.getItem("estoque-user");
   const hashed=await hashPassword(password);
   if(showRegister){
     if(password.length<6){setAuthError("A senha deve ter pelo menos 6 caracteres.");return;}
     if(stored){setAuthError("Já existe um acesso neste aparelho. Entre com ele.");setShowRegister(false);return;}
     localStorage.setItem("estoque-user",JSON.stringify({email:clean,password:hashed}));
     localStorage.setItem("estoque-authenticated","true");
     setAuthenticated(true);
     setPassword("");
     return;
   }
   if(!stored){setAuthError("Nenhum acesso cadastrado neste aparelho. Clique em Criar acesso.");return;}
   try{
     const user=JSON.parse(stored);
     if(user.email===clean&&user.password===hashed){
       localStorage.setItem("estoque-authenticated","true");
       setAuthenticated(true);
       setPassword("");
     }else setAuthError("E-mail ou senha incorretos.");
   }catch{setAuthError("Não foi possível validar o acesso.");}
 }
 function logout(){
   localStorage.removeItem("estoque-authenticated");
   setAuthenticated(false);
   setPassword("");
 }
 useEffect(()=>{
   try{
     const saved=JSON.parse(localStorage.getItem("estoque-items")||"[]");
     setItems(saved.length?saved:INITIAL.map((name,i)=>({id:i+1,name,qty:0,min:1})));
     setMoves(JSON.parse(localStorage.getItem("estoque-moves")||"[]"));
   }catch{
     setItems(INITIAL.map((name,i)=>({id:i+1,name,qty:0,min:1})));
     setMoves([]);
   }
 },[]);
 useEffect(()=>{if(items.length)localStorage.setItem("estoque-items",JSON.stringify(items))},[items]);
 useEffect(()=>{localStorage.setItem("estoque-moves",JSON.stringify(moves))},[moves]);

 const filtered=useMemo(()=>items.filter(x=>x.name.toLowerCase().includes(search.toLowerCase())),[items,search]);
 const lowItems=items.filter(x=>x.qty<x.min);
 const total=items.reduce((a,x)=>a+x.qty,0);
 const okCount=items.length-lowItems.length;
 const today=new Intl.DateTimeFormat("pt-BR",{dateStyle:"full"}).format(new Date());

 function move(id:number,delta:number){
   setItems(xs=>xs.map(x=>x.id===id?{...x,qty:Math.max(0,x.qty+delta)}:x));
   const it=items.find(x=>x.id===id);
   if(it)setMoves(m=>[{id:Date.now(),name:it.name,delta,date:new Date().toLocaleString("pt-BR")},...m].slice(0,100));
 }
 function setMin(id:number,value:number){setItems(xs=>xs.map(x=>x.id===id?{...x,min:Math.max(0,value)}:x))}
 function createBackup(){
   const backup={version:1,app:"ESTOQUE",createdAt:new Date().toISOString(),items,moves};
   const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");
   a.href=url;
   a.download=`estoque-backup-${new Date().toISOString().slice(0,10)}.json`;
   a.click();
   URL.revokeObjectURL(url);
 }
 function restoreBackup(file:File){
   const reader=new FileReader();
   reader.onload=()=>{
     try{
       const data=JSON.parse(String(reader.result));
       if(!Array.isArray(data.items)||!Array.isArray(data.moves))throw new Error("Formato inválido");
       const restored=data.items.filter((x:any)=>x&&Number.isFinite(Number(x.id))&&typeof x.name==="string").map((x:any)=>({id:Number(x.id),name:x.name,qty:Math.max(0,Number(x.qty)||0),min:Math.max(0,Number(x.min)||0)}));
       if(!restored.length)throw new Error("Backup sem materiais");
       setItems(restored);
       setMoves(data.moves);
       alert("Backup restaurado com sucesso.");
     }catch{
       alert("Não foi possível restaurar este arquivo. Selecione um backup do ESTOQUE.");
     }
   };
   reader.readAsText(file);
 }
 function adjust(id:number){
   const it=items.find(x=>x.id===id); if(!it)return;
   const value=window.prompt(`Quantidade atual para ${it.name}:`,String(it.qty));
   if(value===null)return;
   const qty=Math.max(0,Number(value));
   if(!Number.isFinite(qty))return;
   setItems(xs=>xs.map(x=>x.id===id?{...x,qty}:x));
   setMoves(m=>[{id:Date.now(),name:it.name,delta:qty-it.qty,date:new Date().toLocaleString("pt-BR")},...m].slice(0,100));
 }

 if(!authReady)return null;
 if(!authenticated)return <main className="login-page"><section className="login-card"><div className="login-logo"><Boxes size={30}/></div><h1>ESTOQUE</h1><p>Controle de materiais em rolos</p><form onSubmit={handleAuth}><label>E-mail<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></label><label>Senha<input type="password" autoComplete={showRegister?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder={showRegister?"Mínimo 6 caracteres":"Sua senha"}/></label>{authError&&<div className="login-error">{authError}</div>}<button className="login-btn" type="submit">{showRegister?"Criar acesso":"Entrar"}</button></form><button className="login-switch" onClick={()=>{setShowRegister(!showRegister);setAuthError("");}}>{showRegister?"Já tenho acesso":"Primeiro acesso? Criar acesso"}</button><small>Seus dados permanecem neste aparelho. Use o backup para transferi-los.</small></section></main>;

 return <div className="app-shell">
   <aside className={menuOpen?"sidebar open":"sidebar"}>
     <div className="logo"><div className="logo-mark"><Boxes/></div><div><b>ESTOQUE</b><span>CONTROLE DE MATERIAIS</span></div></div>
     <nav>
       <button className="nav-active" onClick={()=>setMenuOpen(false)}><HomeIcon/>Início</button>
       <button onClick={()=>setMenuOpen(false)}><Package/>Materiais</button>
       <button onClick={()=>{setShowHistory(true);setMenuOpen(false)}}><ArrowLeftRight/>Movimentações</button>
       <button onClick={()=>setMenuOpen(false)}><BarChart3/>Relatórios</button>
       <button onClick={()=>{setShowSettings(true);setMenuOpen(false)}}><Settings/>Configurações</button>
     </nav>
     <div className="sidebar-tip"><Boxes/><b>Organização hoje,<br/>produção amanhã!</b></div>
     <div className="sidebar-footer">ESTOQUE v1.0<br/><span>Controle de materiais</span></div>
   </aside>

   <main className="content">
     <header className="topbar">
       <button className="mobile-menu" onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button>
       <div><h1>Bem-vindo!</h1><p>Controle seu estoque de materiais em rolos de forma simples e eficiente.</p></div>
       <div className="top-actions"><button className="theme"><Sun size={17}/><Moon size={18}/></button><button className="logout" onClick={logout}>Sair</button><div className="date"><CalendarDays size={20}/><span>{today}<small>Hoje</small></span></div></div>
     </header>

     {lowItems.length>0&&<div className="alert"><AlertTriangle size={21}/><div><b>Alerta de estoque baixo</b><span>{lowItems.length} material(is) abaixo do estoque mínimo.</span></div><button onClick={()=>setShowSettings(true)}>Ver limites</button></div>}

     <section className="stats">
       <div className="stat blue"><div className="stat-icon"><Boxes/></div><div><span>Materiais cadastrados</span><b>{items.length}</b></div></div>
       <div className="stat green"><div className="stat-icon"><Package/></div><div><span>Total de rolos</span><b>{total}</b></div></div>
       <div className="stat red"><div className="stat-icon"><AlertTriangle/></div><div><span>Abaixo do mínimo</span><b>{lowItems.length}</b></div></div>
       <div className="stat purple"><div className="stat-icon"><BarChart3/></div><div><span>Materiais OK</span><b>{okCount}</b></div></div>
     </section>

     <div className="toolbar"><div className="search"><Search size={19}/><input placeholder="Buscar material..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select aria-label="Filtro de materiais"><option>Todos os materiais</option><option>Abaixo do mínimo</option></select><button className="add" onClick={()=>setSearch("")}><Plus size={19}/> Adicionar material</button></div>

     {showSettings&&<section className="panel settings"><div className="panel-head"><div><h2>Configurações e backup</h2><p>Defina os mínimos e proteja seus dados antes de trocar de aparelho.</p></div><button onClick={()=>setShowSettings(false)}>Fechar</button></div>
       <div className="backup-box"><div><b>Backup dos dados</b><span>Salve materiais, quantidades, mínimos e movimentações em um arquivo.</span></div><div className="backup-actions"><button className="backup-btn" onClick={createBackup}>⬇ Baixar backup</button><label className="restore-btn">↥ Restaurar backup<input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];if(file)restoreBackup(file);e.currentTarget.value=""}}/></label></div></div>{filtered.map(it=><div className="setting" key={it.id}><span>{it.name}</span><label><input type="number" min="0" value={it.min} onChange={e=>setMin(it.id,Number(e.target.value))}/> rolos</label></div>)}</section>}

     {showHistory&&<section className="panel"><div className="panel-head"><div><h2>Últimas movimentações</h2><p>Histórico recente de entradas e saídas.</p></div><button onClick={()=>setShowHistory(false)}>Fechar</button></div>{moves.length===0?<p>Nenhuma movimentação ainda.</p>:moves.slice(0,20).map(m=><div className="move" key={m.id}><span>{m.name}</span><b className={m.delta>0?"in":"out"}>{m.delta>0?"+":""}{m.delta} rolo{Math.abs(m.delta)!==1?"s":""}</b><small>{m.date}</small></div>)}</section>}

     <section className="grid">{filtered.map(it=><article className={it.qty<it.min?"card low":"card"} key={it.id}>
       <div className="cardtop"><div className="material-icon"><PackagePlus size={21}/></div><div className="card-name"><h3>{it.name}</h3><small className={it.qty<it.min?"danger":"good"}>{it.qty<it.min?"⚠ Abaixo do mínimo":it.qty===it.min?"No limite mínimo":"Estoque disponível"}</small></div></div>
       <div className="stock-values"><div><span>Estoque</span><strong className={it.qty<it.min?"danger":"good"}>{it.qty}</strong></div><div><span>Mínimo</span><strong>{it.min}</strong></div></div>
       <div className="card-actions"><button className="entry" onClick={()=>move(it.id,1)}><Plus size={15}/> Entrada</button><button className="exit" onClick={()=>move(it.id,-1)} disabled={it.qty===0}><Minus size={15}/> Saída</button><button className="adjust" onClick={()=>adjust(it.id)}><Settings size={14}/> Ajustar</button></div>
     </article>)}{filtered.length===0&&<div className="empty"><AlertTriangle/>Nenhum material encontrado.</div>}
       <button className="new-card" onClick={()=>setSearch("")}><Plus size={30}/><b>Adicionar novo material</b><span>Em breve</span></button>
     </section>

     <footer>Controle simples e rápido do estoque de materiais.</footer>
   </main>
 </div>
}