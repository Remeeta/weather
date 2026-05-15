// ============================================================
//  firebase-config.js  –  AtmosAI Firebase Integration
//  Replace the firebaseConfig values with your own project keys
//  from https://console.firebase.google.com
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── YOUR FIREBASE CONFIG ─────────────────────────────────
// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ── INIT ─────────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ── AUTH HELPERS ─────────────────────────────────────────

/** Sign in with Google popup */
async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error("Google sign-in error:", err);
    throw err;
  }
}

/** Sign out current user */
async function signOutUser() {
  await signOut(auth);
}

/** Subscribe to auth state changes */
function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── FIRESTORE HELPERS ─────────────────────────────────────

/** Ensure user document exists */
async function ensureUserDoc(uid, displayName, email) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName,
      email,
      favourites: [],
      recentSearches: []
    });
  }
}

/** Get user data (favourites + recents) */
async function getUserData(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : { favourites: [], recentSearches: [] };
}

/** Add city to favourites */
async function addFavourite(uid, city) {
  await updateDoc(doc(db, "users", uid), {
    favourites: arrayUnion(city)
  });
}

/** Remove city from favourites */
async function removeFavourite(uid, city) {
  await updateDoc(doc(db, "users", uid), {
    favourites: arrayRemove(city)
  });
}

/** Prepend city to recent searches (keep last 8) */
async function addRecentSearch(uid, city) {
  const data = await getUserData(uid);
  // Deduplicate and cap at 8
  const updated = [city, ...(data.recentSearches || []).filter(c => c !== city)].slice(0, 8);
  await updateDoc(doc(db, "users", uid), { recentSearches: updated });
}

// ── EXPORTS ───────────────────────────────────────────────
export {
  auth, db,
  signInWithGoogle, signOutUser, onAuthChange,
  ensureUserDoc, getUserData,
  addFavourite, removeFavourite, addRecentSearch
};
