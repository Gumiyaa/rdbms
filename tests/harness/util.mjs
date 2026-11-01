/**
 * Helper assertion & data untuk tes API.
 */

import assert from 'node:assert/strict';

export function apiBaseUrl() {
  const url = process.env.API_BASE_URL;

  if (!url) {
    throw new Error('API_BASE_URL belum diset. Jalankan tes lewat `npm run test:api`.');
  }

  return url;
}

export function uniqueSuffix() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Tanggal lokal YYYY-MM-DD (sama seperti date('Y-m-d') PHP). */
export function todayISO(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const pad = (value) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function expectSuccess(response, status = 200) {
  assert.equal(
    response.status,
    status,
    `HTTP ${response.status} (diharapkan ${status}): ${response.text.slice(0, 400)}`
  );
  assert.equal(response.body?.success, true, `Respons bukan success: ${response.text.slice(0, 400)}`);

  return response.body.data;
}

export function expectError(response, status) {
  assert.equal(
    response.status,
    status,
    `HTTP ${response.status} (diharapkan ${status}): ${response.text.slice(0, 400)}`
  );
  assert.equal(response.body?.success, false, `Respons bukan error: ${response.text.slice(0, 400)}`);
  assert.equal(typeof response.body?.message, 'string');

  return response.body;
}

export async function loginOk(client, email, password) {
  const response = await client.login(email, password);

  return expectSuccess(response);
}

export async function cleanup(client, path, ids) {
  for (const id of ids) {
    if (id === undefined || id === null) {
      continue;
    }

    try {
      await client.del(`${path}?id=${encodeURIComponent(id)}`);
    } catch {
      // Data mungkin sudah dihapus oleh tes lain / cascade.
    }
  }
}
