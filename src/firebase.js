import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCd2pkQmQr7D8yNEOVmFp8Q3dRRHeJvCqo",
    authDomain: "rode-map-347ad.firebaseapp.com",
    projectId: "rode-map-347ad",
    storageBucket: "rode-map-347ad.firebasestorage.app",
    messagingSenderId: "1034465302863",
    appId: "1:1034465302863:web:84dc2eba6e2029a295cd3a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
