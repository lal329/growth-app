import { useState, useEffect, useRef } from "react";

// ── Fonts & Styles ─────────────────────────────────────────
const _link = document.createElement("link");
_link.rel = "stylesheet";
_link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";
document.head.appendChild(_link);

const _css = document.createElement("style");
_css.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f5f5f5; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  button { cursor: pointer; font-family: 'Inter', sans-serif; }
  input, textarea { font-family: 'Inter', sans-serif; font-size: 16px !important; }
  @keyframes up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
  .up { animation: up 0.25s ease both; }
  * { transition: background 0.35s ease, color 0.35s ease, border-color 0.35s ease; }
  .up, button, input, textarea { transition: background 0.35s ease, color 0.35s ease, border-color 0.35s ease, opacity 0.15s, transform 0.15s; }
`;
document.head.appendChild(_css);

// ── Theme ──────────────────────────────────────────────────
const LIGHT = { bg:"#f5f5f5", card:"#ffffff", border:"#d8d8d8", ink:"#111111", mid:"#555555", soft:"#aaaaaa", green:"#2d6a4f", gLight:"#f0f7f3", gMid:"#95c4aa" };
const DARK  = { bg:"#111111", card:"#1a1a1a", border:"#2a2a2a", ink:"#f0f0f0", mid:"#aaaaaa", soft:"#555555", green:"#4a9b6f", gLight:"#1a2a1a", gMid:"#2a4a3a" };

// ── Storage ────────────────────────────────────────────────
const STORE = "growth_v5";
const IDB_NAME = "growth_photos_v5";
const IDB_ST = "photos";

function readStore() { try { return JSON.parse(localStorage.getItem(STORE)) || { plants:[], entries:[] }; } catch { return { plants:[], entries:[] }; } }
function writeStore(plants, entries) {
  try { localStorage.setItem(STORE, JSON.stringify({ plants, entries: entries.map(e => ({ ...e, photos: undefined, photoCount: e.photos?.length||0, photoMeta: e.photoMeta||[] })) })); } catch {}
}
function openIDB() {
  return new Promise((res, rej) => { const r = indexedDB.open(IDB_NAME,1); r.onupgradeneeded = e => e.target.result.createObjectStore(IDB_ST); r.onsuccess = e => res(e.target.result); r.onerror = e => rej(e.target.error); });
}
async function savePhoto(id, url) {
  try { const db = await openIDB(); await new Promise((res,rej) => { const tx = db.transaction(IDB_ST,"readwrite"); tx.objectStore(IDB_ST).put(url,id); tx.oncomplete=()=>res(); tx.onerror=()=>rej(); }); } catch {}
}
async function loadPhoto(id) {
  try { const db = await openIDB(); return await new Promise(res => { const r = db.transaction(IDB_ST).objectStore(IDB_ST).get(id); r.onsuccess=e=>res(e.target.result||null); r.onerror=()=>res(null); }); } catch { return null; }
}
async function deletePhoto(id) {
  try { const db = await openIDB(); await new Promise(res => { const tx = db.transaction(IDB_ST,"readwrite"); tx.objectStore(IDB_ST).delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>res(); }); } catch {}
}

// ── Helpers ────────────────────────────────────────────────
function fmtDate(ts) { return new Date(ts).toLocaleDateString("ja-JP",{month:"numeric",day:"numeric",weekday:"short"}); }
function fmtMonth(ts) { return new Date(ts).toLocaleDateString("ja-JP",{year:"numeric",month:"long"}); }
function fmtYM(ts) { const d=new Date(ts); return `${d.getFullYear()}-${d.getMonth()}`; }
function fmtFull(d) { return new Date(d).toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"}); }
function daysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
function firstDay(y,m) { return new Date(y,m,1).getDay(); }
function todayKey() { const d=new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

// ── Shared UI ──────────────────────────────────────────────
function getInp(C) { return { width:"100%", padding:"11px 14px", borderRadius:8, border:`1.5px solid ${C.border}`, background:C.card, color:C.ink, fontSize:14, fontWeight:400, outline:"none" }; }

function Btn({ label, variant="fill", disabled, onClick, full, C: _C }) {
  const T = _C || LIGHT;
  const getStyle = () => {
    const base = { padding:"11px 18px", borderRadius:8, fontSize:13, fontWeight:500, opacity:disabled?0.35:1, cursor:disabled?"not-allowed":"pointer", width:full?"100%":undefined };
    if (variant==="fill")   return { ...base, background:T.ink,    color:T.card,  border:"none" };
    if (variant==="ghost")  return { ...base, background:"transparent", color:T.mid, border:`1.5px solid ${T.border}` };
    if (variant==="green")  return { ...base, background:T.green,  color:"#fff",  border:"none" };
    if (variant==="danger") return { ...base, background:"#fff0f0", color:"#cc3333", border:"1.5px solid #f5c0c0" };
    return base;
  };
  return <button disabled={disabled} onClick={onClick} style={getStyle()}>{label}</button>;
}

function Cap({ text, C: _C }) { const T = _C||LIGHT; return <p style={{ fontSize:11, fontWeight:500, color:T.soft, marginBottom:8, letterSpacing:"0.04em" }}>{text}</p>; }

// ── Lightbox ───────────────────────────────────────────────
function Lightbox({ photos, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => {
    const el = document.createElement("div");
    el.id = "growth-lightbox";
    Object.assign(el.style, { position:"fixed", inset:"0", background:"rgba(0,0,0,0.95)", zIndex:"999999", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" });
    el.onclick = onClose;
    document.body.appendChild(el);
    return () => { try { document.body.removeChild(el); } catch {} };
  }, []);

  useEffect(() => {
    const el = document.getElementById("growth-lightbox");
    if (!el) return;
    el.innerHTML = "";
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, { position:"absolute", top:"20px", right:"20px", background:"rgba(255,255,255,0.2)", border:"none", borderRadius:"50%", width:"36px", height:"36px", color:"#fff", fontSize:"18px", cursor:"pointer" });
    closeBtn.onclick = e => { e.stopPropagation(); onClose(); };
    el.appendChild(closeBtn);
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, { width:"88%", maxWidth:"360px", aspectRatio:"1/1", borderRadius:"24px", overflow:"hidden" });
    wrapper.onclick = e => e.stopPropagation();
    const img = document.createElement("img");
    img.src = photos[idx];
    Object.assign(img.style, { width:"100%", height:"100%", objectFit:"cover", display:"block" });
    wrapper.appendChild(img);
    el.appendChild(wrapper);
    if (photos.length > 1) {
      const prev = document.createElement("button");
      prev.textContent = "‹";
      Object.assign(prev.style, { position:"absolute", left:"16px", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.15)", border:"none", borderRadius:"50%", width:"40px", height:"40px", color:"#fff", fontSize:"20px", cursor:"pointer" });
      prev.onclick = e => { e.stopPropagation(); setIdx(i => (i-1+photos.length)%photos.length); };
      el.appendChild(prev);
      const next = document.createElement("button");
      next.textContent = "›";
      Object.assign(next.style, { position:"absolute", right:"16px", top:"50%", transform:"translateY(-50%)", background:"rgba(255,255,255,0.15)", border:"none", borderRadius:"50%", width:"40px", height:"40px", color:"#fff", fontSize:"20px", cursor:"pointer" });
      next.onclick = e => { e.stopPropagation(); setIdx(i => (i+1)%photos.length); };
      el.appendChild(next);
      const dots = document.createElement("div");
      Object.assign(dots.style, { display:"flex", gap:"6px", marginTop:"20px" });
      dots.onclick = e => e.stopPropagation();
      photos.forEach((_,i) => { const dot = document.createElement("div"); Object.assign(dot.style, { width:"6px", height:"6px", borderRadius:"50%", background: i===idx ? "#fff" : "rgba(255,255,255,0.35)" }); dots.appendChild(dot); });
      el.appendChild(dots);
    }
  }, [idx, photos]);
  return null;
}

// ── Photo Strip ────────────────────────────────────────────
function PhotoStrip({ photos, photoMeta }) {
  const [lightbox, setLightbox] = useState(null);
  if (!photos?.length) return null;
  function pos(i) { const m = photoMeta?.[i]; return m ? `${m.pos?.x??50}% ${m.pos?.y??50}%` : "50% 50%"; }
  return (
    <>
      {lightbox !== null && <Lightbox photos={photos} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      <div style={{ position:"relative", cursor:"pointer" }} onClick={() => setLightbox(0)}>
        <img src={photos[0]} alt="" style={{ width:"100%", maxHeight:240, objectFit:"cover", objectPosition:pos(0), display:"block" }} />
        {photos.length > 1 && (
          <div style={{ position:"absolute", bottom:8, right:10, background:"rgba(0,0,0,0.45)", borderRadius:12, padding:"2px 8px" }}>
            <span style={{ color:"#fff", fontSize:11 }}>+{photos.length-1}</span>
          </div>
        )}
      </div>
    </>
  );
}

// ── Photo Adjuster ─────────────────────────────────────────
function PhotoAdjuster({ src, position, onChange, onRemove }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const last = useRef({ x:0, y:0 });
  const posRef = useRef(position);
  posRef.current = position;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function getXY(e) { const t = e.touches?.[0]||e; return { x:t.clientX, y:t.clientY }; }
    function onStart(e) { dragging.current=true; last.current=getXY(e); e.preventDefault(); }
    function onMove(e) {
      if (!dragging.current) return;
      e.preventDefault();
      const {x,y} = getXY(e);
      const dx=x-last.current.x, dy=y-last.current.y;
      last.current={x,y};
      const W=el.offsetWidth, H=el.offsetHeight;
      const cur=posRef.current;
      onChange({ x:Math.max(0,Math.min(100,cur.x-(dx/W)*100)), y:Math.max(0,Math.min(100,cur.y-(dy/H)*100)) });
    }
    function onEnd() { dragging.current=false; }
    el.addEventListener("touchstart",onStart,{passive:false});
    el.addEventListener("touchmove",onMove,{passive:false});
    el.addEventListener("touchend",onEnd,{passive:true});
    el.addEventListener("mousedown",onStart);
    el.addEventListener("mousemove",onMove);
    el.addEventListener("mouseup",onEnd);
    el.addEventListener("mouseleave",onEnd);
    return () => { el.removeEventListener("touchstart",onStart); el.removeEventListener("touchmove",onMove); el.removeEventListener("touchend",onEnd); el.removeEventListener("mousedown",onStart); el.removeEventListener("mousemove",onMove); el.removeEventListener("mouseup",onEnd); el.removeEventListener("mouseleave",onEnd); };
  }, []);

  return (
    <div style={{ position:"relative", borderRadius:12, overflow:"hidden", marginBottom:8 }}>
      <div ref={ref} style={{ width:"100%", height:220, overflow:"hidden", cursor:"grab", userSelect:"none", touchAction:"none" }}>
        <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${position.x}% ${position.y}%`, pointerEvents:"none", draggable:false }} />
      </div>
      <div style={{ position:"absolute", bottom:8, left:0, right:0, display:"flex", justifyContent:"center" }}>
        <span style={{ background:"rgba(0,0,0,0.45)", color:"#fff", fontSize:10, padding:"3px 10px", borderRadius:20 }}>ドラッグで表示位置を調整</span>
      </div>
      <button onClick={onRemove} style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.5)", border:"none", borderRadius:"50%", width:28, height:28, color:"#fff", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>×</button>
    </div>
  );
}

