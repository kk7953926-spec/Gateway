import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export function listenToPaymentStatus(
  paymentId: string,
  onUpdate: (status: string, data?: any) => void
) {
  let isConfirmed = false;
  const paymentRef = doc(db, 'upi_payments', paymentId);

  // 1. Real-Time Firestore Document Event Listener
  const unsubscribeFirestore = onSnapshot(
    paymentRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.status) {
          if (data.status === 'CONFIRMED' || data.status === 'CAPTURED') {
            isConfirmed = true;
          }
          onUpdate(data.status, data);
        }
      }
    },
    (err) => {
      console.warn('[usePaymentListener]: Firestore listener notice:', err.message);
    }
  );

  // 2. Active Background Polling & Auto-Sync Worker
  const pollInterval = setInterval(async () => {
    if (isConfirmed) {
      clearInterval(pollInterval);
      return;
    }

    try {
      const res = await fetch(`/api/payment/sync/${paymentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'CONFIRMED' || data.status === 'CAPTURED') {
          isConfirmed = true;
          clearInterval(pollInterval);
          onUpdate(data.status, data.payment || data);
        }
      }
    } catch {
      // Ignore transient network errors
    }
  }, 3000);

  // Unsubscribe function to clean up listeners and intervals
  return () => {
    unsubscribeFirestore();
    clearInterval(pollInterval);
  };
}
