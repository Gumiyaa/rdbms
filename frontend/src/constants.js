export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150';

export const DEMO_EMAIL = 'admin.hr@company.id';
export const DEMO_PASSWORD = 'admin123';

export const EMPTY_DASHBOARD = {
  total_karyawan: 0,
  total_departemen: 0,
  total_jabatan: 0,
  total_staff: 0,
  karyawan_aktif: 0,
  karyawan_cuti: 0,
  cuti_pending: 0,
  kehadiran_hari_ini: { persen: 0, tepat_waktu: 0, terlambat: 0, total: 0 },
  hari_ini: { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpa: 0, total: 0 },
  grafik_mingguan: [],
  distribusi_departemen: [],
  aktivitas_terkini: [],
};

export const EMPTY_SUMMARY = {
  tepat_waktu: 0,
  terlambat: 0,
  izin: 0,
  sakit: 0,
  alpa: 0,
  total: 0,
};
