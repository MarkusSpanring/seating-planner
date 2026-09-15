// ===== Age Groups Config Modal =====

import { state, saveAndRender } from '../../core/state.js';
import { $ } from '../../utils/dom.js';

export function renderAgeModal() {
  const body = $('age-modal-body');
  if (!body) return;
  body.innerHTML = '';

  state.ageGroups.forEach(a => {
    const item = document.createElement('div');
    item.className = 'diet-item';
    item.style.gridTemplateColumns = '1fr auto';

    const isDefault = (a.id === 'age-adult');

    if (isDefault) {
      const name = document.createElement('span');
      name.className = 'diet-name';
      name.textContent = a.name;
      item.appendChild(name);

      const lockSpan = document.createElement('span');
      lockSpan.className = 'settings-item-badge-standard';
      lockSpan.textContent = 'Standard';
      item.appendChild(lockSpan);
    } else {
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'settings-item-name-input';
      nameInput.value = a.name;
      nameInput.placeholder = 'Name der Altersgruppe…';
      nameInput.title = 'Bezeichnung bearbeiten (wird überall automatisch aktualisiert)';

      let lastName = a.name;
      const commit = () => {
        const val = nameInput.value.trim();
        if (val && val !== lastName) {
          a.name = val;
          lastName = val;
          saveAndRender();
        } else if (!val) {
          nameInput.value = lastName;
        }
      };

      nameInput.addEventListener('input', () => {
        const val = nameInput.value.trim();
        if (val) a.name = val;
      });
      nameInput.addEventListener('blur', commit);
      nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          commit();
          nameInput.blur();
        } else if (e.key === 'Escape') {
          nameInput.value = lastName;
          a.name = lastName;
          nameInput.blur();
        }
      });
      item.appendChild(nameInput);

      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-danger';
      btn.textContent = 'Entfernen';
      btn.title = 'Diese Altersgruppe löschen';
      btn.addEventListener('click', () => {
        state.ageGroups = state.ageGroups.filter(x => x.id !== a.id);
        state.guests.forEach(g => {
          if (g.age === a.id) g.age = 'age-adult';
        });
        saveAndRender();
        renderAgeModal();
      });
      item.appendChild(btn);
    }

    body.appendChild(item);
  });

  const addRow = document.createElement('div');
  addRow.className = 'add-diet-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Neue Altersgruppe (z.B. Teenager)…';
  nameInput.title = 'Bezeichnung für neue Altersgruppe eingeben';
  nameInput.id = 'new-age-name';
  addRow.appendChild(nameInput);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-accent btn-sm';
  addBtn.textContent = 'Hinzufügen';
  addBtn.title = 'Neue Altersgruppe hinzufügen';
  addBtn.addEventListener('click', addAge);
  addRow.appendChild(addBtn);

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addAge();
  });

  body.appendChild(addRow);
}

function addAge() {
  const nameInput = $('new-age-name');
  if (!nameInput) return;
  const name = nameInput.value.trim();
  if (!name) return;
  const id = 'age-' + Date.now();
  state.ageGroups.push({ id: id, name: name });
  saveAndRender();
  renderAgeModal();
}

export function openAgeModal() {
  renderAgeModal();
  const modal = $('age-modal');
  if (modal) modal.style.display = '';
}

export function closeAgeModal() {
  const modal = $('age-modal');
  if (modal) modal.style.display = 'none';
}

function mountAgeModal() {
  if ($('age-modal')) return;
  const container = $('modal-container') || document.body;
  const tpl = document.createElement('div');
  tpl.innerHTML = `
    <div class="modal-overlay" id="age-modal" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h2>Altersgruppen konfigurieren</h2>
          <button class="modal-close" id="age-modal-close" title="Schließen">✕</button>
        </div>
        <div class="modal-body" id="age-modal-body"></div>
      </div>
    </div>
  `;
  container.appendChild(tpl.firstElementChild);
}

export function initAgeModal() {
  mountAgeModal();
  const btn = $('btn-ages');
  if (btn) btn.addEventListener('click', openAgeModal);

  const closeBtn = $('age-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAgeModal);

  const modal = $('age-modal');
  if (modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeAgeModal();
    });
  }
}
