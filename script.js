// ============================================================
//  script.js – AtmosAI Weather App
// ============================================================
import {
  signInWithGoogle, signOutUser, onAuthChange,
  ensureUserDoc, getUserData, addFavourite, removeFavourite, addRecentSearch
} from './firebase-config.js';

// ── CONFIG ───────────────────────────────────────────────
// 🔑 Replace with your key from https://openweathermap.org/api
const OWM_KEY = '4d760858ebf17423fae0faae8ea701e4';
const OWM_BASE = 'https://api.openweathermap.org';
const API_READY = OWM_KEY !== 'YOUR_OPENWEATHERMAP_API_KEY';

// ── STATE ─────────────────────────────────────────────────
const state = {
  unit: 'metric',   // 'metric' | 'imperial'
  theme: 'dark',
  user: null,
  currentCity: '',
  currentLat: null,
  currentLon: null,
  favourites: [],
  recentSearches: [],
};

// ── DOM REFS ──────────────────────────────────────────────
const $ = id => document.getElementById(id);
const loadingScreen   = $('loading-screen');
const appEl           = $('app');
const searchInput     = $('search-input');
const searchBtn       = $('search-btn');
const suggestions     = $('search-suggestions');
const locationBtn     = $('location-btn');
const unitToggle      = $('unit-toggle');
const themeToggle     = $('theme-toggle');
const authBtn         = $('auth-btn');
const authModal       = $('auth-modal');
const closeAuthModal  = $('close-auth-modal');
const googleSigninBtn = $('google-signin-btn');
const guestBtn        = $('guest-btn');
const userAvatarWrap  = $('user-avatar-wrap');
const userAvatar      = $('user-avatar');
const userDropdown    = $('user-dropdown');
const userNameDisplay = $('user-name-display');
const signoutBtn      = $('signout-btn');
const addFavBtn       = $('add-fav-btn');
const clearHistoryBtn = $('clear-history-btn');
const toast           = $('toast');
const toastMsg        = $('toast-msg');

// ── LOTTIE ANIMATIONS MAP ────────────────────────────────
const LOTTIE_URLS = {
  clear:   'https://assets5.lottiefiles.com/packages/lf20_xlmz9xwm.json',
  clouds:  'https://assets5.lottiefiles.com/packages/lf20_kUmHdl.json',
  rain:    'https://assets5.lottiefiles.com/packages/lf20_bd9hbd.json',
  drizzle: 'https://assets5.lottiefiles.com/packages/lf20_bd9hbd.json',
  thunder: 'https://assets5.lottiefiles.com/packages/lf20_nkga1c2z.json',
  snow:    'https://assets5.lottiefiles.com/packages/lf20_ixzanmsa.json',
  mist:    'https://assets5.lottiefiles.com/packages/lf20_kUmHdl.json',
  default: 'https://assets5.lottiefiles.com/packages/lf20_xlmz9xwm.json',
};

let lottieMain = null;

function getLottieKey(condition) {
  const c = condition.toLowerCase();
  if (c.includes('thunder')) return 'thunder';
  if (c.includes('drizzle')) return 'drizzle';
  if (c.includes('rain'))    return 'rain';
  if (c.includes('snow'))    return 'snow';
  if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return 'mist';
  if (c.includes('cloud'))   return 'clouds';
  if (c.includes('clear'))   return 'clear';
  return 'default';
}

function loadLottie(condition) {
  const key = getLottieKey(condition);
  const container = $('lottie-main');
  container.innerHTML = '';
  if (lottieMain) { try { lottieMain.destroy(); } catch(e) {} }
  lottieMain = lottie.loadAnimation({
    container,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: LOTTIE_URLS[key] || LOTTIE_URLS.default,
  });
}

// ── CANVAS WEATHER FX ────────────────────────────────────
const canvas = $('weather-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animFrame = null;
let weatherFxType = 'none';

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createParticles(type) {
  particles = [];
  if (type === 'none') return;
  const count = type === 'snow' ? 120 : type === 'rain' ? 200 : 60;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: type === 'snow' ? Math.random() * 4 + 1 : Math.random() * 1.5 + 0.5,
      speed: type === 'rain' ? Math.random() * 14 + 6 : Math.random() * 2 + 0.5,
      wind: type === 'rain' ? Math.random() * 2 : Math.random() * 0.5 - 0.25,
      opacity: Math.random() * 0.6 + 0.2,
    });
  }
}

