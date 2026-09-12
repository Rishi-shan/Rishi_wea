applyTimeTheme(new Date().getHours());
applySavedTheme();
registerAppWorker();

function readStorageJSON(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key} from storage.`, error);
    return fallback;
  }
}

function applySavedTheme() {
  const settings = readStorageJSON("themeSettings", {});
  applyFontSettings(
    settings.displayFont || "pixel",
    settings.bodyFont || "clean",
    settings.numberFont || "pixel"
  );
  if (settings.wallpaper) {
    applyWallpaper(settings.wallpaper);
  }
}

function applyFontSettings(displayFont, bodyFont, numberFont) {
  document.body.dataset.displayFont = displayFont;
  document.body.dataset.bodyFont = bodyFont;
  document.body.dataset.numberFont = numberFont;
}

function applyWallpaper(image) {
  document.body.classList.add("custom-wallpaper");
  document.body.style.setProperty("--wallpaper-image", `url(${JSON.stringify(image)})`);
}

function registerAppWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") {
    return;
  }

  navigator.serviceWorker.register("sw.js").then(registration => {
    registration.update();
  }).catch(error => console.warn("App worker unavailable", error));
}

async function fetchWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current_weather=true` +
    `&hourly=relativehumidity_2m,visibility,pressure_msl,apparent_temperature` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
    `&forecast_days=10` +
    `&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
    const data = await res.json();

    if (!data.current_weather || !data.hourly || !data.daily) {
      throw new Error("Weather response is incomplete");
    }

    updateUI(data);
    renderForecast(data.daily);
    renderMoon(lat, lon, data.timezone, data.utc_offset_seconds);
    fetchAirQuality(lat, lon, data.current_weather.time);
  } catch (error) {
    console.error(error);
    document.getElementById("city").dataset.error = "true";
    document.getElementById("city").title = "Weather could not be updated. Please refresh and try again.";
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && selected) fetchWeather(selected.latitude, selected.longitude);
});

setInterval(() => {
  if (!document.hidden && selected) fetchWeather(selected.latitude, selected.longitude);
}, 15 * 60 * 1000);

async function fetchAirQuality(lat, lon, currentTime) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Air quality request failed: ${res.status}`);
    const data = await res.json();
    if (!data.hourly || !data.hourly.time || !data.hourly.us_aqi) throw new Error("Air quality response is incomplete");
    updateAirUI(data, currentTime);
  } catch (error) {
    console.error(error);
    document.getElementById("aqi-label").innerText = "Unavailable";
  }
}

function updateAirUI(data, currentTime) {
  const currentIndex = findCurrentHourIndex(data.hourly.time, currentTime);
  const aqi = data.hourly.us_aqi[currentIndex];
  document.getElementById("aqi").innerText = aqi;

  let label = "Good";
  if (aqi > 50) label = "Moderate";
  if (aqi > 100) label = "Unhealthy";

  document.getElementById("aqi-label").innerText = label;
}

let selected = null;
try {
  selected = readStorageJSON("selectedCity", null);
} catch (error) {
  localStorage.removeItem("selectedCity");
  selected = null;
}

function renderSavedCities(currentCity) {
  const container = document.getElementById("saved-cities");
  const cities = readStorageJSON("cities", []);
  const locations = cities.slice();

  if (currentCity && !locations.some(city => city.id === currentCity.id)) {
    locations.unshift(currentCity);
  }

  if (locations.length === 0) {
    container.innerHTML = '<a class="saved-empty" href="location.html">Add a country or city to start your list <span aria-hidden="true">＋</span></a>';
    return;
  }

  container.innerHTML = "";
  locations.forEach(city => {
    const button = document.createElement("button");
    button.className = "saved-city";
    button.type = "button";
    if (currentCity && city.id === currentCity.id) button.classList.add("is-current");
    button.innerHTML = `<span class="saved-city-mark" aria-hidden="true">◉</span><span><strong>${city.name}</strong><small>${city.country || "Local forecast"}</small></span>`;
    button.onclick = () => {
      localStorage.setItem("selectedCity", JSON.stringify(city));
      location.reload();
    };
    container.appendChild(button);
  });
}

renderSavedCities(selected);

if (selected) {
  document.getElementById("city").innerText = `${selected.name}, ${selected.country}`;
  fetchWeather(selected.latitude, selected.longitude);
} else if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById("city").innerText = "My location";
      fetchWeather(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      document.getElementById("city").innerText = "Choose a city to see the forecast";
    }
  );
} else {
  document.getElementById("city").innerText = "Choose a city to see the forecast";
}


