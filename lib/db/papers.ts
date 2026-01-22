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
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Paper {
  id: string;
  folderId: string;  // Changed from topicId
  paperNumber: number;
  
  // 서지 정보
  keywords: string;
  author: string;
  year: number;
  title: string;
  publisher: string;
  subject: string;
  
  // 연구 설계
  purposes: string[];
  isQualitative: boolean;
  isQuantitative: boolean;
  
  // 질적 연구
  qualTools: string[];
  
  // 양적 연구
  varsIndependent: string[];
  varsDependent: string[];
  varsModerator: string[];
  varsMediator: string[];
  varsOthers: string[];
  quantTechniques: string[];
  
  // 연구 결과
  results: string[];
  limitations: string[];
  implications: string[];
  futurePlans: string[];
  
  // 파일 관리
  googleDriveFileId: string;
  googleDriveFolderId: string;
  pdfUrl: string;
  
  // 메타
  userNotes: string;
  tags: string[];
  isRead: boolean;
  importance: number;
  createdAt: Date;
  updatedAt: Date;
  lastAnalyzedAt?: Date;
}

/**
 * Check if paper already exists (duplicate check by title)
 */
export async function checkDuplicate(
  userId: string,
  title: string
): Promise<boolean> {
  const papersRef = collection(db, 'users', userId, 'papers');
  const q = query(papersRef, where('title', '==', title), limit(1));
  
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get next paper number
 */
async function getNextPaperNumber(userId: string): Promise<number> {
  const papersRef = collection(db, 'users', userId, 'papers');
  const q = query(papersRef, orderBy('paperNumber', 'desc'), limit(1));
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return 1;
  }
  
  const lastPaper = snapshot.docs[0].data();
  return (lastPaper.paperNumber || 0) + 1;
}

/**
 * Create a new paper
 */
export async function createPaper(
  userId: string,
  data: Omit<Paper, 'id' | 'paperNumber' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const papersRef = collection(db, 'users', userId, 'papers');
  
  const paperNumber = await getNextPaperNumber(userId);
  
  const docRef = await addDoc(papersRef, {
    ...data,
    paperNumber,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastAnalyzedAt: Timestamp.now(),
  });

  return docRef.id;
}

/**
 * Update paper
 */
export async function updatePaper(
  userId: string,
  paperId: string,
  data: Partial<Omit<Paper, 'id' | 'createdAt' | 'paperNumber'>>
): Promise<void> {
  const paperRef = doc(db, 'users', userId, 'papers', paperId);
  
  await updateDoc(paperRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete paper
 */
export async function deletePaper(
  userId: string,
  paperId: string
): Promise<void> {
  const paperRef = doc(db, 'users', userId, 'papers', paperId);
  await deleteDoc(paperRef);
}

/**
 * Get single paper
 */
export async function getPaper(
  userId: string,
  paperId: string
): Promise<Paper | null> {
  const paperRef = doc(db, 'users', userId, 'papers', paperId);
  const docSnap = await getDoc(paperRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt.toDate(),
    updatedAt: docSnap.data().updatedAt.toDate(),
    lastAnalyzedAt: docSnap.data().lastAnalyzedAt?.toDate(),
  } as Paper;
}

/**
 * Subscribe to papers by folder (realtime)
 */
export function subscribeToPapers(
  userId: string,
  folderId: string | null,
  sortBy: 'date' | 'name' = 'date',
  callback: (papers: Paper[]) => void
): () => void {
  const papersRef = collection(db, 'users', userId, 'papers');
  
  let q;
  if (folderId) {
    q = query(
      papersRef,
      where('folderId', '==', folderId),
      orderBy(sortBy === 'date' ? 'createdAt' : 'title', sortBy === 'date' ? 'desc' : 'asc')
    );
  } else {
    q = query(
      papersRef,
      orderBy(sortBy === 'date' ? 'createdAt' : 'title', sortBy === 'date' ? 'desc' : 'asc')
    );
  }

  return onSnapshot(q, (snapshot) => {
    const papers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastAnalyzedAt: doc.data().lastAnalyzedAt?.toDate(),
    })) as Paper[];

    callback(papers);
  });
}
