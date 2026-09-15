// ===== Table Detail SVG Rendering & Navigation =====

import { SVG_NS } from '../../core/constants.js';
import { uiState, saveAndRender } from '../../core/state.js';
import { $, getAdjustedFontSize } from '../../utils/dom.js';
import {
  getTableCenterSize,
  getSeatPositions,
  getTrapezoidPoints
} from '../../utils/geometry.js';
import {
  getTable,
  getDiet,
  guestAtSeat
} from '../../utils/seating.js';

export function updateZoomDisplay() {
  const el = $('zoom-level');
  if (el) el.textContent = Math.round(uiState.detailZoom * 100) + '%';
}

export function zoomFit(tableId) {
  if (!tableId) return;
  const tbl = getTable(tableId);
  if (!tbl) return;
  const seatR = 44;
  const geo = getTableCenterSize(tbl, seatR, false);
  const maxExtent = (geo.type === 'rect') ? Math.max(geo.w / 2, geo.h / 2) + seatR * 2.65 : geo.r + seatR * 2.65;
  uiState.detailZoom = Math.min(1.0, 190 / maxExtent);
  uiState.detailPanX = 0;
  uiState.detailPanY = 0;
  updateZoomDisplay();
  renderTableDetailSVG(tableId);
}

export function renderTableDetailSVG(tableId) {
  const tbl = getTable(tableId);
  const container = $('table-detail-svg-container');
  if (!container) return;
  container.innerHTML = '';
  if (!tbl) return;

  const disabled = Array.isArray(tbl.disabledSeats) ? tbl.disabledSeats : [];
  const viewSize = 400 / uiState.detailZoom;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `${-uiState.detailPanX} ${-uiState.detailPanY} ${viewSize} ${viewSize}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('xmlns', SVG_NS);

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${viewSize / 2},${viewSize / 2})`);

  const seatR = 44;
  const geo = getTableCenterSize(tbl, seatR, false);

  // Table center — auto-sized circle or rectangle
  if (geo.type === 'rect') {
    const center = document.createElementNS(SVG_NS, 'rect');
    center.setAttribute('x', String(-geo.w / 2));
    center.setAttribute('y', String(-geo.h / 2));
    center.setAttribute('width', String(geo.w));
    center.setAttribute('height', String(geo.h));
    center.setAttribute('fill', '#4b5563');
    center.setAttribute('stroke', '#6b7280');
    center.setAttribute('stroke-width', '3');
    center.setAttribute('rx', '8');
    g.appendChild(center);
  } else {
    const center = document.createElementNS(SVG_NS, 'circle');
    center.setAttribute('cx', '0');
    center.setAttribute('cy', '0');
    center.setAttribute('r', String(geo.r));
    center.setAttribute('fill', '#4b5563');
    center.setAttribute('stroke', '#6b7280');
    center.setAttribute('stroke-width', '3');
    g.appendChild(center);
  }

  const tableName = tbl.name || ('Tisch ' + tbl.number);
  const containerWidth = geo.type === 'rect' ? geo.w : geo.r * 2;
  const fontSize = getAdjustedFontSize(tableName, containerWidth, 22);

  const textEl = document.createElementNS(SVG_NS, 'text');
  textEl.setAttribute('x', '0');
  textEl.setAttribute('y', '0');
  textEl.setAttribute('fill', '#f3f4f6');
  textEl.setAttribute('font-size', fontSize + 'px');
  textEl.setAttribute('font-weight', '700');
  textEl.setAttribute('font-family', "'Inter',sans-serif");
  textEl.setAttribute('text-anchor', 'middle');
  textEl.setAttribute('dominant-baseline', 'central');
  textEl.textContent = tableName;
  g.appendChild(textEl);

  const seats = getSeatPositions(
    tbl.seatCount,
    seatR,
    tbl.shape,
    tbl.seatsLong,
    tbl.seatsShort,
    tbl.tableCustomR,
    tbl.tableCustomW,
    tbl.tableCustomH
  );
  seats.forEach(seat => {
    const isDisabled = disabled.indexOf(seat.number) >= 0;

    // In normal mode: skip disabled seats entirely
    // In edit mode: render disabled seats as ghosts
    if (isDisabled && !uiState.detailEditMode) return;

    const guest = isDisabled ? null : guestAtSeat(tbl.id, seat.number);
    const diet = guest ? getDiet(guest.dietId) : null;
    let fillColor, strokeColor;

    if (isDisabled) {
      fillColor = 'rgba(255,255,255,0.04)';
      strokeColor = 'rgba(255,255,255,0.2)';
    } else {
      fillColor = (diet && diet.id !== 'none') ? diet.color : (guest ? '#e5e7eb' : '#ffffff');
      strokeColor = guest ? '#9ca3af' : '#d1d5db';
    }

    let shapeEl;
    if (!isDisabled && guest && guest.needsHighChair) {
      shapeEl = document.createElementNS(SVG_NS, 'polygon');
      shapeEl.setAttribute('points', getTrapezoidPoints(seat.x, seat.y, seatR));
      shapeEl.setAttribute('fill', fillColor);
      shapeEl.setAttribute('stroke', strokeColor);
      shapeEl.setAttribute('stroke-width', '2.5');
      shapeEl.setAttribute('stroke-linejoin', 'round');
      shapeEl.setAttribute('transform', `rotate(${seat.angleDeg},${seat.x},${seat.y})`);
    } else {
      const sqR = seatR * 0.925;
      shapeEl = document.createElementNS(SVG_NS, 'rect');
      shapeEl.setAttribute('x', String(seat.x - sqR));
      shapeEl.setAttribute('y', String(seat.y - sqR));
      shapeEl.setAttribute('width', String(sqR * 2));
      shapeEl.setAttribute('height', String(sqR * 2));
      shapeEl.setAttribute('fill', fillColor);
      shapeEl.setAttribute('stroke', strokeColor);
      shapeEl.setAttribute('stroke-width', isDisabled ? '1.5' : (guest ? '2.5' : '1.5'));
      shapeEl.setAttribute('rx', '4');
    }

    if (isDisabled) {
      shapeEl.setAttribute('stroke-dasharray', '6 4');
      shapeEl.style.opacity = '0.5';
    }

    // Highlight selected seat for swap (normal mode only)
    if (!uiState.detailEditMode) {
      const isSelected = (uiState.selectedDetailSeat === seat.number);
      if (isSelected) {
        shapeEl.setAttribute('stroke', '#f59e0b');
        shapeEl.setAttribute('stroke-width', '3.5');
        shapeEl.style.filter = 'drop-shadow(0 0 6px rgba(245,158,11,0.7))';
      }
    }
    shapeEl.style.cursor = 'pointer';

    const svgTitle = document.createElementNS(SVG_NS, 'title');
    if (uiState.detailEditMode) {
      svgTitle.textContent = isDisabled
        ? `Platz ${seat.number}: Deaktiviert (Klicken zum Reaktivieren)`
        : `Platz ${seat.number}: Aktiv (Klicken zum Deaktivieren)`;
    } else {
      if (guest) {
        svgTitle.textContent = `Platz ${seat.number}: ${guest.firstName} ${guest.lastName || ''}${guest.needsHighChair ? ' (Hochstuhl)' : ''}${diet && diet.id !== 'none' ? ' · ' + diet.name : ''} (Klicken zum Auswählen/Tauschen)`;
      } else {
        svgTitle.textContent = `Platz ${seat.number}: Frei (Klicken zum Auswählen/Tauschen)`;
      }
    }
    shapeEl.appendChild(svgTitle);

    g.appendChild(shapeEl);

    // Click handler: edit mode = toggle disable; normal mode = select/swap
    shapeEl.addEventListener('click', () => {
      if (uiState.detailEditMode) {
        const tblRef = getTable(uiState.currentEditingTableId);
        if (!tblRef) return;
        if (!Array.isArray(tblRef.disabledSeats)) tblRef.disabledSeats = [];
        const idx = tblRef.disabledSeats.indexOf(seat.number);
        if (idx >= 0) {
          tblRef.disabledSeats.splice(idx, 1);
        } else {
          const occupant = guestAtSeat(tblRef.id, seat.number);
          if (occupant) {
            if (!confirm(`Platz ${seat.number} ist belegt von ${occupant.firstName} ${occupant.lastName || ''}. Gast wird nicht mehr zugewiesen. Fortfahren?`)) return;
            occupant.tableId = null;
            occupant.seatNumber = null;
            tblRef.fixed = false;
            tblRef.seatsFixed = false;
          }
          tblRef.disabledSeats.push(seat.number);
        }
        saveAndRender();
      } else {
        if (uiState.selectedDetailSeat === null) {
          uiState.selectedDetailSeat = seat.number;
          renderTableDetailSVG(uiState.currentEditingTableId);
        } else if (uiState.selectedDetailSeat === seat.number) {
          uiState.selectedDetailSeat = null;
          renderTableDetailSVG(uiState.currentEditingTableId);
        } else {
          const tblId = uiState.currentEditingTableId;
          const gA = guestAtSeat(tblId, uiState.selectedDetailSeat);
          const gB = guestAtSeat(tblId, seat.number);
          const tmpSeat = uiState.selectedDetailSeat;
          if (gA) gA.seatNumber = seat.number;
          if (gB) gB.seatNumber = tmpSeat;
          const tblObj = getTable(tblId);
          if (tblObj) {
            tblObj.seatsFixed = false;
          }
          uiState.selectedDetailSeat = null;
          saveAndRender();
        }
      }
    });

    const hasDiet = guest ? (diet && diet.id !== 'none') : false;
    const textColor = isDisabled ? 'rgba(255,255,255,0.3)' : (hasDiet ? '#ffffff' : '#374151');

    // Seat number badge
    const nameOffset = (guest && !uiState.detailEditMode) ? seatR * 0.52 : 0;
    const sBadge = document.createElementNS(SVG_NS, 'text');
    sBadge.setAttribute('x', String(seat.x));
    sBadge.setAttribute('y', String(seat.y - nameOffset));
    sBadge.setAttribute('fill', isDisabled ? 'rgba(255,255,255,0.3)' : (guest ? (hasDiet ? 'rgba(255,255,255,0.75)' : '#6b7280') : '#9ca3af'));
    sBadge.setAttribute('font-size', '13px');
    sBadge.setAttribute('font-weight', '700');
    sBadge.setAttribute('font-family', "'Inter',sans-serif");
    sBadge.setAttribute('text-anchor', 'middle');
    sBadge.setAttribute('dominant-baseline', 'central');
    sBadge.setAttribute('style', 'pointer-events: none;');
    sBadge.textContent = String(seat.number);
    g.appendChild(sBadge);

    if (isDisabled) {
      const cross = document.createElementNS(SVG_NS, 'text');
      cross.setAttribute('x', String(seat.x));
      cross.setAttribute('y', String(seat.y + 4));
      cross.setAttribute('fill', 'rgba(255,255,255,0.25)');
      cross.setAttribute('font-size', '24px');
      cross.setAttribute('font-weight', '700');
      cross.setAttribute('font-family', "'Inter',sans-serif");
      cross.setAttribute('text-anchor', 'middle');
      cross.setAttribute('dominant-baseline', 'central');
      cross.setAttribute('style', 'pointer-events: none;');
      cross.textContent = '✕';
      g.appendChild(cross);
    } else if (guest && !uiState.detailEditMode) {
      const names = guest.firstName.split(' ');
      if (guest.lastName) names.push(guest.lastName);

      const yOffset = names.length > 1 ? -4 : 4;
      const firstNameText = document.createElementNS(SVG_NS, 'text');
      firstNameText.setAttribute('x', String(seat.x));
      firstNameText.setAttribute('y', String(seat.y + yOffset));
      firstNameText.setAttribute('fill', textColor);
      firstNameText.setAttribute('font-size', '15px');
      firstNameText.setAttribute('font-weight', '600');
      firstNameText.setAttribute('font-family', "'Inter',sans-serif");
      firstNameText.setAttribute('text-anchor', 'middle');
      firstNameText.setAttribute('dominant-baseline', 'central');
      firstNameText.setAttribute('style', 'pointer-events: none;');
      firstNameText.textContent = names[0];
      g.appendChild(firstNameText);

      if (names.length > 1) {
        const lastNameInitial = document.createElementNS(SVG_NS, 'text');
        lastNameInitial.setAttribute('x', String(seat.x));
        lastNameInitial.setAttribute('y', String(seat.y + 16));
        lastNameInitial.setAttribute('fill', textColor);
        lastNameInitial.setAttribute('font-size', '15px');
        lastNameInitial.setAttribute('font-weight', '600');
        lastNameInitial.setAttribute('font-family', "'Inter',sans-serif");
        lastNameInitial.setAttribute('text-anchor', 'middle');
        lastNameInitial.setAttribute('dominant-baseline', 'central');
        lastNameInitial.setAttribute('style', 'pointer-events: none;');
        lastNameInitial.textContent = names[1].charAt(0) + '.';
        g.appendChild(lastNameInitial);
      }
    }
  });

  svg.appendChild(g);
  container.appendChild(svg);
}

