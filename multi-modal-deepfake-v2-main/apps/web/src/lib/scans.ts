import { db, storage } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import type { ForensicResult } from './api';

export async function saveScanResult(userId: string, fileData: { name: string; type: string; size: number; }, result: ForensicResult, fileHash: string) {
  try {
    const scansRef = collection(db, `users/${userId}/scans`);
    
    // Instead of stripping heatmaps >600KB, upload them to Firebase Storage
    let heatmapUrl: string | null = null;
    
    if (result.heatmap) {
      try {
        let blob: Blob;
        if (result.heatmap.startsWith('blob:') || result.heatmap.startsWith('http')) {
          // It's already a blob URL from our memory optimization, fetch the blob
          const response = await fetch(result.heatmap);
          blob = await response.blob();
        } else {
          // Fallback if it's still raw base64
          const byteCharacters = atob(result.heatmap);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          blob = new Blob([byteArray], { type: 'image/png' });
        }

        // Upload to Storage
        const imageId = crypto.randomUUID();
        const storageRef = ref(storage, `users/${userId}/heatmaps/${imageId}.png`);
        await uploadBytes(storageRef, blob);
        heatmapUrl = await getDownloadURL(storageRef);
      } catch (uploadError) {
        console.warn('Failed to upload heatmap to storage, falling back to null', uploadError);
        heatmapUrl = null;
      }
    }

    // Create the document with the Storage URL instead of raw base64
    const docRef = await addDoc(scansRef, {
      createdAt: serverTimestamp(),
      fileName: fileData.name,
      fileType: fileData.type,
      fileSize: fileData.size,
      fileHash: fileHash,
      is_fake: result.is_fake,
      confidence: result.confidence,
      breakdown: result.breakdown,
      heatmap: heatmapUrl, // Safe 100 byte URL instead of 3MB string
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
    const scans: Record<string, unknown>[] = [];
    querySnapshot.forEach((doc) => {
      scans.push({ id: doc.id, ...doc.data() });
    });
    return scans;
  } catch (error) {
    console.error("Error getting user scans: ", error);
    throw error;
  }
}
