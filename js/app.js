// ===== Sitzplan Main Bootstrap & Coordinator =====

import { uiState, loadState, registerStateChangeListener } from './core/state.js';
import { getTable } from './utils/seating.js';
import { renderVenue } from './features/venue/venue-canvas.js';
import { initVenueToolbar } from './features/venue/venue-toolbar.js';
import { renderGuestList, initGuestList } from './features/guest-list/guest-list.js';
import {
  initTableDetailModal,
  updateTableDetailModalVisuals,
  renderTableDetailGuests
} from './features/table-detail/table-detail-modal.js';
import { renderTableDetailSVG } from './features/table-detail/table-detail-svg.js';
import { initBlueprintBuilder, renderBlueprintButtons } from './features/blueprint-builder/blueprint-modal.js';
import { initDietModal } from './features/config-modals/diet-modal.js';
import { initAgeModal } from './features/config-modals/age-modal.js';
import { initPrintManager } from './features/print/print-manager.js';
import { initVenueSelector } from './features/venue/venue-selector.js';
import { initVenueSizeControls } from './features/venue/venue-size-modal.js';

export function renderAll() {
  renderVenue();
  renderGuestList();
  renderBlueprintButtons();
  if (uiState.currentEditingTableId) {
    const tbl = getTable(uiState.currentEditingTableId);
    if (tbl) {
      updateTableDetailModalVisuals(tbl);
      renderTableDetailSVG(tbl.id);
      renderTableDetailGuests(tbl.id);
    }
  }
}

// ── State Observer Registration ──
registerStateChangeListener(renderAll);

// ── Application Initialization ──
function init() {
  // Initialize features & DOM listeners
  initVenueSelector();
  initVenueSizeControls();
  initDietModal();
  initAgeModal();
  initBlueprintBuilder();
  initTableDetailModal();
  initGuestList();
  initVenueToolbar();
  initPrintManager();

  // Load backend state and initial render
  loadState(() => {
    renderAll();
  });
}

// ── Bootstrap app execution ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
