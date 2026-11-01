/**
 * Klien HTTP kecil untuk tes API.
 *
 * Node `fetch` tidak menyimpan cookie otomatis, sedangkan API ini memakai
 * session PHP. Karena itu klien ini membawa cookie jar sederhana.
 */

export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.cookies = new Map();
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  storeCookies(response) {
    const list =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : [response.headers.get('set-cookie')].filter(Boolean);

    for (const raw of list) {
      const [pair, ...attributes] = raw.split(';');
      const separator = pair.indexOf('=');

      if (separator <= 0) {
        continue;
      }

      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const expired = attributes.some((attribute) => {
        const [key, val = ''] = attribute.split('=').map((part) => part.trim().toLowerCase());
        return key === 'max-age' && Number(val) <= 0;
      });

      if (value === '' || expired) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  async request(method, path, options = {}) {
    const { body, rawBody, headers = {} } = options;
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const finalHeaders = new Headers(headers);

    if (!finalHeaders.has('Accept')) {
      finalHeaders.set('Accept', 'application/json');
    }

    const cookie = this.cookieHeader();
    if (cookie !== '') {
      finalHeaders.set('Cookie', cookie);
    }

    let payload;

    if (rawBody !== undefined) {
      payload = rawBody;
      if (!finalHeaders.has('Content-Type')) {
        finalHeaders.set('Content-Type', 'application/json');
      }
    } else if (body !== undefined) {
      payload = JSON.stringify(body);
      if (!finalHeaders.has('Content-Type')) {
        finalHeaders.set('Content-Type', 'application/json');
      }
    }

    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: payload,
    });

    this.storeCookies(response);

    const text = await response.text();
    let parsed = null;

    if (text !== '') {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }

    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      body: parsed,
      text,
    };
  }

  get(path, options) {
    return this.request('GET', path, options);
  }

  post(path, body, options = {}) {
    return this.request('POST', path, { ...options, body });
  }

  put(path, body, options = {}) {
    return this.request('PUT', path, { ...options, body });
  }

  del(path, options) {
    return this.request('DELETE', path, options);
  }

  login(email = 'admin.hr@company.id', password = 'admin123') {
    return this.post('/auth.php?action=login', { email, password });
  }
}

export function createClient(baseUrl) {
  return new ApiClient(baseUrl);
}
