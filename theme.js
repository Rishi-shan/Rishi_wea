const settings = JSON.parse(localStorage.getItem("themeSettings") || "{}");
const preview = document.getElementById("theme-preview");
const displayFont = document.getElementById("display-font");
const bodyFont = document.getElementById("body-font");
const numberFont = document.getElementById("number-font");
const wallpaperInput = document.getElementById("wallpaper-input");
const wallpaperStatus = document.getElementById("wallpaper-status");
const themeStatus = document.getElementById("theme-status");
let selectedWallpaper = settings.wallpaper || "";

applyTimeTheme(new Date().getHours());
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").then(registration => registration.update()).catch(() => {});
}
displayFont.value = settings.displayFont || "pixel";
bodyFont.value = settings.bodyFont || "clean";
numberFont.value = settings.numberFont || "pixel";
applyPreviewFonts();
if (selectedWallpaper) {
  applyPreviewWallpaper(selectedWallpaper);
  wallpaperStatus.textContent = "Current wallpaper loaded";
}

displayFont.addEventListener("change", applyPreviewFonts);
bodyFont.addEventListener("change", applyPreviewFonts);
numberFont.addEventListener("change", applyPreviewFonts);
wallpaperInput.addEventListener("change", previewWallpaper);
document.getElementById("apply-theme").addEventListener("click", applyTheme);
document.getElementById("clear-wallpaper").addEventListener("click", clearWallpaper);

function applyTimeTheme(hour) {
  let timeOfDay = "night";
  if (hour >= 5 && hour < 11) timeOfDay = "morning";
  else if (hour >= 11 && hour < 17) timeOfDay = "day";
  else if (hour >= 17 && hour < 21) timeOfDay = "evening";
  document.body.dataset.timeOfDay = timeOfDay;
}

function applyPreviewFonts() {
  preview.dataset.displayFont = displayFont.value;
  preview.dataset.bodyFont = bodyFont.value;
  preview.dataset.numberFont = numberFont.value;
}

function previewWallpaper(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    wallpaperStatus.textContent = "Choose an image smaller than 5 MB";
    wallpaperInput.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = result => {
    selectedWallpaper = result.target.result;
    applyPreviewWallpaper(selectedWallpaper);
    wallpaperStatus.textContent = "New wallpaper previewed";
    themeStatus.textContent = "Preview updated. Apply when ready.";
  };
  reader.readAsDataURL(file);
}

function applyPreviewWallpaper(image) {
  preview.classList.add("has-wallpaper");
  preview.style.setProperty("--preview-wallpaper", `url(${JSON.stringify(image)})`);
}

function applyTheme() {
  localStorage.setItem("themeSettings", JSON.stringify({
    displayFont: displayFont.value,
    bodyFont: bodyFont.value,
    numberFont: numberFont.value,
    wallpaper: selectedWallpaper
  }));
  window.location.href = "index.html";
}

function clearWallpaper() {
  selectedWallpaper = "";
  preview.classList.remove("has-wallpaper");
  preview.style.removeProperty("--preview-wallpaper");
  wallpaperInput.value = "";
  wallpaperStatus.textContent = "Original background selected";
  themeStatus.textContent = "The original background will be used after applying.";
}
