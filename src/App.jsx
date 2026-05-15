import { useState, useEffect, useRef } from "react";

// ── Styles are in index.css ──────────────────────────────

// ── Theme ──────────────────────────────────────────────────
const C = {
  bg:      "#f5f5f5",
  card:    "#ffffff",
  border:  "#e8e8e8",
  ink:     "#111111",
  mid:     "#555555",
  soft:    "#aaaaaa",
  green:   "#2d6a4f",
  gLight:  "#f0f7f3",
  gMid:    "#95c4aa",
};

// ── Storage ────────────────────────────────────────────────
const STORE    = "growth_v5";
const IDB_NAME = "growth_photos_v5";
const IDB_ST   = "photos";

function readStore() {
  try { return JSON.parse(localStorage.getItem(STORE)) || { plants: [], entries: [] }; }
  catch { return { plants: [], entries: [] }; }
}
function writeStore(plants, entries) {
  try {
    localStorage.setItem(STORE, JSON.stringify({
      plants,
      entries: entries.map(e => ({ ...e, photos: undefined, photoCount: e.photos?.length || 0, photoMeta: e.photoMeta || [] })),
    }));
  } catch {}
}
function openIDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore(IDB_ST);
    r.onsuccess = e => res(e.target.result);
    r.onerror   = e => rej(e.target.error);
  });
}
async function savePhoto(id, url) {
  try {
    const db = await openIDB();
    await new Promise((res, rej) => {
      const tx = db.transaction(IDB_ST, "readwrite");
      tx.objectStore(IDB_ST).put(url, id);
      tx.oncomplete = () => res();
      tx.onerror    = () => rej();
    });
  } catch {}
}
async function loadPhoto(id) {
  try {
    const db = await openIDB();
    return await new Promise(res => {
      const r = db.transaction(IDB_ST).objectStore(IDB_ST).get(id);
      r.onsuccess = e => res(e.target.result || null);
      r.onerror   = () => res(null);
    });
  } catch { return null; }
}
async function deletePhoto(id) {
  try {
    const db = await openIDB();
    await new Promise(res => {
      const tx = db.transaction(IDB_ST, "readwrite");
      tx.objectStore(IDB_ST).delete(id);
      tx.oncomplete = () => res();
      tx.onerror    = () => res();
    });
  } catch {}
}

