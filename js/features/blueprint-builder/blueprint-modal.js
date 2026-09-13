// ===== Blueprint Builder Modal & Management =====

import { state, uiState, saveState, saveAndRender } from '../../core/state.js';
import { $, escHtml } from '../../utils/dom.js';
import { findEmptySpace, getTableCenterSize } from '../../utils/geometry.js';
import { getBpShape, renderBlueprintPreview } from './blueprint-preview.js';

export function resetBlueprintForm() {
  uiState.editingBlueprintId = null;
  uiState.bpPreviewDisabledSeats = [];

  const title = $('bp-modal-title');
  if (title) title.textContent = 'Tischvorlage erstellen';
  const saveBtn = $('bp-save');
  if (saveBtn) saveBtn.textContent = 'Vorlage erstellen';
  const newBtn = $('bp-new-btn');
  if (newBtn) newBtn.style.display = 'none';

  $('bp-name').value = '';
  $('bp-seat-count').value = '8';
  $('bp-seats-long').value = '3';
  $('bp-seats-short').value = '1';

  $('bp-shape-circle').classList.add('active');
  $('bp-shape-rect').classList.remove('active');
  $('bp-rect-fields').style.display = 'none';
  $('bp-circle-fields').style.display = '';
  $('bp-size-circle-fields').style.display = '';
  $('bp-size-rect-fields').style.display = 'none';
  $('bp-table-r-input').value = '';
  $('bp-table-w-input').value = '';
  $('bp-table-h-input').value = '';

  renderBlueprintPreview();
  renderBlueprintExistingList();
}

export function isBlueprintInUse(bp) {
  if (!bp) return false;
  return state.tables.some(t => {
    if (t.blueprintId && t.blueprintId === bp.id) return true;
    if (!t.blueprintId) {
      const sameShape = (t.shape || 'circle') === (bp.shape || 'circle');
      const sameSeats = Number(t.seatCount) === Number(bp.seatCount);
      const sameLong = (t.seatsLong != null ? t.seatsLong : null) === (bp.seatsLong != null ? bp.seatsLong : null);
      const sameShort = (t.seatsShort != null ? t.seatsShort : null) === (bp.seatsShort != null ? bp.seatsShort : null);
      const sameCustomR = (t.tableCustomR != null ? t.tableCustomR : null) === (bp.tableCustomR != null ? bp.tableCustomR : null);
      const sameCustomW = (t.tableCustomW != null ? t.tableCustomW : null) === (bp.tableCustomW != null ? bp.tableCustomW : null);
      const sameCustomH = (t.tableCustomH != null ? t.tableCustomH : null) === (bp.tableCustomH != null ? bp.tableCustomH : null);
      if (sameShape && sameSeats && sameLong && sameShort && sameCustomR && sameCustomW && sameCustomH) {
        const tDis = (t.disabledSeats || []).slice().sort().join(',');
        const bpDis = (bp.disabledSeats || []).slice().sort().join(',');
        if (tDis === bpDis && (bp.tableCustomR || bp.tableCustomW || bp.tableCustomH || (bp.disabledSeats && bp.disabledSeats.length > 0) || bp.shape === 'rectangle')) {
          return true;
        }
      }
    }
    return false;
  });
}

export function loadBlueprintForEditing(bpId) {
  const bp = state.customBlueprints.find(b => b.id === bpId);
  if (!bp || isBlueprintInUse(bp)) return;

  uiState.editingBlueprintId = bp.id;
  uiState.bpPreviewDisabledSeats = (bp.disabledSeats || []).slice();

  $('bp-name').value = bp.name || '';

  if (bp.shape === 'rectangle') {
    $('bp-shape-rect').classList.add('active');
    $('bp-shape-circle').classList.remove('active');
    $('bp-rect-fields').style.display = '';
    $('bp-circle-fields').style.display = 'none';
    $('bp-size-circle-fields').style.display = 'none';
    $('bp-size-rect-fields').style.display = '';
    $('bp-seats-long').value = String(bp.seatsLong || 3);
    $('bp-seats-short').value = String(bp.seatsShort || 1);
    $('bp-table-w-input').value = bp.tableCustomW ? String(bp.tableCustomW) : '';
    $('bp-table-h-input').value = bp.tableCustomH ? String(bp.tableCustomH) : '';
  } else {
    $('bp-shape-circle').classList.add('active');
    $('bp-shape-rect').classList.remove('active');
    $('bp-rect-fields').style.display = 'none';
    $('bp-circle-fields').style.display = '';
    $('bp-size-circle-fields').style.display = '';
    $('bp-size-rect-fields').style.display = 'none';
    $('bp-seat-count').value = String(bp.seatCount || 8);
    $('bp-table-r-input').value = bp.tableCustomR ? String(bp.tableCustomR) : '';
  }

  const title = $('bp-modal-title');
  if (title) title.textContent = 'Vorlage bearbeiten: ' + bp.name;
  const saveBtn = $('bp-save');
  if (saveBtn) saveBtn.textContent = 'Änderungen speichern';
  const newBtn = $('bp-new-btn');
  if (newBtn) newBtn.style.display = 'inline-flex';

  renderBlueprintPreview();
  renderBlueprintExistingList();
}

