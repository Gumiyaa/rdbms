// Menyalin hasil build Vite (folder `dist/`) ke root proyek
// agar Laragon (Apache) bisa menyajikan aplikasi di http://rdbms.test
import { cp, rm, readdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(projectRoot, 'dist')

// File/folder sumber yang tidak boleh tertimpa hasil build
const PROTECTED = new Set([
  'frontend',
  'node_modules',
  'scripts',
  'dist',
  'api',
  'storage',
  'package.json',
  'package-lock.json',
  'vite.config.js',
  'README.md',
  '.htaccess',
  '.gitignore',
  '.git',
])

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await exists(distDir))) {
    console.error('Folder dist/ tidak ditemukan. Jalankan `npm run build` lebih dulu.')
    process.exit(1)
  }

  const entries = await readdir(distDir)

  // Bersihkan hasil publikasi sebelumnya (index.html + assets + file lain)
  for (const entry of entries) {
    if (PROTECTED.has(entry)) continue
    await rm(path.join(projectRoot, entry), { recursive: true, force: true })
  }

  for (const entry of entries) {
    if (PROTECTED.has(entry)) continue
    await cp(path.join(distDir, entry), path.join(projectRoot, entry), { recursive: true })
  }

  console.log(`\n✔ Hasil build dipublikasikan ke: ${projectRoot}`)
  console.log('  Buka http://rdbms.test (pastikan Laragon/Apache berjalan)\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
