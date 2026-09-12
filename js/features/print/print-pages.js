// ===== Print Pages Generator =====

import { SVG_NS } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { $, escHtml, getAdjustedFontSize } from '../../utils/dom.js';
import {
  getTableCenterSize,
  getSeatPositions,
  getTrapezoidPoints
} from '../../utils/geometry.js';
import {
  guestsAtTable,
  getDiet,
  guestAtSeat
} from '../../utils/seating.js';

export function renderPrintTablePages() {
  const container = $('print-table-pages');
  if (!container) return;
  container.innerHTML = '';

  const sortedTables = state.tables.slice().sort((a, b) => {
    return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' });
  });

  sortedTables.forEach(table => {
    const guests = guestsAtTable(table.id)
      .filter(g => g.seatNumber)
      .sort((a, b) => a.seatNumber - b.seatNumber);

    const tiles = buildTableSVGForPrint(table);

    tiles.forEach((tileObj) => {
      const page = document.createElement('div');
      page.className = 'print-table-page';

      const heading = document.createElement('h1');
      heading.className = 'print-table-heading';
      heading.textContent = (table.name || ('Tisch ' + table.number)) + tileObj.tileStr;
      page.appendChild(heading);

      const layout = document.createElement('div');
      layout.className = 'print-table-layout';

      const svgWrap = document.createElement('div');
      svgWrap.className = 'print-table-svg-wrap';
      svgWrap.appendChild(tileObj.node);
      layout.appendChild(svgWrap);

      const listWrap = document.createElement('div');
      listWrap.className = 'print-table-list-wrap';

      const tileGuests = guests.filter(g => tileObj.primarySeatNumbers.indexOf(g.seatNumber) >= 0);

      if (tileGuests.length === 0) {
        const empty = document.createElement('p');
        empty.style.cssText = 'color:#999;font-style:italic;font-size:12px;';
        empty.textContent = 'Keine Gäste in diesem Abschnitt.';
        listWrap.appendChild(empty);
      } else {
        const tbl = document.createElement('table');
        tbl.className = 'print-table-guest-table';
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Platz</th><th>Vorname</th><th>Nachname</th><th>Alter</th></tr>';
        tbl.appendChild(thead);
        const tbody = document.createElement('tbody');
        tileGuests.forEach(g => {
          const aGrp = state.ageGroups.find(a => a.id === (g.age || 'age-adult'));
          const aName = aGrp ? aGrp.name : 'Erwachsen';
          const tr = document.createElement('tr');
          tr.innerHTML =
            '<td class="print-seat-num">' + g.seatNumber + '</td>' +
            '<td>' + escHtml(g.firstName || '') + '</td>' +
            '<td>' + escHtml(g.lastName || '') + '</td>' +
            '<td>' + escHtml(aName) + '</td>';
          tbody.appendChild(tr);
        });
        tbl.appendChild(tbody);
        listWrap.appendChild(tbl);

        const usedDietsMap = {};
        let hasHC = false;
        tileGuests.forEach(g => {
          const diet = getDiet(g.dietId);
          if (diet && diet.id !== 'none') usedDietsMap[diet.id] = diet;
          if (g.needsHighChair) hasHC = true;
        });
        const usedDiets = Object.values ? Object.values(usedDietsMap) : Object.keys(usedDietsMap).map(k => usedDietsMap[k]);
        if (usedDiets.length > 0 || hasHC) {
          const legend = document.createElement('div');
          legend.className = 'print-table-legend';
          if (usedDiets.length > 0) {
            const dietTitle = document.createElement('div');
            dietTitle.className = 'print-legend-title';
            dietTitle.textContent = 'Diäten';
            legend.appendChild(dietTitle);
            usedDiets.forEach(diet => {
              const row = document.createElement('div');
              row.className = 'print-legend-row';
              row.innerHTML =
                '<span class="print-legend-swatch" style="background:' + diet.color + '"></span>' +
                '<span class="print-legend-label">' + escHtml(diet.name) + '</span>';
              legend.appendChild(row);
            });
          }
          if (hasHC) {
            if (usedDiets.length > 0) {
              const sep = document.createElement('div');
              sep.className = 'print-legend-sep';
              legend.appendChild(sep);
            }
            const hcTitle = document.createElement('div');
            hcTitle.className = 'print-legend-title';
            hcTitle.textContent = 'Symbol';
            legend.appendChild(hcTitle);
            const hcRow = document.createElement('div');
            hcRow.className = 'print-legend-row';
            hcRow.innerHTML =
              '<svg width="14" height="14" viewBox="0 0 14 14" style="flex-shrink:0; margin-right:6px; vertical-align:middle; overflow:visible;">' +
                '<polygon points="' + getTrapezoidPoints(7, 7, 5) + '" fill="#e5e7eb" stroke="#9ca3af" stroke-width="2.5" stroke-linejoin="round"></polygon>' +
              '</svg>' +
              '<span class="print-legend-label">Hochstuhl</span>';
            legend.appendChild(hcRow);
          }
          listWrap.appendChild(legend);
        }
      }

      layout.appendChild(listWrap);
      page.appendChild(layout);
      container.appendChild(page);
    });
  });
}