function updateUI(data) {
  const currentTime = data.current_weather.time;
  const currentIndex = findCurrentHourIndex(data.hourly.time, currentTime);
  const localHour = Number(currentTime.slice(11, 13));
  applyTimeTheme(localHour);
  document.getElementById("temp").innerText = data.current_weather.temperature;
  document.getElementById("feels").innerText = data.hourly.apparent_temperature[currentIndex];
  document.getElementById("wind").innerText = data.current_weather.windspeed;
  document.getElementById("humidity").innerText = data.hourly.relativehumidity_2m[currentIndex];
  document.getElementById("pressure").innerText = data.hourly.pressure_msl[currentIndex];
  document.getElementById("visibility").innerText = (data.hourly.visibility[currentIndex] / 1000).toFixed(1);

}

function findCurrentHourIndex(times, currentTime) {
  const currentHour = currentTime.slice(0, 13);
  const index = times.findIndex(time => time.slice(0, 13) === currentHour);
  return index >= 0 ? index : 0;
}

function applyTimeTheme(hour) {
  let timeOfDay = "night";

  if (hour >= 5 && hour < 11) timeOfDay = "morning";
  else if (hour >= 11 && hour < 17) timeOfDay = "day";
  else if (hour >= 17 && hour < 21) timeOfDay = "evening";

  document.body.dataset.timeOfDay = timeOfDay;
}

function renderMoon(latitude, longitude, timezone, utcOffsetSeconds) {
  if (typeof SunCalc === "undefined") return;

  const now = new Date();
  const moonPosition = SunCalc.getMoonPosition(now, latitude, longitude);
  const moonIllumination = SunCalc.getMoonIllumination(now);
  const moonTimes = getLocalMoonTimes(now, latitude, longitude, utcOffsetSeconds);
  const altitude = moonPosition.altitude * 180 / Math.PI;
  const azimuth = (moonPosition.azimuth * 180 / Math.PI + 180 + 360) % 360;
  const illumination = Math.round(moonIllumination.fraction * 100);
  const visibleTonight = isMoonVisibleTonight(now, moonTimes, altitude);

  document.getElementById("moon-phase").textContent = getMoonPhaseIcon(moonIllumination.phase);
  document.getElementById("moon-icon").textContent = getMoonPhaseIcon(moonIllumination.phase);
  document.getElementById("moon-visibility").textContent = visibleTonight ? "Visible tonight" : "Not visible tonight";
  document.getElementById("moon-illumination").textContent = `${illumination}%`;
  document.getElementById("moon-position").textContent = getCompassDirection(azimuth);
  document.getElementById("moon-altitude").textContent = `${Math.round(altitude)}° above horizon`;
  document.getElementById("moon-visibility").title = `Moonrise: ${formatMoonTime(moonTimes.rise, timezone)} · Moonset: ${formatMoonTime(moonTimes.set, timezone)}`;
}

function getLocalMoonTimes(now, latitude, longitude, utcOffsetSeconds) {
  const localNow = new Date(now.getTime() + utcOffsetSeconds * 1000);
  const localDate = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()));
  return SunCalc.getMoonTimes(localDate, latitude, longitude, true);
}

function isMoonVisibleTonight(now, moonTimes, altitude) {
  if (altitude > 0) return true;
  const rise = moonTimes.rise?.getTime() || 0;
  const set = moonTimes.set?.getTime() || 0;
  return (rise > now.getTime() && (!set || rise < set)) || (set > now.getTime() && altitude > -6);
}

function formatMoonTime(time, timezone) {
  if (!time) return "not set";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(time);
}

function getCompassDirection(degrees) {
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(degrees / 45) % 8];
}

function getMoonPhaseIcon(phase) {
  if (phase < 0.0625 || phase >= 0.9375) return "●";
  if (phase < 0.1875) return "◔";
  if (phase < 0.3125) return "◑";
  if (phase < 0.4375) return "◒";
  if (phase < 0.5625) return "○";
  if (phase < 0.6875) return "◓";
  if (phase < 0.8125) return "◐";
  return "◕";
}

function renderForecast(daily) {
  const container = document.getElementById("forecast-list");
  container.innerHTML = "";

  daily.time.forEach((date, i) => {
    const day = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
    const div = document.createElement("div");
    div.className = "day";
    div.innerHTML = `
      <div>${day}</div>
      <div>${getIcon(daily.weathercode[i])}</div>
      <div>${daily.temperature_2m_max[i]}°</div>
      <small>${daily.temperature_2m_min[i]}°</small>
    `;
    container.appendChild(div);
  });
}

function getIcon(code) {
  if (code < 3) return "☀️";
  if (code < 50) return "☁️";
  if (code < 70) return "🌧";
  if (code < 80) return "❄️";
  return "⛈";
}