export function openBlueprintBuilder() {
  resetBlueprintForm();
  $('blueprint-builder-modal').style.display = 'flex';
}

export function closeBlueprintBuilder() {
  $('blueprint-builder-modal').style.display = 'none';
  uiState.bpPreviewDisabledSeats = [];
  uiState.editingBlueprintId = null;
}

export function saveBlueprint() {
  const name = $('bp-name').value.trim();
  if (!name) {
    $('bp-name').focus();
    return;
  }
  const shape = getBpShape();
  let seatsLong, seatsShort, count;
  if (shape === 'rectangle') {
    seatsLong = parseInt($('bp-seats-long').value) || 3;
    seatsShort = parseInt($('bp-seats-short').value) || 1;
    count = 2 * (seatsLong + seatsShort);
  } else {
    count = parseInt($('bp-seat-count').value) || 8;
    seatsLong = null;
    seatsShort = null;
  }

  // Read custom size
  const fakeForMin = { seatCount: count, shape: shape, seatsLong: seatsLong, seatsShort: seatsShort };
  const autoGeo = getTableCenterSize(fakeForMin, 30, true);
  let tableCustomR = null, tableCustomW = null, tableCustomH = null;
  if (shape === 'circle') {
    const rv = parseFloat($('bp-table-r-input').value);
    if (rv > autoGeo.r + 0.5) tableCustomR = rv;
  } else {
    const wv = parseFloat($('bp-table-w-input').value);
    const hv = parseFloat($('bp-table-h-input').value);
    if (wv > autoGeo.w + 0.5) tableCustomW = wv;
    if (hv > autoGeo.h + 0.5) tableCustomH = hv;
  }

  const disabledSeats = (uiState.bpPreviewDisabledSeats || []).filter(s => s <= count);

  if (uiState.editingBlueprintId) {
    const existing = state.customBlueprints.find(b => b.id === uiState.editingBlueprintId);
    if (existing) {
      if (isBlueprintInUse(existing)) {
        alert(`Vorlage "${existing.name}" kann nicht bearbeitet werden, da sich ein Tisch dieses Typs im Saalplan befindet.`);
        return;
      }
      existing.name = name;
      existing.shape = shape;
      existing.seatsLong = seatsLong;
      existing.seatsShort = seatsShort;
      existing.seatCount = count;
      existing.disabledSeats = disabledSeats.slice();
      existing.tableCustomR = tableCustomR;
      existing.tableCustomW = tableCustomW;
      existing.tableCustomH = tableCustomH;
    }
  } else {
    const bp = {
      id: 'bp-' + Date.now(),
      name: name,
      shape: shape,
      seatsLong: seatsLong,
      seatsShort: seatsShort,
      seatCount: count,
      disabledSeats: disabledSeats.slice(),
      tableCustomR: tableCustomR,
      tableCustomW: tableCustomW,
      tableCustomH: tableCustomH,
    };
    state.customBlueprints.push(bp);
  }

  saveAndRender();
  closeBlueprintBuilder();
}

