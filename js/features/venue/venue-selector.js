// ===== Venue Selector Component =====

import { state, uiState, switchVenue, createVenue, renameVenue, deleteVenue } from '../../core/state.js';
import { events } from '../../core/events.js';
import { $, escHtml } from '../../utils/dom.js';
import { openVenueSizeModal } from './venue-size-modal.js';

let isDropdownOpen = false;

export function toggleVenueDropdown(forceState) {
  const menu = $('venue-dropdown-menu');
  const btn = $('btn-venue-dropdown');
  if (!menu || !btn) return;

  isDropdownOpen = (typeof forceState === 'boolean') ? forceState : !isDropdownOpen;
  menu.style.display = isDropdownOpen ? 'block' : 'none';
  btn.classList.toggle('open', isDropdownOpen);
}

export function updateVenueDisplay() {
  const currentName = state.venueName || uiState.activeVenue || 'Hauptsaal';
  const nameDisplay = $('venue-name-display');
  if (nameDisplay) {
    nameDisplay.textContent = currentName;
  }

  const venueTitle = $('venue-title');
  if (venueTitle) {
    venueTitle.textContent = 'Saalplan – ' + currentName;
  }
}

export function renderVenueSelector() {
  updateVenueDisplay();

  const listContainer = $('venue-dropdown-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  const active = state.venueName || uiState.activeVenue || 'Hauptsaal';
  const venues = uiState.venues || [];

  venues.forEach(v => {
    const isActive = (v.name === active);
    const item = document.createElement('button');
    item.className = 'venue-dropdown-item' + (isActive ? ' active' : '');

    const main = document.createElement('div');
    main.className = 'venue-item-main';

    const check = document.createElement('span');
    check.className = 'venue-item-check';
    check.textContent = isActive ? '✓' : '';
    main.appendChild(check);

    const name = document.createElement('span');
    name.className = 'venue-item-name';
    name.textContent = v.name;
    main.appendChild(name);

    item.appendChild(main);

    const meta = document.createElement('span');
    meta.className = 'venue-item-meta';
    meta.textContent = `${v.tableCount} T. · ${v.guestCount} G.`;
    item.appendChild(meta);

    item.title = isActive ? 'Aktuell geöffnete Venue' : `Zu Venue "${v.name}" wechseln`;

    item.addEventListener('click', () => {
      toggleVenueDropdown(false);
      if (!isActive) {
        switchVenue(v.name);
      }
    });

    listContainer.appendChild(item);
  });

  const delBtn = $('btn-venue-delete');
  if (delBtn) {
    delBtn.disabled = venues.length <= 1;
    delBtn.title = venues.length <= 1
      ? 'Die einzige verbleibende Venue kann nicht gelöscht werden'
      : 'Aktuelle Venue löschen';
  }
}

// ── Modals for Create & Rename ──

function mountVenueModals() {
  if ($('modal-venue-create')) return;
  const container = $('modal-container') || document.body;

  const tpl = document.createElement('div');
  tpl.innerHTML = `
    <!-- Create Venue Modal -->
    <div class="modal-overlay" id="modal-venue-create" style="display:none;">
      <div class="modal venue-dialog-modal">
        <div class="modal-header">
          <h2>Neue Venue erstellen</h2>
          <button class="modal-close" id="btn-modal-venue-create-close" title="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <div class="venue-dialog-field">
            <label for="input-venue-create-name">Name der Venue</label>
            <input type="text" id="input-venue-create-name" placeholder="z.B. Garten, Tenne, Variante B" class="searchable-picker-input" title="Name für die neue Venue eingeben">
          </div>
          <div class="venue-dialog-field">
            <label class="venue-dialog-checkbox-label" title="Gästeliste und Diäten in die neue Venue übernehmen (Sitzplatz-Zuweisungen werden zurückgesetzt)">
              <input type="checkbox" id="check-venue-create-copy-guests" checked title="Gästeliste und Diäten in die neue Venue übernehmen">
              <span>Gästeliste & Diäten aus aktueller Venue übernehmen (Plätze zurücksetzen)</span>
            </label>
          </div>
          <div style="display: flex; gap: 12px; margin-top: 12px;">
            <div class="venue-dialog-field" style="flex: 1;">
              <label for="input-venue-create-w">Breite (cm)</label>
              <input type="number" id="input-venue-create-w" value="1500" step="50" min="300" class="searchable-picker-input" title="Breite in Zentimetern (z.B. 1500 = 15m)">
            </div>
            <div class="venue-dialog-field" style="flex: 1;">
              <label for="input-venue-create-h">Länge / Tiefe (cm)</label>
              <input type="number" id="input-venue-create-h" value="1000" step="50" min="300" class="searchable-picker-input" title="Länge in Zentimetern (z.B. 1000 = 10m)">
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
            <button class="btn btn-sm" id="btn-modal-venue-create-cancel" title="Abbrechen und Schließen">Abbrechen</button>
            <button class="btn btn-accent btn-sm" id="btn-modal-venue-create-submit" title="Neue Venue anlegen und öffnen">Venue erstellen</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Rename Venue Modal -->
    <div class="modal-overlay" id="modal-venue-rename" style="display:none;">
      <div class="modal venue-dialog-modal">
        <div class="modal-header">
          <h2>Venue umbenennen</h2>
          <button class="modal-close" id="btn-modal-venue-rename-close" title="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <div class="venue-dialog-field">
            <label for="input-venue-rename-name">Neuer Name</label>
            <input type="text" id="input-venue-rename-name" placeholder="Neuer Name der Venue" class="searchable-picker-input" title="Neuen Namen für die Venue eingeben">
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
            <button class="btn btn-sm" id="btn-modal-venue-rename-cancel" title="Abbrechen und Schließen">Abbrechen</button>
            <button class="btn btn-accent btn-sm" id="btn-modal-venue-rename-submit" title="Venue umbenennen">Umbenennen</button>
          </div>
        </div>
      </div>
    </div>
  `;
  while (tpl.firstChild) {
    container.appendChild(tpl.firstChild);
  }
}

export function openCreateVenueModal() {
  toggleVenueDropdown(false);
  const input = $('input-venue-create-name');
  if (input) input.value = '';
  const check = $('check-venue-create-copy-guests');
  if (check) check.checked = true;
  const wInput = $('input-venue-create-w');
  if (wInput) wInput.value = '1500';
  const hInput = $('input-venue-create-h');
  if (hInput) hInput.value = '1000';
  const modal = $('modal-venue-create');
  if (modal) {
    modal.style.display = 'flex';
    if (input) setTimeout(() => input.focus(), 50);
  }
}

export function closeCreateVenueModal() {
  const modal = $('modal-venue-create');
  if (modal) modal.style.display = 'none';
}

export function openRenameVenueModal() {
  toggleVenueDropdown(false);
  const input = $('input-venue-rename-name');
  if (input) input.value = state.venueName || uiState.activeVenue || '';
  const modal = $('modal-venue-rename');
  if (modal) {
    modal.style.display = 'flex';
    if (input) setTimeout(() => input.focus(), 50);
  }
}

export function closeRenameVenueModal() {
  const modal = $('modal-venue-rename');
  if (modal) modal.style.display = 'none';
}

export function initVenueSelector() {
  mountVenueModals();

  const dropdownBtn = $('btn-venue-dropdown');
  if (dropdownBtn) {
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleVenueDropdown();
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const wrap = $('venue-selector-wrap');
    if (wrap && !wrap.contains(e.target)) {
      toggleVenueDropdown(false);
    }
  });

  // Action buttons
  const createBtn = $('btn-venue-create');
  if (createBtn) createBtn.addEventListener('click', openCreateVenueModal);

  const renameBtn = $('btn-venue-rename');
  if (renameBtn) renameBtn.addEventListener('click', openRenameVenueModal);

  const sizeDropdownBtn = $('btn-venue-size-dropdown');
  if (sizeDropdownBtn) {
    sizeDropdownBtn.addEventListener('click', () => {
      toggleVenueDropdown(false);
      openVenueSizeModal();
    });
  }

  const deleteBtn = $('btn-venue-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      toggleVenueDropdown(false);
      const current = state.venueName || uiState.activeVenue;
      if (!confirm(`Venue "${current}" wirklich unwiderruflich löschen?`)) return;
      deleteVenue(current);
    });
  }

  // Modal event listeners: Create
  $('btn-modal-venue-create-close').addEventListener('click', closeCreateVenueModal);
  $('btn-modal-venue-create-cancel').addEventListener('click', closeCreateVenueModal);
  $('modal-venue-create').addEventListener('click', (e) => {
    if (e.target === $('modal-venue-create')) closeCreateVenueModal();
  });
  $('btn-modal-venue-create-submit').addEventListener('click', () => {
    const name = $('input-venue-create-name').value.trim();
    if (!name) {
      $('input-venue-create-name').focus();
      return;
    }
    const copyGuests = $('check-venue-create-copy-guests').checked;
    const w = parseInt($('input-venue-create-w').value, 10) || 1500;
    const h = parseInt($('input-venue-create-h').value, 10) || 1000;
    closeCreateVenueModal();
    createVenue(name, copyGuests, w, h);
  });
  $('input-venue-create-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-modal-venue-create-submit').click();
    if (e.key === 'Escape') closeCreateVenueModal();
  });

  // Modal event listeners: Rename
  $('btn-modal-venue-rename-close').addEventListener('click', closeRenameVenueModal);
  $('btn-modal-venue-rename-cancel').addEventListener('click', closeRenameVenueModal);
  $('modal-venue-rename').addEventListener('click', (e) => {
    if (e.target === $('modal-venue-rename')) closeRenameVenueModal();
  });
  $('btn-modal-venue-rename-submit').addEventListener('click', () => {
    const newName = $('input-venue-rename-name').value.trim();
    if (!newName) {
      $('input-venue-rename-name').focus();
      return;
    }
    closeRenameVenueModal();
    renameVenue(newName);
  });
  $('input-venue-rename-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('btn-modal-venue-rename-submit').click();
    if (e.key === 'Escape') closeRenameVenueModal();
  });

  events.on('venues:updated', renderVenueSelector);
  events.on('state:loaded', renderVenueSelector);
}

