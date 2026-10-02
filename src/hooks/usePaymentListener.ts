import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export function listenToPaymentStatus(paymentId: string, onUpdate: (status: string) => void) {
  const paymentRef = doc(db, 'upi_payments', paymentId);
  
  const unsubscribe = onSnapshot(paymentRef, (doc) => {
    if (doc.exists()) {
      onUpdate(doc.data().status);
    }
  });

  return unsubscribe;
}