function drawParticles(type) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (type === 'rain') {
    particles.forEach(p => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(147,197,253,${p.opacity})`;
      ctx.lineWidth = p.r;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.wind * 2, p.y + 15);
      ctx.stroke();
      p.y += p.speed; p.x += p.wind;
      if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
    });
  } else if (type === 'snow') {
    particles.forEach(p => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(224,242,254,${p.opacity})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      p.y += p.speed; p.x += p.wind;
      if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
    });
  } else if (type === 'thunder') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (Math.random() < 0.015) {
      ctx.fillStyle = 'rgba(167,139,250,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    particles.forEach(p => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(147,197,253,${p.opacity})`;
      ctx.lineWidth = p.r;
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.wind * 2, p.y + 15);
      ctx.stroke();
      p.y += p.speed; p.x += p.wind;
      if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
    });
  }
}

function startWeatherFx(type) {
  weatherFxType = type;
  if (animFrame) cancelAnimationFrame(animFrame);
  createParticles(type);
  if (type === 'none') { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
  function loop() { drawParticles(type); animFrame = requestAnimationFrame(loop); }
  loop();
}

function setWeatherFx(condition) {
  const c = condition.toLowerCase();
  document.body.dataset.weather = getLottieKey(c);
  if (c.includes('thunder')) return startWeatherFx('thunder');
  if (c.includes('rain') || c.includes('drizzle')) return startWeatherFx('rain');
  if (c.includes('snow')) return startWeatherFx('snow');
  startWeatherFx('none');
}

// ── UNIT HELPERS ─────────────────────────────────────────
const toF = c => Math.round(c * 9/5 + 32);
function dispTemp(celsius) {
  const v = state.unit === 'metric' ? Math.round(celsius) : toF(celsius);
  return `${v}°${state.unit === 'metric' ? 'C' : 'F'}`;
}
function dispWind(ms) {
  return state.unit === 'metric'
    ? `${Math.round(ms)} m/s`
    : `${Math.round(ms * 2.237)} mph`;
}

// ── DATE / TIME ───────────────────────────────────────────
// unix = UTC epoch seconds, tz = city timezone offset in seconds
function formatTime(unix, tz = 0) {
  // Build a UTC date shifted by the city's timezone offset
  const localMs = (unix + tz) * 1000;
  const d = new Date(localMs);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function formatDay(unix) {
  return new Date(unix * 1000).toLocaleDateString('en-US', { weekday: 'short' });
}
function updateClock(tz) {
  const tick = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const local = new Date(utc + tz * 1000);
    $('current-time').textContent = local.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    $('current-date').textContent = local.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };
  tick();
  if (window._clockInterval) clearInterval(window._clockInterval);
  window._clockInterval = setInterval(tick, 1000);
}

// ── WEATHER ICON (OWM code → emoji fallback) ─────────────
function owmIconUrl(icon) { return `https://openweathermap.org/img/wn/${icon}@2x.png`; }

// ── API CALLS ─────────────────────────────────────────────
async function fetchCurrentWeather(lat, lon) {
  const res = await fetch(`${OWM_BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OWM_KEY}`);
  if (!res.ok) throw new Error('Failed to fetch current weather');
  return res.json();
}

async function fetchForecast(lat, lon) {
  const res = await fetch(`${OWM_BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=56&appid=${OWM_KEY}`);
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}

async function fetchAirQuality(lat, lon) {
  const res = await fetch(`${OWM_BASE}/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OWM_KEY}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchOneCall(lat, lon) {
  const res = await fetch(`${OWM_BASE}/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely&appid=${OWM_KEY}`);
  if (!res.ok) return null;
  return res.json();
}

async function geocodeCity(city) {
  const res = await fetch(`${OWM_BASE}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=5&appid=${OWM_KEY}`);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  if (!data.length) throw new Error(`City "${city}" not found`);
  return data;
}

// ── AQI LABEL ─────────────────────────────────────────────
function aqiLabel(aqi) {
  return ['','Good','Fair','Moderate','Poor','Very Poor'][aqi] || '—';
}

// ── SUN ARC ───────────────────────────────────────────────
function updateSunArc(sunrise, sunset, tz) {
  const now = Math.floor(Date.now() / 1000) + (new Date().getTimezoneOffset() * 60) + tz;
  const total = sunset - sunrise;
  const elapsed = Math.min(Math.max(now - sunrise, 0), total);
  const pct = elapsed / total;
  const arcLen = 220;
  $('sun-arc-fill').style.strokeDashoffset = arcLen - pct * arcLen;
  const angle = Math.PI * pct;
  const cx = 10 + 180 * pct;
  const cy = 90 - Math.sin(angle) * 90;
  $('sun-dot').setAttribute('cx', cx);
  $('sun-dot').setAttribute('cy', cy);
}

// ── RENDER UI ─────────────────────────────────────────────
function renderCurrent(data) {
  const { name, sys, main, weather, wind, visibility, timezone } = data;
  state.currentCity = `${name}, ${sys.country}`;
  $('city-name').textContent   = name;
  $('country-code').textContent = sys.country;
  $('current-temp').textContent = dispTemp(main.temp);
  $('feels-like').textContent   = `Feels like ${dispTemp(main.feels_like)}`;
  $('weather-desc').textContent = weather[0].description;
  $('val-humidity').textContent  = `${main.humidity}%`;
  $('val-wind').textContent      = dispWind(wind.speed);
  $('val-pressure').textContent  = `${main.pressure} hPa`;
  $('val-visibility').textContent = visibility ? `${(visibility / 1000).toFixed(1)} km` : '—';
  $('val-sunrise').textContent   = formatTime(sys.sunrise, timezone);
  $('val-sunset').textContent    = formatTime(sys.sunset, timezone);
  loadLottie(weather[0].main);
  setWeatherFx(weather[0].main);
  updateClock(timezone);
  updateSunArc(sys.sunrise, sys.sunset, timezone);
}

function renderAQI(data) {
  if (!data) return;
  const aqi = data.list[0].main.aqi;
  $('val-aqi').textContent = aqiLabel(aqi);
}

function renderUV(uv) {
  $('val-uv').textContent = uv !== undefined ? uv.toFixed(1) : '—';
}

function renderAlerts(alerts) {
  const banner = $('alerts-banner');
  if (alerts && alerts.length) {
    $('alert-text').textContent = alerts[0].event;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function renderHourly(list) {
  const container = $('hourly-scroll');
  container.innerHTML = '';
  const now = Date.now() / 1000;
  list.filter(h => h.dt > now).slice(0, 24).forEach((h, i) => {
    const div = document.createElement('div');
    div.className = 'hourly-item' + (i === 0 ? ' active' : '');
    const time = formatTime(h.dt);
    const pop  = h.pop ? `${Math.round(h.pop * 100)}%` : '';
    div.innerHTML = `
      <span class="hourly-time">${i === 0 ? 'Now' : time}</span>
      <img class="hourly-icon" src="${owmIconUrl(h.weather[0].icon)}" alt="${h.weather[0].description}" loading="lazy"/>
      <span class="hourly-temp">${dispTemp(h.main.temp)}</span>
      ${pop ? `<span class="hourly-pop">💧 ${pop}</span>` : ''}`;
    container.appendChild(div);
  });
}

function renderDaily(list) {
  const container = $('daily-list');
  container.innerHTML = '';
  const days = {};
  list.forEach(h => {
    const day = formatDay(h.dt);
    if (!days[day]) days[day] = { hi: -Infinity, lo: Infinity, icon: h.weather[0].icon, desc: h.weather[0].description };
    if (h.main.temp_max > days[day].hi) days[day].hi = h.main.temp_max;
    if (h.main.temp_min < days[day].lo) days[day].lo = h.main.temp_min;
  });
  Object.entries(days).slice(0, 7).forEach(([day, d]) => {
    const div = document.createElement('div');
    div.className = 'daily-item';
    div.innerHTML = `
      <span class="daily-day">${day}</span>
      <img class="daily-icon" src="${owmIconUrl(d.icon)}" alt="${d.desc}" loading="lazy"/>
      <span class="daily-desc">${d.desc}</span>
      <div class="daily-temps">
        <span class="daily-high">${dispTemp(d.hi)}</span>
        <span class="daily-low">${dispTemp(d.lo)}</span>
      </div>`;
    container.appendChild(div);
  });
}

// ── MAIN FETCH & RENDER ───────────────────────────────────
async function loadWeather(lat, lon) {
  if (!API_READY) { showToast('⚠️ Add your OpenWeatherMap API key in script.js'); return; }
  state.currentLat = lat;
  state.currentLon = lon;
  try {
    const [current, forecast, aqi, onecall] = await Promise.allSettled([
      fetchCurrentWeather(lat, lon),
      fetchForecast(lat, lon),
      fetchAirQuality(lat, lon),
      fetchOneCall(lat, lon),
    ]);
    if (current.status === 'fulfilled')  renderCurrent(current.value);
    if (forecast.status === 'fulfilled') { renderHourly(forecast.value.list); renderDaily(forecast.value.list); }
    if (aqi.status === 'fulfilled')      renderAQI(aqi.value);
    if (onecall.status === 'fulfilled' && onecall.value) {
      renderUV(onecall.value.current?.uvi);
      renderAlerts(onecall.value.alerts);
    }
    // Save recent search for signed-in users (Firestore) or guests (localStorage)
    if (state.currentCity) {
      if (state.user) {
        await addRecentSearch(state.user.uid, state.currentCity).catch(() => {});
        await syncUserData();
      } else {
        const prev = JSON.parse(localStorage.getItem('atmos-recent') || '[]');
        const updated = [state.currentCity, ...prev.filter(c => c !== state.currentCity)].slice(0, 8);
        localStorage.setItem('atmos-recent', JSON.stringify(updated));
        renderRecent();
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to load weather data');
  }
}

async function searchCity(query) {
  if (!query.trim()) return;
  try {
    const results = await geocodeCity(query);
    const { lat, lon } = results[0];
    state.currentCity = `${results[0].name}, ${results[0].country}`;
    searchInput.value = '';
    suggestions.classList.add('hidden');
    await loadWeather(lat, lon);
  } catch (err) {
    showToast(err.message);
  }
}

// ── SEARCH SUGGESTIONS ────────────────────────────────────
let suggestTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(suggestTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { suggestions.classList.add('hidden'); return; }
  suggestTimer = setTimeout(async () => {
    try {
      const results = await geocodeCity(q);
      suggestions.innerHTML = '';
      results.forEach(r => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${r.name}, ${r.country}`;
        div.addEventListener('click', () => {
          searchInput.value = `${r.name}, ${r.country}`;
          suggestions.classList.add('hidden');
          loadWeather(r.lat, r.lon);
        });
        suggestions.appendChild(div);
      });
      suggestions.classList.remove('hidden');
    } catch { suggestions.classList.add('hidden'); }
  }, 400);
});

