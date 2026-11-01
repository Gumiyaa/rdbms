import { useCallback, useEffect, useRef, useState } from 'react';

const INITIAL_TOAST = { show: false, message: '', type: 'success' };

/**
 * Toast global dengan durasi tampil 3,5 detik.
 */
export function useToast() {
  const [toast, setToast] = useState(INITIAL_TOAST);
  const toastTimer = useRef(null);

  const showNotification = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(INITIAL_TOAST);
    }, 3500);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  return { toast, showNotification };
}
