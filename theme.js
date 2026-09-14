const settings = readThemeSettings();
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

function readThemeSettings() {
  try {
    const value = localStorage.getItem("themeSettings");
    const settings = value ? JSON.parse(value) : {};
    return settings && typeof settings === "object" ? settings : {};
  } catch (error) {
    console.warn("Could not read saved theme settings.", error);
    return {};
  }
}

function applyPreviewFonts() {
  preview.dataset.displayFont = displayFont.value;
  preview.dataset.bodyFont = bodyFont.value;
  preview.dataset.numberFont = numberFont.value;
}

function previewWallpaper(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    wallpaperStatus.textContent = "Choose a supported image file";
    wallpaperInput.value = "";
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    wallpaperStatus.textContent = "Choose an image smaller than 15 MB";
    wallpaperInput.value = "";
    return;
  }

  wallpaperStatus.textContent = "Preparing image preview...";
  const reader = new FileReader();
  reader.onload = () => {
    compressWallpaper(reader.result)
      .then(image => {
        selectedWallpaper = image;
        previewPan = { x: 0, y: 0 };
        wallpaperZoom.value = "1";
        applyPreviewWallpaper(selectedWallpaper);
        wallpaperStatus.textContent = "New wallpaper previewed";
        themeStatus.textContent = "Preview updated. Apply when ready.";
      })
      .catch(error => {
        console.error("Could not prepare wallpaper.", error);
        wallpaperStatus.textContent = "This image could not be previewed";
        themeStatus.textContent = "Try another image format or file.";
        wallpaperInput.value = "";
      });
  };
  reader.onerror = () => {
    wallpaperStatus.textContent = "The image could not be read";
    themeStatus.textContent = "Try selecting the image again.";
    wallpaperInput.value = "";
  };
  reader.onabort = reader.onerror;
  reader.readAsDataURL(file);
}

function compressWallpaper(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxDimension = 2400;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas is unavailable"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => reject(new Error("Image decoding failed"));
    image.src = dataUrl;
  });
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

async function applyTheme() {
  const originalLabel = document.getElementById("apply-theme").textContent;
  const applyButton = document.getElementById("apply-theme");

  applyButton.disabled = true;
  applyButton.textContent = "Saving image...";

  try {
    const wallpaper = selectedWallpaper
      ? await createWallpaperCrop(selectedWallpaper)
      : "";

    localStorage.setItem("themeSettings", JSON.stringify({
      displayFont: displayFont.value,
      bodyFont: bodyFont.value,
      numberFont: numberFont.value,
      wallpaper
    }));
    window.location.href = "index.html";
  } catch (error) {
    console.error("Could not save theme settings.", error);
    themeStatus.textContent = "Image is too large to save. Choose another image.";
    applyButton.disabled = false;
    applyButton.textContent = originalLabel;
  }
}

function createWallpaperCrop(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const width = preview.clientWidth;
      const height = preview.clientHeight;
      const coverScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      const scale = coverScale * Number(wallpaperZoom.value);
      const sourceWidth = width / scale;
      const sourceHeight = height / scale;
      const sourceX = image.naturalWidth / 2 - previewPan.x / scale - sourceWidth / 2;
      const sourceY = image.naturalHeight / 2 - previewPan.y / scale - sourceHeight / 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas is unavailable"));
        return;
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      );
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => reject(new Error("Image decoding failed"));
    image.src = dataUrl;
  });
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
