const list = document.getElementById("list");
const searchResults = document.getElementById("searchResults");
const searchStatus = document.getElementById("searchStatus");
let cities = JSON.parse(localStorage.getItem("cities")) || [];

applyTimeTheme(new Date().getHours());
applySavedTheme();

render();

function applySavedTheme() {
  const settings = JSON.parse(localStorage.getItem("themeSettings") || "{}");
  if (settings.displayFont) document.body.dataset.displayFont = settings.displayFont;
  if (settings.bodyFont) document.body.dataset.bodyFont = settings.bodyFont;
  if (settings.wallpaper) {
    document.body.classList.add("custom-wallpaper");
    document.body.style.setProperty("--wallpaper-image", `url(${JSON.stringify(settings.wallpaper)})`);
  }
}

function applyTimeTheme(hour) {
  let timeOfDay = "night";

  if (hour >= 5 && hour < 11) timeOfDay = "morning";
  else if (hour >= 11 && hour < 17) timeOfDay = "day";
  else if (hour >= 17 && hour < 21) timeOfDay = "evening";

  document.body.dataset.timeOfDay = timeOfDay;
}

async function addCity() {
  const input = document.getElementById("cityInput");
  const name = input.value.trim();
  if (!name) {
    searchStatus.textContent = "Enter a city name to search worldwide.";
    return;
  }

  searchStatus.textContent = "Searching worldwide...";
  searchResults.innerHTML = "";

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      searchStatus.textContent = "No cities found. Try a broader search.";
      return;
    }

    searchStatus.textContent = `${data.results.length} matching cities found`;
    data.results.forEach(renderSearchResult);
  } catch (error) {
    searchStatus.textContent = "Could not search right now. Check your connection and try again.";
  }
}

function renderSearchResult(city) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.className = "city-result";
  button.type = "button";
  button.innerHTML = `<strong>${city.name}</strong><small>${city.country || ""}${city.admin1 ? ` · ${city.admin1}` : ""}</small>`;
  button.onclick = () => selectCity(city);
  item.appendChild(button);
  searchResults.appendChild(item);
}

function render() {
  list.innerHTML = "";
  cities.forEach((c, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${c.name}</strong><small>${c.country || ""}${c.admin1 ? ` · ${c.admin1}` : ""}</small>`;
    li.onclick = () => selectCity(c);
    list.appendChild(li);
  });
}

function selectCity(city) {
  if (!cities.some(savedCity => savedCity.id === city.id)) {
    cities.push(city);
    localStorage.setItem("cities", JSON.stringify(cities));
  }
  localStorage.setItem("selectedCity", JSON.stringify(city));
  location.href = "index.html";
}
