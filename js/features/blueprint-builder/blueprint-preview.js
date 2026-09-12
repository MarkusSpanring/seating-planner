// ===== Blueprint Builder Preview =====

import { SVG_NS } from '../../core/constants.js';
import { uiState } from '../../core/state.js';
import { $ } from '../../utils/dom.js';
import {
  computeCircleOrbit,
  getTableCenterSize,
  getSeatPositions
} from '../../utils/geometry.js';

export function getBpShape() {
  const rectBtn = $('bp-shape-rect');
  return rectBtn && rectBtn.classList.contains('active') ? 'rectangle' : 'circle';
}

export function renderBlueprintPreview() {
  const container = $('bp-preview');
  if (!container) return;
  container.innerHTML = '';

  const shape = getBpShape();
  const seatR = 30;
  let count, seatsLong, seatsShort;

  if (shape === 'rectangle') {
    seatsLong = parseInt($('bp-seats-long').value) || 3;
    seatsShort = parseInt($('bp-seats-short').value) || 1;
    count = 2 * (seatsLong + seatsShort);
    const totalEl = $('bp-total-display');
    if (totalEl) totalEl.textContent = String(count);
  } else {
    count = parseInt($('bp-seat-count').value) || 8;
    seatsLong = null;
    seatsShort = null;
  }

  // Compute auto-sized minimums
  const fakeTable = { seatCount: count, shape: shape, seatsLong: seatsLong, seatsShort: seatsShort };
  const autoGeo = getTableCenterSize(fakeTable, seatR, true);

  // Sync size sliders
  if (shape === 'rectangle') {
    const minW = Math.round(autoGeo.w), minH = Math.round(autoGeo.h);
    const wEl = $('bp-table-w-slider'), wIn = $('bp-table-w-input');
    const hEl = $('bp-table-h-slider'), hIn = $('bp-table-h-input');
    wEl.min = String(minW); wIn.min = String(minW);
    hEl.min = String(minH); hIn.min = String(minH);
    if (isNaN(parseFloat(wIn.value)) || parseFloat(wIn.value) < minW) { wEl.value = String(minW); wIn.value = String(minW); }
    if (isNaN(parseFloat(hIn.value)) || parseFloat(hIn.value) < minH) { hEl.value = String(minH); hIn.value = String(minH); }
    const hint = $('bp-table-wh-min-hint');
    if (hint) hint.textContent = 'Min. B: ' + minW + ' cm · Min. H: ' + minH + ' cm (' + (minW / 100).toFixed(2) + ' × ' + (minH / 100).toFixed(2) + ' m)';
  } else {
    const minR = Math.round(autoGeo.r);
    const rEl = $('bp-table-r-slider'), rIn = $('bp-table-r-input');
    rEl.min = String(minR); rIn.min = String(minR);
    if (isNaN(parseFloat(rIn.value)) || parseFloat(rIn.value) < minR) { rEl.value = String(minR); rIn.value = String(minR); }
    const hint = $('bp-table-r-min-hint');
    if (hint) hint.textContent = 'Min. Radius: ' + minR + ' cm (Ø ' + (minR * 2) + ' cm / ' + ((minR * 2) / 100).toFixed(2) + ' m)';
  }

  // Read custom size from inputs
  const customR = (shape === 'circle') ? parseFloat($('bp-table-r-input').value) || autoGeo.r : null;
  const customW = (shape === 'rectangle') ? parseFloat($('bp-table-w-input').value) || autoGeo.w : null;
  const customH = (shape === 'rectangle') ? parseFloat($('bp-table-h-input').value) || autoGeo.h : null;

  // Build geo with custom size applied
  let geo;
  if (shape === 'rectangle') {
    geo = { type: 'rect', w: Math.max(autoGeo.w, customW), h: Math.max(autoGeo.h, customH) };
  } else {
    geo = { type: 'circle', r: Math.max(autoGeo.r, customR) };
  }

  // Compute SVG size to fit
  let maxExtent;
  if (geo.type === 'rect') {
    maxExtent = Math.max(geo.w / 2, geo.h / 2) + seatR + 5 + seatR + 10;
  } else {
    const actualOrbit = Math.max(computeCircleOrbit(count, seatR), (customR || 0) + seatR + seatR * 0.3);
    maxExtent = actualOrbit + seatR + 10;
  }
  const svgSize = Math.max(300, maxExtent * 2);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${svgSize} ${svgSize}`);
  svg.setAttribute('width', '100%');

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${svgSize / 2},${svgSize / 2})`);

  // Table center
  if (geo.type === 'rect') {
    const center = document.createElementNS(SVG_NS, 'rect');
    center.setAttribute('x', String(-geo.w / 2));
    center.setAttribute('y', String(-geo.h / 2));
    center.setAttribute('width', String(geo.w));
    center.setAttribute('height', String(geo.h));
    center.setAttribute('fill', '#4b5563');
    center.setAttribute('stroke', '#6b7280');
    center.setAttribute('stroke-width', '2.5');
    center.setAttribute('rx', '6');
    g.appendChild(center);
  } else {
    const center = document.createElementNS(SVG_NS, 'circle');
    center.setAttribute('cx', '0');
    center.setAttribute('cy', '0');
    center.setAttribute('r', String(geo.r));
    center.setAttribute('fill', '#4b5563');
    center.setAttribute('stroke', '#6b7280');
    center.setAttribute('stroke-width', '2.5');
    g.appendChild(center);
  }

  const seats = getSeatPositions(
    count,
    seatR,
    shape,
    seatsLong,
    seatsShort,
    (shape === 'circle' ? customR : null),
    (shape === 'rectangle' ? customW : null),
    (shape === 'rectangle' ? customH : null)
  );

  const disabledCount = uiState.bpPreviewDisabledSeats.length;

  seats.forEach(seat => {
    const isDisabled = uiState.bpPreviewDisabledSeats.indexOf(seat.number) >= 0;
    const fillColor = isDisabled ? 'rgba(255,255,255,0.04)' : '#ffffff';
    const strokeColor = isDisabled ? 'rgba(255,255,255,0.2)' : '#d1d5db';

    const sqR = seatR * 0.925;
    const shapeEl = document.createElementNS(SVG_NS, 'rect');
    shapeEl.setAttribute('x', String(seat.x - sqR));
    shapeEl.setAttribute('y', String(seat.y - sqR));
    shapeEl.setAttribute('width', String(sqR * 2));
    shapeEl.setAttribute('height', String(sqR * 2));
    shapeEl.setAttribute('fill', fillColor);
    shapeEl.setAttribute('stroke', strokeColor);
    shapeEl.setAttribute('stroke-width', isDisabled ? '1.5' : '2');
    shapeEl.setAttribute('rx', '4');

    if (isDisabled) {
      shapeEl.setAttribute('stroke-dasharray', '5 3');
      shapeEl.style.opacity = '0.5';
    }

    shapeEl.style.cursor = 'pointer';

    const svgTitle = document.createElementNS(SVG_NS, 'title');
    svgTitle.textContent = isDisabled
      ? `Platz ${seat.number}: Deaktiviert (Klicken zum Reaktivieren)`
      : `Platz ${seat.number}: Aktiv (Klicken zum Deaktivieren)`;
    shapeEl.appendChild(svgTitle);

    shapeEl.addEventListener('mouseenter', () => {
      shapeEl.setAttribute('stroke', '#f59e0b');
      shapeEl.setAttribute('stroke-width', '2.5');
    });
    shapeEl.addEventListener('mouseleave', () => {
      shapeEl.setAttribute('stroke', strokeColor);
      shapeEl.setAttribute('stroke-width', isDisabled ? '1.5' : '2');
    });
    shapeEl.addEventListener('click', () => {
      const idx = uiState.bpPreviewDisabledSeats.indexOf(seat.number);
      if (idx >= 0) {
        uiState.bpPreviewDisabledSeats.splice(idx, 1);
      } else {
        uiState.bpPreviewDisabledSeats.push(seat.number);
      }
      renderBlueprintPreview();
    });

    g.appendChild(shapeEl);

    const sNum = document.createElementNS(SVG_NS, 'text');
    sNum.setAttribute('x', String(seat.x));
    sNum.setAttribute('y', String(seat.y));
    sNum.setAttribute('fill', isDisabled ? 'rgba(255,255,255,0.3)' : '#9ca3af');
    sNum.setAttribute('font-size', '12px');
    sNum.setAttribute('font-weight', '700');
    sNum.setAttribute('font-family', "'Inter',sans-serif");
    sNum.setAttribute('text-anchor', 'middle');
    sNum.setAttribute('dominant-baseline', 'central');
    sNum.setAttribute('style', 'pointer-events: none;');
    sNum.textContent = String(seat.number);
    g.appendChild(sNum);

    if (isDisabled) {
      const cross = document.createElementNS(SVG_NS, 'text');
      cross.setAttribute('x', String(seat.x));
      cross.setAttribute('y', String(seat.y + 2));
      cross.setAttribute('fill', 'rgba(255,255,255,0.25)');
      cross.setAttribute('font-size', '18px');
      cross.setAttribute('font-weight', '700');
      cross.setAttribute('font-family', "'Inter',sans-serif");
      cross.setAttribute('text-anchor', 'middle');
      cross.setAttribute('dominant-baseline', 'central');
      cross.setAttribute('style', 'pointer-events: none;');
      cross.textContent = '✕';
      g.appendChild(cross);
    }
  });

  const centerText = document.createElementNS(SVG_NS, 'text');
  centerText.setAttribute('x', '0');
  centerText.setAttribute('y', '0');
  centerText.setAttribute('fill', '#f3f4f6');
  centerText.setAttribute('font-size', '16px');
  centerText.setAttribute('font-weight', '700');
  centerText.setAttribute('font-family', "'Inter',sans-serif");
  centerText.setAttribute('text-anchor', 'middle');
  centerText.setAttribute('dominant-baseline', 'central');
  centerText.textContent = disabledCount > 0 ? `${count - disabledCount} / ${count} Pl.` : `${count} Pl.`;
  g.appendChild(centerText);

  svg.appendChild(g);
  container.appendChild(svg);
}

