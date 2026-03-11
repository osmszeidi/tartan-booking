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

// ─── Helper Components ─────────────────────────────────────────────────────
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

// ─── Main App ──────────────────────────────────────────────────────────────
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

      {/* Toast */}
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

      {/* Admin Login */}
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

      {/* Booking Modal */}
      {bookModal && (
        <BookModal
          slot={TIME_SLOTS.find(s => s.id === bookModal)}
          slotData={getSlot(bookModal)}
          onBook={handleBook}
          onClose={() => setBookModal(null)}
          onSuccess={(n) => { showToast(`تم تأكيد حجزك يا ${n} 🎉`); setBookModal(null); }}
        />
      )}

      {/* Edit Modal */}
      {editModal && (
        <EditModal
          booking={editModal}
          onSave={editBooking}
          onClose={() => setEditModal(null)}
        />
      )}

      {/* Header */}
      <header style={{
        borderBottom: "1px solid #1a2e1a",
        background: "rgba(6,13,6,0.92)",
        position: "sticky", top: 0, zIndex: 200,
        backdropFilter: "blur(16px)"
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          padding: "0 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 68
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: "linear-gradient(135deg, #052e16, #166534)",
              border: "1px solid #22c55e44",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, boxShadow: "0 0 20px rgba(34,197,94,0.2)"
            }}>⚽</div>
            <div>
              <div style={{
                fontFamily: "'Cairo'", fontWeight: 900, fontSize: 18,
                color: "#f0fdf4", letterSpacing: 0.3
              }}>ملعب وادي فدى</div>
              <div style={{
                fontSize: 11, color: "#22c55e", fontWeight: 600,
                letterSpacing: 1
              }}>العوابي · سلطنة عُمان</div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: "flex", gap: 8 }}>
            <NavBtn active={view === "booking"} onClick={() => setView("booking")}>الحجز</NavBtn>
            {adminAuth
              ? <NavBtn active={view === "admin"} onClick={() => setView("admin")}>لوحة التحكم</NavBtn>
              : <NavBtn onClick={() => setAdminModal(true)}>المدير</NavBtn>
            }
          </div>
        </div>
      </header>

      {/* Page */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
        {view === "booking"
          ? <BookingPage slots={TIME_SLOTS} getSlot={getSlot} onBook={id => setBookModal(id)} />
          : <AdminPage
              slots={TIME_SLOTS}
              bookings={bookings}
              todayBookings={todayBookings}
              getSlot={getSlot}
              onDelete={deleteBooking}
              onEdit={setEditModal}
              onOverride={setOverride}
              onReset={resetSlot}
              onLogout={() => { setAdminAuth(false); setView("booking"); }}
            />
        }
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #1a2e1a",
        padding: "24px 20px", textAlign: "center",
        color: "#374151", fontSize: 12
      }}>
        ⚽ ملعب وادي فدى — العوابي، سلطنة عُمان
      </footer>
    </>
  );
}

function NavBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 18px", borderRadius: 8,
      background: active ? "rgba(34,197,94,0.12)" : "transparent",
      color: active ? "#22c55e" : "#9ca3af",
      border: `1px solid ${active ? "#22c55e44" : "#1a2e1a"}`,
      fontWeight: 600, fontSize: 14, cursor: "pointer",
      fontFamily: "'Cairo'", transition: "all 0.2s"
    }}>{children}</button>
  );
}