function buildTableSVGForPrint(tbl) {
  const disabled = Array.isArray(tbl.disabledSeats) ? tbl.disabledSeats : [];

  const seatR = tbl.seatCount > 8 ? 28 : 30;
  const geo = getTableCenterSize(tbl, seatR, true); // print pages always auto-fit
  const tableName = tbl.name || ('Tisch ' + tbl.number);

  const boundsW = (geo.type === 'rect' ? geo.w : geo.r * 2) + seatR * 4 + 40;
  const boundsH = (geo.type === 'rect' ? geo.h : geo.r * 2) + seatR * 4 + 40;

  const MAX_PAGE_SIZE = 600;

  const cols = Math.ceil(boundsW / MAX_PAGE_SIZE);
  const rows = Math.ceil(boundsH / MAX_PAGE_SIZE);

  const seats = getSeatPositions(tbl.seatCount, seatR, tbl.shape, tbl.seatsLong, tbl.seatsShort);
  const tiles = [];
  const isSplit = (cols > 1 || rows > 1);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellMinX = -boundsW / 2 + c * (boundsW / cols);
      const cellMaxX = -boundsW / 2 + (c + 1) * (boundsW / cols);
      const cellMinY = -boundsH / 2 + r * (boundsH / rows);
      const cellMaxY = -boundsH / 2 + (r + 1) * (boundsH / rows);

      const isLastCol = (c === cols - 1);
      const isLastRow = (r === rows - 1);

      const primarySeats = seats.filter(seat => {
        if (disabled.indexOf(seat.number) >= 0) return false;
        const inX = isLastCol ? (seat.x >= cellMinX && seat.x <= cellMaxX) : (seat.x >= cellMinX && seat.x < cellMaxX);
        const inY = isLastRow ? (seat.y >= cellMinY && seat.y <= cellMaxY) : (seat.y >= cellMinY && seat.y < cellMaxY);
        return inX && inY;
      });

      let rectMinX, rectMaxX, rectMinY, rectMaxY;
      if (geo.type === 'rect') {
        rectMinX = isSplit ? Math.max(-geo.w / 2, cellMinX) : -geo.w / 2;
        rectMaxX = isSplit ? Math.min(geo.w / 2, cellMaxX) : geo.w / 2;
        rectMinY = isSplit ? Math.max(-geo.h / 2, cellMinY) : -geo.h / 2;
        rectMaxY = isSplit ? Math.min(geo.h / 2, cellMaxY) : geo.h / 2;
      } else {
        rectMinX = -geo.r;
        rectMaxX = geo.r;
        rectMinY = -geo.r;
        rectMaxY = geo.r;
      }

      const seatMinX = primarySeats.length > 0 ? Math.min(...primarySeats.map(s => s.x - seatR)) : rectMinX;
      const seatMaxX = primarySeats.length > 0 ? Math.max(...primarySeats.map(s => s.x + seatR)) : rectMaxX;
      const seatMinY = primarySeats.length > 0 ? Math.min(...primarySeats.map(s => s.y - seatR)) : rectMinY;
      const seatMaxY = primarySeats.length > 0 ? Math.max(...primarySeats.map(s => s.y + seatR)) : rectMaxY;

      const contentMinX = Math.min(rectMinX, seatMinX);
      const contentMaxX = Math.max(rectMaxX, seatMaxX);
      const contentMinY = Math.min(rectMinY, seatMinY);
      const contentMaxY = Math.max(rectMaxY, seatMaxY);

      const pad = 30;
      const vbMinX = contentMinX - pad;
      const vbMaxX = contentMaxX + pad;
      const vbMinY = contentMinY - pad;
      const vbMaxY = contentMaxY + pad;
      const vbWidth = vbMaxX - vbMinX;
      const vbHeight = vbMaxY - vbMinY;

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', `${vbMinX} ${vbMinY} ${vbWidth} ${vbHeight}`);
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', 'auto');
      svg.setAttribute('style', 'overflow: hidden;');

      const g = document.createElementNS(SVG_NS, 'g');

      if (geo.type === 'rect') {
        const center = document.createElementNS(SVG_NS, 'rect');
        center.setAttribute('x', String(rectMinX));
        center.setAttribute('y', String(rectMinY));
        center.setAttribute('width', String(rectMaxX - rectMinX));
        center.setAttribute('height', String(rectMaxY - rectMinY));
        center.setAttribute('fill', '#f3f4f6');
        center.setAttribute('stroke', '#d1d5db');
        center.setAttribute('stroke-width', '2.5');
        center.setAttribute('rx', isSplit ? '0' : '6');
        g.appendChild(center);

        if (isSplit) {
          if (!isLastCol) {
            const cutLine = document.createElementNS(SVG_NS, 'line');
            cutLine.setAttribute('x1', String(rectMaxX));
            cutLine.setAttribute('y1', String(rectMinY));
            cutLine.setAttribute('x2', String(rectMaxX));
            cutLine.setAttribute('y2', String(rectMaxY));
            cutLine.setAttribute('stroke', '#9ca3af');
            cutLine.setAttribute('stroke-width', '2');
            cutLine.setAttribute('stroke-dasharray', '5 3');
            g.appendChild(cutLine);
          }
          if (c > 0) {
            const cutLine = document.createElementNS(SVG_NS, 'line');
            cutLine.setAttribute('x1', String(rectMinX));
            cutLine.setAttribute('y1', String(rectMinY));
            cutLine.setAttribute('x2', String(rectMinX));
            cutLine.setAttribute('y2', String(rectMaxY));
            cutLine.setAttribute('stroke', '#9ca3af');
            cutLine.setAttribute('stroke-width', '2');
            cutLine.setAttribute('stroke-dasharray', '5 3');
            g.appendChild(cutLine);
          }
          if (!isLastRow) {
            const cutLine = document.createElementNS(SVG_NS, 'line');
            cutLine.setAttribute('x1', String(rectMinX));
            cutLine.setAttribute('y1', String(rectMaxY));
            cutLine.setAttribute('x2', String(rectMaxX));
            cutLine.setAttribute('y2', String(rectMaxY));
            cutLine.setAttribute('stroke', '#9ca3af');
            cutLine.setAttribute('stroke-width', '2');
            cutLine.setAttribute('stroke-dasharray', '5 3');
            g.appendChild(cutLine);
          }
          if (r > 0) {
            const cutLine = document.createElementNS(SVG_NS, 'line');
            cutLine.setAttribute('x1', String(rectMinX));
            cutLine.setAttribute('y1', String(rectMinY));
            cutLine.setAttribute('x2', String(rectMaxX));
            cutLine.setAttribute('y2', String(rectMinY));
            cutLine.setAttribute('stroke', '#9ca3af');
            cutLine.setAttribute('stroke-width', '2');
            cutLine.setAttribute('stroke-dasharray', '5 3');
            g.appendChild(cutLine);
          }
        }
      } else {
        const center = document.createElementNS(SVG_NS, 'circle');
        center.setAttribute('cx', '0');
        center.setAttribute('cy', '0');
        center.setAttribute('r', String(geo.r));
        center.setAttribute('fill', '#f3f4f6');
        center.setAttribute('stroke', '#d1d5db');
        center.setAttribute('stroke-width', '2.5');
        g.appendChild(center);
      }

      const labelX = (rectMinX + rectMaxX) / 2;
      const labelY = (rectMinY + rectMaxY) / 2;

      const tileIndex = r * cols + c + 1;
      const totalTiles = cols * rows;
      const labelText = isSplit ? `${tableName} (${tileIndex}/${totalTiles})` : tableName;
      const segmentWidth = (rectMaxX - rectMinX);
      const fontSize = getAdjustedFontSize(labelText, segmentWidth, 16);

      const textEl = document.createElementNS(SVG_NS, 'text');
      textEl.setAttribute('x', String(labelX));
      textEl.setAttribute('y', String(labelY));
      textEl.setAttribute('fill', '#374151');
      textEl.setAttribute('font-size', fontSize + 'px');
      textEl.setAttribute('font-weight', '700');
      textEl.setAttribute('font-family', "'Inter',sans-serif");
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('dominant-baseline', 'central');
      textEl.textContent = labelText;
      g.appendChild(textEl);

      primarySeats.forEach(seat => {
        const guest = guestAtSeat(tbl.id, seat.number);
        const diet = guest ? getDiet(guest.dietId) : null;
        const hasDiet = diet && diet.id !== 'none';

        const fill = hasDiet ? diet.color : (guest ? '#e5e7eb' : '#ffffff');
        const stroke = guest ? '#9ca3af' : '#d1d5db';
        const textColor = guest ? (hasDiet ? '#ffffff' : '#374151') : '#9ca3af';

        if (!guest || !guest.needsHighChair) {
          const sqR = seatR * 0.925;
          const rect = document.createElementNS(SVG_NS, 'rect');
          rect.setAttribute('x', String(seat.x - sqR));
          rect.setAttribute('y', String(seat.y - sqR));
          rect.setAttribute('width', String(sqR * 2));
          rect.setAttribute('height', String(sqR * 2));
          rect.setAttribute('fill', fill);
          rect.setAttribute('stroke', stroke);
          rect.setAttribute('stroke-width', guest ? '2' : '1.5');
          rect.setAttribute('rx', '4');
          g.appendChild(rect);
        } else {
          const poly = document.createElementNS(SVG_NS, 'polygon');
          poly.setAttribute('points', getTrapezoidPoints(seat.x, seat.y, seatR));
          poly.setAttribute('fill', fill);
          poly.setAttribute('stroke', stroke);
          poly.setAttribute('stroke-width', '2.5');
          poly.setAttribute('stroke-linejoin', 'round');
          poly.setAttribute('transform', `rotate(${seat.angleDeg},${seat.x},${seat.y})`);
          g.appendChild(poly);
        }

        const badgeY = seat.y - (guest ? seatR * 0.45 : 0);
        const sNum = document.createElementNS(SVG_NS, 'text');
        sNum.setAttribute('x', String(seat.x));
        sNum.setAttribute('y', String(badgeY));
        sNum.setAttribute('fill', textColor);
        sNum.setAttribute('font-size', '9px');
        sNum.setAttribute('font-weight', '700');
        sNum.setAttribute('font-family', "'Inter',sans-serif");
        sNum.setAttribute('text-anchor', 'middle');
        sNum.setAttribute('dominant-baseline', 'central');
        sNum.setAttribute('style', 'pointer-events:none;');
        sNum.textContent = String(seat.number);
        g.appendChild(sNum);

        if (guest) {
          const first = guest.firstName || '';
          const last = guest.lastName ? guest.lastName.charAt(0) + '.' : '';
          const nameY = seat.y + (last ? 0 : 4);

          const fText = document.createElementNS(SVG_NS, 'text');
          fText.setAttribute('x', String(seat.x));
          fText.setAttribute('y', String(nameY));
          fText.setAttribute('fill', textColor);
          fText.setAttribute('font-size', '10px');
          fText.setAttribute('font-weight', '600');
          fText.setAttribute('font-family', "'Inter',sans-serif");
          fText.setAttribute('text-anchor', 'middle');
          fText.setAttribute('dominant-baseline', 'central');
          fText.setAttribute('style', 'pointer-events:none;');
          fText.textContent = first;
          g.appendChild(fText);

          if (last) {
            const lText = document.createElementNS(SVG_NS, 'text');
            lText.setAttribute('x', String(seat.x));
            lText.setAttribute('y', String(nameY + 11));
            lText.setAttribute('fill', textColor);
            lText.setAttribute('font-size', '10px');
            lText.setAttribute('font-weight', '600');
            lText.setAttribute('font-family', "'Inter',sans-serif");
            lText.setAttribute('text-anchor', 'middle');
            lText.setAttribute('dominant-baseline', 'central');
            lText.setAttribute('style', 'pointer-events:none;');
            lText.textContent = last;
            g.appendChild(lText);
          }
        }
      });

      svg.appendChild(g);
      const tileStr = isSplit ? (` (Teil ${tileIndex}/${totalTiles})`) : '';
      tiles.push({
        node: svg,
        tileStr: tileStr,
        primarySeatNumbers: primarySeats.map(s => s.number)
      });
    }
  }

  return tiles;
}

