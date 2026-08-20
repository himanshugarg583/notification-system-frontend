"use client";

import { useCallback, useEffect, useState } from "react";
import { api, token } from "@/lib/api";
import { Badge, CH_META, clock, Toasts, TopBar, useToasts } from "./components";

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "";

export default function SitePage() {
  const [me, setMe] = useState(null);
  const [feed, setFeed] = useState([]);
  const [mode, setMode] = useState("login");
  const [pushState, setPushState] = useState("idle"); // idle | working | on | unsupported
  const [busy, setBusy] = useState(true);
  const { items, push } = useToasts();

  const loadFeed = useCallback(async () => {
    try { setFeed(await api.myNotifications()); } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      if (token.get()) {
        try {
          setMe(await api.me());
          await loadFeed();
        } catch { token.clear(); }
      }
      setBusy(false);
    })();
  }, [loadFeed]);

  /* ── OneSignal web push ──────────────────────────── */
  useEffect(() => {
    if (!me || !ONESIGNAL_APP_ID || typeof window === "undefined") return;
    if (window.__oneSignalBooted) return;
    window.__oneSignalBooted = true;

    const s = document.createElement("script");
    s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    s.defer = true;
    document.head.appendChild(s);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      await OneSignal.init({ appId: ONESIGNAL_APP_ID, allowLocalhostAsSecureOrigin: true });
      window.__oneSignal = OneSignal;

      const sync = async () => {
        const id = OneSignal.User?.PushSubscription?.id;
        if (!id) return;
        try {
          await api.savePush(id);
          setPushState("on");
        } catch (e) { push(e.message, "error"); }
      };
      OneSignal.User.PushSubscription.addEventListener("change", sync);
      if (OneSignal.User.PushSubscription.optedIn) sync();
    });
  }, [me, push]);

  async function enablePush() {
    if (!ONESIGNAL_APP_ID) {
      return push("NEXT_PUBLIC_ONESIGNAL_APP_ID is not set in .env.local.", "error");
    }
    if (!("Notification" in window)) {
      setPushState("unsupported");
      return push("This browser does not support web push.", "error");
    }
    setPushState("working");
    try {
      const OneSignal = window.__oneSignal;
      if (!OneSignal) throw new Error("OneSignal SDK is still loading, try again in a second.");
      await OneSignal.Notifications.requestPermission();
      await OneSignal.User.PushSubscription.optIn();
      const id = OneSignal.User.PushSubscription.id;
      if (!id) throw new Error("No subscription id yet. Please allow notifications in the browser.");
      await api.savePush(id);
      setPushState("on");
      push("Push notifications enabled on this browser.");
    } catch (e) {
      setPushState("idle");
      push(e.message, "error");
    }
  }

  /* ── auth ─────────────────────────────────────────── */
  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const payload = Object.fromEntries(f.entries());
    try {
      const res = mode === "login"
        ? await api.login({ username: payload.username, password: payload.password })
        : await api.register(payload);

      token.set(res.token);
      setMe(res.user);
      report(res.notifications, mode === "login" ? "Login" : "Signup");
      await loadFeed();
    } catch (err) {
      push(err.message, "error");
    }
  }

  async function signOut() {
    try {
      const res = await api.logout();
      report(res.notifications, "Logout");
    } catch (e) {
      push(e.message, "error");
    }
    token.clear();
    setMe(null);
    setFeed([]);
  }

  function report(notifications = [], label) {
    if (!notifications.length) {
      return push(`${label} succeeded, but no channels are enabled for this trigger.`);
    }
    const line = notifications
      .map((n) => `${CH_META[n.channel]?.label || n.channel}: ${n.status}`)
      .join(" · ");
    push(`${label} trigger fired — ${line}`);
  }

  if (busy) {
    return (
      <>
        <TopBar page="site" />
        <div className="shell"><p className="mono muted" style={{ marginTop: 40 }}>Loading…</p></div>
      </>
    );
  }

  /* ── signed out ───────────────────────────────────── */
  if (!me) {
    return (
      <>
        <TopBar page="site" />
        <div className="shell">
          <div className="center-wrap">
            <div className="pagehead">
              <p className="eyebrow">Demo website</p>
              <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
              <p className="lede">
                Anything you do here — sign up, sign in, sign out — is a trigger. Messages go out
                on whichever channels the admin has turned on.
              </p>
            </div>

            <div className="panel">
              <form className="panel-body" onSubmit={submit}>
                {mode === "signup" && (
                  <div className="field">
                    <label htmlFor="fn">Your name</label>
                    <input id="fn" name="first_name" placeholder="Aarav" required />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="un">Username</label>
                  <input id="un" name="username" required autoComplete="username" />
                </div>
                {mode === "signup" && (
                  <>
                    <div className="field">
                      <label htmlFor="em">Email</label>
                      <input id="em" name="email" type="email" placeholder="you@example.com" required />
                      <span className="help">Use a Postmark-verified address or the email will bounce.</span>
                    </div>
                    <div className="field">
                      <label htmlFor="ph">WhatsApp number</label>
                      <input id="ph" name="phone" placeholder="919876543210" />
                      <span className="help">Include country code, no + or spaces. Must be on Meta's test recipient list.</span>
                    </div>
                  </>
                )}
                <div className="field">
                  <label htmlFor="pw">Password</label>
                  <input id="pw" name="password" type="password" required minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"} />
                </div>
                <button className="btn btn-solid" style={{ width: "100%" }}>
                  {mode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>
              <div className="panel-body" style={{ borderTop: "1px solid var(--rule)", paddingTop: 13 }}>
                <button
                  className="btn btn-sm"
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                >
                  {mode === "login" ? "Create a new account" : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <Toasts items={items} />
      </>
    );
  }

  /* ── signed in ────────────────────────────────────── */
  return (
    <>
      <TopBar page="site" user={me} onSignOut={signOut} />
      <div className="shell">
        <div className="pagehead">
          <p className="eyebrow">Signed in</p>
          <h1>Hey {me.first_name || me.username}</h1>
          <p className="lede">
            The login trigger has just fired. Signing out will fire the logout trigger —
            both outcomes appear in the activity feed below.
          </p>
        </div>

        <div className="split">
          <div className="stack">
            <div className="panel">
              <div className="panel-head">
                <h2>Browser notifications</h2>
                <span className="chip" style={{ marginLeft: "auto" }}>
                  <span className="lamp" data-live={pushState === "on"} />
                  {pushState === "on" ? "subscribed" : "not subscribed"}
                </span>
              </div>
              <div className="panel-body">
                <p className="muted" style={{ margin: "0 0 13px", lineHeight: 1.55 }}>
                  Web push only arrives once this browser has opted in. After you allow it, the
                  subscription id is saved on the server.
                </p>
                <button
                  className="btn btn-solid"
                  onClick={enablePush}
                  disabled={pushState === "working" || pushState === "on"}
                >
                  {pushState === "on" ? "Subscribed" :
                   pushState === "working" ? "Waiting for permission…" : "Enable push on this browser"}
                </button>
                {!ONESIGNAL_APP_ID && (
                  <p className="note" style={{ marginTop: 13 }}>
                    NEXT_PUBLIC_ONESIGNAL_APP_ID is not set, so this button will not work.
                  </p>
                )}
              </div>
            </div>

            <ProfileCard me={me} onSaved={setMe} onError={(m) => push(m, "error")} onOk={(m) => push(m)} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Your activity</h2>
              <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={loadFeed}>
                Refresh
              </button>
            </div>
            <div className="panel-body">
              {feed.length === 0 ? (
                <p className="mono muted" style={{ margin: 0 }}>Nothing sent yet.</p>
              ) : (
                feed.map((n) => (
                  <div className="feed-item" key={n.id}>
                    <div className="feed-top">
                      <i className={`ch-bar ch-${n.channel}`} />
                      <span className="mono" style={{ fontSize: 12 }}>
                        {CH_META[n.channel]?.label || n.channel}
                      </span>
                      <Badge status={n.status} />
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: "auto" }}>
                        {clock(n.created_at)}
                      </span>
                    </div>
                    <div className="txt">
                      {n.rendered_subject && <b>{n.rendered_subject} — </b>}
                      {n.rendered_body}
                    </div>
                    {n.error && (
                      <div className="txt" style={{ color: "var(--bad)", marginTop: 4 }}>{n.error}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <Toasts items={items} />
    </>
  );
}
function ProfileCard({ me, onSaved, onOk, onError }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: me.first_name || "",
    email: me.email || "",
    phone: me.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateMe(form);
      onSaved(updated);
      onOk("Profile updated.");
      setEditing(false);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const displayPhone = me.phone
    ? (me.phone.startsWith("+") ? me.phone : `+${me.phone}`)
    : "—";

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Your details</h2>
        {!editing && (
          <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>
      <div className="panel-body">
        {editing ? (
          <form onSubmit={save}>
            <div className="field">
              <label htmlFor="fn2">Your name</label>
              <input id="fn2" value={form.first_name} onChange={set("first_name")} placeholder="Aarav" />
            </div>
            <div className="field">
              <label htmlFor="em2">Email</label>
              <input id="em2" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
              <span className="help">Postmark sends emails to this address.</span>
            </div>
            <div className="field">
              <label htmlFor="ph2">WhatsApp number</label>
              <input id="ph2" value={form.phone} onChange={set("phone")} placeholder="919876543210" />
              <span className="help">Include country code, no + or spaces. Must be on Meta&apos;s test recipient list.</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-solid" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <dl className="kv">
              <dt>username</dt><dd>{me.username}</dd>
              <dt>name</dt><dd>{me.first_name || "—"}</dd>
              <dt>email</dt><dd>{me.email || "—"}</dd>
              <dt>phone</dt><dd>{displayPhone}</dd>
              <dt>last login</dt><dd>{me.last_login ? new Date(me.last_login).toLocaleString() : "—"}</dd>
            </dl>
            <p className="muted" style={{ marginTop: 13, marginBottom: 0 }}>
              If email or phone is empty those channels will be skipped &mdash; the log row shows
              &quot;skipped&quot; instead of &quot;sent&quot;.
            </p>
          </>
        )}
      </div>
    </div>
  );
}