document.addEventListener('click', e => {
  if (!e.target.closest('#search-wrapper')) suggestions.classList.add('hidden');
});

searchBtn.addEventListener('click', () => searchCity(searchInput.value));
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchCity(searchInput.value); });

// ── GEOLOCATION ───────────────────────────────────────────
function getLocation() {
  if (!navigator.geolocation) { showToast('Geolocation not supported'); useFallback(); return; }
  navigator.geolocation.getCurrentPosition(
    pos => loadWeather(pos.coords.latitude, pos.coords.longitude),
    _   => { showToast('Location denied – showing London', 'info'); useFallback(); }
  );
}
function useFallback() { loadWeather(51.5074, -0.1278); } // London fallback
locationBtn.addEventListener('click', getLocation);

// ── UNIT TOGGLE ───────────────────────────────────────────
unitToggle.addEventListener('click', () => {
  state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
  unitToggle.textContent = state.unit === 'metric' ? '°C' : '°F';
  if (state.currentLat) loadWeather(state.currentLat, state.currentLon);
});

// ── THEME TOGGLE ──────────────────────────────────────────
themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('theme-light', state.theme === 'light');
  document.body.classList.toggle('theme-dark',  state.theme === 'dark');
  themeToggle.innerHTML = state.theme === 'dark'
    ? '<i class="fa-solid fa-moon"></i>'
    : '<i class="fa-solid fa-sun"></i>';
  localStorage.setItem('atmos-theme', state.theme);
});