// ── Helpers ────────────────────────────────────────────────
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}
function fmtMonth(ts) {
  return new Date(ts).toLocaleDateString("ja-JP", { year: "numeric", month: "long" });
}
function fmtYM(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}`;
}
function daysInMonth(y, m)  { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y, m)     { return new Date(y, m, 1).getDay(); }
function todayKey()         { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

// ── Shared atoms ───────────────────────────────────────────
const inp = {
  width: "100%", padding: "11px 14px", borderRadius: 8,
  border: `1.5px solid ${C.border}`, background: C.card,
  color: C.ink, fontSize: 14, fontWeight: 400, outline: "none",
};

function Btn({ label, variant = "fill", disabled, onClick, full }) {
  const v = {
    fill:   { background: C.ink,    color: "#fff",   border: "none" },
    ghost:  { background: "transparent", color: C.mid, border: `1.5px solid ${C.border}` },
    green:  { background: C.green,  color: "#fff",   border: "none" },
    danger: { background: "#fff0f0", color: "#cc3333", border: "1.5px solid #f5c0c0" },
  };
  return (
    <button disabled={disabled} onClick={onClick} style={{
      width: full ? "100%" : undefined,
      padding: "11px 18px", borderRadius: 8,
      fontSize: 13, fontWeight: 500,
      opacity: disabled ? 0.35 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "opacity 0.15s",
      ...v[variant],
    }}>{label}</button>
  );
}

function Cap({ text }) {
  return <p style={{ fontSize: 11, fontWeight: 500, color: C.soft, marginBottom: 8, letterSpacing: "0.04em" }}>{text}</p>;
}

function Divider() {
  return <div style={{ height: 1, background: C.border }} />;
}

// ── Nav Menu ───────────────────────────────────────────────
function NavMenu({ current, onNav }) {
  const [open, setOpen] = useState(false);
  const items = [
    { key: "album",    label: "Plants" },
    { key: "timeline", label: "Timeline" },
    { key: "calendar", label: "Calendar" },
  ];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: "none", border: `1.5px solid ${C.border}`, borderRadius: 8, width: 36, height: 36, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 0 }}>
        {[0,1,2].map(i => <span key={i} style={{ display: "block", width: 14, height: 1.5, background: C.ink, borderRadius: 99 }} />)}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div style={{ position: "absolute", top: 42, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 6, zIndex: 20, minWidth: 150, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            {items.map(({ key, label }) => (
              <button key={key} onClick={() => { onNav(key); setOpen(false); }}
                style={{ display: "block", width: "100%", padding: "9px 14px", background: current === key ? C.bg : "transparent", borderRadius: 7, border: "none", textAlign: "left", fontSize: 13, fontWeight: current === key ? 600 : 400, color: current === key ? C.ink : C.mid, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Plant Card ─────────────────────────────────────────────
function PlantCard({ plant, entries, onClick, delay, archived }) {
  const pe = entries.filter(e => e.plantId === plant.id).sort((a, b) => b.createdAt - a.createdAt);
  const latest = pe[0];
  return (
    <div className="up" onClick={onClick}
      style={{ animationDelay: `${delay}ms`, background: C.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, cursor: "pointer", opacity: archived ? 0.6 : 1 }}>
      <div style={{ aspectRatio: "1/1", background: C.bg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {latest?.photos?.[0]
          ? <img src={latest.photos[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 32, opacity: 0.3 }}>{archived ? "🍂" : "🌿"}</span>}
      </div>
      <div style={{ padding: "6px 8px 7px" }}>
        {plant.variety && (
          <p style={{ fontSize: 7, color: C.soft, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 0 }}>{plant.name}</p>
        )}
        <p style={{ fontSize: 12, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
          {plant.variety || plant.name}
        </p>
        <p style={{ fontSize: 9, color: C.soft, marginTop: 2 }}>
          {pe.length > 0 ? `${pe.length}件` : "記録なし"}
          {plant.waterDays ? ` · 💧${plant.waterDays}日` : ""}
        </p>
      </div>
    </div>
  );
}

// ── Album View ─────────────────────────────────────────────
function AlbumView({ plants, entries, onNav, onPlant, onAddPlant }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 40 }}>
      <div style={{ padding: "52px 20px 16px", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, color: C.soft, marginBottom: 4 }}>
              {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: C.ink, letterSpacing: "-0.03em" }}>GROWTH</h1>
          </div>
          <NavMenu current="album" onNav={onNav} />
        </div>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {(() => {
          const active   = plants.filter(p => !p.archived);
          const archived = plants.filter(p =>  p.archived);
          if (plants.length === 0) return (
            <div className="up" style={{ textAlign: "center", padding: "64px 16px" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🌿</div>
              <p style={{ fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Start your garden</p>
              <p style={{ fontSize: 13, color: C.soft, marginBottom: 28 }}>植物を登録して毎日の記録を残しましょう</p>
              <Btn label="最初の植物を追加" onClick={onAddPlant} />
            </div>
          );
          return (
            <>
              {/* 追加バー */}
              <button onClick={onAddPlant}
                style={{ width: "100%", padding: "11px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", fontSize: 12, fontWeight: 500, color: C.mid, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> 植物を追加
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {active.map((p, i) => (
                  <PlantCard key={p.id} plant={p} entries={entries} onClick={() => onPlant(p.id)} delay={i * 50} />
                ))}
              </div>
              {archived.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: C.soft, letterSpacing: "0.04em", marginBottom: 12 }}>🍂 枯れてしまった。</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {archived.map((p, i) => (
                      <PlantCard key={p.id} plant={p} entries={entries} onClick={() => onPlant(p.id)} delay={i * 50} archived />
                    ))}
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

// ── Plant Detail ───────────────────────────────────────────
function PlantDetail({ plant, entries, onBack, onAddEntry, onDelete, onDeleteEntry, onArchive, onEdit }) {
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [confirmWither,  setConfirmWither]  = useState(false);
  const pe = entries.filter(e => e.plantId === plant.id).sort((a, b) => b.createdAt - a.createdAt);

  const groups = [];
  pe.forEach(e => {
    const k = fmtYM(e.createdAt);
    const g = groups.find(g => g.key === k);
    if (g) g.items.push(e); else groups.push({ key: k, label: fmtMonth(e.createdAt), items: [e] });
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ padding: "48px 20px 20px", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 500, color: C.green, padding: 0 }}>← Back</button>
          <button onClick={onEdit} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 500, color: C.mid, cursor: "pointer" }}>編集</button>
        </div>
        {plant.variety && (
          <p style={{ fontSize: 10, fontWeight: 500, color: C.soft, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 3 }}>{plant.name}</p>
        )}
        <h2 style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>{plant.variety || plant.name}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
          {plant.arrivalDate && (() => {
            const diff = Math.floor((Date.now() - new Date(plant.arrivalDate)) / 86400000);
            const months = Math.floor(diff / 30);
            const label = months >= 2 ? `${months}ヶ月` : `${diff}日`;
            return (
              <p style={{ fontSize: 12, color: C.mid }}>
                🌱 お迎え日 {new Date(plant.arrivalDate).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
                <span style={{ marginLeft: 6, padding: "2px 8px", borderRadius: 20, background: C.gLight, color: C.green, fontSize: 11, fontWeight: 500 }}>
                  {label}経過
                </span>
              </p>
            );
          })()}
          {plant.waterDays && <p style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>💧 {plant.waterDays}日おき</p>}
          {plant.notes && <p style={{ fontSize: 12, color: C.soft }}>{plant.notes}</p>}
        </div>
      </div>

      <div style={{ padding: "16px 16px" }}>
        <Btn label="+ 今日の記録を追加" variant="green" onClick={onAddEntry} full />
        <div style={{ height: 24 }} />

        {pe.length === 0
          ? <p style={{ textAlign: "center", color: C.soft, padding: "40px 0", fontSize: 14 }}>まだ記録がありません</p>
          : groups.map(g => (
            <div key={g.key} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: C.soft, marginBottom: 12, letterSpacing: "0.04em" }}>{g.label}</p>
              {g.items.map((e, i) => <JournalCard key={e.id} entry={e} delay={i * 35} onDelete={onDeleteEntry} />)}
            </div>
          ))}

        <Divider />
        <div style={{ paddingTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 枯れたボタン */}
          {!plant.archived && (
            confirmWither ? (
              <div style={{ background: "#fdf8f0", border: "1.5px solid #e8d5a0", borderRadius: 10, padding: "14px 16px" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#7a5c20", marginBottom: 6 }}>🍂 枯れてしまいましたか？</p>
                <p style={{ fontSize: 12, color: "#a08040", marginBottom: 14, lineHeight: 1.6 }}>
                  記録はアーカイブとして残します。いつでも振り返ることができます。
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Btn label="キャンセル" variant="ghost" onClick={() => setConfirmWither(false)} />
                  <button onClick={() => { onArchive(plant.id); setConfirmWither(false); }}
                    style={{ padding: "11px 18px", borderRadius: 8, border: "none", background: "#c8a050", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    アーカイブする
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmWither(true)}
                  style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", fontSize: 13, fontWeight: 500, color: C.soft, cursor: "pointer" }}>
                  🍂 枯れてしまった
                </button>
              </div>
            )
          )}

          {/* 復活ボタン */}
          {plant.archived && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => onArchive(plant.id, false)}
                style={{ padding: "11px 18px", borderRadius: 8, border: `1px solid ${C.gMid}`, background: C.gLight, fontSize: 13, fontWeight: 500, color: C.green, cursor: "pointer" }}>
                🌱 復活した！
              </button>
            </div>
          )}

          {/* 削除ボタン */}
          {confirmDelete ? (
            <div style={{ background: "#fff0f0", border: "1.5px solid #f5c0c0", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 13, color: "#cc3333", marginBottom: 12 }}>「{plant.variety || plant.name}」を削除しますか？すべての記録も消えます。</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Btn label="キャンセル" variant="ghost" onClick={() => setConfirmDelete(false)} />
                <Btn label="削除する" variant="danger" onClick={onDelete} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn label="植物を削除" variant="danger" onClick={() => setConfirmDelete(true)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Lightbox ───────────────────────────────────────────────
function Lightbox({ photos, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src={photos[idx]} alt="" onClick={e => e.stopPropagation()}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      {photos.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); }}
            style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer" }}>‹</button>
          <button onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % photos.length); }}
            style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer" }}>›</button>
          <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
            {photos.map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === idx ? "#fff" : "rgba(255,255,255,0.35)" }} />
            ))}
          </div>
        </>
      )}
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
    </div>
  );
}

// ── Photo Strip ─────────────────────────────────────────────
function PhotoStrip({ photos, photoMeta }) {
  const [lightbox, setLightbox] = useState(null);
  if (!photos?.length) return null;
  function pos(i) {
    const m = photoMeta?.[i];
    return m ? `${m.pos?.x ?? 50}% ${m.pos?.y ?? 50}%` : "50% 50%";
  }
  return (
    <>
      {lightbox !== null && <Lightbox photos={photos} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      {photos.length === 1 ? (
        <img src={photos[0]} alt="" onClick={() => setLightbox(0)}
          style={{ width: "100%", maxHeight: 240, objectFit: "cover", objectPosition: pos(0), display: "block", cursor: "pointer" }} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: photos.length === 2 ? "1fr 1fr" : "2fr 1fr", gap: 2 }}>
          <img src={photos[0]} alt="" onClick={() => setLightbox(0)}
            style={{ width: "100%", height: photos.length === 2 ? 160 : 200, objectFit: "cover", objectPosition: pos(0), display: "block", cursor: "pointer",
              gridRow: photos.length >= 3 ? "1 / 3" : undefined }} />
          {photos.slice(1, photos.length >= 5 ? 3 : undefined).map((p, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={p} alt="" onClick={() => setLightbox(i + 1)}
                style={{ width: "100%", height: photos.length === 2 ? 160 : 99, objectFit: "cover", objectPosition: pos(i+1), display: "block", cursor: "pointer" }} />
              {i === 1 && photos.length > 3 && (
                <div onClick={() => setLightbox(3)}
                  style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <span style={{ color: "#fff", fontSize: 18, fontWeight: 600 }}>+{photos.length - 3}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Journal Card ───────────────────────────────────────────
function JournalCard({ entry, delay = 0, onDelete }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="up" style={{ animationDelay: `${delay}ms`, background: C.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 10 }}>
      {entry.photos?.length > 0 && (
        <PhotoStrip photos={entry.photos} photoMeta={entry.photoMeta} />
      )}
      <div style={{ padding: "11px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: entry.memo ? 6 : 0 }}>
          <p style={{ fontSize: 11, color: C.soft }}>{fmtDate(entry.createdAt)}</p>
          {!confirm && (
            <button onClick={() => setConfirm(true)}
              style={{ background: "none", border: "none", color: C.soft, fontSize: 14, padding: "2px 4px", lineHeight: 1 }}>✕</button>
          )}
        </div>
        {confirm && (
          <div style={{ background: "#fff0f0", border: "1.5px solid #f5c0c0", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
            <p style={{ fontSize: 12, color: "#cc3333", marginBottom: 8 }}>この記録を削除しますか？</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn label="キャンセル" variant="ghost" onClick={() => setConfirm(false)} />
              <Btn label="削除" variant="danger" onClick={() => onDelete(entry.id)} />
            </div>
          </div>
        )}
        {entry.memo && <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.7 }}>{entry.memo}</p>}
      </div>
    </div>
  );
}

// ── Photo Position Adjuster ────────────────────────────────
function PhotoAdjuster({ src, position, onChange, onRemove }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const posRef = useRef(position);
  posRef.current = position;

  function getXY(e) {
    const t = e.touches?.[0] || e;
    return { x: t.clientX, y: t.clientY };
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onStart(e) {
      dragging.current = true;
      last.current = getXY(e);
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging.current) return;
      e.preventDefault();
      const { x, y } = getXY(e);
      const dx = x - last.current.x;
      const dy = y - last.current.y;
      last.current = { x, y };
      const W = el.offsetWidth;
      const H = el.offsetHeight;
      const cur = posRef.current;
      const newX = Math.max(0, Math.min(100, cur.x - (dx / W) * 100));
      const newY = Math.max(0, Math.min(100, cur.y - (dy / H) * 100));
      onChange({ x: newX, y: newY });
    }

    function onEnd() { dragging.current = false; }

    el.addEventListener("touchstart",  onStart, { passive: false });
    el.addEventListener("touchmove",   onMove,  { passive: false });
    el.addEventListener("touchend",    onEnd,   { passive: true });
    el.addEventListener("mousedown",   onStart);
    el.addEventListener("mousemove",   onMove);
    el.addEventListener("mouseup",     onEnd);
    el.addEventListener("mouseleave",  onEnd);

    return () => {
      el.removeEventListener("touchstart",  onStart);
      el.removeEventListener("touchmove",   onMove);
      el.removeEventListener("touchend",    onEnd);
      el.removeEventListener("mousedown",   onStart);
      el.removeEventListener("mousemove",   onMove);
      el.removeEventListener("mouseup",     onEnd);
      el.removeEventListener("mouseleave",  onEnd);
    };
  }, []);

  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
      <div
        ref={ref}
        style={{ width: "100%", height: 220, overflow: "hidden", cursor: "grab", userSelect: "none", touchAction: "none" }}
      >
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${position.x}% ${position.y}%`, pointerEvents: "none", userSelect: "none", draggable: false }} />
      </div>
      <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <span style={{ background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 10, padding: "3px 10px", borderRadius: 20 }}>ドラッグで表示位置を調整</span>
      </div>
      <button onClick={onRemove} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>×</button>
    </div>
  );
}

