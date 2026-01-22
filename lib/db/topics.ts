import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Topic {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new topic
 */
export async function createTopic(
  userId: string,
  data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const topicsRef = collection(db, 'users', userId, 'topics');
  
  const docRef = await addDoc(topicsRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return docRef.id;
}

/**
 * Update topic
 */
export async function updateTopic(
  userId: string,
  topicId: string,
  data: Partial<Omit<Topic, 'id' | 'createdAt'>>
): Promise<void> {
  const topicRef = doc(db, 'users', userId, 'topics', topicId);
  
  await updateDoc(topicRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete topic
 */
export async function deleteTopic(
  userId: string,
  topicId: string
): Promise<void> {
  const topicRef = doc(db, 'users', userId, 'topics', topicId);
  await deleteDoc(topicRef);
}

/**
 * Get single topic
 */
export async function getTopic(
  userId: string,
  topicId: string
): Promise<Topic | null> {
  const topicRef = doc(db, 'users', userId, 'topics', topicId);
  const docSnap = await getDoc(topicRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt.toDate(),
    updatedAt: docSnap.data().updatedAt.toDate(),
  } as Topic;
}

/**
 * Subscribe to topics (realtime)
 */
export function subscribeToTopics(
  userId: string,
  callback: (topics: Topic[]) => void
): () => void {
  const topicsRef = collection(db, 'users', userId, 'topics');
  const q = query(topicsRef, orderBy('order', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const topics = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Topic[];

    callback(topics);
  });
}