export function initTableDetailSVGNavigation() {
  $('btn-zoom-in').addEventListener('click', () => {
    uiState.detailZoom = Math.min(2.0, uiState.detailZoom + 0.1);
    updateZoomDisplay();
    if (uiState.currentEditingTableId) renderTableDetailSVG(uiState.currentEditingTableId);
  });

  $('btn-zoom-out').addEventListener('click', () => {
    uiState.detailZoom = Math.max(0.2, uiState.detailZoom - 0.1);
    updateZoomDisplay();
    if (uiState.currentEditingTableId) renderTableDetailSVG(uiState.currentEditingTableId);
  });

  $('btn-zoom-fit').addEventListener('click', () => {
    zoomFit(uiState.currentEditingTableId);
  });

  const svgContainer = $('table-detail-svg-container');
  if (!svgContainer) return;

  let isDetailPanning = false;
  let lastPanClientX, lastPanClientY;

  svgContainer.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const targetStyle = window.getComputedStyle(e.target);
    if (e.target.tagName !== 'svg' && targetStyle.cursor === 'pointer') return;

    isDetailPanning = true;
    lastPanClientX = e.clientX;
    lastPanClientY = e.clientY;
    svgContainer.style.cursor = 'grabbing';
    e.preventDefault();
  });

  window.addEventListener('mousemove', e => {
    if (!isDetailPanning) return;
    const dx = e.clientX - lastPanClientX;
    const dy = e.clientY - lastPanClientY;
    lastPanClientX = e.clientX;
    lastPanClientY = e.clientY;

    const rect = svgContainer.getBoundingClientRect();
    const viewSize = 400 / uiState.detailZoom;
    const minDim = Math.min(rect.width, rect.height);
    const scale = viewSize / minDim;

    uiState.detailPanX += dx * scale;
    uiState.detailPanY += dy * scale;

    const svg = svgContainer.querySelector('svg');
    if (svg) {
      svg.setAttribute('viewBox', (-uiState.detailPanX) + ' ' + (-uiState.detailPanY) + ' ' + viewSize + ' ' + viewSize);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDetailPanning) {
      isDetailPanning = false;
      svgContainer.style.cursor = '';
    }
  });
}

