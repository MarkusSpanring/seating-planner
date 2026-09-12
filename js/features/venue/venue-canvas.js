// ===== Venue Canvas SVG Rendering & Drag-Drop =====

import { SVG_NS, SEAT_R_CM } from '../../core/constants.js';
import { state, uiState, saveState, getVenueWidth, getVenueHeight } from '../../core/state.js';
import { $, getAdjustedFontSize } from '../../utils/dom.js';
import {
  getTableCenterSize,
  getSeatPositions,
  getTrapezoidPoints,
  getTableBounds,
  getTableCollisionRadius,
  isCollidingAt
} from '../../utils/geometry.js';
import { getTable, getDiet, guestAtSeat } from '../../utils/seating.js';
import { openTableDetail } from '../table-detail/table-detail-modal.js';
import { showTooltip, hideTooltip, showTableTooltip, renderLegends } from './venue-tooltips.js';

export function svgPoint(clientX, clientY) {
  const svg = uiState.svgElement;
  if (!svg) return { x: 0, y: 0 };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

export function renderVenue() {
  const container = $('venue-container');
  if (!container) return;
  container.innerHTML = '';

  const venueW = getVenueWidth();
  const venueH = getVenueHeight();

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${venueW} ${venueH}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('class', 'venue-svg');
  uiState.svgElement = svg;

  // Canvas background
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('id', 'venue-bg-rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', String(venueW));
  bg.setAttribute('height', String(venueH));
  bg.setAttribute('fill', 'rgba(30,34,46,0.4)');
  bg.setAttribute('rx', '8');
  svg.appendChild(bg);

  // Grid dots (50 cm with 100 cm / 1 m emphasis)
  const dotsGroup = document.createElementNS(SVG_NS, 'g');
  dotsGroup.setAttribute('id', 'venue-grid-dots');
  for (let gx = 50; gx < venueW; gx += 50) {
    for (let gy = 50; gy < venueH; gy += 50) {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', String(gx));
      dot.setAttribute('cy', String(gy));
      const isMeter = (gx % 100 === 0 && gy % 100 === 0);
      dot.setAttribute('r', isMeter ? '1.8' : '1.0');
      dot.setAttribute('fill', isMeter ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)');
      dotsGroup.appendChild(dot);
    }
  }
  svg.appendChild(dotsGroup);

  // Empty state message
  if (state.tables.length === 0) {
    const txt1 = document.createElementNS(SVG_NS, 'text');
    txt1.setAttribute('x', String(venueW / 2));
    txt1.setAttribute('y', String(venueH / 2 - 15));
    txt1.setAttribute('fill', 'rgba(255,255,255,0.2)');
    txt1.setAttribute('font-size', '24px');
    txt1.setAttribute('font-family', "'Inter',sans-serif");
    txt1.setAttribute('font-weight', '500');
    txt1.setAttribute('text-anchor', 'middle');
    txt1.textContent = 'Tische mit den Schaltflächen oben hinzufügen';
    svg.appendChild(txt1);

    const txt2 = document.createElementNS(SVG_NS, 'text');
    txt2.setAttribute('x', String(venueW / 2));
    txt2.setAttribute('y', String(venueH / 2 + 22));
    txt2.setAttribute('fill', 'rgba(255,255,255,0.12)');
    txt2.setAttribute('font-size', '16px');
    txt2.setAttribute('font-family', "'Inter',sans-serif");
    txt2.setAttribute('font-weight', '400');
    txt2.setAttribute('text-anchor', 'middle');
    txt2.textContent = 'Dann ziehen und anordnen (1 Punkt = 1 cm)';
    svg.appendChild(txt2);
  }

  let lastMouseUpWasDrag = false;

  // Render tables
  state.tables.forEach(table => {
    const seatR = SEAT_R_CM;
    const geo = getTableCenterSize(table, seatR, false);
    const disabled = Array.isArray(table.disabledSeats) ? table.disabledSeats : [];

    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('transform', `translate(${table.x},${table.y})`);
    group.setAttribute('style', 'cursor: grab;');
    group.setAttribute('data-table-id', String(table.id));

    // Table center
    let center;
    if (geo.type === 'rect') {
      center = document.createElementNS(SVG_NS, 'rect');
      center.setAttribute('x', String(-geo.w / 2));
      center.setAttribute('y', String(-geo.h / 2));
      center.setAttribute('width', String(geo.w));
      center.setAttribute('height', String(geo.h));
      center.setAttribute('fill', table.fixed ? 'rgba(34,197,94,0.12)' : 'rgba(139,92,246,0.15)');
      center.setAttribute('stroke', table.fixed ? '#22c55e' : 'rgba(139,92,246,0.35)');
      center.setAttribute('stroke-width', table.fixed ? '3' : '2.5');
      center.setAttribute('rx', '8');
    } else {
      center = document.createElementNS(SVG_NS, 'circle');
      center.setAttribute('cx', '0');
      center.setAttribute('cy', '0');
      center.setAttribute('r', String(geo.r));
      center.setAttribute('fill', table.fixed ? 'rgba(34,197,94,0.12)' : 'rgba(139,92,246,0.15)');
      center.setAttribute('stroke', table.fixed ? '#22c55e' : 'rgba(139,92,246,0.35)');
      center.setAttribute('stroke-width', table.fixed ? '3' : '2.5');
    }

    // Table number / name
    const tableName = table.name || String(table.number);
    group.appendChild(center);

    center.addEventListener('mouseenter', e => {
      if (uiState.dragState) return;
      showTableTooltip(e, table);
    });
    center.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    const containerWidth = geo.type === 'rect' ? geo.w : geo.r * 2;
    const fontSize = getAdjustedFontSize(tableName, containerWidth, 24);

    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('x', '0');
    textEl.setAttribute('y', '0');
    textEl.setAttribute('fill', '#e8eaed');
    textEl.setAttribute('font-size', fontSize + 'px');
    textEl.setAttribute('font-weight', '700');
    textEl.setAttribute('font-family', "'Inter',sans-serif");
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    textEl.setAttribute('style', 'pointer-events:none;');
    textEl.textContent = tableName;
    group.appendChild(textEl);

    // Seats
    const seats = getSeatPositions(
      table.seatCount,
      seatR,
      table.shape,
      table.seatsLong,
      table.seatsShort,
      table.tableCustomR,
      table.tableCustomW,
      table.tableCustomH
    );

    seats.forEach(seat => {
      if (disabled.indexOf(seat.number) >= 0) return;
      const guest = guestAtSeat(table.id, seat.number);
      const diet = guest ? getDiet(guest.dietId) : null;
      const fillColor = (diet && diet.id !== 'none') ? diet.color : 'rgba(255,255,255,0.06)';

      const strokeColor = table.seatsFixed
        ? (guest ? '#22c55e' : 'rgba(34,197,94,0.3)')
        : (guest ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)');
      const strokeWidth = guest ? 2.5 : 1.5;

      let shapeEl;
      if (guest && guest.needsHighChair) {
        shapeEl = document.createElementNS(SVG_NS, 'polygon');
        shapeEl.setAttribute('points', getTrapezoidPoints(seat.x, seat.y, seatR));
        shapeEl.setAttribute('fill', fillColor);
        shapeEl.setAttribute('stroke', strokeColor);
        shapeEl.setAttribute('stroke-width', String(strokeWidth));
        shapeEl.setAttribute('stroke-linejoin', 'round');
        shapeEl.setAttribute('transform', `rotate(${seat.angleDeg},${seat.x},${seat.y})`);
        shapeEl.setAttribute('style', 'cursor:pointer;transition:all 0.2s ease;');
        shapeEl.setAttribute('data-seat', String(seat.number));
      } else {
        const sqR = seatR * 0.925;
        shapeEl = document.createElementNS(SVG_NS, 'rect');
        shapeEl.setAttribute('x', String(seat.x - sqR));
        shapeEl.setAttribute('y', String(seat.y - sqR));
        shapeEl.setAttribute('width', String(sqR * 2));
        shapeEl.setAttribute('height', String(sqR * 2));
        shapeEl.setAttribute('fill', fillColor);
        shapeEl.setAttribute('stroke', strokeColor);
        shapeEl.setAttribute('stroke-width', String(strokeWidth));
        shapeEl.setAttribute('rx', '4');
        shapeEl.setAttribute('style', 'cursor:pointer;transition:all 0.2s ease;');
        shapeEl.setAttribute('data-seat', String(seat.number));
      }

      shapeEl.addEventListener('mouseenter', e => {
        if (uiState.dragState) return;
        showTooltip(e, table, seat.number, guest, diet);
        shapeEl.setAttribute('stroke', '#8b5cf6');
        shapeEl.setAttribute('stroke-width', '2.5');
      });
      shapeEl.addEventListener('mouseleave', () => {
        hideTooltip();
        shapeEl.setAttribute('stroke', strokeColor);
        shapeEl.setAttribute('stroke-width', String(strokeWidth));
      });
      group.appendChild(shapeEl);

      const sNumEl = document.createElementNS(SVG_NS, 'text');
      sNumEl.setAttribute('x', String(seat.x));
      sNumEl.setAttribute('y', String(seat.y));
      sNumEl.setAttribute('fill', guest ? '#dedede' : '#5f6368');
      sNumEl.setAttribute('font-size', '14px');
      sNumEl.setAttribute('font-weight', '600');
      sNumEl.setAttribute('font-family', "'Inter',sans-serif");
      sNumEl.setAttribute('text-anchor', 'middle');
      sNumEl.setAttribute('dominant-baseline', 'central');
      sNumEl.setAttribute('style', 'pointer-events:none;');
      sNumEl.textContent = String(seat.number);
      group.appendChild(sNumEl);
    });

    // Drag handlers
    group.addEventListener('mousedown', e => {
      const p = svgPoint(e.clientX, e.clientY);
      uiState.dragState = {
        tableId: table.id,
        offsetX: p.x - table.x,
        offsetY: p.y - table.y,
        groupEl: group,
        moved: false,
        originalX: table.x,
        originalY: table.y
      };
      group.style.cursor = 'grabbing';
      hideTooltip();
    });

    group.addEventListener('click', () => {
      if (!lastMouseUpWasDrag) {
        openTableDetail(table.id);
      }
    });

    svg.appendChild(group);
  });

  // SVG-level mouse handlers for drag
  svg.addEventListener('mousemove', e => {
    if (!uiState.dragState) return;
    e.preventDefault();
    const p = svgPoint(e.clientX, e.clientY);
    let newX = p.x - uiState.dragState.offsetX;
    let newY = p.y - uiState.dragState.offsetY;

    const tbl = getTable(uiState.dragState.tableId);
    if (Math.abs(newX - tbl.x) > 3 || Math.abs(newY - tbl.y) > 3) {
      uiState.dragState.moved = true;
    }

    const bounds = getTableBounds(tbl, SEAT_R_CM);
    const padX = bounds.type === 'rect' ? bounds.hw : bounds.r;
    const padY = bounds.type === 'rect' ? bounds.hh : bounds.r;
    const currentVenueW = getVenueWidth();
    const currentVenueH = getVenueHeight();
    newX = Math.max(padX, Math.min(currentVenueW - padX, newX));
    newY = Math.max(padY, Math.min(currentVenueH - padY, newY));

    const collides = isCollidingAt(newX, newY, tbl, tbl.id);

    const centerEl = uiState.dragState.groupEl.querySelector('circle, rect');
    if (centerEl) {
      if (collides) {
        centerEl.setAttribute('fill', 'rgba(239, 68, 68, 0.25)');
        centerEl.setAttribute('stroke', '#ef4444');
        centerEl.setAttribute('stroke-width', '3');
      } else {
        centerEl.setAttribute('fill', tbl.fixed ? 'rgba(34,197,94,0.12)' : 'rgba(139,92,246,0.15)');
        centerEl.setAttribute('stroke', tbl.fixed ? '#22c55e' : 'rgba(139,92,246,0.35)');
        centerEl.setAttribute('stroke-width', tbl.fixed ? '2.5' : '2');
      }
    }

    uiState.dragState.groupEl.setAttribute('transform', `translate(${newX},${newY})`);
    tbl.x = newX;
    tbl.y = newY;
  });

  const stopDragging = () => {
    if (!uiState.dragState) return;
    uiState.dragState.groupEl.style.cursor = 'grab';
    lastMouseUpWasDrag = uiState.dragState.moved;

    if (uiState.dragState.moved) {
      const tbl = getTable(uiState.dragState.tableId);
      if (tbl) {
        const collides = isCollidingAt(tbl.x, tbl.y, tbl, tbl.id);

        if (collides) {
          tbl.x = uiState.dragState.originalX;
          tbl.y = uiState.dragState.originalY;
          renderVenue();
        } else {
          saveState();
          renderVenue();
        }
      }
    }

    uiState.dragState = null;
  };

  svg.addEventListener('mouseup', stopDragging);
  svg.addEventListener('mouseleave', stopDragging);

  const globalUsedDiets = {};
  state.guests.forEach(g => {
    if (g.tableId && g.seatNumber && g.dietId !== 'none') {
      globalUsedDiets[g.dietId] = true;
    }
  });

  const globalDietIds = Object.keys(globalUsedDiets);
  renderLegends(globalDietIds);

  container.appendChild(svg);
}