// ── Nav Menu (Drawer) ──────────────────────────────────────
function NavDrawer({ current, onNav, dark, setDark, C }) {
  const [open, setOpen] = useState(false);
  const navItems = [
    { key:"album",    icon:"🪴", label:"マイ植物" },
    { key:"timeline", icon:"📜", label:"タイムライン" },
    { key:"calendar", icon:"📅", label:"カレンダー" },
  ];
  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => setOpen(true)}
        style={{ width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3.5, padding:0 }}>
        {[0,1,2].map(i => <span key={i} style={{ display:"block", width:14, height:1.5, background:C.ink, borderRadius:99 }} />)}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:100 }} />
          <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"75%", maxWidth:300, background:C.card, zIndex:200, display:"flex", flexDirection:"column", boxShadow:"-4px 0 20px rgba(0,0,0,0.15)" }}>
            <div style={{ padding:"52px 16px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <p style={{ fontSize:15, fontWeight:700, color:C.ink }}>GROWTH</p>
              <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", color:C.soft, fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
            <div style={{ padding:"12px 10px", flex:1 }}>
              <p style={{ fontSize:9, color:C.soft, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6, paddingLeft:6 }}>メニュー</p>
              {navItems.map(({ key, icon, label }) => (
                <button key={key} onClick={() => { onNav(key); setOpen(false); }}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"none", background:current===key ? C.gLight : "transparent", display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:2 }}>
                  <span style={{ fontSize:16 }}>{icon}</span>
                  <span style={{ fontSize:13, fontWeight:current===key?600:400, color:current===key?C.green:C.ink }}>{label}</span>
                </button>
              ))}
            </div>
            <div style={{ height:1, background:C.border, margin:"0 16px" }} />
            <div style={{ padding:"14px 16px 32px" }}>
              <p style={{ fontSize:9, color:C.soft, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>設定</p>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"2px 0" }}>
                <span style={{ fontSize:13, color:C.ink }}>ダークモード</span>
                <div onClick={() => setDark(d => !d)} style={{ width:40, height:24, borderRadius:99, background:dark?C.green:"#ddd", position:"relative", cursor:"pointer", transition:"background 0.2s" }}>
                  <div style={{ position:"absolute", top:2, left:dark?18:2, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Journal Card ───────────────────────────────────────────
function JournalCard({ entry, delay=0, onDelete, onEdit, C }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="up" style={{ animationDelay:`${delay}ms`, background:C.card, borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}`, marginBottom:10 }}>
      {entry.photos?.length > 0 && <PhotoStrip photos={entry.photos} photoMeta={entry.photoMeta} />}
      <div style={{ padding:"11px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:entry.memo?6:0 }}>
          <p style={{ fontSize:11, color:C.soft }}>{fmtDate(entry.createdAt)}</p>
          {!confirm && (
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => onEdit(entry)} style={{ background:"none", border:"none", color:C.soft, fontSize:11, fontWeight:500, padding:"2px 4px", cursor:"pointer" }}>編集</button>
              <button onClick={() => setConfirm(true)} style={{ background:"none", border:"none", color:C.soft, fontSize:14, padding:"2px 4px", lineHeight:1 }}>✕</button>
            </div>
          )}
        </div>
        {confirm && (
          <div style={{ background:"#fff0f0", border:"1.5px solid #f5c0c0", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
            <p style={{ fontSize:12, color:"#cc3333", marginBottom:8 }}>この記録を削除しますか？</p>
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <Btn label="キャンセル" variant="ghost" onClick={() => setConfirm(false)} C={C} />
              <Btn label="削除" variant="danger" onClick={() => onDelete(entry.id)} C={C} />
            </div>
          </div>
        )}
        {entry.memo && <p style={{ fontSize:14, color:C.ink, lineHeight:1.7 }}>{entry.memo}</p>}
      </div>
    </div>
  );
}

// ── Add/Edit Entry ─────────────────────────────────────────
function EntryForm({ plant, entry, onSave, onBack, title, C }) {
  const [photos,    setPhotos]    = useState(entry?.photos || []);
  const [photoMeta, setPhotoMeta] = useState(entry?.photoMeta || []);
  const [memo,      setMemo]      = useState(entry?.memo || "");
  const [adjustIdx, setAdjustIdx] = useState(null);
  const MAX = 5;

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || photos.length >= MAX) return;
    const reader = new FileReader();
    reader.onload = ev => { setPhotos(ps => [...ps, ev.target.result]); setPhotoMeta(pm => [...pm, { pos:{x:50,y:50} }]); setAdjustIdx(photos.length); };
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  function removePhoto(i) { setPhotos(ps => ps.filter((_,idx) => idx!==i)); setPhotoMeta(pm => pm.filter((_,idx) => idx!==i)); if (adjustIdx===i) setAdjustIdx(null); }
  function updatePos(i, pos) { setPhotoMeta(pm => pm.map((m,idx) => idx===i ? {...m,pos} : m)); }
  const canSave = memo.trim().length > 0 || photos.length > 0;

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <div style={{ padding:"48px 20px 18px", background:C.card, borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack} style={{ background:"none", border:"none", fontSize:13, fontWeight:500, color:C.green, padding:0, marginBottom:14, display:"block" }}>← Back</button>
        <h2 style={{ fontSize:18, fontWeight:700, color:C.ink, letterSpacing:"-0.02em" }}>{title}</h2>
      </div>
      <div className="up" style={{ padding:"22px 16px 60px", display:"flex", flexDirection:"column", gap:20 }}>
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <Cap text="写真" C={C} />
            <span style={{ fontSize:11, color:C.soft }}>{photos.length} / {MAX}</span>
          </div>
          {adjustIdx !== null && photos[adjustIdx] && (
            <div>
              <PhotoAdjuster src={photos[adjustIdx]} position={photoMeta[adjustIdx]?.pos||{x:50,y:50}} onChange={pos => updatePos(adjustIdx,pos)} onRemove={() => removePhoto(adjustIdx)} />
              <button onClick={() => setAdjustIdx(null)} style={{ width:"100%", padding:"9px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", fontSize:12, fontWeight:500, color:C.mid, cursor:"pointer", marginBottom:8 }}>完了</button>
            </div>
          )}
          {adjustIdx === null && (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {photos.map((p,i) => (
                <div key={i} onClick={() => setAdjustIdx(i)} style={{ position:"relative", width:80, height:80, borderRadius:8, overflow:"hidden", flexShrink:0, cursor:"pointer" }}>
                  <img src={p} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:`${photoMeta[i]?.pos?.x??50}% ${photoMeta[i]?.pos?.y??50}%` }} />
                  <button onClick={e => { e.stopPropagation(); removePhoto(i); }} style={{ position:"absolute", top:3, right:3, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:22, height:22, color:"#fff", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>×</button>
                </div>
              ))}
              {photos.length < MAX && (
                <div style={{ position:"relative", width:80, height:80, borderRadius:8, border:`1.5px dashed ${C.border}`, background:C.card, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
                  <span style={{ fontSize:22, color:C.soft }}>+</span>
                  <input type="file" accept="image/*" onChange={handleFile} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
                </div>
              )}
            </div>
          )}
          {photos.length === 0 && adjustIdx === null && (
            <div style={{ position:"relative", borderRadius:12, border:`1.5px dashed ${C.border}`, background:C.card, height:130, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, overflow:"hidden", marginTop:10 }}>
              <span style={{ fontSize:28 }}>📷</span>
              <span style={{ fontSize:12, color:C.soft }}>タップして写真を選ぶ（最大{MAX}枚）</span>
              <input type="file" accept="image/*" onChange={handleFile} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
            </div>
          )}
        </div>
        <div>
          <Cap text="今日の気持ち・気づき" C={C} />
          <textarea style={{ ...getInp(C), minHeight:120, resize:"vertical" }}
            placeholder="新しい葉が出てきた！少し乾燥気味だったかも…" value={memo} onChange={e => setMemo(e.target.value)} />
        </div>
        <Btn label="保存する" disabled={!canSave} onClick={() => canSave && onSave({ photos, photoMeta, memo:memo.trim(), createdAt: entry?.createdAt || Date.now() })} full C={C} />
      </div>
    </div>
  );
}

// ── Plant Detail ───────────────────────────────────────────
function PlantDetail({ plant, entries, onBack, onAddEntry, onDelete, onDeleteEntry, onArchive, onEdit, onEditEntry, C }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmWither, setConfirmWither] = useState(false);
  const pe = entries.filter(e => e.plantId===plant.id).sort((a,b) => b.createdAt-a.createdAt);
  const groups = [];
  pe.forEach(e => { const k=fmtYM(e.createdAt); const g=groups.find(g=>g.key===k); if(g) g.items.push(e); else groups.push({key:k,label:fmtMonth(e.createdAt),items:[e]}); });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, paddingBottom:60 }}>
      <div style={{ padding:"48px 20px 20px", background:C.card, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", fontSize:13, fontWeight:500, color:C.green, padding:0 }}>← Back</button>
          <button onClick={onEdit} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:500, color:C.mid, cursor:"pointer" }}>編集</button>
        </div>
        {plant.variety && <p style={{ fontSize:10, fontWeight:500, color:C.soft, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:3 }}>{plant.name}</p>}
        <h2 style={{ fontSize:22, fontWeight:700, color:C.ink, letterSpacing:"-0.02em" }}>{plant.variety||plant.name}</h2>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:6 }}>
          {plant.arrivalDate && (() => {
            const diff = Math.floor((Date.now()-new Date(plant.arrivalDate))/86400000);
            const months = Math.floor(diff/30);
            const label = months >= 2 ? `${months}ヶ月` : `${diff}日`;
            return <p style={{ fontSize:12, color:C.mid }}>🌱 お迎え日 {fmtFull(plant.arrivalDate)} <span style={{ marginLeft:6, padding:"2px 8px", borderRadius:20, background:C.gLight, color:C.green, fontSize:11, fontWeight:500 }}>{label}経過</span></p>;
          })()}
          {plant.waterDays && <p style={{ fontSize:12, color:C.green, fontWeight:500 }}>💧 {plant.waterDays}日おき</p>}
          {plant.notes && <p style={{ fontSize:12, color:C.soft }}>{plant.notes}</p>}
        </div>
      </div>
      <div style={{ padding:"16px 16px" }}>
        <button onClick={onAddEntry} style={{ width:"100%", padding:"11px", borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", fontSize:12, fontWeight:500, color:C.mid, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <span style={{ fontSize:16, lineHeight:1 }}>+</span> 今日の記録を追加
        </button>
        <div style={{ height:24 }} />
        {pe.length === 0
          ? <p style={{ textAlign:"center", color:C.soft, padding:"40px 0", fontSize:14 }}>まだ記録がありません</p>
          : groups.map(g => (
            <div key={g.key} style={{ marginBottom:28 }}>
              <p style={{ fontSize:11, fontWeight:500, color:C.soft, marginBottom:12, letterSpacing:"0.04em" }}>{g.label}</p>
              {g.items.map((e,i) => <JournalCard key={e.id} entry={e} delay={i*35} onDelete={onDeleteEntry} onEdit={onEditEntry} C={C} />)}
            </div>
          ))}
        <div style={{ height:1, background:C.border, margin:"8px 0 16px" }} />
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {!plant.archived && (
            confirmWither ? (
              <div style={{ background:"#fdf8f0", border:"1.5px solid #e8d5a0", borderRadius:10, padding:"14px 16px" }}>
                <p style={{ fontSize:13, fontWeight:600, color:"#7a5c20", marginBottom:6 }}>🍂 枯れてしまいましたか？</p>
                <p style={{ fontSize:12, color:"#a08040", marginBottom:14, lineHeight:1.6 }}>記録はアーカイブとして残します。</p>
                <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                  <Btn label="キャンセル" variant="ghost" onClick={() => setConfirmWither(false)} C={C} />
                  <button onClick={() => { onArchive(plant.id); setConfirmWither(false); }} style={{ padding:"11px 18px", borderRadius:8, border:"none", background:"#c8a050", color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer" }}>アーカイブする</button>
                </div>
              </div>
            ) : (
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <button onClick={() => setConfirmWither(true)} style={{ padding:"11px 18px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", fontSize:13, fontWeight:500, color:C.soft, cursor:"pointer" }}>🍂 枯れてしまった</button>
              </div>
            )
          )}
          {plant.archived && (
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button onClick={() => onArchive(plant.id, false)} style={{ padding:"11px 18px", borderRadius:8, border:`1px solid ${C.gMid}`, background:C.gLight, fontSize:13, fontWeight:500, color:C.green, cursor:"pointer" }}>🌱 復活した！</button>
            </div>
          )}
          {confirmDelete ? (
            <div style={{ background:"#fff0f0", border:"1.5px solid #f5c0c0", borderRadius:10, padding:"14px 16px" }}>
              <p style={{ fontSize:13, color:"#cc3333", marginBottom:12 }}>「{plant.variety||plant.name}」を削除しますか？すべての記録も消えます。</p>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <Btn label="キャンセル" variant="ghost" onClick={() => setConfirmDelete(false)} C={C} />
                <Btn label="削除する" variant="danger" onClick={onDelete} C={C} />
              </div>
            </div>
          ) : (
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <Btn label="記録を削除" variant="danger" onClick={() => setConfirmDelete(true)} C={C} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plant Form (Add/Edit) ──────────────────────────────────
function PlantForm({ plant, onSave, onBack, title, C }) {
  const [name,        setName]        = useState(plant?.name||"");
  const [variety,     setVariety]     = useState(plant?.variety||"");
  const [waterDays,   setWaterDays]   = useState(plant?.waterDays||null);
  const [arrivalDate, setArrivalDate] = useState(plant?.arrivalDate||"");
  const [notes,       setNotes]       = useState(plant?.notes||"");
  const fieldStyle = getInp(C);

  return (
    <div style={{ minHeight:"100vh", background:C.bg }}>
      <div style={{ padding:"48px 20px 18px", background:C.card, borderBottom:`1px solid ${C.border}` }}>
        <button onClick={onBack} style={{ background:"none", border:"none", fontSize:13, fontWeight:500, color:C.green, padding:0, marginBottom:14, display:"block" }}>← Back</button>
        <h2 style={{ fontSize:18, fontWeight:700, color:C.ink, letterSpacing:"-0.02em" }}>{title}</h2>
      </div>
      <div className="up" style={{ padding:"22px 16px 60px", display:"flex", flexDirection:"column", gap:20 }}>
        <div><Cap text="属名・種名" C={C} /><input style={fieldStyle} placeholder="例）モンステラ" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div><Cap text="品種名" C={C} /><input style={fieldStyle} placeholder="例）デリシオーサ（任意）" value={variety} onChange={e=>setVariety(e.target.value)} /></div>
        <div>
          <Cap text="水やり頻度" C={C} />
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {[null,1,2,3,5,7,14].map(n => {
              const sel = waterDays===n;
              return <button key={String(n)} onClick={() => setWaterDays(n)} style={{ flex:1, minWidth:"calc(25% - 8px)", padding:"9px 0", borderRadius:8, border:`1.5px solid ${sel?C.ink:C.border}`, background:sel?C.ink:C.card, color:sel?"#fff":C.mid, fontSize:12, fontWeight:sel?600:400, cursor:"pointer" }}>{n===null?"設定しない":`${n}日`}</button>;
            })}
          </div>
          <p style={{ fontSize:11, color:C.soft, marginTop:6 }}>※ デプロイ後にプッシュ通知として機能します</p>
        </div>
        <div><Cap text="お迎え日（任意）" C={C} /><input type="date" style={fieldStyle} value={arrivalDate} onChange={e=>setArrivalDate(e.target.value)} /></div>
        <div><Cap text="メモ（任意）" C={C} /><textarea style={{ ...fieldStyle, minHeight:72, resize:"vertical" }} placeholder="置き場所、品種など" value={notes} onChange={e=>setNotes(e.target.value)} /></div>
        <Btn label="保存する" disabled={!name.trim()} onClick={() => onSave({ ...(plant||{}), name:name.trim(), variety:variety.trim(), waterDays, arrivalDate:arrivalDate||null, notes })} full C={C} />
      </div>
    </div>
  );
}

// ── Album View ─────────────────────────────────────────────
function AlbumView({ plants, entries, onNav, onPlant, onAddPlant, dark, setDark, C }) {
  const [sort, setSort]           = useState(() => localStorage.getItem("growth_sort")||"arrival_new");
  const [sortOpen, setSortOpen]   = useState(false);
  const [customOrder, setCustomOrder] = useState(() => { try { return JSON.parse(localStorage.getItem("growth_custom_order"))||null; } catch { return null; } });
  const [tapSelected, setTapSelected] = useState(null);

  const SORTS = [
    { key:"name",         label:"名前順" },
    { key:"arrival_new",  label:"お迎え日 新しい順" },
    { key:"arrival_old",  label:"お迎え日 古い順" },
    { key:"entries_desc", label:"記録数 多い順" },
    { key:"entries_asc",  label:"記録数 少ない順" },
    { key:"recent",       label:"最近記録した順" },
    { key:"custom",       label:"カスタム順" },
  ];

  function sortedPlants(list) {
    if (sort==="custom" && customOrder) {
      return [...list].sort((a,b) => { const ai=customOrder.indexOf(a.id), bi=customOrder.indexOf(b.id); if(ai===-1) return 1; if(bi===-1) return -1; return ai-bi; });
    }
    return [...list].sort((a,b) => {
      if (sort==="arrival_new") return (b.arrivalDate||"") > (a.arrivalDate||"") ? 1 : -1;
      if (sort==="arrival_old") return (a.arrivalDate||"") > (b.arrivalDate||"") ? 1 : -1;
      if (sort==="entries_desc") return entries.filter(e=>e.plantId===b.id).length - entries.filter(e=>e.plantId===a.id).length;
      if (sort==="entries_asc")  return entries.filter(e=>e.plantId===a.id).length - entries.filter(e=>e.plantId===b.id).length;
      if (sort==="name") return a.name.localeCompare(b.name,"ja");
      if (sort==="recent") {
        const la=entries.filter(e=>e.plantId===a.id).sort((x,y)=>y.createdAt-x.createdAt)[0]?.createdAt||0;
        const lb=entries.filter(e=>e.plantId===b.id).sort((x,y)=>y.createdAt-x.createdAt)[0]?.createdAt||0;
        return lb-la;
      }
      return 0;
    });
  }

  function handleTapReorder(id, active) {
    if (tapSelected===null) { setTapSelected(id); }
    else if (tapSelected===id) { setTapSelected(null); }
    else {
      const current = customOrder||active.map(p=>p.id);
      const fi=current.indexOf(tapSelected), ti=current.indexOf(id);
      const next=[...current];
      [next[fi],next[ti]]=[next[ti],next[fi]];
      setCustomOrder(next);
      localStorage.setItem("growth_custom_order",JSON.stringify(next));
      setTapSelected(null);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, paddingBottom:40 }}>
      <div style={{ padding:"52px 20px 16px", background:C.card, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:11, color:C.soft, marginBottom:4 }}>{new Date().toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"})}</p>
            <h1 style={{ fontSize:28, fontWeight:700, color:C.ink, letterSpacing:"-0.02em" }}>GROWTH</h1>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <button onClick={() => setSortOpen(o=>!o)} style={{ width:34, height:34, borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", fontSize:14, color:C.mid, cursor:"pointer" }}>▾</button>
              {sortOpen && (
                <>
                  <div onClick={() => setSortOpen(false)} style={{ position:"fixed", inset:0, zIndex:10 }} />
                  <div style={{ position:"absolute", top:40, right:0, background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:6, zIndex:20, minWidth:180, boxShadow:"0 4px 20px rgba(0,0,0,0.08)" }}>
                    {SORTS.map(s => (
                      <button key={s.key} onClick={() => { setSort(s.key); localStorage.setItem("growth_sort",s.key); setSortOpen(false); }}
                        style={{ display:"block", width:"100%", padding:"8px 12px", background:sort===s.key?C.gLight:"transparent", borderRadius:7, border:"none", textAlign:"left", fontSize:12, color:sort===s.key?C.green:C.ink, fontWeight:sort===s.key?600:400, cursor:"pointer" }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <NavDrawer current="album" onNav={onNav} dark={dark} setDark={setDark} C={C} />
          </div>
        </div>
      </div>

      <div style={{ padding:"20px 16px" }}>
        {plants.length === 0 ? (
          <div className="up" style={{ textAlign:"center", padding:"40px 16px" }}>
            <div style={{ fontSize:48, marginBottom:14, opacity:0.25 }}>🌱</div>
            <p style={{ fontSize:14, color:C.soft, fontWeight:300, marginBottom:6 }}>あなたの植物記録アプリ</p>
            <p style={{ fontSize:11, color:C.soft, fontWeight:300, marginBottom:28, opacity:0.7 }}>植物を登録して育成を記録しましょう</p>
            <Btn label="+ 最初の植物を追加" onClick={onAddPlant} C={C} />
          </div>
        ) : (() => {
          const active   = plants.filter(p => !p.archived);
          const archived = plants.filter(p =>  p.archived);
          return (
            <>
              <button onClick={onAddPlant} style={{ width:"100%", padding:"11px", borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", fontSize:12, fontWeight:500, color:C.mid, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:10 }}>
                <span style={{ fontSize:16, lineHeight:1 }}>+</span> 植物を追加
              </button>

              {sort==="custom" && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                  <p style={{ fontSize:10, color:tapSelected?C.green:C.soft, fontWeight:tapSelected?600:400 }}>
                    {tapSelected ? "入れ替え先のカードをタップ" : "入れ替えたいカードをタップ"}
                  </p>
                  <button onClick={() => { setSort("name"); localStorage.setItem("growth_sort","name"); setTapSelected(null); }}
                    style={{ padding:"4px 10px", borderRadius:8, border:`1px solid ${C.green}`, background:C.gLight, color:C.green, fontSize:12, fontWeight:600, cursor:"pointer" }}>OK</button>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {sortedPlants(active).map((p,i) => {
                  const pe = entries.filter(e=>e.plantId===p.id).sort((a,b)=>b.createdAt-a.createdAt);
                  const isSel = tapSelected===p.id;
                  return (
                    <div key={p.id} className="up" onClick={() => sort==="custom" ? handleTapReorder(p.id,sortedPlants(active)) : onPlant(p.id)}
                      style={{ animationDelay:`${i*50}ms`, background:C.card, borderRadius:14, overflow:"hidden", border:`1.5px solid ${isSel?C.green:C.border}`, cursor:"pointer", transform:isSel?"scale(1.03)":"scale(1)", transition:"transform 0.15s, border 0.15s", boxShadow:isSel?`0 0 0 3px ${C.gLight}`:"none" }}>
                      <div style={{ aspectRatio:"1/1", background:C.bg, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {pe[0]?.photos?.[0]
                          ? <img src={pe[0].photos[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : <span style={{ fontSize:32, opacity:0.3 }}>{p.archived?"🍂":"🌿"}</span>}
                      </div>
                      <div style={{ padding:"6px 8px 7px" }}>
                        {p.variety && <p style={{ fontSize:7, color:C.soft, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:0 }}>{p.name}</p>}
                        <p style={{ fontSize:12, fontWeight:600, color:isSel?C.green:C.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", lineHeight:1.3 }}>{p.variety||p.name}</p>
                        <p style={{ fontSize:9, color:C.soft, marginTop:2 }}>{pe.length>0?`${pe.length}件`:"記録なし"}{p.waterDays?` · 💧${p.waterDays}日`:""}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {archived.length > 0 && (
                <div style={{ marginTop:32 }}>
                  <p style={{ fontSize:11, fontWeight:500, color:C.soft, letterSpacing:"0.04em", marginBottom:12 }}>🍂 枯れてしまった。</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {archived.map((p,i) => {
                      const pe = entries.filter(e=>e.plantId===p.id).sort((a,b)=>b.createdAt-a.createdAt);
                      return (
                        <div key={p.id} onClick={() => onPlant(p.id)} style={{ background:C.card, borderRadius:14, overflow:"hidden", border:`1px solid ${C.border}`, cursor:"pointer", opacity:0.6 }}>
                          <div style={{ aspectRatio:"1/1", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {pe[0]?.photos?.[0] ? <img src={pe[0].photos[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <span style={{ fontSize:32, opacity:0.3 }}>🍂</span>}
                          </div>
                          <div style={{ padding:"6px 8px 7px" }}>
                            {p.variety && <p style={{ fontSize:7, color:C.soft, textTransform:"uppercase", letterSpacing:"0.06em" }}>{p.name}</p>}
                            <p style={{ fontSize:12, fontWeight:600, color:C.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.variety||p.name}</p>
                            <p style={{ fontSize:9, color:C.soft, marginTop:2 }}>{pe.length}件</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────
function TimelineView({ plants, entries, onNav, onPlant, dark, setDark, C }) {
  const [lightbox, setLightbox] = useState(null);
  const sorted = [...entries].sort((a,b) => b.createdAt-a.createdAt);
  const groups = [];
  sorted.forEach(e => { const k=fmtYM(e.createdAt); const g=groups.find(g=>g.key===k); if(g) g.items.push(e); else groups.push({key:k,label:fmtMonth(e.createdAt),items:[e]}); });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, paddingBottom:40 }}>
      {lightbox && <Lightbox photos={lightbox.photos} startIndex={lightbox.idx} onClose={() => setLightbox(null)} />}
      <div style={{ padding:"52px 20px 16px", background:C.card, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:C.ink, letterSpacing:"-0.02em" }}>Timeline</h1>
        <NavDrawer current="timeline" onNav={onNav} dark={dark} setDark={setDark} C={C} />
      </div>
      <div style={{ padding:"20px 16px" }}>
        {sorted.length===0
          ? <p style={{ textAlign:"center", color:C.soft, padding:"50px 0", fontSize:14 }}>まだ記録がありません</p>
          : groups.map(g => (
            <div key={g.key} style={{ marginBottom:28 }}>
              <p style={{ fontSize:11, fontWeight:500, color:C.soft, marginBottom:12, letterSpacing:"0.04em" }}>{g.label}</p>
              {g.items.map((e,i) => {
                const plant = plants.find(p=>p.id===e.plantId);
                return (
                  <div key={e.id} className="up" style={{ animationDelay:`${i*35}ms`, background:C.card, borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}`, marginBottom:10 }}>
                    {e.photos?.[0] && (
                      <div style={{ position:"relative", cursor:"pointer" }} onClick={() => setLightbox({photos:e.photos,idx:0})}>
                        <img src={e.photos[0]} alt="" style={{ width:"100%", maxHeight:200, objectFit:"cover", display:"block" }} />
                        {e.photos.length > 1 && (
                          <div style={{ position:"absolute", bottom:8, right:10, background:"rgba(0,0,0,0.45)", borderRadius:12, padding:"2px 8px" }}>
                            <span style={{ color:"#fff", fontSize:11 }}>+{e.photos.length-1}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ padding:"11px 14px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:e.memo?6:0 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:C.green, cursor:"pointer" }} onClick={() => plant && onPlant(plant.id)}>{plant?(plant.variety||plant.name):""}</span>
                        <span style={{ fontSize:11, color:C.soft }}>{fmtDate(e.createdAt)}</span>
                      </div>
                      {e.memo && <p style={{ fontSize:14, color:C.ink, lineHeight:1.7 }}>{e.memo}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Calendar ───────────────────────────────────────────────
function CalendarView({ plants, entries, onNav, onPlant, dark, setDark, C }) {
  const now = new Date();
  const [yr,setYr]=useState(now.getFullYear());
  const [mo,setMo]=useState(now.getMonth());
  const [sel,setSel]=useState(null);
  const days=daysInMonth(yr,mo), fd=firstDay(yr,mo);
  const tKey=todayKey();
  const dotMap={};
  entries.forEach(e => { const d=new Date(e.createdAt); const k=`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; if(!dotMap[k]) dotMap[k]=[]; dotMap[k].push(e); });
  const selKey=sel?`${yr}-${mo}-${sel}`:null;
  const selEntries=selKey?(dotMap[selKey]||[]):[];
  function prev(){if(mo===0){setYr(y=>y-1);setMo(11);}else setMo(m=>m-1);setSel(null);}
  function next(){if(mo===11){setYr(y=>y+1);setMo(0);}else setMo(m=>m+1);setSel(null);}

  return (
    <div style={{ minHeight:"100vh", background:C.bg, paddingBottom:40 }}>
      <div style={{ padding:"52px 20px 16px", background:C.card, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:C.ink, letterSpacing:"-0.02em" }}>Calendar</h1>
        <NavDrawer current="calendar" onNav={onNav} dark={dark} setDark={setDark} C={C} />
      </div>
      <div style={{ padding:"20px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <button onClick={prev} style={{ background:"none", border:"none", fontSize:22, color:C.mid, padding:"0 8px", cursor:"pointer" }}>‹</button>
          <span style={{ fontSize:15, fontWeight:600, color:C.ink }}>{yr}年 {mo+1}月</span>
          <button onClick={next} style={{ background:"none", border:"none", fontSize:22, color:C.mid, padding:"0 8px", cursor:"pointer" }}>›</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
          {["日","月","火","水","木","金","土"].map((d,i) => <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:500, padding:"3px 0", color:i===0?"#cc4444":i===6?"#4466cc":C.soft }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:24 }}>
          {Array.from({length:fd}).map((_,i) => <div key={`_${i}`} />)}
          {Array.from({length:days}).map((_,i) => {
            const day=i+1, key=`${yr}-${mo}-${day}`, isSel=sel===day, isToday=key===tKey, hasDot=!!dotMap[key];
            return (
              <div key={day} onClick={() => setSel(isSel?null:day)} style={{ aspectRatio:"1", borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, cursor:"pointer", background:isSel?C.ink:isToday?C.gLight:"transparent", border:`1px solid ${isToday&&!isSel?C.gMid:"transparent"}`, transition:"background .15s" }}>
                <span style={{ fontSize:13, fontWeight:isSel||isToday?600:400, color:isSel?"#fff":C.ink }}>{day}</span>
                {hasDot && <div style={{ width:4, height:4, borderRadius:"50%", background:isSel?"rgba(255,255,255,0.7)":C.green }} />}
              </div>
            );
          })}
        </div>
        {selKey && (
          <div>
            <p style={{ fontSize:11, fontWeight:500, color:C.soft, marginBottom:12, letterSpacing:"0.04em" }}>{yr}年{mo+1}月{sel}日の記録</p>
            {selEntries.length===0
              ? <p style={{ fontSize:13, color:C.soft }}>この日の記録はありません</p>
              : selEntries.map(e => {
                  const plant=plants.find(p=>p.id===e.plantId);
                  return (
                    <div key={e.id} onClick={() => plant&&onPlant(plant.id)} style={{ background:C.card, borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}`, marginBottom:10, cursor:"pointer" }}>
                      {e.photos?.[0] && <img src={e.photos[0]} alt="" style={{ width:"100%", maxHeight:180, objectFit:"cover", display:"block" }} />}
                      <div style={{ padding:"11px 14px" }}>
                        <span style={{ fontSize:12, fontWeight:600, color:C.green }}>{plant?(plant.variety||plant.name):""}</span>
                        {e.memo && <p style={{ fontSize:14, color:C.ink, lineHeight:1.7, marginTop:4 }}>{e.memo}</p>}
                      </div>
                    </div>
                  );
                })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────
export default function App() {
  const [dark,    setDark]    = useState(() => localStorage.getItem("growth_dark")==="1");
  const C = dark ? DARK : LIGHT;
  const [plants,  setPlants]  = useState(() => readStore().plants);
  const [entries, setEntries] = useState(() => readStore().entries.map(e => ({ ...e, photos:[] })));
  const [view,    setView]    = useState("album");
  const [plantId, setPlantId] = useState(null);
  const [entryFor,    setEntryFor]    = useState(null);
  const [editingEntry,setEditingEntry]= useState(null);

  // Apply theme
  useEffect(() => {
    document.body.style.background = C.bg;
    localStorage.setItem("growth_dark", dark?"1":"0");
  }, [dark]);

  // Load photos from IDB
  useEffect(() => {
    const init = readStore().entries;
    if (!init.length) return;
    Promise.all(init.map(async e => {
      const count = e.photoCount||0;
      const photos = await Promise.all(Array.from({length:count},(_,i) => loadPhoto(`${e.id}_${i}`)));
      return { id:e.id, photos:photos.filter(Boolean), photoMeta:e.photoMeta||[] };
    })).then(res => setEntries(es => es.map(en => { const r=res.find(r=>r.id===en.id); return r?.photos?.length ? {...en, photos:r.photos, photoMeta:r.photoMeta} : en; })));
  }, []);

  useEffect(() => { writeStore(plants, entries); }, [plants, entries]);

  const plant = plants.find(p => p.id===plantId)||null;

  function addPlant(form)    { setPlants(ps => [...ps, { id:Date.now(), ...form }]); setView("album"); }
  function updatePlant(form) { setPlants(ps => ps.map(p => p.id===form.id?form:p)); setView("plant"); }
  function deletePlant(id)   { entries.filter(e=>e.plantId===id).forEach(e=>e.photos?.forEach((_,i)=>deletePhoto(`${e.id}_${i}`))); setPlants(ps=>ps.filter(p=>p.id!==id)); setEntries(es=>es.filter(e=>e.plantId!==id)); setView("album"); }
  function archivePlant(id, archive=true) { setPlants(ps=>ps.map(p=>p.id===id?{...p,archived:archive,archivedAt:archive?Date.now():null}:p)); setView("album"); }

  function addEntry({ photos, photoMeta, memo, createdAt }) {
    const id=Date.now();
    photos.forEach((p,i) => savePhoto(`${id}_${i}`,p));
    setEntries(es => [...es, { id, plantId:entryFor.id, photos, photoMeta, memo, createdAt }]);
    setView("plant");
  }
  function saveEditedEntry({ photos, photoMeta, memo }) {
    if (!editingEntry) return;
    const id=editingEntry.id;
    photos.forEach((p,i) => savePhoto(`${id}_${i}`,p));
    setEntries(es => es.map(e => e.id===id ? {...e,photos,photoMeta,memo} : e));
    setView("plant"); setEditingEntry(null);
  }
  function deleteEntry(id) { const e=entries.find(e=>e.id===id); e?.photos?.forEach((_,i)=>deletePhoto(`${e.id}_${i}`)); setEntries(es=>es.filter(e=>e.id!==id)); }

  function goPlant(id) { setPlantId(id); setView("plant"); }
  function goNav(key) { setView(key); }

  const commonProps = { dark, setDark, C };

  return (
    <div style={{ maxWidth:430, margin:"0 auto", minHeight:"100vh", background:C.bg, overflowX:"hidden" }}>
      {view==="album"     && <AlbumView    plants={plants} entries={entries} onNav={goNav} onPlant={goPlant} onAddPlant={()=>setView("addPlant")} {...commonProps} />}
      {view==="timeline"  && <TimelineView plants={plants} entries={entries} onNav={goNav} onPlant={goPlant} {...commonProps} />}
      {view==="calendar"  && <CalendarView plants={plants} entries={entries} onNav={goNav} onPlant={goPlant} {...commonProps} />}
      {view==="plant"     && plant && <PlantDetail plant={plant} entries={entries} onBack={()=>setView("album")} onAddEntry={()=>{setEntryFor(plant);setView("addEntry");}} onDelete={()=>deletePlant(plant.id)} onDeleteEntry={deleteEntry} onArchive={archivePlant} onEdit={()=>setView("editPlant")} onEditEntry={e=>{setEditingEntry(e);setView("editEntry");}} C={C} />}
      {view==="addPlant"  && <PlantForm title="New Plant"  onSave={addPlant}    onBack={()=>setView("album")} C={C} />}
      {view==="editPlant" && plant && <PlantForm title="編集" plant={plant} onSave={updatePlant} onBack={()=>setView("plant")} C={C} />}
      {view==="addEntry"  && entryFor    && <EntryForm title={`${entryFor.variety||entryFor.name} の記録`}    plant={entryFor}    onSave={addEntry}         onBack={()=>setView("plant")} C={C} />}
      {view==="editEntry" && editingEntry && plant && <EntryForm title="記録を編集" plant={plant} entry={editingEntry} onSave={saveEditedEntry} onBack={()=>{setView("plant");setEditingEntry(null);}} C={C} />}
    </div>
  );
}