export function addTableFromBlueprint(bp) {
  const used = {};
  state.tables.forEach(t => {
    if (String(t.number).trim() !== '' && !isNaN(t.number)) {
      used[Number(t.number)] = true;
    }
  });
  let num = 1;
  while (used[num]) num++;

  const tempTable = {
    seatCount: bp.seatCount,
    shape: bp.shape,
    disabledSeats: (bp.disabledSeats || []).slice(),
    seatsLong: bp.seatsLong,
    seatsShort: bp.seatsShort,
    tableCustomR: bp.tableCustomR,
    tableCustomW: bp.tableCustomW,
    tableCustomH: bp.tableCustomH
  };
  const pos = findEmptySpace(tempTable);

  state.tables.push({
    id: Date.now(),
    blueprintId: bp.id,
    number: num,
    seatCount: bp.seatCount,
    x: pos.x,
    y: pos.y,
    shape: bp.shape,
    seatsLong: bp.seatsLong,
    seatsShort: bp.seatsShort,
    disabledSeats: (bp.disabledSeats || []).slice(),
    tableCustomR: bp.tableCustomR || null,
    tableCustomW: bp.tableCustomW || null,
    tableCustomH: bp.tableCustomH || null,
  });
  saveAndRender();
}

export function renderBlueprintButtons() {
  const container = $('custom-blueprint-buttons');
  if (!container) return;
  container.innerHTML = '';
  state.customBlueprints.forEach(bp => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-accent btn-sm custom-blueprint-btn';
    btn.textContent = '+ ' + bp.name;
    const shapeLabel = bp.shape === 'rectangle' ? 'Rechteckig' : 'Rund';
    btn.title = `Tisch "${bp.name}" (${shapeLabel}, ${bp.seatCount} Plätze) auf dem Saalplan platzieren`;
    btn.addEventListener('click', () => {
      addTableFromBlueprint(bp);
    });
    container.appendChild(btn);
  });
}

export function renderBlueprintExistingList() {
  const container = $('bp-existing-list');
  if (!container) return;
  container.innerHTML = '';
  if (state.customBlueprints.length === 0) return;

  const title = document.createElement('div');
  title.style.cssText = 'font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;';
  title.textContent = 'Vorhandene Vorlagen';
  container.appendChild(title);

  const listWrap = document.createElement('div');
  listWrap.className = 'bp-existing-list-container';

  state.customBlueprints.forEach(bp => {
    const isEditing = (uiState.editingBlueprintId === bp.id);
    const inUse = isBlueprintInUse(bp);
    const row = document.createElement('div');
    row.className = 'bp-existing-item' + (isEditing ? ' active' : '') + (inUse ? ' in-use' : '');
    row.title = inUse
      ? 'Wird im Saalplan verwendet — Bearbeiten und Löschen gesperrt'
      : 'Klicken zum Bearbeiten';

    const main = document.createElement('div');
    main.className = 'bp-existing-main';

    const nameEl = document.createElement('span');
    nameEl.className = 'bp-existing-name';
    nameEl.textContent = bp.name;
    main.appendChild(nameEl);

    const meta = document.createElement('span');
    meta.className = 'bp-existing-meta';
    const shapeIcon = bp.shape === 'rectangle' ? '▭' : '○';
    meta.textContent = `${shapeIcon} ${bp.seatCount} Pl.`;
    main.appendChild(meta);

    const disabledCount = Array.isArray(bp.disabledSeats) ? bp.disabledSeats.length : 0;
    if (disabledCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'bp-existing-badge';
      badge.textContent = `-${disabledCount}`;
      badge.title = `${disabledCount} Platz/Plätze deaktiviert`;
      main.appendChild(badge);
    }
    row.appendChild(main);

    if (inUse) {
      const lock = document.createElement('span');
      lock.className = 'bp-existing-lock';
      lock.textContent = '🔒';
      lock.title = 'Tisch befindet sich im Saalplan — Bearbeiten und Löschen nicht möglich';
      row.appendChild(lock);
    } else {
      const delBtn = document.createElement('button');
      delBtn.className = 'bp-existing-del-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Vorlage löschen';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isBlueprintInUse(bp)) {
          alert(`Vorlage "${bp.name}" kann nicht gelöscht werden, da sich ein Tisch dieses Typs im Saalplan befindet.`);
          return;
        }
        if (!confirm(`Vorlage "${bp.name}" löschen? Bereits erstellte Tische bleiben erhalten.`)) return;
        state.customBlueprints = state.customBlueprints.filter(b => b.id !== bp.id);
        if (uiState.editingBlueprintId === bp.id) {
          resetBlueprintForm();
        }
        saveAndRender();
        renderBlueprintExistingList();
      });
      row.appendChild(delBtn);

      row.addEventListener('click', () => {
        loadBlueprintForEditing(bp.id);
      });
    }

    listWrap.appendChild(row);
  });

  container.appendChild(listWrap);
}

