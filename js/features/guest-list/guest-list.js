// ===== Guest List Coordinator =====

import { state, uiState } from '../../core/state.js';
import { $ } from '../../utils/dom.js';
import { seatedCount, totalSeatCapacity } from '../../utils/seating.js';
import { registerGuestListRenderer } from '../venue/venue-toolbar.js';
import { renderSplitView } from './split-view.js';
import { renderTableView } from './table-view.js';
import { initAddGuestModal } from './add-guest-modal.js';

export function updateStats() {
  const seated = seatedCount();
  const total = state.guests.length;
  const capacity = totalSeatCapacity();
  const el = $('stats-badge');
  if (el) {
    el.innerHTML = '<strong>' + seated + '</strong> / ' + total + ' platziert · ' + capacity + ' Plätze gesamt';
  }
}

export function renderGuestList() {
  updateStats();
  const panel = $('guest-list');
  if (!panel) return;
  panel.innerHTML = '';

  if (state.guests.length === 0) {
    panel.innerHTML =
      '<div class="empty-state">' +
      '<p>Noch keine Gäste</p>' +
      '<button class="btn btn-accent" id="btn-import-empty" title="Gästeliste aus einer CSV-Datei importieren">Gästeliste importieren</button>' +
      '</div>';
    const emptyBtn = $('btn-import-empty');
    if (emptyBtn) {
      emptyBtn.addEventListener('click', () => {
        $('csv-input').click();
      });
    }
    return;
  }

  if (uiState.venueCollapsed) {
    renderTableView(panel);
  } else {
    renderSplitView(panel, renderGuestList);
  }
}

export function initGuestList() {
  initAddGuestModal();
  registerGuestListRenderer(renderGuestList);

  const filterInput = $('guest-filter-input');
  if (filterInput) {
    filterInput.addEventListener('input', () => {
      renderGuestList();
    });
  }

  const expandBtn = $('btn-expand-all');
  if (expandBtn) {
    expandBtn.title = 'Alle Tischgruppen ausklappen';
    expandBtn.addEventListener('click', () => {
      if (!uiState.allGroupsExpanded) {
        state.tables.forEach(t => {
          uiState.collapsedGroups['table-' + t.id] = false;
        });
        uiState.collapsedGroups['unassigned'] = false;
        uiState.allGroupsExpanded = true;
        expandBtn.textContent = '⬆ Fixierte einklappen';
        expandBtn.title = 'Fixierte Tische wieder einklappen (Standardansicht)';
      } else {
        state.tables.forEach(t => {
          delete uiState.collapsedGroups['table-' + t.id];
        });
        delete uiState.collapsedGroups['unassigned'];
        uiState.allGroupsExpanded = false;
        expandBtn.textContent = '⬇ Alle ausklappen';
        expandBtn.title = 'Alle Tischgruppen ausklappen';
      }
      renderGuestList();
    });
  }
}

