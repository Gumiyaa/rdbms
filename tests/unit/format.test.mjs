import test from 'node:test';
import assert from 'node:assert/strict';

import { ApiError } from '../../frontend/src/api/client.js';
import { errorText, formatIDR } from '../../frontend/src/utils/format.js';

const normalize = (value) => value.replace(/\s/g, ' ');

test('errorText menggabungkan pesan utama dengan detail validasi', () => {
  const error = new ApiError('Validasi gagal.', 422, {
    nama: 'Nama wajib diisi.',
    email: 'Email tidak valid.',
  });

  assert.equal(errorText(error, 'Cadangan'), 'Validasi gagal. Nama wajib diisi. Email tidak valid.');
});

test('errorText mengabaikan detail validasi yang kosong', () => {
  const error = new ApiError('Validasi gagal.', 422, {
    nama: 'Nama wajib diisi.',
    email: '',
    telepon: null,
  });

  assert.equal(errorText(error, 'Cadangan'), 'Validasi gagal. Nama wajib diisi.');
});

test('errorText memakai pesan ApiError tanpa detail', () => {
  const error = new ApiError('Email atau kata sandi salah.', 401);

  assert.equal(errorText(error, 'Cadangan'), 'Email atau kata sandi salah.');
});

test('errorText memakai fallback untuk error non-API', () => {
  assert.equal(errorText(new Error('boom'), 'Terjadi kesalahan'), 'Terjadi kesalahan');
  assert.equal(errorText('bukan error', 'Terjadi kesalahan'), 'Terjadi kesalahan');
  assert.equal(errorText(null, 'Terjadi kesalahan'), 'Terjadi kesalahan');
});

test('formatIDR memformat rupiah tanpa desimal', () => {
  assert.equal(normalize(formatIDR(0)), 'Rp 0');
  assert.equal(normalize(formatIDR(1_234_567)), 'Rp 1.234.567');
  assert.equal(normalize(formatIDR('1500000')), 'Rp 1.500.000');
  assert.equal(normalize(formatIDR(999)), 'Rp 999');
});

test('formatIDR menangani nilai kosong atau tidak valid sebagai nol', () => {
  assert.equal(normalize(formatIDR(null)), 'Rp 0');
  assert.equal(normalize(formatIDR(undefined)), 'Rp 0');
  assert.equal(normalize(formatIDR('abc')), 'Rp 0');
  assert.equal(normalize(formatIDR('')), 'Rp 0');
});

test('formatIDR menampilkan nilai negatif', () => {
  assert.equal(normalize(formatIDR(-2_500_000)), '-Rp 2.500.000');
});
