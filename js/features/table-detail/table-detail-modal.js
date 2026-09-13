// ===== Table Detail Modal Coordinator =====

import { state, uiState, saveAndRender } from '../../core/state.js';
import { $ } from '../../utils/dom.js';
import {
  getTable,
  guestsAtTable,
  getActiveSeatNumbers,
  removeTable
} from '../../utils/seating.js';
import { renderGuestCard } from '../guest-list/guest-row.js';
import { zoomFit, renderTableDetailSVG, initTableDetailSVGNavigation } from './table-detail-svg.js';
import { initTableDetailEdit } from './table-detail-edit.js';

export function openTableDetail(tableId) {
  const tbl = getTable(tableId);
  if (!tbl) return;

  uiState.currentEditingTableId = tableId;
  $('table-detail-rename').value = tbl.number;

  populateTableDetailTemplateSelect(tbl);

  $('table-detail-table-fixed').checked = !!tbl.fixed;
  $('table-detail-fixed').checked = !!tbl.seatsFixed;
  updateTableDetailModalVisuals(tbl);

  zoomFit(tbl.id);
  renderTableDetailGuests(tbl.id);

  $('table-detail-modal').style.display = 'flex';
}

export function populateTableDetailTemplateSelect(tbl) {
  const seatSel = $('table-detail-seatcount');
  if (!seatSel) return;
  seatSel.innerHTML = '';
  seatSel.disabled = false;

  const seatedAtTable = guestsAtTable(tbl.id).filter(g => g.seatNumber).length;

  // 1. Standard round presets
  const standardGroup = document.createElement('optgroup');
  standardGroup.label = 'Standard-Tische (Rund)';
  const presets = [
    { count: 7, label: '7er Tisch' },
    { count: 8, label: '8er Tisch' },
    { count: 10, label: '10er Tisch' }
  ];
  presets.forEach(p => {
    const opt = document.createElement('option');
    opt.value = 'preset:' + p.count;
    opt.textContent = p.label;
    if (p.count < seatedAtTable) {
      opt.disabled = true;
      opt.textContent += ` (${seatedAtTable} Gäste zugewiesen)`;
    }
    standardGroup.appendChild(opt);
  });
  seatSel.appendChild(standardGroup);

  // 2. Vorlagen (Custom Blueprints)
  const blueprints = Array.isArray(state.customBlueprints) ? state.customBlueprints : [];
  if (blueprints.length > 0) {
    const bpGroup = document.createElement('optgroup');
    bpGroup.label = 'Vorlagen';
    blueprints.forEach(bp => {
      const opt = document.createElement('option');
      opt.value = 'bp:' + bp.id;
      const disCount = Array.isArray(bp.disabledSeats) ? bp.disabledSeats.length : 0;
      const effSeats = bp.seatCount - disCount;
      const shapeText = bp.shape === 'rectangle' ? `${bp.seatsLong || 0}x${bp.seatsShort || 0}` : 'Rund';
      opt.textContent = `${bp.name} (${shapeText}, ${bp.seatCount}er)`;
      if (effSeats < seatedAtTable) {
        opt.disabled = true;
        opt.textContent += ` (${seatedAtTable} Gäste zugewiesen)`;
      }
      bpGroup.appendChild(opt);
    });
    seatSel.appendChild(bpGroup);
  }

  // Determine currently selected option
  let selectedValue = null;
  if (tbl.blueprintId && blueprints.some(b => b.id === tbl.blueprintId)) {
    selectedValue = 'bp:' + tbl.blueprintId;
  } else {
    // Try to match a blueprint by geometric properties
    const matchingBp = blueprints.find(bp => {
      const sameShape = (tbl.shape || 'circle') === (bp.shape || 'circle');
      const sameSeats = tbl.seatCount === bp.seatCount;
      const sameLong = (tbl.seatsLong != null ? tbl.seatsLong : null) === (bp.seatsLong != null ? bp.seatsLong : null);
      const sameShort = (tbl.seatsShort != null ? tbl.seatsShort : null) === (bp.seatsShort != null ? bp.seatsShort : null);
      const sameCustomR = (tbl.tableCustomR != null ? tbl.tableCustomR : null) === (bp.tableCustomR != null ? bp.tableCustomR : null);
      const sameCustomW = (tbl.tableCustomW != null ? tbl.tableCustomW : null) === (bp.tableCustomW != null ? bp.tableCustomW : null);
      const sameCustomH = (tbl.tableCustomH != null ? tbl.tableCustomH : null) === (bp.tableCustomH != null ? bp.tableCustomH : null);
      return sameShape && sameSeats && sameLong && sameShort && sameCustomR && sameCustomW && sameCustomH;
    });
    if (matchingBp) {
      selectedValue = 'bp:' + matchingBp.id;
    } else if (tbl.shape === 'circle' && !tbl.tableCustomR && (!tbl.seatsLong) && (!tbl.disabledSeats || tbl.disabledSeats.length === 0)) {
      if (tbl.seatCount === 7) selectedValue = 'preset:7';
      else if (tbl.seatCount === 8) selectedValue = 'preset:8';
      else if (tbl.seatCount === 10) selectedValue = 'preset:10';
    }
  }

  if (selectedValue && seatSel.querySelector(`option[value="${selectedValue}"]`)) {
    seatSel.value = selectedValue;
  } else {
    // Current table configuration does not match any existing preset or blueprint
    const customOpt = document.createElement('option');
    customOpt.value = 'current';
    const shapeText = tbl.shape === 'rectangle' ? 'Rechteck' : 'Rund';
    customOpt.textContent = `Aktuell (${shapeText}, ${tbl.seatCount}er)`;
    seatSel.insertBefore(customOpt, seatSel.firstChild);
    seatSel.value = 'current';
  }
}

