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
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Folder {
  id: string;
  topicId: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a new folder
 */
export async function createFolder(
  userId: string,
  data: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const foldersRef = collection(db, 'users', userId, 'folders');
  
  const docRef = await addDoc(foldersRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return docRef.id;
}

/**
 * Update folder
 */
export async function updateFolder(
  userId: string,
  folderId: string,
  data: Partial<Omit<Folder, 'id' | 'createdAt'>>
): Promise<void> {
  const folderRef = doc(db, 'users', userId, 'folders', folderId);
  
  await updateDoc(folderRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete folder
 */
export async function deleteFolder(
  userId: string,
  folderId: string
): Promise<void> {
  const folderRef = doc(db, 'users', userId, 'folders', folderId);
  await deleteDoc(folderRef);
}

/**
 * Get single folder
 */
export async function getFolder(
  userId: string,
  folderId: string
): Promise<Folder | null> {
  const folderRef = doc(db, 'users', userId, 'folders', folderId);
  const docSnap = await getDoc(folderRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt.toDate(),
    updatedAt: docSnap.data().updatedAt.toDate(),
  } as Folder;
}

/**
 * Subscribe to folders by topic (realtime)
 */
export function subscribeToFolders(
  userId: string,
  topicId: string,
  callback: (folders: Folder[]) => void
): () => void {
  const foldersRef = collection(db, 'users', userId, 'folders');
  const q = query(
    foldersRef, 
    where('topicId', '==', topicId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const folders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Folder[];

    callback(folders);
  });
}
