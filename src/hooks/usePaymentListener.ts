import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export function listenToPaymentStatus(paymentId: string, onUpdate: (status: string, data?: any) => void) {
  const paymentRef = doc(db, 'upi_payments', paymentId);
  
  const unsubscribe = onSnapshot(paymentRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      onUpdate(data.status, data);
    }
  });

  return unsubscribe;
}
