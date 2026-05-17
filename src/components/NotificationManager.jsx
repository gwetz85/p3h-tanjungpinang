import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

const NotificationManager = () => {
  const { currentUser, role } = useAuth();
  const [jobs, setJobs] = useState([]);

  // 1. Request Permission on Mount
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  // 2. Fetch Jobs only for 'Petugas'
  useEffect(() => {
    if (role !== 'Petugas' || !currentUser) return;

    const qProses = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Proses'));
    const qPending = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Pending'));

    let prosesList = [];
    let pendingList = [];

    const updateList = () => {
      const combined = [...prosesList, ...pendingList];
      setJobs(combined);
    };

    const unsubProses = onValue(qProses, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        prosesList = Object.keys(data).reduce((acc, key) => {
          const job = data[key];
          // Filter only jobs assigned to current Petugas
          if (job.petugasId === currentUser.uid || job.petugas === currentUser.email) {
            acc.push({ id: key, ...job });
          }
          return acc;
        }, []);
      } else {
        prosesList = [];
      }
      updateList();
    });

    const unsubPending = onValue(qPending, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        pendingList = Object.keys(data).reduce((acc, key) => {
          const job = data[key];
          // Filter only jobs assigned to current Petugas
          if (job.petugasId === currentUser.uid || job.petugas === currentUser.email) {
            acc.push({ id: key, ...job });
          }
          return acc;
        }, []);
      } else {
        pendingList = [];
      }
      updateList();
    });

    return () => {
      unsubProses();
      unsubPending();
    };
  }, [currentUser, role]);

  // 3. Monitor schedules every minute
  useEffect(() => {
    if (jobs.length === 0) return;

    const checkSchedules = () => {
      const now = Date.now();
      const thirtyMinsInMs = 30 * 60 * 1000; // 30 Minutes
      
      // Get previously notified job IDs from localStorage to avoid spamming
      let notifiedJobs = [];
      try {
        const stored = localStorage.getItem('notified_schedules');
        if (stored) notifiedJobs = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }

      let hasNewNotification = false;

      jobs.forEach((job) => {
        if (!job.jadwalKunjungan) return;

        const scheduleTime = new Date(job.jadwalKunjungan).getTime();
        const timeDiff = scheduleTime - now;

        // If schedule is in the future but within 30 minutes, AND hasn't been notified yet
        if (timeDiff > 0 && timeDiff <= thirtyMinsInMs) {
          if (!notifiedJobs.includes(job.id)) {
            // Trigger Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              const notification = new Notification('Jadwal Kunjungan Segera Tiba!', {
                body: `Pelaku Usaha: ${job.nama}\nJadwal: ${new Date(scheduleTime).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}`,
                icon: '/logo-p3h.png', // Assuming this exists from your manifest
                requireInteraction: true // Keeps notification visible until clicked/dismissed
              });

              notification.onclick = function() {
                window.focus();
                this.close();
              };

              // Mark as notified
              notifiedJobs.push(job.id);
              hasNewNotification = true;
            }
          }
        }
      });

      // Save back to localStorage if we added a new one
      if (hasNewNotification) {
        localStorage.setItem('notified_schedules', JSON.stringify(notifiedJobs));
      }
    };

    // Check immediately, then every 1 minute
    checkSchedules();
    const intervalId = setInterval(checkSchedules, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [jobs]);

  // Invisible background component
  return null;
};

export default NotificationManager;
