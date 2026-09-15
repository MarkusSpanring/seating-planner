// ===== Diet / Allergy Config Modal =====

import { PRESET_COLORS } from '../../core/constants.js';
import { state, saveAndRender } from '../../core/state.js';
import { $ } from '../../utils/dom.js';

export function renderDietModal() {
  const body = $('diet-modal-body');
  if (!body) return;
  body.innerHTML = '';

  state.dietOptions.forEach(d => {
    const item = document.createElement('div');
    item.className = 'diet-item';

    const isDefault = (d.id === 'none');

    if (isDefault) {
      const swatch = document.createElement('div');
      swatch.className = 'diet-swatch';
      swatch.style.backgroundColor = d.color;
      swatch.title = 'Standard (Keine Einschränkung)';
      item.appendChild(swatch);

      const name = document.createElement('span');
      name.className = 'diet-name';
      name.textContent = d.name;
      item.appendChild(name);

      const lockSpan = document.createElement('span');
      lockSpan.className = 'settings-item-badge-standard';
      lockSpan.textContent = 'Standard';
      item.appendChild(lockSpan);
    } else {
      const colorPicker = document.createElement('input');
      colorPicker.type = 'color';
      colorPicker.className = 'diet-swatch-picker';
      colorPicker.value = d.color;
      colorPicker.title = `Farbe für „${d.name}“ ändern`;
      colorPicker.addEventListener('click', e => { e.stopPropagation(); });
      colorPicker.addEventListener('input', () => {
        d.color = colorPicker.value;
        saveAndRender();
      });
      colorPicker.addEventListener('change', () => {
        d.color = colorPicker.value;
        saveAndRender();
      });
      item.appendChild(colorPicker);

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'settings-item-name-input';
      nameInput.value = d.name;
      nameInput.placeholder = 'Name der Diät / Allergie…';
      nameInput.title = 'Bezeichnung bearbeiten (wird überall automatisch aktualisiert)';

    let lastName = d.name;
    const commit = () => {
      const val = nameInput.value.trim();
      if (val && val !== lastName) {
        d.name = val;
        lastName = val;
        saveAndRender();
      } else if (!val) {
        nameInput.value = lastName;
      }
    };

    nameInput.addEventListener('input', () => {
      const val = nameInput.value.trim();
      if (val) d.name = val;
    });
    nameInput.addEventListener('blur', commit);
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        commit();
        nameInput.blur();
      } else if (e.key === 'Escape') {
        nameInput.value = lastName;
        d.name = lastName;
        nameInput.blur();
      }
    });
    item.appendChild(nameInput);

    if (d.id !== 'none') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-danger';
      btn.textContent = 'Entfernen';
      btn.title = 'Diese Diät-Option löschen';
      btn.addEventListener('click', () => {
        state.dietOptions = state.dietOptions.filter(x => x.id !== d.id);
        state.guests.forEach(g => {
          if (g.dietId === d.id) g.dietId = 'none';
        });
        saveAndRender();
        renderDietModal();
      });
      item.appendChild(btn);
    }
  }

  body.appendChild(item);
  });

  // Add new row
  const addRow = document.createElement('div');
  addRow.className = 'add-diet-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Neue Option (z.B. Laktosefrei)…';
  nameInput.title = 'Bezeichnung für neue Diät oder Allergie eingeben';
  nameInput.id = 'new-diet-name';
  addRow.appendChild(nameInput);

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  const nextColorIdx = Math.max(0, state.dietOptions.length - 1) % PRESET_COLORS.length;
  colorInput.value = PRESET_COLORS[nextColorIdx];
  colorInput.title = 'Farbe für diese Diät/Allergie auswählen';
  colorInput.id = 'new-diet-color';
  addRow.appendChild(colorInput);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-accent btn-sm';
  addBtn.textContent = 'Hinzufügen';
  addBtn.title = 'Neue Diät-Option hinzufügen';
  addBtn.addEventListener('click', addDiet);
  addRow.appendChild(addBtn);

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addDiet();
  });

  body.appendChild(addRow);
}

function addDiet() {
  const nameInput = $('new-diet-name');
  const colorInput = $('new-diet-color');
  if (!nameInput || !colorInput) return;
  const name = nameInput.value.trim();
  if (!name) return;
  const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  state.dietOptions.push({ id: id, name: name, color: colorInput.value });
  saveAndRender();
  renderDietModal();
}

export function openDietModal() {
  renderDietModal();
  const modal = $('diet-modal');
  if (modal) modal.style.display = '';
}

export function closeDietModal() {
  const modal = $('diet-modal');
  if (modal) modal.style.display = 'none';
}

function mountDietModal() {
  if ($('diet-modal')) return;
  const container = $('modal-container') || document.body;
  const tpl = document.createElement('div');
  tpl.innerHTML = `
    <div class="modal-overlay" id="diet-modal" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2>Diät / Allergie Optionen</h2>
          <button class="modal-close" id="diet-modal-close" title="Schließen">✕</button>
        </div>
        <div class="modal-body" id="diet-modal-body"></div>
      </div>
    </div>
  `;
  container.appendChild(tpl.firstElementChild);
}

export function initDietModal() {
  mountDietModal();
  const btn = $('btn-diets');
  if (btn) btn.addEventListener('click', openDietModal);

  const closeBtn = $('diet-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeDietModal);

  const modal = $('diet-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeDietModal();
    });
  }
}
