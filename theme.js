const settings = JSON.parse(localStorage.getItem("themeSettings") || "{}");
const preview = document.getElementById("theme-preview");
const displayFont = document.getElementById("display-font");
const bodyFont = document.getElementById("body-font");
const numberFont = document.getElementById("number-font");
const wallpaperInput = document.getElementById("wallpaper-input");
const wallpaperStatus = document.getElementById("wallpaper-status");
const wallpaperZoom = document.getElementById("wallpaper-zoom");
const wallpaperZoomValue = document.getElementById("wallpaper-zoom-value");
const themeStatus = document.getElementById("theme-status");
let selectedWallpaper = settings.wallpaper || "";
let previewPan = { x: 0, y: 0 };
let dragStart = null;

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
wallpaperZoom.addEventListener("input", updatePreviewCrop);
preview.addEventListener("pointerdown", startPreviewDrag);
preview.addEventListener("pointermove", movePreviewDrag);
preview.addEventListener("pointerup", stopPreviewDrag);
preview.addEventListener("pointercancel", stopPreviewDrag);
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
  updatePreviewCrop();
}

function updatePreviewCrop() {
  const zoom = Number(wallpaperZoom.value);
  const bounds = getPanBounds(zoom);
  previewPan.x = Math.max(-bounds.x, Math.min(bounds.x, previewPan.x));
  previewPan.y = Math.max(-bounds.y, Math.min(bounds.y, previewPan.y));
  preview.style.setProperty("--preview-zoom", zoom);
  preview.style.setProperty("--preview-pan-x", `${previewPan.x}px`);
  preview.style.setProperty("--preview-pan-y", `${previewPan.y}px`);
  wallpaperZoomValue.textContent = `${Math.round(zoom * 100)}%`;
}

function getPanBounds(zoom) {
  return {
    x: preview.clientWidth * (zoom - 1) / 2,
    y: preview.clientHeight * (zoom - 1) / 2
  };
}

function startPreviewDrag(event) {
  if (!preview.classList.contains("has-wallpaper") || Number(wallpaperZoom.value) === 1) return;
  dragStart = { x: event.clientX, y: event.clientY, panX: previewPan.x, panY: previewPan.y };
  preview.setPointerCapture(event.pointerId);
  preview.classList.add("is-dragging");
}

function movePreviewDrag(event) {
  if (!dragStart) return;
  const bounds = getPanBounds(Number(wallpaperZoom.value));
  previewPan.x = dragStart.panX + event.clientX - dragStart.x;
  previewPan.y = dragStart.panY + event.clientY - dragStart.y;
  previewPan.x = Math.max(-bounds.x, Math.min(bounds.x, previewPan.x));
  previewPan.y = Math.max(-bounds.y, Math.min(bounds.y, previewPan.y));
  updatePreviewCrop();
}

function stopPreviewDrag(event) {
  if (!dragStart) return;
  if (event.pointerId !== undefined && preview.hasPointerCapture(event.pointerId)) {
    preview.releasePointerCapture(event.pointerId);
  }
  dragStart = null;
  preview.classList.remove("is-dragging");
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
  previewPan = { x: 0, y: 0 };
  wallpaperZoom.value = "1";
  preview.classList.remove("has-wallpaper");
  preview.style.removeProperty("--preview-wallpaper");
  updatePreviewCrop();
  wallpaperInput.value = "";
  wallpaperStatus.textContent = "Original background selected";
  themeStatus.textContent = "The original background will be used after applying.";
}
