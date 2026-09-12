// ===== Sitzplan DOM Utilities =====

export function $(id) {
  return document.getElementById(id);
}

export function escHtml(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function getAdjustedFontSize(text, containerWidth, baseSize) {
  // Approximate text width: 1 character is roughly 0.6 * fontSize
  const approxWidth = text.length * baseSize * 0.6;
  if (approxWidth > containerWidth - 10) {
    return Math.max(8, Math.floor((containerWidth - 10) / (text.length * 0.6)));
  }
  return baseSize;
}

