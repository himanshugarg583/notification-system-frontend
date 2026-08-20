"use client";

import { useCallback, useEffect, useState } from "react";
import { api, CHANNELS, token } from "@/lib/api";
import { Badge, CH_META, clock, Modal, Rocker, Toasts, TopBar, useToasts } from "../components";

export default function AdminPage() {
  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState("matrix");
  const [editing, setEditing] = useState(null);   // { trigger, channel, template }
  const [testing, setTesting] = useState(null);   // template
  const [newTrigger, setNewTrigger] = useState(false);
  const [busy, setBusy] = useState(true);
  const { items, push } = useToasts();

  const load = useCallback(async () => {
    try {
      const [matrix, logRows] = await Promise.all([api.matrix(), api.logs()]);
      setData(matrix);
      setLogs(logRows);
    } catch (e) {
      push(e.message, "error");
    }
  }, [push]);

  useEffect(() => {
    (async () => {
      if (!token.get()) return setBusy(false);
      try {
        const user = await api.me();
        if (!user.is_staff) {
          push("This account is not an admin. Sign in with admin credentials.", "error");
          setBusy(false);
          return;
        }
        setMe(user);
        await load();
      } catch {
        token.clear();
      }
      setBusy(false);
    })();
  }, [load, push]);

  async function signIn(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const res = await api.login({
        username: f.get("username"),
        password: f.get("password"),
      });
      if (!res.user.is_staff) return push("This is not an admin account.", "error");
      token.set(res.token);
      setMe(res.user);
      await load();
    } catch (err) {
      push(err.message, "error");
    }
  }

  async function signOut() {
    try { await api.logout(); } catch {}
    token.clear();
    setMe(null);
    setData(null);
  }

  async function toggle(tpl) {
    try {
      await api.toggleTemplate(tpl.id, !tpl.is_enabled);
      push(`${CH_META[tpl.channel].label} turned ${tpl.is_enabled ? "off" : "on"}.`);
      load();
    } catch (e) {
      push(e.message, "error");
    }
  }

  async function removeTrigger(row) {
    if (!confirm(`Delete "${row.name}" and all of its templates?`)) return;
    try {
      await api.deleteTrigger(row.id);
      push(`${row.name} deleted.`);
      load();
    } catch (e) {
      push(e.message, "error");
    }
  }

  /* ── gates ─────────────────────────────────────────── */
  if (busy) {
    return (
      <>
        <TopBar page="admin" />
        <div className="shell"><p className="mono muted" style={{ marginTop: 40 }}>Loading…</p></div>
      </>
    );
  }

  if (!me) {
    return (
      <>
        <TopBar page="admin" />
        <div className="shell">
          <div className="center-wrap">
            <div className="pagehead">
              <p className="eyebrow">Restricted</p>
              <h1>Admin sign in</h1>
              <p className="lede">Notification settings are only accessible to staff accounts.</p>
            </div>
            <div className="panel">
              <form className="panel-body" onSubmit={signIn}>
                <div className="field">
                  <label htmlFor="u">Username</label>
                  <input id="u" name="username" defaultValue="admin" required />
                </div>
                <div className="field">
                  <label htmlFor="p">Password</label>
                  <input id="p" name="password" type="password" defaultValue="admin12345" required />
                </div>
                <button className="btn btn-solid" style={{ width: "100%" }}>Sign in</button>
              </form>
            </div>
            <p className="note" style={{ marginTop: 14 }}>
              Seed defaults: admin / admin12345 — override via .env.
            </p>
          </div>
        </div>
        <Toasts items={items} />
      </>
    );
  }

  const mockedCount = data
    ? Object.values(data.providers).filter((p) => !p.live).length
    : 0;

  /* ── main ──────────────────────────────────────────── */
  return (
    <>
      <TopBar page="admin" user={me} onSignOut={signOut} />
      <div className="shell">
        <div className="pagehead spread">
          <div>
            <p className="eyebrow">Notification settings</p>
            <h1>Switchboard</h1>
            <p className="lede">
              Each row is a trigger, each column is a channel. Click a cell to write a template,
              use the toggle to turn a channel off, hit Test to send yourself a sample.
            </p>
          </div>
          <button className="btn btn-solid" onClick={() => setNewTrigger(true)}>+ New trigger</button>
        </div>

        {data && (
          <div className="strip">
            {CHANNELS.map((c) => {
              const p = data.providers[c.key];
              return (
                <span key={c.key} className="chip" title={p.missing_env.join(", ")}>
                  <span className="lamp" data-live={p.live} />
                  {c.label} · {p.live ? "live" : "mock"}
                </span>
              );
            })}
            <span className="chip">
              <span className="ch-bar ch-email" />
              {data.rows.length} triggers
            </span>
          </div>
        )}

        {mockedCount > 0 && (
          <p className="note" style={{ marginBottom: 18 }}>
            {mockedCount} channel{mockedCount > 1 ? "s are" : " is"} in mock mode — sends are logged
            but nothing goes out. Set the missing keys in backend .env and restart.
          </p>
        )}

        <div className="tabs">
          <button className="tab" data-on={tab === "matrix"} onClick={() => setTab("matrix")}>
            Matrix
          </button>
          <button className="tab" data-on={tab === "logs"} onClick={() => { setTab("logs"); load(); }}>
            Delivery log ({logs.length})
          </button>
        </div>

        {tab === "matrix" && data && (
          <table className="matrix">
            <thead>
              <tr>
                <th>Trigger</th>
                {CHANNELS.map((c) => (
                  <th key={c.key}>
                    <span><i className={`ch-bar ch-${c.key}`} />{c.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.id}>
                  <th className="rowhead">
                    <div className="name">{row.name}</div>
                    <div className="code">{row.code}</div>
                    <span className="kind">
                      {row.kind === "scheduled" ? `after ${row.inactive_days}d idle` : "event"}
                    </span>
                    <div style={{ display: "flex", gap: 6, marginTop: 11 }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => api.fire(row.code).then((r) => {
                          push(`${row.name} fired on ${r.fired} channel(s).`);
                          load();
                        }).catch((e) => push(e.message, "error"))}
                      >
                        Fire now
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => removeTrigger(row)}>
                        Delete
                      </button>
                    </div>
                  </th>

                  {CHANNELS.map((c) => {
                    const tpl = row.cells[c.key];
                    return (
                      <td key={c.key} className="cell" data-ch={c.label}>
                        {tpl ? (
                          <div className="strip-inner">
                            <div className="strip-top">
                              <Rocker
                                on={tpl.is_enabled}
                                label={`${row.name} ${c.label}`}
                                onChange={() => toggle(tpl)}
                              />
                              <span className="state" data-on={tpl.is_enabled}>
                                {tpl.is_enabled ? "on" : "off"}
                              </span>
                            </div>
                            <div className="preview">
                              {tpl.subject && <span className="subj">{tpl.subject}</span>}
                              {tpl.body}
                            </div>
                            <div className="cell-actions">
                              <button
                                className="btn btn-sm"
                                onClick={() => setEditing({ trigger: row, channel: c.key, template: tpl })}
                              >
                                Edit
                              </button>
                              <button className="btn btn-sm" onClick={() => setTesting({ ...tpl, _row: row })}>
                                Test
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="empty-cell">
                            <p>No template yet</p>
                            <button
                              className="btn btn-sm"
                              onClick={() => setEditing({ trigger: row, channel: c.key, template: null })}
                            >
                              Create template
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "logs" && (
          <div className="panel">
            {logs.length === 0 ? (
              <div className="panel-body">
                <p className="mono muted">
                  Nothing sent yet. Sign in on the site or hit Test on any cell.
                </p>
              </div>
            ) : (
              <table className="logtable">
                <thead>
                  <tr>
                    <th>Time</th><th>Trigger</th><th>Channel</th>
                    <th>To</th><th>Status</th><th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td>{clock(l.created_at)}</td>
                      <td>{l.trigger_code}</td>
                      <td>{CH_META[l.channel]?.label || l.channel}</td>
                      <td style={{ maxWidth: 170, wordBreak: "break-all" }}>{l.recipient}</td>
                      <td>
                        <Badge status={l.status} />
                        {l.is_test && <span className="badge" style={{ marginLeft: 4 }}>test</span>}
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        {l.error ? (
                          <span style={{ color: "var(--bad)" }}>{l.error}</span>
                        ) : (
                          <>{l.rendered_subject && <b>{l.rendered_subject} · </b>}{l.rendered_body.slice(0, 90)}</>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {editing && (
        <TemplateEditor
          {...editing}
          variables={data.variables}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); push(msg); load(); }}
          onError={(m) => push(m, "error")}
        />
      )}

      {testing && (
        <TestDialog
          template={testing}
          onClose={() => setTesting(null)}
          onDone={(entry) => {
            setTesting(null);
            const ok = entry.status === "sent" || entry.status === "mocked";
            push(
              ok
                ? `${CH_META[entry.channel].label} test ${entry.status} → ${entry.recipient}`
                : entry.error || "Test send failed.",
              ok ? "ok" : "error"
            );
            load();
          }}
          onError={(m) => push(m, "error")}
        />
      )}

      {newTrigger && (
        <TriggerEditor
          onClose={() => setNewTrigger(false)}
          onSaved={(name) => { setNewTrigger(false); push(`${name} added.`); load(); }}
          onError={(m) => push(m, "error")}
        />
      )}

      <Toasts items={items} />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   Template editor
   ══════════════════════════════════════════════════════ */
function TemplateEditor({ trigger, channel, template, variables, onClose, onSaved, onError }) {
  const meta = CH_META[channel];
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body || "");
  const [waName, setWaName] = useState(template?.whatsapp_template_name || "");
  const [saving, setSaving] = useState(false);

  const needsSubject = channel !== "whatsapp";
  const subjectLabel = channel === "email" ? "Subject line" : "Notification title";

  function insert(v) {
    setBody((b) => `${b}{{${v}}}`);
  }

  async function save() {
    setSaving(true);
    try {
      await api.saveTemplate({
        trigger: trigger.id,
        channel,
        subject,
        body,
        whatsapp_template_name: waName,
        is_enabled: template ? template.is_enabled : true,
      });
      onSaved(`${meta.label} template saved for ${trigger.name}.`);
    } catch (e) {
      onError(e.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`${meta.label} · ${trigger.name}`}
      subtitle={`${trigger.code} → ${channel}`}
      accent={meta.color}
      onClose={onClose}
      footer={
        <>
          {template && (
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (!confirm("Delete this template?")) return;
                try {
                  await api.deleteTemplate(template.id);
                  onSaved("Template deleted.");
                } catch (e) { onError(e.message); }
              }}
            >
              Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-solid" onClick={save} disabled={saving || !body.trim()}>
            {saving ? "Saving…" : "Save template"}
          </button>
        </>
      }
    >
      {needsSubject && (
        <div className="field">
          <label htmlFor="subj">{subjectLabel}</label>
          <input
            id="subj"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={channel === "email" ? "You signed in to {{site}}" : "Welcome back"}
          />
        </div>
      )}

      <div className="field">
        <label htmlFor="body">Message</label>
        <textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="vars">
          {variables.map((v) => (
            <button key={v} className="var-btn" onClick={() => insert(v)}>{`{{${v}}}`}</button>
          ))}
        </div>
        <span className="help">Click a variable to insert it into the message.</span>
      </div>

      {channel === "whatsapp" && (
        <div className="field">
          <label htmlFor="wa">Approved template name (optional)</label>
          <input
            id="wa"
            value={waName}
            onChange={(e) => setWaName(e.target.value)}
            placeholder="hello_world"
          />
          <span className="help">
            Leave blank to send plain text — this only works if the user has messaged your sandbox
            number in the last 24 hours. Otherwise put an approved template name from Meta.
          </span>
        </div>
      )}

      <div className="field" style={{ marginBottom: 0 }}>
        <label>Preview</label>
        <div className="preview" style={{ WebkitLineClamp: "unset", minHeight: 60 }}>
          {subject && <span className="subj">{subject}</span>}
          {body || "…"}
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════
   Test send
   ══════════════════════════════════════════════════════ */
function TestDialog({ template, onClose, onDone, onError }) {
  const meta = CH_META[template.channel];
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);

  const placeholder = {
    whatsapp: "919876543210 — a number on Meta's test recipient list",
    email: "you@example.com",
    webpush: "OneSignal subscription id",
  }[template.channel];

  async function send() {
    setSending(true);
    try {
      onDone(await api.testTemplate(template.id, to.trim()));
    } catch (e) {
      onError(e.message);
      setSending(false);
    }
  }

  return (
    <Modal
      title={`Test send · ${meta.label}`}
      subtitle={template._row?.code}
      accent={meta.color}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-solid" onClick={send} disabled={sending}>
            {sending ? "Sending…" : "Send test"}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="to">Send to</label>
        <input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder={placeholder} />
        <span className="help">
          Leave blank to send to your own admin account. Test still runs even if the toggle is off.
        </span>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>What goes out</label>
        <div className="preview" style={{ WebkitLineClamp: "unset" }}>
          {template.subject && <span className="subj">{template.subject}</span>}
          {template.body}
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════
   New trigger
   ══════════════════════════════════════════════════════ */
function TriggerEditor({ onClose, onSaved, onError }) {
  const [form, setForm] = useState({
    name: "", code: "", description: "", kind: "event", inactive_days: 3,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function autoCode(e) {
    const name = e.target.value;
    setForm((f) => ({
      ...f,
      name,
      code: f.code || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await api.createTrigger({
        ...form,
        inactive_days: form.kind === "scheduled" ? Number(form.inactive_days) : null,
      });
      onSaved(form.name);
    } catch (e) {
      onError(e.message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title="New trigger"
      subtitle="Add a new row to the matrix"
      accent="var(--ink)"
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-solid" onClick={save} disabled={saving || !form.name || !form.code}>
            {saving ? "Adding…" : "Add trigger"}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="tn">Name</label>
        <input id="tn" value={form.name} onChange={autoCode} placeholder="Order placed" />
      </div>
      <div className="field">
        <label htmlFor="tc">Code</label>
        <input id="tc" value={form.code} onChange={set("code")} placeholder="order_placed" />
        <span className="help">Fire this trigger from code with: fire_trigger(&quot;{form.code || "order_placed"}&quot;, user)</span>
      </div>
      <div className="field">
        <label htmlFor="td">Description</label>
        <input id="td" value={form.description} onChange={set("description")} placeholder="User completes a purchase" />
      </div>
      <div className="field">
        <label htmlFor="tk">Type</label>
        <select id="tk" value={form.kind} onChange={set("kind")}>
          <option value="event">Event — something happens on the site</option>
          <option value="scheduled">Scheduled — user has been idle for N days</option>
        </select>
      </div>
      {form.kind === "scheduled" && (
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ti">Fire after (days idle)</label>
          <input id="ti" type="number" min="1" value={form.inactive_days} onChange={set("inactive_days")} />
          <span className="help">Checked by the daily cron management command.</span>
        </div>
      )}
    </Modal>
  );
}
