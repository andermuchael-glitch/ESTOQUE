"use client";
import {useEffect,useMemo,useState} from "react";
import {PackagePlus,Minus,Plus,Search,History,AlertTriangle,Boxes,Settings} from "lucide-react";
const INITIAL=["NEOLATEX 3MM","NEOLATEX 2MM BOLSO DE CARTEIRA","MATERIAL DE MOUSE PAD","MOUSE PAD ERGONÔMICO QUADRADO","MOUSE PAD ERGONÔMICO GOTA","APOIO DE TECLADO","CAPA DE MALA","FORRO PRETO IMPERMEÁVEL","MATERIAL MOCHILA IMPERMEÁVEL","MATERIAL ESTEIRA","FORRO MARMITA","FORRO DE COOLER","MATERIAL CANGA","FORRO WINE BAG"];
type Item={id:number;name:string;qty:number;min:number}; type Move={id:number;name:string;delta:number;date:string};
export default function Home(){
 const [items,setItems]=useState<Item[]>(()=>{try{return JSON.parse(localStorage.getItem("estoque-items")||"[]")}catch{return []}});
 const [moves,setMoves]=useState<Move[]>(()=>{try{return JSON.parse(localStorage.getItem("estoque-moves")||"[]")}catch{return []}});
 const [search,setSearch]=useState(""); const [showHistory,setShowHistory]=useState(false); const [showSettings,setShowSettings]=useState(false);
 useEffect(()=>{if(!items.length)setItems(INITIAL.map((name,i)=>({id:i+1,name,qty:0,min:1})))},[]);
 useEffect(()=>{localStorage.setItem("estoque-items",JSON.stringify(items))},[items]); useEffect(()=>{localStorage.setItem("estoque-moves",JSON.stringify(moves))},[moves]);
 const filtered=useMemo(()=>items.filter(x=>x.name.toLowerCase().includes(search.toLowerCase())),[items,search]);
 const lowItems=items.filter(x=>x.qty<x.min), total=items.reduce((a,x)=>a+x.qty,0);
 function move(id:number,delta:number){setItems(xs=>xs.map(x=>x.id===id?{...x,qty:Math.max(0,x.qty+delta)}:x));const it=items.find(x=>x.id===id);if(it)setMoves(m=>[{id:Date.now(),name:it.name,delta,date:new Date().toLocaleString("pt-BR")},...m].slice(0,100))}
 function setMin(id:number,value:number){setItems(xs=>xs.map(x=>x.id===id?{...x,min:Math.max(0,value)}:x))}
 return <main><header><div className="brand"><Boxes/><div><h1>ESTOQUE</h1><span>Materiais em rolos</span></div></div><div className="actions"><button className="history" onClick={()=>setShowSettings(!showSettings)}><Settings size={18}/> Limites</button><button className="history" onClick={()=>setShowHistory(!showHistory)}><History size={18}/> Histórico</button></div></header>
 {lowItems.length>0&&<div className="alert"><AlertTriangle size={20}/><div><b>Alerta de estoque baixo</b><span>{lowItems.length} material(is) abaixo do estoque mínimo: {lowItems.map(x=>x.name).join(" • ")}</span></div></div>}
 <section className="stats"><div><span>Materiais</span><b>{items.length}</b></div><div><span>Total de rolos</span><b>{total}</b></div><div className={lowItems.length?"warn":""}><span>Abaixo do mínimo</span><b>{lowItems.length}</b></div></section>
 <div className="search"><Search size={19}/><input placeholder="Buscar material..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
 {showSettings&&<section className="panel settings"><h2>Estoque mínimo por material</h2><p>Defina quantos rolos devem existir antes de o aplicativo emitir um alerta.</p>{filtered.map(it=><div className="setting" key={it.id}><span>{it.name}</span><label><input type="number" min="0" value={it.min} onChange={e=>setMin(it.id,Number(e.target.value))}/> rolos</label></div>)}</section>}
 {showHistory&&<section className="panel"><h2>Últimas movimentações</h2>{moves.length===0?<p>Nenhuma movimentação ainda.</p>:moves.slice(0,20).map(m=><div className="move" key={m.id}><span>{m.name}</span><b className={m.delta>0?"in":"out"}>{m.delta>0?"+":""}{m.delta} rolo{Math.abs(m.delta)!==1?"s":""}</b><small>{m.date}</small></div>)}</section>}
 <section className="grid">{filtered.map(it=><article className={it.qty<it.min?"card low":"card"} key={it.id}><div className="cardtop"><div className="icon"><PackagePlus size={21}/></div><div><h3>{it.name}</h3><small>{it.qty<it.min?"⚠ Abaixo do mínimo":it.qty===it.min?"No limite mínimo":"Estoque disponível"}</small></div></div><div className="quantity"><button onClick={()=>move(it.id,-1)} disabled={it.qty===0}><Minus size={18}/></button><strong>{it.qty}</strong><button onClick={()=>move(it.id,1)}><Plus size={18}/></button></div><div className="label">MÍNIMO: {it.min} • ROLOS DISPONÍVEIS</div></article>)}</section>
 {filtered.length===0&&<div className="empty"><AlertTriangle/>Nenhum material encontrado.</div>}<footer>Controle simples e rápido do estoque de materiais.</footer></main>}