export function updateTableDetailModalVisuals(tbl) {
  const contentNode = $('table-detail-modal-content');
  if (!contentNode) return;
  if (tbl.fixed && tbl.seatsFixed) {
    contentNode.style.border = '2px solid #22c55e';
    contentNode.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.4)';
  } else {
    contentNode.style.border = '1px solid var(--border-color)';
    contentNode.style.boxShadow = '';
  }
}

export function saveTableNumber() {
  if (!uiState.currentEditingTableId) return;
  const tbl = getTable(uiState.currentEditingTableId);
  if (!tbl) return;

  const input = $('table-detail-rename');
  const newNum = input.value.trim();

  if (newNum !== '' && newNum !== String(tbl.number)) {
    const existingTbl = state.tables.find(t => String(t.number) === newNum && t.id !== tbl.id);
    if (existingTbl) {
      const oldNum = tbl.number;
      existingTbl.number = oldNum;
    }
    tbl.number = newNum;

    saveAndRender();
  }
}

export function closeTableDetailModal() {
  $('table-detail-modal').style.display = 'none';
  uiState.currentEditingTableId = null;
  uiState.selectedDetailSeat = null; // clear swap
  uiState.detailEditMode = false;

  const emBtn = $('btn-edit-mode');
  if (emBtn) emBtn.classList.remove('active');
  const rotBtn = $('btn-rotate-table');
  if (rotBtn) rotBtn.style.display = 'none';

  ['td-rename-wrap', 'td-seatcount-wrap', 'td-lbl-table-fixed', 'td-lbl-seat-fixed', 'table-detail-right-panel', 'table-detail-save', 'table-detail-remove'].forEach(id => {
    const el = $(id);
    if (el) el.classList.remove('edit-mode-disabled');
  });
}

export function renderTableDetailGuests(tableId) {
  const container = $('table-detail-guests');
  if (!container) return;
  container.innerHTML = '';

  const guests = guestsAtTable(tableId);
  if (guests.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size: 0.85rem; text-align:center;">Keine Gäste zugewiesen</p>';
    return;
  }

  guests.sort((a, b) => (a.seatNumber || 999) - (b.seatNumber || 999));

  const hr = document.createElement('div');
  hr.className = 'guest-list-header guest-list-header-full';
  hr.innerHTML = `
    <div class="guest-summary-left guest-summary-left-full">
      <div class="guest-col-firstname">First</div>
      <div class="guest-col-lastname">Last</div>
      <div class="guest-col-table">Table</div>
      <div class="guest-col-seat">Seat</div>
      <div class="guest-col-hc">HC</div>
      <div class="guest-col-age">Age</div>
      <div class="guest-col-diet">Diet</div>
    </div>
    <div class="guest-col-actions"></div>
  `;
  container.appendChild(hr);

  guests.forEach(g => {
    container.appendChild(renderGuestCard(g, true, true, true));
  });
}

