import { ref, push, update } from 'firebase/database';
import { rtdb } from '../firebase';

/**
 * Menambahkan notifikasi baru ke database.
 * @param {string} title - Judul notifikasi
 * @param {string} message - Isi pesan notifikasi
 * @param {string} type - Tipe (login, register, movement, info)
 */
export const addNotification = async (title, message, type = 'info') => {
  try {
    const notifRef = push(ref(rtdb, 'notifikasi'));
    await update(ref(rtdb, `notifikasi/${notifRef.key}`), {
      title,
      message,
      type,
      timestamp: Date.now(),
      readBy: {}
    });
  } catch (error) {
    console.error('Gagal menyimpan notifikasi:', error);
  }
};
