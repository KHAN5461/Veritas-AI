import { db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export async function saveScanResult(userId: string, fileData: any, result: any, fileHash: string) {
  try {
    const scansRef = collection(db, `users/${userId}/scans`);
    
    // Ensure document does not exceed Firestore 1MB hard limit (e.g. 3.3MB base64 heatmaps)
    let safeHeatmap: string | null = null;
    if (result.heatmap && typeof result.heatmap === 'string' && result.heatmap.length < 600000) {
      safeHeatmap = result.heatmap;
    }

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
      heatmap: safeHeatmap,
      status: 'completed',
    });
    
    return docRef.id;
  } catch (error) {
    console.warn("Could not save scan result to Firestore: ", error);
    return null;
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