function mountTableDetailModal() {
  if ($('table-detail-modal')) return;
  const container = $('modal-container') || document.body;
  const tpl = document.createElement('div');
  tpl.innerHTML = `
    <div class="modal-overlay" id="table-detail-modal" style="display:none">
      <div class="modal table-detail-modal-content" id="table-detail-modal-content">
        <div class="modal-header">
          <h2>Tischdetails</h2>
          <button class="modal-close" id="table-detail-close" title="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <div class="table-detail-header-controls">
            <div style="flex: 1;" id="td-rename-wrap">
              <label for="table-detail-rename">Tischnummer / Name</label>
              <input type="text" id="table-detail-rename" placeholder="z.B. 1A, VIP, Haupttisch" title="Tischnummer oder Tischnamen bearbeiten" />
            </div>
            <div style="flex: 0 0 auto;" id="td-seatcount-wrap">
              <label for="table-detail-seatcount">Tischvorlage / Größe</label>
              <select id="table-detail-seatcount" style="width: 200px;" title="Tischvorlage / Tischgröße anpassen"></select>
            </div>
            <div style="display: flex; align-items: flex-end; gap: 16px;">
              <label id="td-lbl-table-fixed" title="Tisch im Saalplan hervorheben und standardmäßig einklappen" style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; white-space: nowrap; font-weight: 500; text-transform: none; letter-spacing: 0; margin-bottom: 0;">
                <input type="checkbox" id="table-detail-table-fixed" style="margin:0; cursor:pointer; width:14px; height:14px; accent-color:#22c55e;" title="Tisch im Saalplan als platziert/fixiert markieren"> Gäste platziert
              </label>
              <label id="td-lbl-seat-fixed" title="Alle Sitzplatzränder im Saalplan grün hervorheben (Sitzordnung fixiert)" style="display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-secondary); cursor: pointer; white-space: nowrap; font-weight: 500; text-transform: none; letter-spacing: 0; margin-bottom: 0;">
                <input type="checkbox" id="table-detail-fixed" style="margin:0; cursor:pointer; width:14px; height:14px; accent-color:#22c55e;" title="Sitzplätze als fixiert markieren"> Plätze fixiert
              </label>
              <button class="btn btn-sm edit-mode-toggle" id="btn-rotate-table" title="Tisch um 90° drehen" style="display:none;">↻ Drehen</button>
              <button class="btn btn-sm edit-mode-toggle" id="btn-edit-mode" title="Bearbeitungsmodus: Plätze durch Anklicken aktivieren oder deaktivieren">🔧 Bearbeitungsmodus</button>
              <button class="btn btn-accent" id="table-detail-save" title="Tischnamen speichern">Name aktualisieren</button>
              <button class="btn btn-danger" id="table-detail-remove" title="Diesen Tisch aus dem Saalplan entfernen">🗑️ Tisch entfernen</button>
            </div>
          </div>
          <div class="table-detail-layout">
            <div class="table-detail-left-panel">
              <div class="table-detail-zoom-bar">
                <button class="btn btn-sm" id="btn-zoom-out" style="padding: 2px 8px;" title="Verkleinern">-</button>
                <span class="table-detail-zoom-level" id="zoom-level" title="Aktuelle Zoomstufe">100%</span>
                <button class="btn btn-sm" id="btn-zoom-in" style="padding: 2px 8px;" title="Vergrößern">+</button>
                <button class="btn btn-sm" id="btn-zoom-fit" style="padding: 2px 8px;" title="Ansicht anpassen">Fit</button>
              </div>
              <div class="table-detail-svg-container" id="table-detail-svg-container"></div>
            </div>
            <div class="table-detail-right-panel" id="table-detail-right-panel">
              <h3 class="table-detail-guests-header">Zugewiesene Gäste</h3>
              <div class="table-detail-guests-list" id="table-detail-guests"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(tpl.firstElementChild);
}

export function initTableDetailModal() {
  mountTableDetailModal();
  initTableDetailSVGNavigation();
  initTableDetailEdit();

  $('table-detail-close').addEventListener('click', closeTableDetailModal);
  $('table-detail-save').addEventListener('click', saveTableNumber);
  $('table-detail-rename').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveTableNumber();
    if (e.key === 'Escape') closeTableDetailModal();
  });
  $('table-detail-modal').addEventListener('click', e => {
    if (e.target === $('table-detail-modal')) closeTableDetailModal();
  });

  $('table-detail-remove').addEventListener('click', () => {
    const tblId = uiState.currentEditingTableId;
    if (!tblId) return;
    const tbl = state.tables.find(t => t.id === tblId);
    if (!tbl) return;
    const count = state.guests.filter(g => g.tableId === tblId).length;
    if (count > 0 && !confirm('Tisch ' + tbl.number + ' entfernen? ' + count + ' Gast/Gäste werden nicht mehr zugewiesen.')) return;

    closeTableDetailModal();
    removeTable(tblId);
  });

  $('table-detail-seatcount').addEventListener('change', function () {
    const tblId = uiState.currentEditingTableId;
    if (!tblId) return;
    const tbl = state.tables.find(t => t.id === tblId);
    if (!tbl) return;

    const val = this.value;
    if (val === 'current') return;

    if (val.startsWith('preset:')) {
      const count = parseInt(val.split(':')[1], 10);
      tbl.shape = 'circle';
      tbl.seatCount = count;
      tbl.seatsLong = null;
      tbl.seatsShort = null;
      tbl.tableCustomR = null;
      tbl.tableCustomW = null;
      tbl.tableCustomH = null;
      tbl.blueprintId = null;
      tbl.disabledSeats = [];
    } else if (val.startsWith('bp:')) {
      const bpId = val.slice(3);
      const bp = state.customBlueprints.find(b => b.id === bpId);
      if (bp) {
        tbl.shape = bp.shape;
        tbl.seatCount = bp.seatCount;
        tbl.seatsLong = bp.seatsLong != null ? bp.seatsLong : null;
        tbl.seatsShort = bp.seatsShort != null ? bp.seatsShort : null;
        tbl.tableCustomR = bp.tableCustomR != null ? bp.tableCustomR : null;
        tbl.tableCustomW = bp.tableCustomW != null ? bp.tableCustomW : null;
        tbl.tableCustomH = bp.tableCustomH != null ? bp.tableCustomH : null;
        tbl.blueprintId = bp.id;
        tbl.disabledSeats = (bp.disabledSeats || []).slice();
      }
    }

    // Compact seat numbers so nobody ends up on a non-existent / disabled seat
    const activeSeats = getActiveSeatNumbers(tbl);
    const seated = state.guests
      .filter(g => g.tableId === tbl.id && g.seatNumber)
      .sort((a, b) => a.seatNumber - b.seatNumber);
    seated.forEach((g, i) => { g.seatNumber = activeSeats[i] || null; });

    saveAndRender();
    populateTableDetailTemplateSelect(tbl);
    renderTableDetailSVG(tbl.id);
    zoomFit(tbl.id);
    renderTableDetailGuests(tbl.id);
  });

  $('table-detail-fixed').addEventListener('change', function () {
    const tblId = uiState.currentEditingTableId;
    if (!tblId) return;
    const tbl = state.tables.find(t => t.id === tblId);
    if (!tbl) return;
    tbl.seatsFixed = this.checked;
    updateTableDetailModalVisuals(tbl);
    saveAndRender();
  });

  $('table-detail-table-fixed').addEventListener('change', function () {
    const tblId = uiState.currentEditingTableId;
    if (!tblId) return;
    const tbl = state.tables.find(t => t.id === tblId);
    if (!tbl) return;
    tbl.fixed = this.checked;
    if (!this.checked) {
      tbl.seatsFixed = false;
      $('table-detail-fixed').checked = false;
    }
    updateTableDetailModalVisuals(tbl);
    saveAndRender();
  });
}