// ── FAVOURITES ────────────────────────────────────────────
function renderFavourites() {
  const container = $('fav-list');
  container.innerHTML = '';
  if (!state.user) { container.innerHTML = '<p class="empty-state">Sign in to save favourites</p>'; return; }
  if (!state.favourites.length) { container.innerHTML = '<p class="empty-state">No favourites yet</p>'; return; }
  state.favourites.forEach(city => {
    const div = document.createElement('div');
    div.className = 'fav-item';
    div.innerHTML = `
      <div class="fav-item-left"><i class="fa-solid fa-heart"></i><span>${city}</span></div>
      <button class="fav-remove" data-city="${city}" title="Remove"><i class="fa-solid fa-xmark"></i></button>`;
    div.querySelector('.fav-item-left').addEventListener('click', () => searchCity(city));
    div.querySelector('.fav-remove').addEventListener('click', async e => {
      e.stopPropagation();
      await removeFavourite(state.user.uid, city);
      state.favourites = state.favourites.filter(c => c !== city);
      renderFavourites();
    });
    container.appendChild(div);
  });
}

addFavBtn.addEventListener('click', async () => {
  if (!state.user) { authModal.classList.remove('hidden'); return; }
  if (!state.currentCity) return;
  if (state.favourites.includes(state.currentCity)) { showToast('Already in favourites', 'info'); return; }
  await addFavourite(state.user.uid, state.currentCity);
  state.favourites.push(state.currentCity);
  renderFavourites();
  showToast(`${state.currentCity} added to favourites`, 'success');
});