// ─── صفحة الحجز ────────────────────────────────────────────────────────────
function BookingPage({ slots, getSlot, onBook }) {
  return (
    <div>
      {/* Hero */}
      <div style={{
        position: "relative", textAlign: "center",
        padding: "60px 20px 56px", marginBottom: 48,
        borderRadius: 24, overflow: "hidden",
        background: "linear-gradient(180deg, #0d1f0d 0%, #060d06 100%)",
        border: "1px solid #1a2e1a"
      }}>
        <div className="pitch-bg" />

        {/* Pitch lines decoration */}
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center", pointerEvents: "none"
        }}>
          <div style={{ width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(34,197,94,0.08)", position: "absolute" }} />
          <div style={{ width: 120, height: 120, borderRadius: "50%", border: "1px solid rgba(34,197,94,0.06)", position: "absolute" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-block", padding: "6px 20px", borderRadius: 30,
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
            color: "#22c55e", fontSize: 13, fontWeight: 700, marginBottom: 20,
            letterSpacing: 0.3
          }}>
            📅 {todayArabic()}
          </div>

          <h1 className="glow-text" style={{
            fontFamily: "'Cairo'", fontWeight: 900,
            fontSize: "clamp(36px, 8vw, 68px)",
            lineHeight: 1.1, letterSpacing: -0.5,
            marginBottom: 16,
            background: "linear-gradient(135deg, #f0fdf4 30%, #22c55e 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            احجز مقعدك<br />في الملعب
          </h1>

          <p style={{ color: "#6b7280", fontSize: 15, fontWeight: 400 }}>
            ملعب وادي فدى — العوابي &nbsp;·&nbsp; الحد الأقصى {toArabicNums(MAX_PLAYERS)} لاعب لكل فترة
          </p>

          {/* mini pitch graphic */}
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginTop: 28, gap: 0,
            width: 220, height: 90,
            borderRadius: 12, border: "1.5px solid rgba(34,197,94,0.2)",
            background: "repeating-linear-gradient(0deg, rgba(34,197,94,0.035) 0px, rgba(34,197,94,0.035) 18px, transparent 18px, transparent 36px)",
            position: "relative", overflow: "hidden"
          }}>
            <div style={{ position: "absolute", width: 1, height: "100%", background: "rgba(34,197,94,0.18)" }} />
            <div style={{ width: 40, height: 55, border: "1px solid rgba(34,197,94,0.2)", position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)" }} />
            <div style={{ width: 40, height: 55, border: "1px solid rgba(34,197,94,0.2)", position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }} />
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid rgba(34,197,94,0.2)" }} />
          </div>
        </div>
      </div>

      {/* Slot Cards */}
      <div className="slots-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 20, marginBottom: 48
      }}>
        {slots.map((slot, i) => {
          const { count, status, remaining } = getSlot(slot.id);
          const canBook = status === "available" || status === "few";

          const borderColor = status === "available" ? "rgba(34,197,94,0.3)"
            : status === "few" ? "rgba(251,191,36,0.3)"
            : status === "full" ? "rgba(248,113,113,0.2)"
            : "#1a2e1a";

          const glowColor = status === "available" ? "rgba(34,197,94,0.08)"
            : status === "few" ? "rgba(251,191,36,0.06)"
            : "transparent";

          return (
            <div key={slot.id} className="slot-card fade-up" style={{
              animationDelay: `${i * 0.1}s`, opacity: 0,
              background: "#101a10",
              border: `1px solid ${borderColor}`,
              borderRadius: 20, padding: 26,
              boxShadow: `0 8px 40px ${glowColor}`,
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{
                    fontFamily: "'Cairo'", fontSize: 22, fontWeight: 900,
                    lineHeight: 1.2, marginBottom: 6
                  }}>{slot.label}</div>
                  <StatusBadge status={status} />
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: canBook ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, border: `1px solid ${canBook ? "rgba(34,197,94,0.2)" : "#1a2e1a"}`
                }}>
                  {status === "full" ? "🔴" : status === "closed" ? "🔒" : status === "few" ? "🟡" : "🟢"}
                </div>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>اللاعبون المحجوزون</span>
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: status === "full" ? "#f87171" : "#f0fdf4"
                  }}>
                    {toArabicNums(count)} / {toArabicNums(MAX_PLAYERS)}
                  </span>
                </div>
                <Bar filled={count} max={MAX_PLAYERS} />
              </div>

              {/* Remaining spots */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", borderRadius: 12,
                background: "#060d06", marginBottom: 20,
                border: "1px solid #1a2e1a"
              }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>المقاعد المتبقية</span>
                <span style={{
                  fontFamily: "'Cairo'", fontSize: 28, fontWeight: 900,
                  color: remaining === 0 ? "#f87171" : remaining <= 4 ? "#fbbf24" : "#22c55e",
                  lineHeight: 1
                }}>
                  {toArabicNums(remaining)}
                </span>
              </div>

              {/* Button */}
              <button
                className={canBook ? "btn-book" : ""}
                onClick={() => canBook && onBook(slot.id)}
                disabled={!canBook}
                style={{
                  width: "100%", padding: "13px",
                  borderRadius: 12, border: "none",
                  fontFamily: "'Cairo'", fontWeight: 800, fontSize: 16,
                  cursor: canBook ? "pointer" : "not-allowed",
                  background: canBook
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : "#1a2e1a",
                  color: canBook ? "#000" : "#4b5563",
                  transition: "opacity 0.2s",
                  opacity: canBook ? 1 : 0.7,
                  position: "relative", overflow: "hidden"
                }}
              >
                {status === "closed" ? "⛔  مغلق" : status === "full" ? "⛔  مكتمل" : "احجز مقعدك ←"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Info strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16, padding: 28,
        background: "#0d160d", border: "1px solid #1a2e1a", borderRadius: 20
      }}>
        {[
          { icon: "⚽", title: `${toArabicNums(MAX_PLAYERS)} لاعب كحد أقصى`, sub: "لكل فترة" },
          { icon: "📍", title: "وادي فدى", sub: "العوابي" },
          { icon: "📱", title: "بدون تكرار", sub: "رقم واحد لكل فترة" },
          { icon: "🕐", title: "٤ فترات يومياً", sub: "٩ م — ١ ص" },
        ].map(item => (
          <div key={item.title} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{item.title}</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── مودال الحجز ────────────────────────────────────────────────────────────
function BookModal({ slot, slotData, onBook, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!name.trim()) return setError("الرجاء إدخال اسمك الكريم.");
    if (!phone.trim() || phone.trim().length < 7) return setError("الرجاء إدخال رقم هاتف صحيح.");
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const res = onBook(slot.id, name, phone);
    setLoading(false);
    if (res.error) return setError(res.error);
    setDone(true);
    setTimeout(() => onSuccess(name), 1400);
  };

  return (
    <Modal onClose={onClose}>
      {!done ? (
        <>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              display: "inline-flex", width: 52, height: 52, borderRadius: 14,
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
              alignItems: "center", justifyContent: "center", fontSize: 26,
              marginBottom: 14
            }}>⚽</div>
            <div style={{ fontFamily: "'Cairo'", fontSize: 22, fontWeight: 900, marginBottom: 4 }}>حجز مقعد</div>
            <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 15 }}>{slot.label}</div>
            <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
              {toArabicNums(slotData.remaining)} مقعد متبقٍّ · {todayStr()}
            </div>
          </div>

          <Field label="الاسم الكامل" placeholder="مثال: أحمد بن سالم العوابي"
            value={name} onChange={e => { setName(e.target.value); setError(""); }}
          />
          <Field label="رقم الجوال" placeholder="مثال: 9123 4567"
            value={phone} onChange={e => { setPhone(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && submit()}
          />

          {error && (
            <div style={{
              color: "#f87171", fontSize: 13, marginBottom: 16,
              padding: "10px 14px", background: "rgba(248,113,113,0.08)",
              borderRadius: 10, textAlign: "center"
            }}>{error}</div>
          )}

          <button onClick={submit} disabled={loading} style={{
            width: "100%", padding: "14px",
            borderRadius: 12, border: "none",
            background: loading ? "#1a2e1a" : "linear-gradient(135deg, #22c55e, #16a34a)",
            color: loading ? "#4b5563" : "#000",
            fontWeight: 800, fontSize: 17, cursor: loading ? "wait" : "pointer",
            fontFamily: "'Cairo'", marginBottom: 10, transition: "all 0.2s"
          }}>
            {loading ? "جارٍ التأكيد..." : "تأكيد الحجز ←"}
          </button>
          <button onClick={onClose} style={{
            width: "100%", padding: "11px",
            borderRadius: 12, border: "1px solid #1a2e1a",
            background: "transparent", color: "#6b7280",
            fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "'Cairo'"
          }}>إلغاء</button>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div style={{ fontSize: 70, marginBottom: 16, lineHeight: 1 }}>🎉</div>
          <div style={{ fontFamily: "'Cairo'", fontSize: 30, fontWeight: 900, color: "#22c55e", marginBottom: 8 }}>تم الحجز!</div>
          <div style={{ color: "#9ca3af", fontSize: 15 }}>نراك على أرض الملعب 🏆</div>
        </div>
      )}
    </Modal>
  );
}

// ─── مودال التعديل ──────────────────────────────────────────────────────────
function EditModal({ booking, onSave, onClose }) {
  const [name, setName] = useState(booking.player_name);
  const [phone, setPhone] = useState(booking.phone_number);
  return (
    <Modal onClose={onClose}>
      <div style={{ fontFamily: "'Cairo'", fontSize: 22, fontWeight: 900, marginBottom: 20, textAlign: "center" }}>
        ✏️ تعديل الحجز
      </div>
      <Field label="اسم اللاعب" value={name} onChange={e => setName(e.target.value)} />
      <Field label="رقم الجوال" value={phone} onChange={e => setPhone(e.target.value)} />
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => onSave(booking.id, name, phone)} style={{
          flex: 1, padding: "12px", borderRadius: 10, border: "none",
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "'Cairo'"
        }}>حفظ</button>
        <button onClick={onClose} style={{
          padding: "12px 20px", borderRadius: 10,
          border: "1px solid #1a2e1a", background: "transparent",
          color: "#9ca3af", cursor: "pointer", fontFamily: "'Cairo'", fontSize: 15
        }}>إلغاء</button>
      </div>
    </Modal>
  );
}

