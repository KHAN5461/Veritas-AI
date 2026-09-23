import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export async function saveScanResult(userId: string, fileData: any, result: any, fileHash: string) {
  try {
    const scansRef = collection(db, `users/${userId}/scans`);
    
    // Create the document
    const docRef = await addDoc(scansRef, {
      createdAt: serverTimestamp(),
      fileName: fileData.name,
      fileType: fileData.type,
      fileSize: fileData.size,
      fileHash: fileHash,
      is_fake: result.is_fake,
      confidence: result.confidence,
      breakdown: result.breakdown,
      heatmap: result.heatmap || null,
      status: 'completed',
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error saving scan result: ", error);
    throw error;
  }
}

export async function getScanResult(userId: string, scanId: string) {
  try {
    const docRef = doc(db, `users/${userId}/scans`, scanId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting scan result: ", error);
    throw error;
  }
}

import { getDocs, query, orderBy } from 'firebase/firestore';

export async function getUserScans(userId: string) {
  try {
    const scansRef = collection(db, `users/${userId}/scans`);
    const q = query(scansRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const scans: any[] = [];
    querySnapshot.forEach((doc) => {
      scans.push({ id: doc.id, ...doc.data() });
    });
    return scans;
  } catch (error) {
    console.error("Error getting user scans: ", error);
    throw error;
  }
}
