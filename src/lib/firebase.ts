import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate that required variables are present and not empty
const missingVars: string[] = [];
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.trim() === '') {
  missingVars.push('VITE_FIREBASE_API_KEY');
}
if (!firebaseConfig.authDomain || firebaseConfig.authDomain.trim() === '') {
  missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
}
if (!firebaseConfig.projectId || firebaseConfig.projectId.trim() === '') {
  missingVars.push('VITE_FIREBASE_PROJECT_ID');
}

if (missingVars.length > 0) {
  const errorMessage = `
❌ Missing or empty Firebase environment variables: ${missingVars.join(', ')}

Please create a .env file in the project root (project/.env) with these variables:

VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

Get these values from: https://console.firebase.google.com/
Go to Project Settings > General > Your apps > Web app config
`;
  console.error(errorMessage);
  throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
}

// Validate config format
if (!firebaseConfig.authDomain.includes('.firebaseapp.com') && !firebaseConfig.authDomain.includes('.web.app')) {
  console.warn('Warning: authDomain should end with .firebaseapp.com or .web.app');
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  console.log('✅ Firebase initialized successfully');
} catch (error: any) {
  console.error('❌ Firebase initialization error:', error);
  throw new Error(
    `Firebase initialization failed: ${error.message}\n` +
    `Please check your Firebase configuration in .env file.`
  );
}

export { auth, db };