// ── RECENT SEARCHES ───────────────────────────────────────
function renderRecent() {
  const container = $('recent-list');
  container.innerHTML = '';
  const list = state.user ? state.recentSearches : JSON.parse(localStorage.getItem('atmos-recent') || '[]');
  if (!list.length) { container.innerHTML = '<p class="empty-state">No recent searches</p>'; return; }
  list.forEach(city => {
    const div = document.createElement('div');
    div.className = 'recent-item';
    div.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i><span>${city}</span>`;
    div.addEventListener('click', () => searchCity(city));
    container.appendChild(div);
  });
}

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem('atmos-recent');
  state.recentSearches = [];
  renderRecent();
});

// ── FIREBASE AUTH ─────────────────────────────────────────
authBtn.addEventListener('click', () => authModal.classList.remove('hidden'));
closeAuthModal.addEventListener('click', () => authModal.classList.add('hidden'));
guestBtn.addEventListener('click', () => authModal.classList.add('hidden'));

googleSigninBtn.addEventListener('click', async () => {
  try {
    const user = await signInWithGoogle();
    authModal.classList.add('hidden');
    showToast(`Welcome, ${user.displayName}!`, 'success');
  } catch(e) { showToast('Sign-in failed: ' + e.message); }
});

signoutBtn.addEventListener('click', async () => {
  await signOutUser();
  userDropdown.classList.add('hidden');
  showToast('Signed out', 'info');
});

userAvatar.addEventListener('click', () => userDropdown.classList.toggle('hidden'));
document.addEventListener('click', e => {
  if (!e.target.closest('#user-avatar-wrap')) userDropdown.classList.add('hidden');
});

async function syncUserData() {
  if (!state.user) return;
  try {
    const data = await getUserData(state.user.uid);
    state.favourites     = data.favourites     || [];
    state.recentSearches = data.recentSearches || [];
    renderFavourites();
    renderRecent();
  } catch(e) { console.warn('Firestore sync failed:', e); }
}

onAuthChange(async user => {
  state.user = user;
  if (user) {
    authBtn.classList.add('hidden');
    userAvatarWrap.classList.remove('hidden');
    userAvatar.src = user.photoURL || '';
    userNameDisplay.textContent = user.displayName || user.email;
    await ensureUserDoc(user.uid, user.displayName, user.email).catch(() => {});
    await syncUserData();
  } else {
    authBtn.classList.remove('hidden');
    userAvatarWrap.classList.add('hidden');
    state.favourites = [];
    state.recentSearches = [];
    renderFavourites();
    renderRecent();
  }
});

// ── TOAST ─────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'error') {
  toastMsg.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ── INIT ──────────────────────────────────────────────────
function init() {
  // Restore theme
  const savedTheme = localStorage.getItem('atmos-theme') || 'dark';
  state.theme = savedTheme;
  document.body.classList.toggle('theme-light', savedTheme === 'light');
  document.body.classList.toggle('theme-dark',  savedTheme === 'dark');
  themeToggle.innerHTML = savedTheme === 'dark'
    ? '<i class="fa-solid fa-moon"></i>'
    : '<i class="fa-solid fa-sun"></i>';

  // Restore unit preference
  const savedUnit = localStorage.getItem('atmos-unit');
  if (savedUnit) {
    state.unit = savedUnit;
    unitToggle.textContent = savedUnit === 'metric' ? '°C' : '°F';
  }

  // Render guest recents from localStorage on startup
  renderRecent();

  // Warn if API key not set
  if (!API_READY) {
    loadingScreen.classList.add('fade-out');
    appEl.classList.remove('hidden');
    showToast('⚠️ Add your OpenWeatherMap API key in script.js', 'error');
    return;
  }

  // Start loading weather
  getLocation();
  setTimeout(() => {
    loadingScreen.classList.add('fade-out');
    appEl.classList.remove('hidden');
  }, 2000);
}

// Persist unit preference
unitToggle.addEventListener('click', () => {
  localStorage.setItem('atmos-unit', state.unit);
}, { capture: true });

init();