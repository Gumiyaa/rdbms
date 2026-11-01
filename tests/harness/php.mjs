/**
 * Mencari binary PHP yang bisa dipakai tes.
 *
 * Urutan pencarian:
 *   1. environment variable PHP_BINARY
 *   2. `php` di PATH
 *   3. instalasi Laragon (D:\Program\Laragon, C:\laragon, atau LARAGON_ROOT)
 *
 * CI (ubuntu-latest) memakai `shivammathur/setup-php` sehingga `php` ada di PATH.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

function isFile(path) {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

function canRun(binary) {
  const result = spawnSync(binary, ['-v'], {
    encoding: 'utf8',
    timeout: 20_000,
    windowsHide: true,
  });

  return result.status === 0;
}

function versionOf(path) {
  const match = path.match(/php-(\d+)\.(\d+)\.(\d+)/i);

  if (!match) {
    return [0, 0, 0];
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a, b) {
  const va = versionOf(a);
  const vb = versionOf(b);

  for (let i = 0; i < 3; i += 1) {
    if (va[i] !== vb[i]) {
      return va[i] - vb[i];
    }
  }

  return a.localeCompare(b);
}

function laragonCandidates() {
  const roots = [process.env.LARAGON_ROOT, 'D:\\Program\\Laragon', 'C:\\laragon'].filter(Boolean);
  const candidates = [];

  for (const root of roots) {
    const binDir = join(root, 'bin', 'php');

    if (!existsSync(binDir)) {
      continue;
    }

    for (const entry of readdirSync(binDir)) {
      const executable = join(binDir, entry, 'php.exe');

      if (entry.toLowerCase().startsWith('php-') && isFile(executable)) {
        candidates.push(executable);
      }
    }
  }

  return candidates.sort(compareVersions).reverse();
}

/**
 * @returns {string} path atau nama binary PHP yang siap dipakai
 */
export function resolvePhpBinary() {
  const fromEnv = (process.env.PHP_BINARY ?? '').trim();

  if (fromEnv !== '' && canRun(fromEnv)) {
    return fromEnv;
  }

  if (canRun('php')) {
    return 'php';
  }

  for (const candidate of laragonCandidates()) {
    if (canRun(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Binary PHP tidak ditemukan. Pasang PHP 8.1+ (dengan pdo_sqlite & mbstring) ' +
      'atau set environment variable PHP_BINARY ke path php.exe.'
  );
}

/**
 * Ringkasan versi + ekstensi penting, dipakai untuk log awal.
 */
export function phpInfo(binary) {
  const result = spawnSync(binary, ['-r', 'echo PHP_VERSION, "|", implode(",", array_intersect(["pdo_sqlite","sqlite3","mbstring"], get_loaded_extensions()));'], {
    encoding: 'utf8',
    timeout: 20_000,
    windowsHide: true,
  });

  if (result.status !== 0) {
    return { version: 'unknown', extensions: [] };
  }

  const [version, extensions = ''] = result.stdout.trim().split('|');

  return {
    version,
    extensions: extensions.split(',').filter(Boolean),
  };
}
