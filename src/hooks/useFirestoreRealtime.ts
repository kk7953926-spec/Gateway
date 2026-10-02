import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useFirestoreRealtime<T>(collectionName: string, queryConstraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, collectionName), ...queryConstraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as T);
      });
      setData(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(queryConstraints)]);

  return { data, loading };
}
