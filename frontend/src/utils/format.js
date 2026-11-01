import { ApiError } from '../api/client';

/**
 * Ubah error API menjadi teks yang siap ditampilkan.
 * Bila error membawa detail validasi per field, detail tersebut digabung.
 */
export const errorText = (err, fallback) => {
  if (err instanceof ApiError) {
    if (err.errors && typeof err.errors === 'object') {
      const details = Object.values(err.errors).filter(Boolean).join(' ');
      return details ? `${err.message} ${details}` : err.message;
    }
    return err.message;
  }
  return fallback;
};

export const formatIDR = (val) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
};
