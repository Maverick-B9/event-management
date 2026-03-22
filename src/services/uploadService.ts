import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/firebase";

export async function uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
}

export async function uploadStudentFile(studentId: string, file: File): Promise<string> {
    const path = `submissions/${studentId}/${Date.now()}_${file.name}`;
    return uploadFile(file, path);
}

export async function uploadLogo(type: string, file: File): Promise<string> {
    const path = `logos/${type}_${Date.now()}_${file.name}`;
    return uploadFile(file, path);
}
