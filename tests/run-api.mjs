/**
 * Orkestrator tes integrasi API.
 *
 * Alur:
 *   1. cari binary PHP
 *   2. buat folder + database SQLite sementara (schema & seed otomatis)
 *   3. jalankan `php -S` dengan RDBMS_DB_PATH ke database sementara itu
 *   4. jalankan seluruh `tests/api/*.test.mjs` secara berurutan
 *   5. matikan server & hapus folder sementara
 *
 * Database utama tidak pernah dibuka oleh tes ini.
 *
 * Pemakaian:
 *   npm run test:api
 *   node tests/run-api.mjs --keep   (pertahankan folder sementara untuk debug)
 */

import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { phpInfo, resolvePhpBinary } from './harness/php.mjs';
import { initializeDatabase, startApiServer } from './harness/server.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const keepTemp = process.argv.includes('--keep');

function runNodeTest(files, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--test', '--test-concurrency=1', '--test-reporter=spec', ...files],
      {
        cwd: projectRoot,
        env: { ...process.env, ...env },
        stdio: 'inherit',
        windowsHide: true,
      }
    );

    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  const phpBinary = resolvePhpBinary();
  const info = phpInfo(phpBinary);
  const required = ['pdo_sqlite', 'sqlite3', 'mbstring'];
  const missing = required.filter((extension) => !info.extensions.includes(extension));

  if (missing.length > 0) {
    throw new Error(
      `Ekstensi PHP belum aktif: ${missing.join(', ')}. ` +
        'Aktifkan di php.ini (extension=pdo_sqlite, sqlite3, mbstring).'
    );
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'rdbms-api-'));
  const dbPath = join(tempDir, 'employee_management.db');
  const sessionDir = join(tempDir, 'sessions');

  mkdirSync(sessionDir, { recursive: true });

  console.log(`PHP      : ${phpBinary} (${info.version})`);
  console.log(`Database : ${dbPath}`);

  let server = null;

  try {
    initializeDatabase({ phpBinary, projectRoot, dbPath });

    server = await startApiServer({ phpBinary, projectRoot, dbPath, sessionDir });

    console.log(`API      : ${server.baseUrl}`);
    console.log('');

    const apiDir = join(projectRoot, 'tests', 'api');
    const files = readdirSync(apiDir)
      .filter((name) => name.endsWith('.test.mjs'))
      .sort()
      .map((name) => join(apiDir, name));

    if (files.length === 0) {
      throw new Error('Tidak ada file tes di tests/api.');
    }

    const exitCode = await runNodeTest(files, {
      API_BASE_URL: server.baseUrl,
      PHP_BINARY: phpBinary,
      RDBMS_DB_PATH: dbPath,
    });

    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  } finally {
    if (server !== null) {
      const logs = server.logs();

      await server.stop();

      if (process.exitCode && logs.trim() !== '') {
        console.error('\n--- log server PHP (ekor) ---');
        console.error(logs);
      }
    }

    if (keepTemp) {
      console.log(`\nFolder sementara dipertahankan: ${tempDir}`);
    } else {
      rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  }
}

main().catch((error) => {
  console.error(`\n[test:api] ${error.message}`);
  process.exitCode = 1;
});
