/**
 * Menjalankan backend PHP dengan `php -S` memakai database sementara.
 *
 * Database utama TIDAK pernah dipakai: path selalu dioverride lewat
 * environment variable RDBMS_DB_PATH.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync } from 'node:fs';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * Membuat skema + seed di database sementara sebelum server dijalankan.
 * Dengan begitu request pertama tidak perlu menebak kapan inisialisasi selesai.
 */
export function initializeDatabase({ phpBinary, projectRoot, dbPath }) {
  const result = spawnSync(
    phpBinary,
    ['-r', "require 'api/config/database.php'; db(); echo 'ok';"],
    {
      cwd: projectRoot,
      env: { ...process.env, RDBMS_DB_PATH: dbPath },
      encoding: 'utf8',
      timeout: 120_000,
      windowsHide: true,
    }
  );

  if (result.status !== 0 || !String(result.stdout).includes('ok')) {
    throw new Error(
      `Gagal menyiapkan database tes (exit ${result.status}).\n` +
        `stdout: ${result.stdout}\nstderr: ${result.stderr}`
    );
  }
}

/**
 * @returns {Promise<{baseUrl: string, port: number, pid: number|undefined,
 *   stop: () => Promise<void>, logs: () => string}>}
 */
export async function startApiServer({ phpBinary, projectRoot, dbPath, sessionDir, timeoutMs = 30_000 }) {
  mkdirSync(sessionDir, { recursive: true });

  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const child = spawn(
    phpBinary,
    [
      '-d',
      `session.save_path=${sessionDir}`,
      '-d',
      'display_errors=0',
      '-d',
      'log_errors=1',
      '-S',
      `127.0.0.1:${port}`,
      '-t',
      projectRoot,
    ],
    {
      cwd: projectRoot,
      env: { ...process.env, RDBMS_DB_PATH: dbPath },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );

  let logs = '';
  const collect = (chunk) => {
    logs = `${logs}${chunk}`.slice(-32_768);
  };

  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', collect);
  child.stderr?.on('data', collect);

  let exited = false;
  let exitInfo = null;

  const exitPromise = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      exited = true;
      exitInfo = { code, signal };
      resolve(exitInfo);
    });
  });

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (exited) {
      throw new Error(
        `Server PHP berhenti terlalu awal (${JSON.stringify(exitInfo)}).\n${logs}`
      );
    }

    try {
      const response = await fetch(`${baseUrl}/auth.php?action=me`, {
        headers: { Accept: 'application/json' },
      });
      const text = await response.text();

      if (response.status === 401 && text.includes('"success":false')) {
        return {
          baseUrl,
          port,
          pid: child.pid,
          logs: () => logs,
          stop: () => stopServer(child, exitPromise, () => exited),
        };
      }
    } catch {
      // Server belum siap; coba lagi.
    }

    await delay(120);
  }

  await stopServer(child, exitPromise, () => exited);

  throw new Error(`Server PHP tidak siap dalam ${timeoutMs} ms.\n${logs}`);
}

async function stopServer(child, exitPromise, hasExited) {
  if (hasExited()) {
    return;
  }

  child.kill('SIGTERM');

  const stopped = await Promise.race([
    exitPromise.then(() => true),
    delay(4_000).then(() => false),
  ]);

  if (!stopped && process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    await Promise.race([exitPromise, delay(3_000)]);
  }
}
