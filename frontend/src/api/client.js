/**
 * Klien API untuk backend PHP Native.
 *
 * - Semua request memakai Fetch API + JSON.
 * - `credentials: 'include'` agar cookie session PHP ikut terkirim.
 * - Base URL mengikuti BASE_URL Vite ('/api/' saat dev via proxy,
 *   './api/' pada hasil build yang disajikan Laragon).
 */

const env = import.meta.env ?? {};
const API_BASE = `${env.BASE_URL ?? '/'}api/`;

export class ApiError extends Error {
  constructor(message, status = 0, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request(path, options = {}) {
  const { method = 'GET', body, query } = options;

  let url = API_BASE + path;

  if (query) {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || value === 'Semua') {
        return;
      }
      params.append(key, String(value));
    });

    const qs = params.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  let response;

  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: body
        ? { 'Content-Type': 'application/json', Accept: 'application/json' }
        : { Accept: 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Pastikan Laragon (Apache) berjalan.', 0);
  }

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || `Permintaan gagal (HTTP ${response.status}).`,
      response.status,
      payload?.errors ?? null
    );
  }

  return payload ?? { success: true, data: null };
}

export const api = {
  auth: {
    me: () => request('auth.php?action=me'),
    login: (payload) => request('auth.php?action=login', { method: 'POST', body: payload }),
    logout: () => request('auth.php?action=logout', { method: 'POST', body: {} }),
  },

  dashboard: () => request('dashboard.php'),

  employees: {
    list: (query) => request('employees.php', { query }),
    get: (id) => request('employees.php', { query: { id } }),
    create: (data) => request('employees.php', { method: 'POST', body: data }),
    update: (id, data) => request('employees.php', { query: { id }, method: 'PUT', body: data }),
    remove: (id) => request('employees.php', { query: { id }, method: 'DELETE' }),
  },

  departments: {
    list: (query) => request('departments.php', { query }),
    get: (id) => request('departments.php', { query: { id } }),
    create: (data) => request('departments.php', { method: 'POST', body: data }),
    update: (id, data) => request('departments.php', { query: { id }, method: 'PUT', body: data }),
    remove: (id) => request('departments.php', { query: { id }, method: 'DELETE' }),
  },

  positions: {
    list: (query) => request('positions.php', { query }),
    get: (id) => request('positions.php', { query: { id } }),
    create: (data) => request('positions.php', { method: 'POST', body: data }),
    update: (id, data) => request('positions.php', { query: { id }, method: 'PUT', body: data }),
    remove: (id) => request('positions.php', { query: { id }, method: 'DELETE' }),
  },

  attendances: {
    list: (query) => request('attendances.php', { query }),
    recap: (query) => request('attendances.php', { query: { action: 'recap', ...query } }),
    create: (data) => request('attendances.php', { method: 'POST', body: data }),
    update: (id, data) => request('attendances.php', { query: { id }, method: 'PUT', body: data }),
    remove: (id) => request('attendances.php', { query: { id }, method: 'DELETE' }),
    clockIn: () => request('attendances.php?action=clock-in', { method: 'POST', body: {} }),
    clockOut: () => request('attendances.php?action=clock-out', { method: 'POST', body: {} }),
  },

  leaves: {
    list: (query) => request('leave_requests.php', { query }),
    get: (id) => request('leave_requests.php', { query: { id } }),
    create: (data) => request('leave_requests.php', { method: 'POST', body: data }),
    update: (id, data) => request('leave_requests.php', { query: { id }, method: 'PUT', body: data }),
    remove: (id) => request('leave_requests.php', { query: { id }, method: 'DELETE' }),
  },
};

export default api;
