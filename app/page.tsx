"use client";
import {useEffect,useMemo,useState} from "react";
import {PackagePlus,Minus,Plus,Search,History,AlertTriangle,Boxes} from "lucide-react";
const INITIAL=["NEOLATEX 3MM","NEOLATEX 2MM BOLSO DE CARTEIRA","MATERIAL DE MOUSE PAD","MOUSE PAD ERGONÔMICO QUADRADO","MOUSE PAD ERGONÔMICO GOTA","APOIO DE TECLADO","CAPA DE MALA","FORRO PRETO IMPERMEÁVEL","MATERIAL MOCHILA IMPERMEÁVEL","MATERIAL ESTEIRA","FORRO MARMITA","FORRO DE COOLER","MATERIAL CANGA","FORRO WINE BAG"];
type Item={id:number;name:string;qty:number;min:number};
type Move={id:number;name:string;delta:number;date:string};
export default function Home(){
 const [items,setItems]=useState<Item[]>(()=>{try{return JSON.parse(localStorage.getItem("estoque-items")||"[]")}catch{return []}});
 const [moves,setMoves]=useState<Move[]>(()=>{try{return JSON.parse(localStorage.getItem("estoque-moves")||"[]")}catch{return []}});
 const [search,setSearch]=useState(""); const [showHistory,setShowHistory]=useState(false);
 useEffect(()=>{if(!items.length)setItems(INITIAL.map((name,i)=>({id:i+1,name,qty:0,min:1})))},[]);
 useEffect(()=>{localStorage.setItem("estoque-items",JSON.stringify(items))},[items]);
 useEffect(()=>{localStorage.setItem("estoque-moves",JSON.stringify(moves))},[moves]);
 const filtered=useMemo(()=>items.filter(x=>x.name.toLowerCase().includes(search.toLowerCase())),[items,search]);
 const total=items.reduce((a,x)=>a+x.qty,0), low=items.filter(x=>x.qty<=x.min).length;
 function move(id:number,delta:number){setItems(xs=>xs.map(x=>x.id===id?{...x,qty:Math.max(0,x.qty+delta)}:x));const it=items.find(x=>x.id===id);if(it)setMoves(m=>[{id:Date.now(),name:it.name,delta,date:new Date().toLocaleString("pt-BR")},...m].slice(0,100))}
 return <main><header><div className="brand"><Boxes/><div><h1>ESTOQUE</h1><span>Materiais em rolos</span></div></div><button className="history" onClick={()=>setShowHistory(!showHistory)}><History size={18}/> Histórico</button></header>
 <section className="stats"><div><span>Materiais</span><b>{items.length}</b></div><div><span>Total de rolos</span><b>{total}</b></div><div className="warn"><span>Estoque baixo</span><b>{low}</b></div></section>
 <div className="search"><Search size={19}/><input placeholder="Buscar material..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
 {showHistory&&<section className="panel"><h2>Últimas movimentações</h2>{moves.length===0?<p>Nenhuma movimentação ainda.</p>:moves.slice(0,20).map(m=><div className="move" key={m.id}><span>{m.name}</span><b className={m.delta>0?"in":"out"}>{m.delta>0?"+":""}{m.delta} rolo{Math.abs(m.delta)!==1?"s":""}</b><small>{m.date}</small></div>)}</section>}
 <section className="grid">{filtered.map(it=><article className={it.qty<=it.min?"card low":"card"} key={it.id}><div className="cardtop"><div className="icon"><PackagePlus size={21}/></div><div><h3>{it.name}</h3><small>{it.qty<=it.min?"Estoque baixo":"Estoque disponível"}</small></div></div><div className="quantity"><button onClick={()=>move(it.id,-1)} disabled={it.qty===0}><Minus size={18}/></button><strong>{it.qty}</strong><button onClick={()=>move(it.id,1)}><Plus size={18}/></button></div><div className="label">ROLOS DISPONÍVEIS</div></article>)}</section>
 {filtered.length===0&&<div className="empty"><AlertTriangle/>Nenhum material encontrado.</div>}
 <footer>Controle simples e rápido do estoque de materiais.</footer></main>}