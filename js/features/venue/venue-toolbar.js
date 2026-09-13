// ===== Venue Toolbar Controls =====

import { uiState } from '../../core/state.js';
import { $ } from '../../utils/dom.js';
import { renderBlueprintButtons } from '../blueprint-builder/blueprint-modal.js';

let renderGuestListCallback = null;

export function registerGuestListRenderer(cb) {
  renderGuestListCallback = cb;
}

export function toggleVenue() {
  uiState.venueCollapsed = !uiState.venueCollapsed;
  const venuePanel = $('venue-panel');
  const toggleBtn = $('btn-toggle-venue');
  const toggleIcon = $('venue-toggle-icon');
  const toggleLabel = $('venue-toggle-label');
  const guestPanel = document.querySelector('.guest-panel');

  if (uiState.venueCollapsed) {
    if (venuePanel) venuePanel.classList.add('venue-collapsed');
    if (toggleIcon) toggleIcon.textContent = '▶';
    if (toggleLabel) toggleLabel.textContent = 'Venue einblenden';
    if (toggleBtn) {
      toggleBtn.classList.add('btn-accent');
      toggleBtn.style.color = '#fff';
      toggleBtn.style.backgroundColor = '';
      toggleBtn.style.borderColor = '';
      toggleBtn.title = 'Saalplan wieder einblenden';
    }
    if (guestPanel) guestPanel.classList.add('guest-panel-expanded');

    const fInput = $('guest-filter-input');
    if (fInput) fInput.style.display = 'inline-block';
    const addBtn = $('btn-add-guest');
    if (addBtn) addBtn.style.display = 'block';
    const importBtn = $('btn-import');
    if (importBtn) importBtn.style.display = 'inline-block';
    const agesBtn = $('btn-ages');
    if (agesBtn) agesBtn.style.display = 'inline-block';
    const dietsBtn = $('btn-diets');
    if (dietsBtn) dietsBtn.style.display = 'inline-block';
    const exBtn = $('btn-expand-all');
    if (exBtn) exBtn.style.display = 'none';
  } else {
    if (venuePanel) venuePanel.classList.remove('venue-collapsed');
    if (toggleIcon) toggleIcon.textContent = '◀';
    if (toggleLabel) toggleLabel.textContent = 'Venue ausblenden';
    if (toggleBtn) {
      toggleBtn.classList.remove('btn-accent');
      toggleBtn.style.color = 'var(--text-primary)';
      toggleBtn.style.backgroundColor = 'var(--bg-glass)';
      toggleBtn.style.borderColor = 'var(--border-color)';
      toggleBtn.title = 'Saalplan ausblenden (Vollbild-Tabelle)';
    }
    if (guestPanel) guestPanel.classList.remove('guest-panel-expanded');
    const fInput = $('guest-filter-input');
    if (fInput) {
      fInput.style.display = 'none';
      fInput.value = '';
    }
    const addBtn = $('btn-add-guest');
    if (addBtn) addBtn.style.display = 'none';
    const importBtn = $('btn-import');
    if (importBtn) importBtn.style.display = 'none';
    const agesBtn = $('btn-ages');
    if (agesBtn) agesBtn.style.display = 'none';
    const dietsBtn = $('btn-diets');
    if (dietsBtn) dietsBtn.style.display = 'none';
    const exBtn = $('btn-expand-all');
    if (exBtn) {
      exBtn.style.display = 'inline-flex';
      exBtn.textContent = '⬇ Alle ausklappen';
      uiState.allGroupsExpanded = false;
    }
  }

  if (renderGuestListCallback) {
    renderGuestListCallback();
  }
}

export function initVenueToolbar() {
  const toggleBtn = $('btn-toggle-venue');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleVenue);

  renderBlueprintButtons();
}