// ── Add Entry ──────────────────────────────────────────────
function AddEntryView({ plant, onSave, onBack }) {
  const [photos,    setPhotos]    = useState([]); // [{ src, pos: {x,y} }]
  const [memo,      setMemo]      = useState("");
  const [adjustIdx, setAdjustIdx] = useState(null);
  const MAX = 5;

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || photos.length >= MAX) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPhotos(ps => [...ps, { src: ev.target.result, pos: { x: 50, y: 50 } }]);
      setAdjustIdx(photos.length); // 追加したら位置調整モードへ
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removePhoto(i) {
    setPhotos(ps => ps.filter((_, idx) => idx !== i));
    if (adjustIdx === i) setAdjustIdx(null);
  }

  function updatePos(i, pos) {
    setPhotos(ps => ps.map((p, idx) => idx === i ? { ...p, pos } : p));
  }

  const canSave = memo.trim().length > 0 || photos.length > 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ padding: "48px 20px 18px", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 500, color: C.green, padding: 0, marginBottom: 14, display: "block" }}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>{plant.variety || plant.name} の記録</h2>
      </div>

      <div className="up" style={{ padding: "22px 16px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Cap text="写真" />
            <span style={{ fontSize: 11, color: C.soft }}>{photos.length} / {MAX}</span>
          </div>

          {/* 位置調整モード */}
          {adjustIdx !== null && photos[adjustIdx] && (
            <div>
              <PhotoAdjuster
                src={photos[adjustIdx].src}
                position={photos[adjustIdx].pos}
                onChange={pos => updatePos(adjustIdx, pos)}
                onRemove={() => removePhoto(adjustIdx)}
              />
              <button onClick={() => setAdjustIdx(null)}
                style={{ width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", fontSize: 12, fontWeight: 500, color: C.mid, cursor: "pointer", marginBottom: 8 }}>
                完了
              </button>
            </div>
          )}

          {/* サムネイル一覧 */}
          {adjustIdx === null && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {photos.map((p, i) => (
                <div key={i} onClick={() => setAdjustIdx(i)}
                  style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, cursor: "pointer" }}>
                  <img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${p.pos.x}% ${p.pos.y}%` }} />
                  <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 16, opacity: 0.8 }}>✦</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removePhoto(i); }}
                    style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>×</button>
                </div>
              ))}
              {photos.length < MAX && (
                <div style={{ position: "relative", width: 80, height: 80, borderRadius: 8, border: `1.5px dashed ${C.border}`, background: C.card, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  <span style={{ fontSize: 22, color: C.soft }}>+</span>
                  <input type="file" accept="image/*" onChange={handleFile}
                    style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </div>
              )}
            </div>
          )}

          {photos.length === 0 && adjustIdx === null && (
            <div style={{ position: "relative", borderRadius: 12, border: `1.5px dashed ${C.border}`, background: C.card, height: 130, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden", marginTop: 10 }}>
              <span style={{ fontSize: 28 }}>📷</span>
              <span style={{ fontSize: 12, color: C.soft }}>タップして写真を選ぶ（最大{MAX}枚）</span>
              <input type="file" accept="image/*" onChange={handleFile}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
            </div>
          )}
        </div>

        <div>
          <Cap text="今日の気持ち・気づき" />
          <textarea style={{ ...inp, minHeight: 120, resize: "vertical" }}
            placeholder="新しい葉が出てきた！少し乾燥気味だったかも…"
            value={memo} onChange={e => setMemo(e.target.value)} />
        </div>

        <Btn label="記録を保存する" disabled={!canSave}
          onClick={() => canSave && onSave({ photos: photos.map(p => ({ src: p.src, pos: p.pos })), memo: memo.trim(), createdAt: Date.now() })} full />
      </div>
    </div>
  );
}

// ── Edit Plant ─────────────────────────────────────────────
function EditPlantView({ plant, onSave, onBack }) {
  const [name,        setName]        = useState(plant.name || "");
  const [variety,     setVariety]     = useState(plant.variety || "");
  const [waterDays,   setWaterDays]   = useState(plant.waterDays || null);
  const [arrivalDate, setArrivalDate] = useState(plant.arrivalDate || "");
  const [notes,       setNotes]       = useState(plant.notes || "");

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ padding: "48px 20px 18px", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 500, color: C.green, padding: 0, marginBottom: 14, display: "block" }}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>編集</h2>
      </div>
      <div className="up" style={{ padding: "22px 16px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Cap text="属名・種名" />
          <input style={inp} placeholder="例）モンステラ" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <Cap text="品種名" />
          <input style={inp} placeholder="例）デリシオーサ（任意）" value={variety} onChange={e => setVariety(e.target.value)} />
        </div>
        <div>
          <Cap text="水やり頻度" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[null, 1, 2, 3, 5, 7, 14].map(n => {
              const sel = waterDays === n;
              return (
                <button key={String(n)} onClick={() => setWaterDays(n)}
                  style={{ flex: 1, minWidth: "calc(25% - 8px)", padding: "9px 0", borderRadius: 8,
                    border: `1.5px solid ${sel ? C.ink : C.border}`,
                    background: sel ? C.ink : C.card,
                    color: sel ? "#fff" : C.mid,
                    fontSize: 12, fontWeight: sel ? 600 : 400, cursor: "pointer" }}>
                  {n === null ? "設定しない" : `${n}日`}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Cap text="お迎え日（任意）" />
          <input type="date" style={inp} value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} />
        </div>
        <div>
          <Cap text="メモ（任意）" />
          <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} placeholder="置き場所、品種など"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <Btn label="保存する" disabled={!name.trim()}
          onClick={() => onSave({ ...plant, name: name.trim(), variety: variety.trim(), waterDays, arrivalDate: arrivalDate || null, notes })} full />
      </div>
    </div>
  );
}

// ── Add Plant ──────────────────────────────────────────────
function AddPlantView({ onSave, onBack }) {
  const [name,        setName]        = useState("");
  const [variety,     setVariety]     = useState("");
  const [waterDays,   setWaterDays]   = useState(null);
  const [arrivalDate, setArrivalDate] = useState("");
  const [notes,       setNotes]       = useState("");

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ padding: "48px 20px 18px", background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 13, fontWeight: 500, color: C.green, padding: 0, marginBottom: 14, display: "block" }}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>New Plant</h2>
      </div>

      <div className="up" style={{ padding: "22px 16px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <Cap text="属名・種名" />
          <input style={inp} placeholder="例）モンステラ" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <Cap text="品種名" />
          <input style={inp} placeholder="例）デリシオーサ（任意）" value={variety} onChange={e => setVariety(e.target.value)} />
        </div>
        <div>
          <Cap text="水やり頻度" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[null, 1, 2, 3, 5, 7, 14].map(n => {
              const sel = waterDays === n;
              return (
                <button key={String(n)} onClick={() => setWaterDays(n)}
                  style={{ flex: 1, minWidth: "calc(25% - 8px)", padding: "9px 0", borderRadius: 8,
                    border: `1.5px solid ${sel ? C.ink : C.border}`,
                    background: sel ? C.ink : C.card,
                    color: sel ? "#fff" : C.mid,
                    fontSize: 12, fontWeight: sel ? 600 : 400, cursor: "pointer" }}>
                  {n === null ? "設定しない" : `${n}日`}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 11, color: C.soft, marginTop: 6 }}>※ デプロイ後にプッシュ通知として機能します</p>
        </div>
        <div>
          <Cap text="お迎え日（任意）" />
          <input type="date" style={inp} value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} />
        </div>
        <div>
          <Cap text="メモ（任意）" />
          <textarea style={{ ...inp, minHeight: 72, resize: "vertical" }} placeholder="置き場所、品種など"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <Btn label="登録する" disabled={!name.trim()}
          onClick={() => onSave({ name: name.trim(), variety: variety.trim(), waterDays, arrivalDate: arrivalDate || null, notes })} full />
      </div>
    </div>
  );
}

// ── Timeline View ──────────────────────────────────────────
function TimelineView({ plants, entries, onNav, onPlant }) {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  const groups = [];
  sorted.forEach(e => {
    const k = fmtYM(e.createdAt);
    const g = groups.find(g => g.key === k);
    if (g) g.items.push(e); else groups.push({ key: k, label: fmtMonth(e.createdAt), items: [e] });
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 40 }}>
      <div style={{ padding: "52px 20px 16px", background: C.card, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>Timeline</h1>
        <NavMenu current="timeline" onNav={onNav} />
      </div>
      <div style={{ padding: "20px 16px" }}>
        {sorted.length === 0
          ? <p style={{ textAlign: "center", color: C.soft, padding: "50px 0", fontSize: 14 }}>まだ記録がありません</p>
          : groups.map(g => (
            <div key={g.key} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: C.soft, marginBottom: 12, letterSpacing: "0.04em" }}>{g.label}</p>
              {g.items.map((e, i) => {
                const plant = plants.find(p => p.id === e.plantId);
                return (
                  <div key={e.id} className="up" onClick={() => plant && onPlant(plant.id)}
                    style={{ animationDelay: `${i*35}ms`, background: C.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 10, cursor: "pointer" }}>
                    {e.photos?.[0] && <img src={e.photos[0]} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />}
                    <div style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: e.memo ? 6 : 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>{plant ? (plant.variety || plant.name) : ""}</span>
                        <span style={{ fontSize: 11, color: C.soft }}>{fmtDate(e.createdAt)}</span>
                      </div>
                      {e.memo && <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.7 }}>{e.memo}</p>}
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

// ── Calendar View ──────────────────────────────────────────
function CalendarView({ plants, entries, onNav, onPlant }) {
  const now = new Date();
  const [yr,  setYr]  = useState(now.getFullYear());
  const [mo,  setMo]  = useState(now.getMonth());
  const [sel, setSel] = useState(null);

  const days  = daysInMonth(yr, mo);
  const first = firstDay(yr, mo);

  const dotMap = {};
  entries.forEach(e => {
    const d = new Date(e.createdAt);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!dotMap[k]) dotMap[k] = [];
    dotMap[k].push(e);
  });

  const selKey     = sel ? `${yr}-${mo}-${sel}` : null;
  const selEntries = selKey ? (dotMap[selKey] || []) : [];
  const tKey       = todayKey();

  function prev() { if (mo===0){setYr(y=>y-1);setMo(11);}else setMo(m=>m-1); setSel(null); }
  function next() { if (mo===11){setYr(y=>y+1);setMo(0);}else setMo(m=>m+1); setSel(null); }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 40 }}>
      <div style={{ padding: "52px 20px 16px", background: C.card, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>Calendar</h1>
        <NavMenu current="calendar" onNav={onNav} />
      </div>
      <div style={{ padding: "20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={prev} style={{ background: "none", border: "none", fontSize: 20, color: C.mid, padding: "0 8px" }}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{yr}年 {mo+1}月</span>
          <button onClick={next} style={{ background: "none", border: "none", fontSize: 20, color: C.mid, padding: "0 8px" }}>›</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 6 }}>
          {["日","月","火","水","木","金","土"].map((d,i) => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 500, padding: "3px 0", color: i===0?"#cc4444":i===6?"#4466cc":C.soft }}>{d}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 24 }}>
          {Array.from({ length: first }).map((_,i) => <div key={`_${i}`} />)}
          {Array.from({ length: days }).map((_,i) => {
            const day  = i + 1;
            const key  = `${yr}-${mo}-${day}`;
            const isSel   = sel === day;
            const isToday = key === tKey;
            const hasDot  = !!dotMap[key];
            return (
              <div key={day} onClick={() => setSel(isSel ? null : day)}
                style={{ aspectRatio: "1", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer",
                  background: isSel ? C.ink : isToday ? C.bg : "transparent",
                  border: `1px solid ${isToday && !isSel ? C.border : "transparent"}`,
                  transition: "background 0.12s" }}>
                <span style={{ fontSize: 13, fontWeight: isSel || isToday ? 600 : 400, color: isSel ? "#fff" : C.ink }}>{day}</span>
                {hasDot && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "rgba(255,255,255,0.7)" : C.green }} />}
              </div>
            );
          })}
        </div>

        {selKey && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: C.soft, marginBottom: 12, letterSpacing: "0.04em" }}>
              {yr}年{mo+1}月{sel}日の記録
            </p>
            {selEntries.length === 0
              ? <p style={{ fontSize: 13, color: C.soft }}>この日の記録はありません</p>
              : selEntries.map(e => {
                  const plant = plants.find(p => p.id === e.plantId);
                  return (
                    <div key={e.id} onClick={() => plant && onPlant(plant.id)}
                      style={{ background: C.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 10, cursor: "pointer" }}>
                      {e.photos?.[0] && <img src={e.photos[0]} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} />}
                      <div style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.green }}>{plant ? (plant.variety || plant.name) : ""}</span>
                        {e.memo && <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.7, marginTop: 4 }}>{e.memo}</p>}
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
  const [plants,  setPlants]  = useState(() => readStore().plants);
  const [entries, setEntries] = useState(() => readStore().entries.map(e => ({ ...e, photo: null })));
  const [view,    setView]    = useState("album");
  const [plantId, setPlantId] = useState(null);
  const [entryFor, setEntryFor] = useState(null);

  useEffect(() => {
    const init = readStore().entries;
    if (!init.length) return;
    Promise.all(init.map(async e => {
      const count = e.photoCount || (e.photo ? 1 : 0);
      const photos = await Promise.all(
        Array.from({ length: count }, (_, i) => loadPhoto(`${e.id}_${i}`))
      );
      return { id: e.id, photos: photos.filter(Boolean), photoMeta: e.photoMeta || [] };
    })).then(res => setEntries(es => es.map(en => {
      const r = res.find(r => r.id === en.id);
      return r?.photos?.length ? { ...en, photos: r.photos, photoMeta: r.photoMeta } : en;
    })));
  }, []);

  useEffect(() => { writeStore(plants, entries); }, [plants, entries]);

  const plant = plants.find(p => p.id === plantId) || null;

  function addPlant(form) {
    setPlants(ps => [...ps, { id: Date.now(), ...form }]);
    setView("album");
  }
  function deletePlant(id) {
    entries.filter(e => e.plantId === id).forEach(e => {
      e.photos?.forEach((_, i) => deletePhoto(`${e.id}_${i}`));
    });
    setPlants(ps => ps.filter(p => p.id !== id));
    setEntries(es => es.filter(e => e.plantId !== id));
    setView("album");
  }
  function editPlant(updated) {
    setPlants(ps => ps.map(p => p.id === updated.id ? updated : p));
    setView("plant");
  }

  function archivePlant(id, archive = true) {
    setPlants(ps => ps.map(p => p.id === id
      ? archive
        ? { ...p, archived: true, archivedAt: Date.now() }
        : { ...p, archived: false, archivedAt: null }
      : p
    ));
    setView("album");
  }
  function addEntry({ photos, memo, createdAt }) {
    const id = Date.now();
    const photoMeta = (photos || []).map(p => ({ pos: p.pos || { x:50, y:50 } }));
    const entry = { id, plantId: entryFor.id, photos: [], photoMeta, memo, createdAt };
    photos?.forEach((p, i) => savePhoto(`${id}_${i}`, p.src || p));
    // Keep photos in memory for this session
    const withPhotos = { ...entry, photos: (photos || []).map(p => p.src || p) };
    setEntries(es => [...es, withPhotos]);
    setView("plant");
  }
  function deleteEntry(id) {
    const entry = entries.find(e => e.id === id);
    entry?.photos?.forEach((_, i) => deletePhoto(`${id}_${i}`));
    setEntries(es => es.filter(e => e.id !== id));
  }
  function goPlant(id) { setPlantId(id); setView("plant"); }

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg }}>
      {view === "album"    && <AlbumView    plants={plants} entries={entries} onNav={setView} onPlant={goPlant} onAddPlant={() => setView("addPlant")} />}
      {view === "timeline" && <TimelineView plants={plants} entries={entries} onNav={setView} onPlant={goPlant} />}
      {view === "calendar" && <CalendarView plants={plants} entries={entries} onNav={setView} onPlant={goPlant} />}
      {view === "plant"    && plant && <PlantDetail plant={plant} entries={entries} onBack={() => setView("album")} onAddEntry={() => { setEntryFor(plant); setView("addEntry"); }} onDelete={() => deletePlant(plant.id)} onDeleteEntry={deleteEntry} onArchive={archivePlant} onEdit={() => setView("editPlant")} />}
      {view === "addPlant"  && <AddPlantView onSave={addPlant} onBack={() => setView("album")} />}
      {view === "editPlant" && plant && <EditPlantView plant={plant} onSave={editPlant} onBack={() => setView("plant")} />}
      {view === "addEntry" && entryFor && <AddEntryView plant={entryFor} onSave={addEntry} onBack={() => setView("plant")} />}
    </div>
  );
}