// ─── لوحة التحكم ────────────────────────────────────────────────────────────
function AdminPage({ slots, bookings, todayBookings, getSlot, onDelete, onEdit, onOverride, onReset, onLogout }) {
  const [activeSlot, setActiveSlot] = useState(slots[0].id);
  const [tab, setTab] = useState("today");

  const displayBookings = tab === "today" ? todayBookings : bookings;
  const slotBookings = displayBookings.filter(b => b.time_slot === activeSlot);
  const { count, status, isClosed } = getSlot(activeSlot);

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{
            display: "inline-block", padding: "3px 14px", borderRadius: 6,
            background: "rgba(34,197,94,0.1)", color: "#22c55e",
            fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8
          }}>ADMIN</div>
          <h2 style={{ fontFamily: "'Cairo'", fontSize: 36, fontWeight: 900, lineHeight: 1.1 }}>
            لوحة التحكم
          </h2>
          <div style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
            {todayArabic()}
          </div>
        </div>
        <button onClick={onLogout} style={{
          padding: "9px 20px", borderRadius: 10,
          border: "1px solid #1a2e1a", background: "transparent",
          color: "#9ca3af", cursor: "pointer", fontFamily: "'Cairo'",
          fontSize: 14, fontWeight: 600
        }}>تسجيل الخروج ↗</button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16, marginBottom: 32
      }}>
        {[
          { label: "حجوزات اليوم", value: toArabicNums(todayBookings.length), color: "#22c55e" },
          { label: "فترات متاحة", value: toArabicNums(slots.filter(s => getSlot(s.id).status === "available").length), color: "#22c55e" },
          { label: "فترات مكتملة", value: toArabicNums(slots.filter(s => getSlot(s.id).status === "full").length), color: "#f87171" },
          { label: "إجمالي الحجوزات", value: toArabicNums(bookings.length), color: "#4ade80" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#101a10", border: "1px solid #1a2e1a",
            borderRadius: 16, padding: "20px 22px"
          }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>{stat.label}</div>
            <div style={{ fontFamily: "'Cairo'", fontSize: 44, fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Slot Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {slots.map(slot => {
          const sd = getSlot(slot.id);
          const active = activeSlot === slot.id;
          return (
            <button key={slot.id} onClick={() => setActiveSlot(slot.id)} style={{
              padding: "9px 18px", borderRadius: 10, cursor: "pointer",
              fontFamily: "'Cairo'", fontWeight: 700, fontSize: 15,
              background: active ? "#22c55e" : "#101a10",
              color: active ? "#000" : "#9ca3af",
              border: `1px solid ${active ? "#22c55e" : "#1a2e1a"}`,
              transition: "all 0.2s"
            }}>
              {slot.label}
              <span style={{ marginRight: 8, fontSize: 12, opacity: 0.8 }}>
                {toArabicNums(sd.count)}/{toArabicNums(MAX_PLAYERS)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Slot Panel */}
      <div style={{ background: "#101a10", border: "1px solid #1a2e1a", borderRadius: 20, overflow: "hidden", marginBottom: 24 }}>

        {/* Slot header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #1a2e1a",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 14
        }}>
          <div>
            <div style={{ fontFamily: "'Cairo'", fontSize: 22, fontWeight: 900 }}>
              {slots.find(s => s.id === activeSlot)?.label}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
              <StatusBadge status={status} />
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                {toArabicNums(count)} / {toArabicNums(MAX_PLAYERS)} لاعب
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => onOverride(activeSlot, isClosed ? null : "closed")} style={{
              padding: "9px 18px", borderRadius: 10, cursor: "pointer",
              fontFamily: "'Cairo'", fontWeight: 700, fontSize: 14,
              background: isClosed ? "rgba(34,197,94,0.1)" : "transparent",
              color: isClosed ? "#22c55e" : "#9ca3af",
              border: `1px solid ${isClosed ? "#22c55e44" : "#1a2e1a"}`
            }}>
              {isClosed ? "🔓 فتح الفترة" : "🔒 إغلاق الفترة"}
            </button>
            <button onClick={() => { if (confirm("هل تريد إعادة تعيين هذه الفترة لليوم؟")) onReset(activeSlot); }} style={{
              padding: "9px 18px", borderRadius: 10, cursor: "pointer",
              fontFamily: "'Cairo'", fontWeight: 700, fontSize: 14,
              background: "transparent", color: "#f87171",
              border: "1px solid #991b1b"
            }}>
              🔄 إعادة تعيين
            </button>
          </div>
        </div>

        {/* Tab row */}
        <div style={{ padding: "12px 24px", borderBottom: "1px solid #1a2e1a", display: "flex", gap: 8, alignItems: "center" }}>
          {[["today", "اليوم"], ["all", "الكل"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "5px 16px", borderRadius: 8, cursor: "pointer",
              fontFamily: "'Cairo'", fontWeight: 600, fontSize: 13,
              background: tab === t ? "rgba(34,197,94,0.1)" : "transparent",
              color: tab === t ? "#22c55e" : "#6b7280",
              border: `1px solid ${tab === t ? "rgba(34,197,94,0.25)" : "transparent"}`
            }}>{l}</button>
          ))}
          <span style={{ fontSize: 12, color: "#4b5563", marginRight: 8 }}>
            {toArabicNums(slotBookings.length)} حجز
          </span>
        </div>

        {/* Table */}
        {slotBookings.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center", color: "#4b5563" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            لا توجد حجوزات لهذه الفترة
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a2e1a" }}>
                  {["#", "الاسم", "الجوال", "التاريخ", "وقت الحجز", "إجراءات"].map(h => (
                    <th key={h} style={{
                      padding: "13px 22px", textAlign: "right",
                      fontSize: 11, color: "#4b5563",
                      textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slotBookings.map((b, i) => (
                  <tr key={b.id} className="table-row" style={{
                    borderBottom: "1px solid rgba(26,46,26,0.5)",
                    transition: "background 0.15s"
                  }}>
                    <td style={{ padding: "14px 22px", color: "#4b5563", fontSize: 14 }}>{toArabicNums(i + 1)}</td>
                    <td style={{ padding: "14px 22px", fontWeight: 700, fontSize: 15 }}>{b.player_name}</td>
                    <td style={{ padding: "14px 22px", color: "#9ca3af", fontFamily: "monospace", direction: "ltr", textAlign: "right", fontSize: 14 }}>{b.phone_number}</td>
                    <td style={{ padding: "14px 22px", color: "#6b7280", fontSize: 13 }}>{b.booking_date}</td>
                    <td style={{ padding: "14px 22px", color: "#6b7280", fontSize: 13 }}>
                      {new Date(b.created_at).toLocaleTimeString("ar-OM", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "14px 22px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => onEdit(b)} style={{
                          background: "transparent", border: "1px solid #1a2e1a",
                          color: "#9ca3af", padding: "5px 14px", borderRadius: 8,
                          cursor: "pointer", fontSize: 13, fontFamily: "'Cairo'", fontWeight: 600
                        }}>تعديل</button>
                        <button onClick={() => { if (confirm("حذف هذا الحجز؟")) onDelete(b.id); }} style={{
                          background: "transparent", border: "1px solid #991b1b",
                          color: "#f87171", padding: "5px 14px", borderRadius: 8,
                          cursor: "pointer", fontSize: 13, fontFamily: "'Cairo'", fontWeight: 600
                        }}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Overview */}
      <div style={{ background: "#101a10", border: "1px solid #1a2e1a", borderRadius: 20, overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a2e1a" }}>
          <div style={{ fontFamily: "'Cairo'", fontSize: 20, fontWeight: 900 }}>نظرة عامة على اليوم</div>
        </div>
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {slots.map(slot => {
            const sd = getSlot(slot.id);
            return (
              <div key={slot.id} style={{
                padding: "18px 20px", borderRadius: 14,
                background: "#060d06", border: "1px solid #1a2e1a"
              }}>
                <div style={{ fontFamily: "'Cairo'", fontWeight: 800, marginBottom: 10, fontSize: 15 }}>{slot.label}</div>
                <Bar filled={sd.count} max={MAX_PLAYERS} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    {toArabicNums(sd.count)}/{toArabicNums(MAX_PLAYERS)} لاعب
                  </span>
                  <StatusBadge status={sd.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
