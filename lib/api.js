const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const KEY = "nd_token";

export const token = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(KEY)),
  set: (v) => localStorage.setItem(KEY, v),
  clear: () => localStorage.removeItem(KEY),
};

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const t = auth && token.get();
  if (t) headers.Authorization = `Token ${t}`;

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Could not reach the backend. Is ${BASE} running?`);
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(readError(data) || `Request failed (${res.status}).`);
  }
  return data;
}

function readError(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const first = Object.entries(data)[0];
  if (!first) return "";
  const [field, msg] = first;
  const text = Array.isArray(msg) ? msg[0] : msg;
  return field === "non_field_errors" ? text : `${field}: ${text}`;
}

export const api = {
  // website
  register: (b) => request("/auth/register/", { method: "POST", body: b, auth: false }),
  login: (b) => request("/auth/login/", { method: "POST", body: b, auth: false }),
  logout: () => request("/auth/logout/", { method: "POST" }),
  me: () => request("/auth/me/"),
  updateMe: (b) => request("/auth/me/update/", { method: "PATCH", body: b }),
  savePush: (player_id) => request("/push/subscribe/", { method: "POST", body: { player_id } }),
  myNotifications: () => request("/my/notifications/"),

  // admin
  matrix: () => request("/admin/matrix/"),
  createTrigger: (b) => request("/admin/triggers/", { method: "POST", body: b }),
  updateTrigger: (id, b) => request(`/admin/triggers/${id}/`, { method: "PATCH", body: b }),
  deleteTrigger: (id) => request(`/admin/triggers/${id}/`, { method: "DELETE" }),
  saveTemplate: (b) => request("/admin/templates/", { method: "POST", body: b }),
  deleteTemplate: (id) => request(`/admin/templates/${id}/`, { method: "DELETE" }),
  toggleTemplate: (id, is_enabled) =>
    request(`/admin/templates/${id}/toggle/`, { method: "POST", body: { is_enabled } }),
  testTemplate: (id, to) => request(`/admin/templates/${id}/test/`, { method: "POST", body: { to } }),
  fire: (code, user_id) => request("/admin/fire/", { method: "POST", body: { code, user_id } }),
  logs: () => request("/admin/logs/"),
};

export const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", short: "WA" },
  { key: "email", label: "Email", short: "EM" },
  { key: "webpush", label: "Web Push", short: "WP" },
];
