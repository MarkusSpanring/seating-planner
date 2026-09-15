// ===== Unified Settings Modal (Diäten, Altersgruppen, Daten & Export) =====

import { PRESET_COLORS, DEFAULT_AGES } from '../../core/constants.js';
import { state, saveAndRender, registerStateChangeListener } from '../../core/state.js';
import { $, escHtml } from '../../utils/dom.js';
import { getTable } from '../../utils/seating.js';
import { getFamilyForGuest } from '../../utils/family.js';

let activeTab = 'diets'; // 'diets' | 'ages' | 'data'

export function openSettingsModal(tab = 'diets') {
  activeTab = tab;
  mountSettingsModal();
  const modal = $('settings-modal');
  if (modal) {
    modal.style.display = 'flex';
    updateSettingsModalTabs();
    renderSettingsModalContent();
  }
}

export function closeSettingsModal() {
  const modal = $('settings-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function mountSettingsModal() {
  if ($('settings-modal')) return;
  const container = $('modal-container') || document.body;

  const tpl = document.createElement('div');
  tpl.innerHTML = `
    <div class="modal-overlay" id="settings-modal" style="display: none;">
      <div class="modal settings-modal-container">
        <div class="modal-header settings-modal-header">
          <h2>⚙️ Einstellungen</h2>
          <button class="modal-close" id="btn-settings-close" title="Schließen">✕</button>
        </div>
        <div class="settings-modal-layout">
          <!-- Sidebar Navigation -->
          <div class="settings-modal-sidebar">
            <button class="settings-tab-btn" data-tab="diets" id="tab-btn-diets">
              <span class="settings-tab-icon">🎨</span>
              <span class="settings-tab-label">Diäten & Allergien</span>
            </button>
            <button class="settings-tab-btn" data-tab="ages" id="tab-btn-ages">
              <span class="settings-tab-icon">👶</span>
              <span class="settings-tab-label">Altersgruppen</span>
            </button>
            <button class="settings-tab-btn" data-tab="data" id="tab-btn-data">
              <span class="settings-tab-icon">💾</span>
              <span class="settings-tab-label">Daten & CSV</span>
            </button>
            <button class="settings-tab-btn" data-tab="updates" id="tab-btn-updates">
              <span class="settings-tab-icon">🔄</span>
              <span class="settings-tab-label">Updates & Info</span>
            </button>
          </div>
          <!-- Content Pane -->
          <div class="settings-modal-content" id="settings-modal-content">
            <!-- Dynamic Content -->
          </div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(tpl.firstElementChild);

  $('btn-settings-close').addEventListener('click', closeSettingsModal);

  $('settings-modal').addEventListener('click', e => {
    if (e.target === $('settings-modal')) closeSettingsModal();
  });

  const sidebar = document.querySelector('.settings-modal-sidebar');
  if (sidebar) {
    sidebar.addEventListener('click', e => {
      const btn = e.target.closest('.settings-tab-btn');
      if (btn && btn.dataset.tab) {
        activeTab = btn.dataset.tab;
        updateSettingsModalTabs();
        renderSettingsModalContent();
      }
    });
  }
}

function updateSettingsModalTabs() {
  const btns = document.querySelectorAll('.settings-tab-btn');
  btns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });
}

function renderSettingsModalContent() {
  const content = $('settings-modal-content');
  if (!content) return;
  content.innerHTML = '';

  if (activeTab === 'diets') {
    renderDietsTab(content);
  } else if (activeTab === 'ages') {
    renderAgesTab(content);
  } else if (activeTab === 'data') {
    renderDataTab(content);
  } else if (activeTab === 'updates') {
    renderUpdatesTab(content);
  }
}

// ── Tab 1: Diäten & Allergien ──
function renderDietsTab(content) {
  content.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'settings-pane-header';
  header.innerHTML = `
    <h3>Diäten & Allergien</h3>
    <p class="settings-pane-desc">Konfiguriere Ernährungsweisen und Allergien für Gäste. Die Farben werden im Saalplan auf den Sitzplätzen und in der Legende dargestellt.</p>
  `;
  content.appendChild(header);

  const list = document.createElement('div');
  list.className = 'settings-items-list';

  state.dietOptions.forEach(d => {
    const row = document.createElement('div');
    row.className = 'settings-item-row';

    const isDefault = (d.id === 'none');

    if (isDefault) {
      const swatch = document.createElement('div');
      swatch.className = 'diet-swatch';
      swatch.style.backgroundColor = d.color;
      swatch.title = 'Standard (Keine Einschränkung)';
      row.appendChild(swatch);

      const name = document.createElement('span');
      name.className = 'settings-item-name';
      name.textContent = d.name;
      row.appendChild(name);

      const lockSpan = document.createElement('span');
      lockSpan.className = 'settings-item-badge-standard';
      lockSpan.textContent = 'Standard';
      row.appendChild(lockSpan);
    } else {
      // Interactive color selector
      const colorPicker = document.createElement('input');
      colorPicker.type = 'color';
      colorPicker.className = 'diet-swatch-picker';
      colorPicker.value = d.color;
      colorPicker.title = `Farbe für „${d.name}“ ändern (Klicken zum Öffnen der Farbauswahl)`;
      colorPicker.addEventListener('click', e => { e.stopPropagation(); });
      colorPicker.addEventListener('input', () => {
        d.color = colorPicker.value;
        saveAndRender();
      });
      colorPicker.addEventListener('change', () => {
        d.color = colorPicker.value;
        saveAndRender();
      });
      row.appendChild(colorPicker);

      // Editable name textbox
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'settings-item-name-input';
      nameInput.value = d.name;
      nameInput.placeholder = 'Name der Diät / Allergie…';
      nameInput.title = 'Bezeichnung bearbeiten (wird überall automatisch aktualisiert)';

      let lastName = d.name;
      const commitNameChange = () => {
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
        if (val) {
          d.name = val;
        }
      });
      nameInput.addEventListener('blur', commitNameChange);
      nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          commitNameChange();
          nameInput.blur();
        } else if (e.key === 'Escape') {
          nameInput.value = lastName;
          d.name = lastName;
          nameInput.blur();
        }
      });
      row.appendChild(nameInput);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-danger settings-item-del-btn';
      delBtn.textContent = 'Entfernen';
      delBtn.title = `Diät "${d.name}" löschen`;
      delBtn.addEventListener('click', () => {
        state.dietOptions = state.dietOptions.filter(x => x.id !== d.id);
        state.guests.forEach(g => {
          if (g.dietId === d.id) g.dietId = 'none';
        });
        saveAndRender();
        renderSettingsModalContent();
      });
      row.appendChild(delBtn);
    }

    list.appendChild(row);
  });
  content.appendChild(list);

  // Add new diet section
  const addBox = document.createElement('div');
  addBox.className = 'settings-add-box';
  addBox.innerHTML = `
    <div class="settings-add-title">Neue Diät / Allergie hinzufügen</div>
    <div class="settings-add-form">
      <input type="text" id="settings-new-diet-name" class="settings-text-input" placeholder="z.B. Laktosefrei, Halal, Koscher…" title="Bezeichnung eingeben">
      <input type="color" id="settings-new-diet-color" class="settings-color-input" title="Farbe für Diät auswählen">
      <button class="btn btn-accent btn-sm" id="settings-new-diet-submit">➕ Hinzufügen</button>
    </div>
  `;
  content.appendChild(addBox);

  const nextColorIdx = Math.max(0, state.dietOptions.length - 1) % PRESET_COLORS.length;
  const colorInput = addBox.querySelector('#settings-new-diet-color');
  if (colorInput) colorInput.value = PRESET_COLORS[nextColorIdx];

  const submitBtn = addBox.querySelector('#settings-new-diet-submit');
  const nameInput = addBox.querySelector('#settings-new-diet-name');

  const handleAdd = () => {
    const val = nameInput.value.trim();
    if (!val) return;
    const color = colorInput.value;
    const id = val.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    state.dietOptions.push({ id, name: val, color });
    nameInput.value = '';
    saveAndRender();
    renderSettingsModalContent();
    const freshInput = $('settings-new-diet-name');
    if (freshInput) freshInput.focus();
  };

  if (submitBtn) submitBtn.addEventListener('click', handleAdd);
  if (nameInput) {
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAdd();
    });
  }
}

// ── Tab 2: Altersgruppen ──
function renderAgesTab(content) {
  content.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'settings-pane-header';
  header.innerHTML = `
    <h3>Altersgruppen</h3>
    <p class="settings-pane-desc">Verwalte Altersgruppen für Gäste. Dies ermöglicht genaue Zählungen für Menüs und Kindersitzplätze.</p>
  `;
  content.appendChild(header);

  const list = document.createElement('div');
  list.className = 'settings-items-list';

  state.ageGroups.forEach(a => {
    const row = document.createElement('div');
    row.className = 'settings-item-row';

    const icon = document.createElement('span');
    icon.className = 'settings-item-icon';
    icon.textContent = (a.id === 'age-adult') ? '👤' : '👶';
    row.appendChild(icon);

    const isDefault = (a.id === 'age-adult');

    if (isDefault) {
      const name = document.createElement('span');
      name.className = 'settings-item-name';
      name.textContent = a.name;
      row.appendChild(name);

      const lockSpan = document.createElement('span');
      lockSpan.className = 'settings-item-badge-standard';
      lockSpan.textContent = 'Standard';
      row.appendChild(lockSpan);
    } else {
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'settings-item-name-input';
      nameInput.value = a.name;
      nameInput.placeholder = 'Name der Altersgruppe…';
      nameInput.title = 'Bezeichnung bearbeiten (wird überall automatisch aktualisiert)';

      let lastName = a.name;
      const commitNameChange = () => {
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
        if (val) {
          a.name = val;
        }
      });
      nameInput.addEventListener('blur', commitNameChange);
      nameInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          commitNameChange();
          nameInput.blur();
        } else if (e.key === 'Escape') {
          nameInput.value = lastName;
          a.name = lastName;
          nameInput.blur();
        }
      });
      row.appendChild(nameInput);

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-danger settings-item-del-btn';
      delBtn.textContent = 'Entfernen';
      delBtn.title = `Altersgruppe "${a.name}" löschen`;
      delBtn.addEventListener('click', () => {
        state.ageGroups = state.ageGroups.filter(x => x.id !== a.id);
        state.guests.forEach(g => {
          if (g.age === a.id) g.age = 'age-adult';
        });
        saveAndRender();
        renderSettingsModalContent();
      });
      row.appendChild(delBtn);
    }

    list.appendChild(row);
  });
  content.appendChild(list);

  // Add new age group section
  const addBox = document.createElement('div');
  addBox.className = 'settings-add-box';
  addBox.innerHTML = `
    <div class="settings-add-title">Neue Altersgruppe hinzufügen</div>
    <div class="settings-add-form">
      <input type="text" id="settings-new-age-name" class="settings-text-input" placeholder="z.B. Teenager, Senioren…" title="Bezeichnung eingeben">
      <button class="btn btn-accent btn-sm" id="settings-new-age-submit">➕ Hinzufügen</button>
    </div>
  `;
  content.appendChild(addBox);

  const submitBtn = addBox.querySelector('#settings-new-age-submit');
  const nameInput = addBox.querySelector('#settings-new-age-name');

  const handleAdd = () => {
    const val = nameInput.value.trim();
    if (!val) return;
    const id = 'age-' + val.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    state.ageGroups.push({ id, name: val });
    nameInput.value = '';
    saveAndRender();
    renderSettingsModalContent();
    const freshInput = $('settings-new-age-name');
    if (freshInput) freshInput.focus();
  };

  if (submitBtn) submitBtn.addEventListener('click', handleAdd);
  if (nameInput) {
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleAdd();
    });
  }
}

// ── Tab 3: Daten & CSV ──
function renderDataTab(content) {
  content.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'settings-pane-header';
  header.innerHTML = `
    <h3>Daten & CSV-Verwaltung</h3>
    <p class="settings-pane-desc">Importiere oder exportiere Gästelisten für Druckereien, Caterer oder die weitere Bearbeitung in Excel.</p>
  `;
  content.appendChild(header);

  const cardContainer = document.createElement('div');
  cardContainer.className = 'settings-data-cards';

  // Export Card
  const exportCard = document.createElement('div');
  exportCard.className = 'settings-data-card';
  exportCard.innerHTML = `
    <div class="settings-data-card-icon">📥</div>
    <div class="settings-data-card-content">
      <h4>Gästeliste exportieren</h4>
      <p>Aktuelle Gästeliste inklusive Tisch- und Sitzplatzzuweisungen, Diäten und Altersgruppen als CSV-Datei (Excel-kompatibel) herunterladen.</p>
      <button class="btn btn-accent btn-sm" id="btn-settings-export-csv" title="Gästeliste als CSV herunterladen">
        📥 Gästeliste herunterladen (${state.guests.length} Gäste)
      </button>
    </div>
  `;
  cardContainer.appendChild(exportCard);

  // Import Card
  const importCard = document.createElement('div');
  importCard.className = 'settings-data-card';
  importCard.innerHTML = `
    <div class="settings-data-card-icon">📄</div>
    <div class="settings-data-card-content">
      <h4>Gäste aus CSV importieren</h4>
      <p>Lade eine CSV-Datei mit Gästen hoch (Format: Vorname, Nachname, optional Hochstuhl). Gäste werden an die bestehende Liste angehängt.</p>
      <button class="btn btn-sm" id="btn-settings-import-csv" title="CSV-Datei auswählen">
        📄 CSV-Datei auswählen…
      </button>
    </div>
  `;
  cardContainer.appendChild(importCard);

  content.appendChild(cardContainer);

  const exportBtn = exportCard.querySelector('#btn-settings-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportGuestsToCSV);
  }

  const importBtn = importCard.querySelector('#btn-settings-import-csv');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const fileInput = $('csv-input');
      if (fileInput) fileInput.click();
    });
  }
}

export function exportGuestsToCSV() {
  if (state.guests.length === 0) {
    alert('Die Gästeliste ist aktuell leer.');
    return;
  }

  const headers = ['Vorname', 'Nachname', 'Tisch', 'Platz', 'Hochstuhl', 'Alter', 'Diät', 'Familie'];
  const escapeCsv = val => {
    const s = String(val || '');
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const rows = state.guests.map(g => {
    const tbl = g.tableId ? getTable(g.tableId) : null;
    const tblNum = tbl ? String(tbl.number) : '';
    const seatNum = g.seatNumber ? String(g.seatNumber) : '';
    const hc = g.needsHighChair ? 'Ja' : 'Nein';
    const ageGroup = state.ageGroups.find(a => a.id === g.age);
    const ageName = ageGroup ? ageGroup.name : (g.age || 'Erwachsen');
    const diet = state.dietOptions.find(d => d.id === g.dietId);
    const dietName = diet ? diet.name : 'None';
    const fam = getFamilyForGuest(g.id);
    const famName = fam ? fam.name : '';

    return [
      escapeCsv(g.firstName),
      escapeCsv(g.lastName),
      escapeCsv(tblNum),
      escapeCsv(seatNum),
      escapeCsv(hc),
      escapeCsv(ageName),
      escapeCsv(dietName),
      escapeCsv(famName)
    ].join(';');
  });

  const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const venuePart = state.venueName ? state.venueName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Venue';
  link.setAttribute('href', url);
  link.setAttribute('download', `Gaesteliste_${venuePart}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Tab 4: Updates & Info ──
function renderUpdatesTab(content) {
  content.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'settings-pane-header';
  header.innerHTML = `
    <h3>Updates & System</h3>
    <p class="settings-pane-desc">Halte Sitzplan mit den neuesten Verbesserungen und Funktionen aktuell. Alle deine Daten in <code>states/</code> bleiben bei jedem Update zu 100% erhalten.</p>
  `;
  content.appendChild(header);

  const container = document.createElement('div');
  container.className = 'settings-update-container';
  container.innerHTML = `
    <div class="settings-data-card" style="margin-bottom: 16px;">
      <div class="settings-data-card-icon">💍</div>
      <div class="settings-data-card-content" style="flex: 1;">
        <h4>Sitzplan – Wedding Seating Planner</h4>
        <p>100% lokale & private Sitzplatzverwaltung für Hochzeiten und Feiern.</p>
        <div class="settings-update-meta" id="update-meta-info" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
          <span>Status: <strong>Bereit</strong></span>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-primary" id="btn-check-updates" style="display: inline-flex; align-items: center; gap: 6px;">
            <span>🔍</span>
            <span>Auf Updates prüfen</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Update Results Card (shown after checking) -->
    <div id="update-result-card" style="display: none; margin-bottom: 16px;"></div>

    <!-- Desktop Scripts Reminder Card -->
    <div class="settings-data-card" style="opacity: 0.9;">
      <div class="settings-data-card-icon">💻</div>
      <div class="settings-data-card-content">
        <h4>1-Klick Desktop-Skripte</h4>
        <p>Du kannst Sitzplan auch jederzeit außerhalb des Browsers per Doppelklick auf das Update-Skript in deinem Sitzplan-Ordner aktualisieren:</p>
        <ul style="margin: 0; padding-left: 18px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6;">
          <li><strong>Windows:</strong> <code>update.bat</code></li>
          <li><strong>Mac / macOS:</strong> <code>update.command</code></li>
          <li><strong>Linux:</strong> <code>./update.sh</code></li>
        </ul>
      </div>
    </div>
  `;

  content.appendChild(container);

  const checkBtn = container.querySelector('#btn-check-updates');
  const resultCard = container.querySelector('#update-result-card');
  const metaInfo = container.querySelector('#update-meta-info');

  checkBtn.addEventListener('click', async () => {
    checkBtn.disabled = true;
    checkBtn.innerHTML = `<span>⏳</span><span>Prüfe Updates...</span>`;
    resultCard.style.display = 'none';

    try {
      const res = await fetch('/api/update/check');
      const data = await res.json();
      checkBtn.disabled = false;
      checkBtn.innerHTML = `<span>🔄</span><span>Erneut prüfen</span>`;

      if (data.currentCommit) {
        metaInfo.innerHTML = `
          <span>Aktueller Stand: <strong>${escHtml(data.currentCommit)}</strong> ${data.currentDate ? `(${escHtml(data.currentDate)})` : ''}</span>
        `;
      }

      resultCard.style.display = 'block';

      if (!data.gitAvailable) {
        resultCard.innerHTML = `
          <div class="settings-update-banner warning">
            <div class="settings-update-banner-icon">⚠️</div>
            <div class="settings-update-banner-body">
              <strong>Git ist noch nicht eingerichtet</strong>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem;">
                ${escHtml(data.error || 'Git wird für 1-Klick Updates benötigt.')}
              </p>
              <p style="margin: 6px 0 0 0; font-size: 0.8rem; color: var(--text-muted);">
                Tipp: Führe die Datei <code>install.bat</code> (Windows) bzw. <code>install.command</code> (Mac) aus, um Git automatisch einzurichten.
              </p>
            </div>
          </div>
        `;
        return;
      }

      if (data.error) {
        resultCard.innerHTML = `
          <div class="settings-update-banner warning">
            <div class="settings-update-banner-icon">⚠️</div>
            <div class="settings-update-banner-body">
              <strong>Prüfung nicht möglich</strong>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem;">
                ${escHtml(data.error)}
              </p>
            </div>
          </div>
        `;
        return;
      }

      if (!data.updateAvailable) {
        resultCard.innerHTML = `
          <div class="settings-update-banner success">
            <div class="settings-update-banner-icon">🎉</div>
            <div class="settings-update-banner-body">
              <strong>Du hast bereits die neueste Version!</strong>
              <p style="margin: 4px 0 0 0; font-size: 0.82rem;">
                Sitzplan ist auf dem aktuellsten Stand (${escHtml(data.currentCommit)}). Es sind keine neuen Updates vorhanden.
              </p>
            </div>
          </div>
        `;
        return;
      }

      // Update is available!
      resultCard.innerHTML = `
        <div class="settings-update-banner update-available">
          <div class="settings-update-banner-icon">🚀</div>
          <div class="settings-update-banner-body" style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <strong>Neues Update verfügbar!</strong>
              <span class="badge" style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.4); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">
                ${data.commitsBehind} neue Aktualisierung(en)
              </span>
            </div>
            ${data.latestMessage ? `<p style="margin: 6px 0; font-size: 0.82rem; color: var(--text-primary);">Neueste Änderung: <em>"${escHtml(data.latestMessage)}"</em></p>` : ''}
            <p style="margin: 4px 0 12px 0; font-size: 0.8rem; color: var(--text-muted);">
              🛡️ Vor der Aktualisierung wird automatisch eine Sicherheitskopie deiner Daten in <code>states/</code> erstellt.
            </p>
            <button class="btn btn-primary" id="btn-apply-update" style="display: inline-flex; align-items: center; gap: 6px;">
              <span>📥</span>
              <span>Jetzt aktualisieren</span>
            </button>
            <div id="update-progress-msg" style="margin-top: 8px; font-size: 0.8rem; display: none;"></div>
          </div>
        </div>
      `;

      const applyBtn = resultCard.querySelector('#btn-apply-update');
      const progressMsg = resultCard.querySelector('#update-progress-msg');

      applyBtn.addEventListener('click', async () => {
        applyBtn.disabled = true;
        applyBtn.innerHTML = `<span>⏳</span><span>Wird aktualisiert...</span>`;
        progressMsg.style.display = 'block';
        progressMsg.innerHTML = `<span style="color: var(--text-muted);">Erstelle Sicherheitskopie und lade neuesten Code herunter...</span>`;

        try {
          const updateRes = await fetch('/api/update/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          });
          const updateData = await updateRes.json();

          if (updateData.success) {
            progressMsg.innerHTML = `
              <span style="color: #4ade80; font-weight: 600;">
                ✅ ${escHtml(updateData.message)}
              </span><br>
              <span style="color: var(--text-muted); font-size: 0.75rem;">Die Anwendung wird in Kürze neu geladen...</span>
            `;
            setTimeout(() => {
              window.location.reload();
            }, 1800);
          } else {
            applyBtn.disabled = false;
            applyBtn.innerHTML = `<span>📥</span><span>Erneut versuchen</span>`;
            progressMsg.innerHTML = `
              <span style="color: #ef4444; font-weight: 600;">
                ❌ Fehler: ${escHtml(updateData.error || 'Update fehlgeschlagen')}
              </span>
            `;
          }
        } catch (err) {
          applyBtn.disabled = false;
          applyBtn.innerHTML = `<span>📥</span><span>Erneut versuchen</span>`;
          progressMsg.innerHTML = `
            <span style="color: #ef4444; font-weight: 600;">
              ❌ Netzwerkfehler: ${escHtml(err.message)}
            </span>
          `;
        }
      });

    } catch (e) {
      checkBtn.disabled = false;
      checkBtn.innerHTML = `<span>🔄</span><span>Erneut prüfen</span>`;
      resultCard.style.display = 'block';
      resultCard.innerHTML = `
        <div class="settings-update-banner warning">
          <div class="settings-update-banner-icon">⚠️</div>
          <div class="settings-update-banner-body">
            <strong>Server nicht erreichbar</strong>
            <p style="margin: 4px 0 0 0; font-size: 0.82rem;">${escHtml(e.message)}</p>
          </div>
        </div>
      `;
    }
  });
}

export function initSettingsModal() {
  mountSettingsModal();
  const settingsBtn = $('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => openSettingsModal('diets'));
  }

  registerStateChangeListener(() => {
    const modal = $('settings-modal');
    if (modal && modal.style.display !== 'none') {
      renderSettingsModalContent();
    }
  });
}