function mountBlueprintBuilderModal() {
  if ($('blueprint-builder-modal')) return;
  const container = $('modal-container') || document.body;
  const tpl = document.createElement('div');
  tpl.innerHTML = `
    <div class="modal-overlay" id="blueprint-builder-modal" style="display:none">
      <div class="modal blueprint-builder-modal-content">
        <div class="modal-header">
          <h2 id="bp-modal-title">Tischvorlage erstellen</h2>
          <button class="modal-close" id="blueprint-builder-close" title="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <div class="blueprint-builder-layout">
            <!-- Left: controls -->
            <div class="blueprint-builder-controls">
              <div class="bp-field">
                <label>Name</label>
                <input type="text" id="bp-name" placeholder="z.B. Brauttisch" class="searchable-picker-input" style="width: 100%; box-sizing: border-box;" title="Name der Vorlage eingeben">
              </div>
              <div class="bp-field">
                <label>Form</label>
                <div class="bp-shape-toggle">
                  <button class="btn btn-sm bp-shape-btn active" id="bp-shape-circle" data-shape="circle" title="Runde Tischform wählen">○ Kreis</button>
                  <button class="btn btn-sm bp-shape-btn" id="bp-shape-rect" data-shape="rectangle" title="Rechteckige Tischform wählen">▭ Rechteck</button>
                </div>
              </div>
              <div class="bp-field" id="bp-circle-fields">
                <label>Plätze</label>
                <input type="number" id="bp-seat-count" min="3" max="24" value="8" class="searchable-picker-input" style="width: 80px;" title="Anzahl der Sitzplätze (3 bis 24)">
              </div>
              <div class="bp-field bp-rect-only" id="bp-rect-fields" style="display: none;">
                <label>Plätze Längsseite / Querseite</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input type="number" id="bp-seats-long" min="1" max="10" value="3" class="searchable-picker-input" style="width: 70px;" title="Sitzplätze an jeder Längsseite (1 bis 10)">
                  <span style="color: var(--text-muted); line-height: 32px;">×</span>
                  <input type="number" id="bp-seats-short" min="0" max="10" value="1" class="searchable-picker-input" style="width: 70px;" title="Sitzplätze an jeder Querseite (0 bis 10)">
                </div>
                <span style="font-size: 0.7rem; color: var(--text-muted);">Gesamt: <span id="bp-total-display">8</span> Plätze</span>
              </div>
              <!-- Table inner size controls -->
              <div class="bp-field" id="bp-size-circle-fields">
                <label>Tischradius (cm)</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <input type="range" id="bp-table-r-slider" min="10" max="400" step="1" style="flex: 1;" title="Tischradius in cm mit Schieberegler anpassen">
                  <input type="number" id="bp-table-r-input" min="10" max="400" step="1" class="searchable-picker-input" style="width: 60px;" title="Tischradius in cm eingeben">
                </div>
                <span style="font-size: 0.7rem; color: var(--text-muted);" id="bp-table-r-min-hint"></span>
              </div>
              <div class="bp-field bp-rect-only" id="bp-size-rect-fields" style="display:none;">
                <label>Tischgröße (B × H in cm)</label>
                <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 0.75rem; color: var(--text-muted); width: 12px;">B</span>
                  <input type="range" id="bp-table-w-slider" min="10" max="1000" step="1" style="flex: 1;" title="Tischbreite in cm mit Schieberegler anpassen">
                  <input type="number" id="bp-table-w-input" min="10" max="1000" step="1" class="searchable-picker-input" style="width: 60px;" title="Tischbreite in cm eingeben">
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                  <span style="font-size: 0.75rem; color: var(--text-muted); width: 12px;">H</span>
                  <input type="range" id="bp-table-h-slider" min="10" max="1000" step="1" style="flex: 1;" title="Tischhöhe/Tiefe in cm mit Schieberegler anpassen">
                  <input type="number" id="bp-table-h-input" min="10" max="1000" step="1" class="searchable-picker-input" style="width: 60px;" title="Tischhöhe/Tiefe in cm eingeben">
                </div>
                <span style="font-size: 0.7rem; color: var(--text-muted);" id="bp-table-wh-min-hint"></span>
              </div>
              <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 12px;">
                Klicke auf Plätze in der Vorschau, um sie zu deaktivieren oder wieder zu aktivieren.
              </p>
              <div style="display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
                <button class="btn btn-accent btn-sm" id="bp-save" title="Tischvorlage speichern">Vorlage erstellen</button>
                <button class="btn btn-sm" id="bp-new-btn" style="display: none;" title="Eingaben leeren und neue Vorlage erstellen">+ Neu</button>
                <button class="btn btn-sm" id="bp-cancel" title="Abbrechen und Schließen">Abbrechen</button>
              </div>
              <!-- Existing blueprints -->
              <div id="bp-existing-list" style="margin-top: 20px;"></div>
            </div>
            <!-- Right: preview -->
            <div class="blueprint-builder-preview" id="bp-preview"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(tpl.firstElementChild);
}

export function initBlueprintBuilder() {
  mountBlueprintBuilderModal();
  $('btn-open-blueprint').addEventListener('click', openBlueprintBuilder);
  $('blueprint-builder-close').addEventListener('click', closeBlueprintBuilder);
  $('bp-cancel').addEventListener('click', closeBlueprintBuilder);
  $('bp-save').addEventListener('click', saveBlueprint);
  $('bp-new-btn').addEventListener('click', resetBlueprintForm);

  $('blueprint-builder-modal').addEventListener('click', e => {
    if (e.target === $('blueprint-builder-modal')) closeBlueprintBuilder();
  });

  $('bp-shape-circle').addEventListener('click', () => {
    $('bp-shape-circle').classList.add('active');
    $('bp-shape-rect').classList.remove('active');
    $('bp-rect-fields').style.display = 'none';
    $('bp-circle-fields').style.display = '';
    $('bp-size-circle-fields').style.display = '';
    $('bp-size-rect-fields').style.display = 'none';
    const count = parseInt($('bp-seat-count').value) || 8;
    uiState.bpPreviewDisabledSeats = (uiState.bpPreviewDisabledSeats || []).filter(s => s <= count);
    renderBlueprintPreview();
  });

  $('bp-shape-rect').addEventListener('click', () => {
    $('bp-shape-rect').classList.add('active');
    $('bp-shape-circle').classList.remove('active');
    $('bp-rect-fields').style.display = '';
    $('bp-circle-fields').style.display = 'none';
    $('bp-size-circle-fields').style.display = 'none';
    $('bp-size-rect-fields').style.display = '';
    const seatsLong = parseInt($('bp-seats-long').value) || 3;
    const seatsShort = parseInt($('bp-seats-short').value) || 1;
    const count = 2 * (seatsLong + seatsShort);
    uiState.bpPreviewDisabledSeats = (uiState.bpPreviewDisabledSeats || []).filter(s => s <= count);
    renderBlueprintPreview();
  });

  $('bp-seat-count').addEventListener('input', () => {
    const count = parseInt($('bp-seat-count').value) || 8;
    uiState.bpPreviewDisabledSeats = (uiState.bpPreviewDisabledSeats || []).filter(s => s <= count);
    renderBlueprintPreview();
  });
  $('bp-seats-long').addEventListener('input', () => {
    const seatsLong = parseInt($('bp-seats-long').value) || 3;
    const seatsShort = parseInt($('bp-seats-short').value) || 1;
    const count = 2 * (seatsLong + seatsShort);
    uiState.bpPreviewDisabledSeats = (uiState.bpPreviewDisabledSeats || []).filter(s => s <= count);
    renderBlueprintPreview();
  });
  $('bp-seats-short').addEventListener('input', () => {
    const seatsLong = parseInt($('bp-seats-long').value) || 3;
    const seatsShort = parseInt($('bp-seats-short').value) || 1;
    const count = 2 * (seatsLong + seatsShort);
    uiState.bpPreviewDisabledSeats = (uiState.bpPreviewDisabledSeats || []).filter(s => s <= count);
    renderBlueprintPreview();
  });

  ['bp-table-r', 'bp-table-w', 'bp-table-h'].forEach(id => {
    const slider = $(id + '-slider');
    const input = $(id + '-input');
    if (!slider || !input) return;
    slider.addEventListener('input', () => {
      input.value = slider.value;
      renderBlueprintPreview();
    });
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (!isNaN(v)) {
        slider.value = v;
        renderBlueprintPreview();
      }
    });
  });
}
