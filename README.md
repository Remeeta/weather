# 🌤 AtmosAI – Premium Weather Web App

A futuristic glassmorphism weather application built with **HTML5, CSS3, and Vanilla JavaScript** — powered by OpenWeatherMap and Firebase.

## ✨ Features

- **Real-time weather** — temperature, humidity, wind, pressure, visibility, feels like
- **GPS auto-detect** with graceful fallback to London
- **City search** with live geocoded suggestions
- **24-hour hourly forecast** with precipitation probability
- **7-day daily forecast**
- **Sunrise/Sunset** animated SVG arc showing sun position in real time
- **Air Quality Index** (Good → Very Poor)
- **UV Index** (via OneCall 3.0)
- **Weather alerts** banner
- **Canvas particle animations** — rain, snow, lightning
- **Lottie animated icons** — dynamically match current conditions
- **Dark / Light theme** toggle (persisted in localStorage)
- **°C / °F** unit toggle (persisted)
- **Firebase Google Sign-In**
- **Favourite cities** saved to Firestore
- **Recent search history** — Firestore (signed in) or localStorage (guest)
- Fully **responsive** — mobile, tablet, desktop

---

## 🚀 Quick Start

### 1. Get a Free OpenWeatherMap API Key
1. Sign up at https://openweathermap.org/api
2. Go to **API Keys** and copy your key
3. Open `script.js` and replace line 10:

```js
const OWM_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';
```

### 2. Run a Local Server

> ⚠️ **Important:** This app uses ES Modules — it must be served over HTTP, not opened directly as a file.

**Option A – Node.js (recommended):**
```powershell
cd c:\dev\myweather
npx -y serve .
```
Open → http://localhost:3000

**Option B – VS Code:**
Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension → right-click `index.html` → **Open with Live Server**

**Option C – Python:**
```powershell
python -m http.server 8080
```
Open → http://localhost:8080

---

## 🔥 Firebase Setup (Optional)

Required only for Google Sign-In, Favourite Cities, and cross-device search history sync.

1. Go to https://console.firebase.google.com → Create project
2. Enable **Authentication** → Google sign-in
3. Enable **Firestore Database** → Start in test mode
4. Go to **Project Settings** → Your apps → Add Web App → copy config
5. Paste into `firebase-config.js`:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📁 File Structure

```
myweather/
├── index.html          ← App shell & semantic structure
├── style.css           ← Glassmorphism UI, animations, responsive layout
├── script.js           ← Weather logic, canvas particle FX, Firebase UI
└── firebase-config.js  ← Firebase Auth + Firestore helpers
```

---

## 🌐 API Reference

| API | Endpoint | Tier |
|---|---|---|
| Current Weather | `/data/2.5/weather` | Free |
| 5-day Forecast (3h) | `/data/2.5/forecast` | Free |
| Air Pollution | `/data/2.5/air_pollution` | Free |
| Geocoding | `/geo/1.0/direct` | Free |
| OneCall 3.0 (UV, alerts) | `/data/3.0/onecall` | Paid subscription |

---

## 🎨 Customisation

| What | Where |
|---|---|
| Accent colour | `--accent` in `:root` in `style.css` |
| Fallback city | `useFallback()` in `script.js` |
| Particle count | `createParticles()` → `count` in `script.js` |
| Lottie icons | `LOTTIE_URLS` map in `script.js` |
| Recent history limit | `.slice(0, 8)` in `script.js` |
