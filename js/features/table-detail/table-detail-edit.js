// ===== Table Detail Edit Mode & Rotation =====

import { state, uiState, saveAndRender } from '../../core/state.js';
import { $ } from '../../utils/dom.js';
import { getTable } from '../../utils/seating.js';
import { renderTableDetailSVG } from './table-detail-svg.js';

export function toggleEditMode() {
  uiState.detailEditMode = !uiState.detailEditMode;
  uiState.selectedDetailSeat = null; // clear swap selection

  const emBtn = $('btn-edit-mode');
  const rotBtn = $('btn-rotate-table');

  const elements = [
    'td-rename-wrap',
    'td-seatcount-wrap',
    'td-lbl-table-fixed',
    'td-lbl-seat-fixed',
    'table-detail-right-panel',
    'table-detail-remove'
  ];

  if (emBtn) {
    if (uiState.detailEditMode) {
      emBtn.classList.add('active');
      emBtn.title = 'Bearbeitungsmodus beenden';
      if (uiState.currentEditingTableId) {
        const tbl = getTable(uiState.currentEditingTableId);
        if (tbl && tbl.shape === 'rectangle' && tbl.seatsLong != null) {
          if (rotBtn) {
            rotBtn.style.display = 'inline-flex';
            rotBtn.title = 'Rechteckigen Tisch um 90 Grad drehen';
          }
        }
      }
      elements.forEach(id => {
        const el = $(id);
        if (el) el.classList.add('edit-mode-disabled');
      });
    } else {
      emBtn.classList.remove('active');
      emBtn.title = 'Bearbeitungsmodus: Plätze durch Anklicken aktivieren oder deaktivieren';
      if (rotBtn) rotBtn.style.display = 'none';
      elements.forEach(id => {
        const el = $(id);
        if (el) el.classList.remove('edit-mode-disabled');
      });
    }
  }
  if (uiState.currentEditingTableId) {
    renderTableDetailSVG(uiState.currentEditingTableId);
  }
}

export function rotateCurrentTable() {
  if (!uiState.currentEditingTableId || !uiState.detailEditMode) return;
  const tbl = state.tables.find(t => t.id === uiState.currentEditingTableId);
  if (!tbl || tbl.shape !== 'rectangle' || tbl.seatsLong == null) return;

  const totalSeats = tbl.seatCount;
  const shift = tbl.isRotated ? -tbl.seatsLong : tbl.seatsShort;

  // Update guests
  state.guests.forEach(g => {
    if (g.tableId === tbl.id && g.seatNumber) {
      let newNum = (g.seatNumber + shift) % totalSeats;
      if (newNum <= 0) newNum += totalSeats;
      g.seatNumber = newNum;
    }
  });

  // Update disabled seats
  if (Array.isArray(tbl.disabledSeats)) {
    tbl.disabledSeats = tbl.disabledSeats.map(s => {
      let newNum = (s + shift) % totalSeats;
      if (newNum <= 0) newNum += totalSeats;
      return newNum;
    });
  }

  tbl.isRotated = !tbl.isRotated;

  const temp = tbl.seatsLong;
  tbl.seatsLong = tbl.seatsShort;
  tbl.seatsShort = temp;

  const tempW = tbl.tableCustomW;
  tbl.tableCustomW = tbl.tableCustomH;
  tbl.tableCustomH = tempW;

  tbl.seatsFixed = false;

  saveAndRender();
}

export function initTableDetailEdit() {
  const emBtn = $('btn-edit-mode');
  if (emBtn) emBtn.addEventListener('click', toggleEditMode);

  const rotBtn = $('btn-rotate-table');
  if (rotBtn) rotBtn.addEventListener('click', rotateCurrentTable);
}

