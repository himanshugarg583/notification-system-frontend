"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const CH_META = {
  whatsapp: { label: "WhatsApp", color: "var(--wa)", tint: "var(--wa-tint)" },
  email: { label: "Email", color: "var(--em)", tint: "var(--em-tint)" },
  webpush: { label: "Web Push", color: "var(--wp)", tint: "var(--wp-tint)" },
};

/* ── top bar ─────────────────────────────────────────── */
export function TopBar({ page, user, onSignOut }) {
  return (
    <header className="topbar">
      <a href="/" className="wordmark">
        <span className="dot" />
        NotifyDesk
      </a>
      <nav>
        <a className="navlink" href="/" data-on={page === "site"}>Website</a>
        <a className="navlink" href="/admin" data-on={page === "admin"}>Admin</a>
        {user && (
          <>
            <span className="navlink" style={{ color: "var(--ink-3)" }}>{user.username}</span>
            <button className="btn btn-sm" onClick={onSignOut}>Sign out</button>
          </>
        )}
      </nav>
    </header>
  );
}

/* ── toasts ──────────────────────────────────────────── */
export function useToasts() {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, text, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 5200);
  }, []);
  return { items, push };
}

export function Toasts({ items }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast" data-kind={t.kind}>
          <span className="k">{t.kind === "error" ? "✗" : "✓"}</span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ── modal ───────────────────────────────────────────── */
export function Modal({ title, subtitle, accent, onClose, children, footer }) {
  const ref = useRef(null);

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" tabIndex={-1} ref={ref}>
        <div className="modal-head">
          {accent && <span className="accent" style={{ background: accent }} />}
          <div style={{ flex: 1 }}>
            <h2>{title}</h2>
            {subtitle && (
              <p className="mono" style={{ margin: "5px 0 0", fontSize: 12, color: "var(--ink-3)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button className="btn btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ── rocker switch ───────────────────────────────────── */
export function Rocker({ on, onChange, label }) {
  return (
    <button
      className="rocker"
      data-on={on}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    />
  );
}

/* ── status badge ────────────────────────────────────── */
export function Badge({ status }) {
  return <span className="badge" data-s={status}>{status}</span>;
}

export function clock(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
