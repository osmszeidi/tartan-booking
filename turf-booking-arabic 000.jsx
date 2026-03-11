import { useState, useEffect } from "react";

// ─── قاعدة البيانات (localStorage) ────────────────────────────────────────
const DB = {
  getBookings: () => JSON.parse(localStorage.getItem("turf_bookings") || "[]"),
  saveBookings: (b) => localStorage.setItem("turf_bookings", JSON.stringify(b)),
  getSlotOverrides: () => JSON.parse(localStorage.getItem("turf_slot_overrides") || "{}"),
  saveSlotOverrides: (o) => localStorage.setItem("turf_slot_overrides", JSON.stringify(o)),
  getAdminPass: () => localStorage.getItem("turf_admin_pass") || "admin123",
};

const TIME_SLOTS = [
  { id: "slot_21", label: "٩:٠٠ م – ١٠:٠٠ م", labelEn: "9:00 PM – 10:00 PM" },
  { id: "slot_22", label: "١٠:٠٠ م – ١١:٠٠ م", labelEn: "10:00 PM – 11:00 PM" },
  { id: "slot_23", label: "١١:٠٠ م – ١٢:٠٠ ص", labelEn: "11:00 PM – 12:00 AM" },
  { id: "slot_00", label: "١٢:٠٠ ص – ١:٠٠ ص", labelEn: "12:00 AM – 1:00 AM" },
];
const MAX_PLAYERS = 14;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function toArabicNums(n) {
  return String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function todayArabic() {
  return new Date().toLocaleDateString("ar-OM", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}

// ─── Styles ────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=Cairo:wght@300;400;600;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #060d06;
    --surface: #0d160d;
    --card: #101a10;
    --border: #1a2e1a;
    --green: #22c55e;
    --green-dim: #16a34a;
    --green-glow: rgba(34,197,94,0.12);
    --green-deep: #052e16;
    --yellow: #fbbf24;
    --red: #f87171;
    --red-dim: #991b1b;
    --text: #f0fdf4;
    --text-muted: #6b7280;
    --text-sub: #9ca3af;
    --accent: #4ade80;
    --gold: #d97706;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Cairo', 'Tajawal', sans-serif;
    min-height: 100vh;
    direction: rtl;
    overflow-x: hidden;
  }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: var(--surface); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  input, select, textarea, button {
    font-family: 'Cairo', 'Tajawal', sans-serif;
    direction: rtl;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(32px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes shine {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pitchPulse {
    0%, 100% { opacity: 0.06; }
    50%       { opacity: 0.12; }
  }

  .fade-up { animation: fadeUp 0.5s ease forwards; }
  .fade-in { animation: fadeIn 0.3s ease forwards; }

  .slot-card {
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .slot-card:hover {
    transform: translateY(-4px);
  }

  .btn-book {
    position: relative;
    overflow: hidden;
  }
  .btn-book::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: shine 2.5s infinite;
  }

  .pitch-bg {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(0deg, rgba(34,197,94,0.04) 0px, rgba(34,197,94,0.04) 40px, transparent 40px, transparent 80px);
    pointer-events: none;
    animation: pitchPulse 4s ease-in-out infinite;
  }

  .glow-text {
    text-shadow: 0 0 40px rgba(34,197,94,0.4);
  }

  .table-row:hover { background: rgba(34,197,94,0.04) !important; }

  @media (max-width: 600px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .slots-grid  { grid-template-columns: 1fr !important; }
  }
`;

function StatusBadge({ status }) {
  const map = {
    available: { bg: "rgba(34,197,94,0.1)",  color: "#22c55e", dot: "#22c55e", label: "متاح" },
    few:       { bg: "rgba(251,191,36,0.1)",  color: "#fbbf24", dot: "#fbbf24", label: "مقاعد محدودة" },
    full:      { bg: "rgba(248,113,113,0.1)", color: "#f87171", dot: "#f87171", label: "مكتمل" },
    closed:    { bg: "rgba(107,114,128,0.1)", color: "#6b7280", dot: "#6b7280", label: "مغلق" },
  };
  const s = map[status] || map.available;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 12px", borderRadius: 20,
      background: s.bg, color: s.color, fontSize: 12, fontWeight: 600,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: s.dot,
        animation: (status === "available" || status === "few") ? "pulse 2s infinite" : "none",
        flexShrink: 0
      }} />
      {s.label}
    </span>
  );
}

function Bar({ filled, max }) {
  const pct = Math.min((filled / max) * 100, 100);
  const color = pct >= 100 ? "#f87171" : pct >= 70 ? "#fbbf24" : "#22c55e";
  return (
    <div style={{ background: "#1a2e1a", borderRadius: 6, height: 8, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`, height: "100%", borderRadius: 6,
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        boxShadow: `0 0 10px ${color}55`,
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fade-in" onClick={onClose} style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 16, backdropFilter: "blur(6px)"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0d160d",
        border: "1px solid #1a2e1a",
        borderRadius: 20, padding: "32px 28px",
        width: "100%", maxWidth: 460,
        animation: "slideIn 0.3s ease",
        boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 0 40px rgba(34,197,94,0.06)"
      }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block", fontSize: 12, color: "#9ca3af",
        marginBottom: 6, letterSpacing: 0.5, fontWeight: 500
      }}>{label}</label>
      <input {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: "100%",
          background: "#060d06",
          border: `1.5px solid ${focused ? "#22c55e" : "#1a2e1a"}`,
          borderRadius: 10, padding: "11px 14px",
          color: "#f0fdf4", fontSize: 15,
          outline: "none", transition: "border-color 0.2s",
          boxShadow: focused ? "0 0 0 3px rgba(34,197,94,0.1)" : "none",
          ...(props.style || {})
        }}
      />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("booking");
  const [bookings, setBookings] = useState(DB.getBookings());
  const [overrides, setOverrides] = useState(DB.getSlotOverrides());
  const [bookModal, setBookModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [adminModal, setAdminModal] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [editModal, setEditModal] = useState(null);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const todayBookings = bookings.filter(b => b.booking_date === todayStr());

  const getSlot = (id) => {
    const count = todayBookings.filter(b => b.time_slot === id).length;
    const override = overrides[`${id}_${todayStr()}`];
    const isFull = count >= MAX_PLAYERS;
    const isClosed = override === "closed";
    const status = isClosed ? "closed" : isFull ? "full" : count >= MAX_PLAYERS * 0.7 ? "few" : "available";
    return { count, isFull, isClosed, status, remaining: MAX_PLAYERS - count };
  };

  const handleBook = (slotId, name, phone) => {
    const dup = todayBookings.find(b => b.time_slot === slotId && b.phone_number === phone);
    if (dup) return { error: "هذا الرقم محجوز بالفعل في هذه الفترة." };
    const { isFull, isClosed } = getSlot(slotId);
    if (isFull) return { error: "هذه الفترة مكتملة." };
    if (isClosed) return { error: "هذه الفترة مغلقة." };
    const b = {
      id: Date.now().toString(),
      player_name: name.trim(),
      phone_number: phone.trim(),
      time_slot: slotId,
      booking_date: todayStr(),
      created_at: new Date().toISOString(),
    };
    const updated = [...bookings, b];
    setBookings(updated);
    DB.saveBookings(updated);
    return { success: true };
  };

  const deleteBooking = (id) => {
    const updated = bookings.filter(b => b.id !== id);
    setBookings(updated);
    DB.saveBookings(updated);
    showToast("تم حذف الحجز", "err");
  };

  const editBooking = (id, name, phone) => {
    const updated = bookings.map(b => b.id === id ? { ...b, player_name: name, phone_number: phone } : b);
    setBookings(updated);
    DB.saveBookings(updated);
    showToast("تم تعديل الحجز بنجاح");
    setEditModal(null);
  };

  const setOverride = (slotId, value) => {
    const key = `${slotId}_${todayStr()}`;
    const updated = value
      ? { ...overrides, [key]: value }
      : Object.fromEntries(Object.entries(overrides).filter(([k]) => k !== key));
    setOverrides(updated);
    DB.saveSlotOverrides(updated);
    showToast(value === "closed" ? "تم إغلاق الفترة" : "تم فتح الفترة");
  };

  const resetSlot = (slotId) => {
    const updated = bookings.filter(b => !(b.time_slot === slotId && b.booking_date === todayStr()));
    setBookings(updated);
    DB.saveBookings(updated);
    setOverride(slotId, null);
    showToast("تم إعادة تعيين الفترة");
  };

  return (
    <>
      <style>{css}</style>

      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          zIndex: 99999,
          background: toast.type === "err" ? "#991b1b" : "#16a34a",
          color: "#fff", padding: "12px 28px", borderRadius: 50,
          fontSize: 14, fontWeight: 600, animation: "fadeUp 0.3s ease",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          whiteSpace: "nowrap"
        }}>
          {toast.type === "err" ? "✕  " : "✓  "}{toast.msg}
        </div>
      )}

      {adminModal && (
        <Modal onClose={() => { setAdminModal(false); setAdminError(""); setAdminPass(""); }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
            <div style={{ fontFamily: "'Cairo'", fontSize: 22, fontWeight: 900 }}>دخول المدير</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>أدخل كلمة المرور للمتابعة</div>
          </div>
          <Field label="كلمة المرور" type="password" value={adminPass}
            onChange={e => setAdminPass(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                if (adminPass === DB.getAdminPass()) {
                  setAdminAuth(true); setAdminModal(false); setView("admin"); setAdminPass(""); setAdminError("");
                } else setAdminError("كلمة المرور غير صحيحة");
              }
            }}
          />
          {adminError && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{adminError}</div>}
          <button onClick={() => {
            if (adminPass === DB.getAdminPass()) {
              setAdminAuth(true); setAdminModal(false); setView("admin"); setAdminPass(""); setAdminError("");
            } else setAdminError("كلمة المرور غير صحيحة");
          }} style={{
            width: "100%", padding: "13px", borderRadius: 12,
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "#000", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer",
            fontFamily: "'Cairo'", letterSpacing: 0.5
          }}>دخول</button>
          <div style={{
            marginTop: 16, padding: "10px 14px", background: "#060d06",
            borderRadius: 8, fontSize: 12, color: "#6b7280", textAlign: "center"
          }}>
            كلمة المرور الافتراضية: <code style={{ color: "#4ade80", fontFamily: "monospace" }}>admin123</code>
          </div>
        </Modal>
      )}

      {bookModal && (
        <BookModal
          slot={TIME_SLOTS.find(s => s.id === bookModal)}
          slotData={getSlot(bookModal)}
          onBook={handleBook}
          onClose={() => setBookModal(null)}
          onSuccess={(n) => { showToast(`تم تأكيد حجزك يا ${n} 🎉`); setBookModal(null); }}
        />
      )}
