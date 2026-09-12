// ===== Add Guest Modal & CSV Import =====

import { state, saveAndRender } from '../../core/state.js';
import { $ } from '../../utils/dom.js';

export function handleCSVImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    const lines = evt.target.result.split('\n').map(l => l.trim()).filter(Boolean);
    let count = 0;
    lines.forEach((line, idx) => {
      const parts = line.split(',').map(s => s.trim());
      const firstName = parts[0] || '';
      const lastName = parts[1] || '';
      const highChairCol = (parts[2] || '').trim().toLowerCase();

      if (firstName || lastName) {
        state.guests.push({
          id: 'g-' + Date.now() + '-' + idx + '-' + count,
          firstName: firstName,
          lastName: lastName,
          needsHighChair: highChairCol === 'yes' || highChairCol === 'true',
          dietId: 'none',
          tableId: null,
          seatNumber: null,
        });
        count++;
      }
    });

    saveAndRender();
  };
  reader.readAsText(file);
  e.target.value = '';
}

export function openAddGuestModal() {
  $('add-guest-first').value = '';
  $('add-guest-last').value = '';
  $('add-guest-hc').checked = false;

  const dietSelect = $('add-guest-diet');
  dietSelect.innerHTML = '';
  state.dietOptions.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    if (d.id === 'none') opt.selected = true;
    dietSelect.appendChild(opt);
  });

  $('add-guest-modal').style.display = 'flex';
  setTimeout(() => {
    $('add-guest-first').focus();
  }, 50);
}

export function closeAddGuestModal() {
  $('add-guest-modal').style.display = 'none';
}

export function saveNewGuest() {
  const newId = 'g-' + Date.now();
  state.guests.push({
    id: newId,
    firstName: $('add-guest-first').value.trim(),
    lastName: $('add-guest-last').value.trim(),
    dietId: $('add-guest-diet').value || 'none',
    needsHighChair: $('add-guest-hc').checked,
    tableId: null,
    seatNumber: null,
  });
  closeAddGuestModal();
  saveAndRender();
}

function mountAddGuestModal() {
  if ($('add-guest-modal')) return;
  const container = $('modal-container') || document.body;
  const tpl = document.createElement('div');
  tpl.innerHTML = `
    <div class="modal-overlay" id="add-guest-modal" style="display:none">
      <div class="modal" style="width: 360px;">
        <div class="modal-header">
          <h2>Neuen Gast hinzufügen</h2>
          <button class="modal-close" id="add-guest-close" title="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div style="flex: 1;">
              <label style="display:block; margin-bottom: 6px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Vorname</label>
              <input type="text" id="add-guest-first" class="searchable-picker-input" style="width: 100%; padding: 8px 12px; margin: 0; box-sizing: border-box;" placeholder="Vorname" title="Vorname des neuen Gastes" />
            </div>
            <div style="flex: 1;">
              <label style="display:block; margin-bottom: 6px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Nachname</label>
              <input type="text" id="add-guest-last" class="searchable-picker-input" style="width: 100%; padding: 8px 12px; margin: 0; box-sizing: border-box;" placeholder="Nachname" title="Nachname des neuen Gastes" />
            </div>
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display:block; margin-bottom: 6px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Diät / Allergie</label>
            <select id="add-guest-diet" class="inline-diet-select" style="width: 100%; max-width: none; border: 1px solid var(--border-color); background: var(--bg-card); padding: 8px 12px; border-radius: 4px; color: #fff; outline: none; box-sizing: border-box;" title="Diät oder Allergie für den Gast auswählen">
            </select>
          </div>
          <div style="margin-bottom: 24px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; color: var(--text-primary);" title="Markieren, falls ein Hochstuhl benötigt wird">
              <input type="checkbox" id="add-guest-hc" style="margin: 0; cursor: pointer;" title="Markieren, falls ein Hochstuhl benötigt wird"> Benötigt Hochstuhl
            </label>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button class="btn btn-sm" id="add-guest-cancel" title="Abbrechen und Eingaben verwerfen">Abbrechen</button>
            <button class="btn btn-sm btn-accent" id="add-guest-save" title="Gast speichern und zur Gästeliste hinzufügen">Gast hinzufügen</button>
          </div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(tpl.firstElementChild);
}

export function initAddGuestModal() {
  mountAddGuestModal();
  const addBtn = $('btn-add-guest');
  if (addBtn) addBtn.addEventListener('click', openAddGuestModal);

  const closeBtn = $('add-guest-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAddGuestModal);

  const cancelBtn = $('add-guest-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', closeAddGuestModal);

  const saveBtn = $('add-guest-save');
  if (saveBtn) saveBtn.addEventListener('click', saveNewGuest);

  const modal = $('add-guest-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeAddGuestModal();
    });
  }

  const importBtn = $('btn-import');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      $('csv-input').click();
    });
  }

  const csvInput = $('csv-input');
  if (csvInput) {
    csvInput.addEventListener('change', handleCSVImport);
  }
}
