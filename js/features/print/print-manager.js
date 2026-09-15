import { SEAT_R_CM } from '../../core/constants.js';
import { state, uiState } from '../../core/state.js';
import { $ } from '../../utils/dom.js';
import { getTableBounds, getTableExtents } from '../../utils/geometry.js';
import { renderLegends } from '../venue/venue-tooltips.js';
import { renderPrintTablePages } from './print-pages.js';

let savedViewBox = null;

export function initPrintManager() {
  const printBtn = $('btn-print');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  window.addEventListener('beforeprint', () => {
    renderPrintTablePages();

    const globalUsedDiets = {};
    state.guests.forEach(g => {
      if (g.tableId && g.seatNumber && g.dietId !== 'none') {
        globalUsedDiets[g.dietId] = true;
      }
    });
    renderLegends(Object.keys(globalUsedDiets));

    const svgElement = uiState.svgElement;
    if (!svgElement || state.tables.length === 0) return;

    const PAD = 80;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.tables.forEach(t => {
      const ext = getTableExtents(t, SEAT_R_CM);
      minX = Math.min(minX, t.x + ext.minX);
      minY = Math.min(minY, t.y + ext.minY);
      maxX = Math.max(maxX, t.x + ext.maxX);
      maxY = Math.max(maxY, t.y + ext.maxY);
    });

    const vx = minX - PAD;
    const vy = minY - PAD;
    const vw = (maxX - minX) + PAD * 2;
    const vh = (maxY - minY) + PAD * 2;

    const bg = document.getElementById('venue-bg-rect');
    if (bg) {
      bg.setAttribute('data-old-x', bg.getAttribute('x'));
      bg.setAttribute('data-old-y', bg.getAttribute('y'));
      bg.setAttribute('data-old-w', bg.getAttribute('width'));
      bg.setAttribute('data-old-h', bg.getAttribute('height'));
      bg.setAttribute('data-old-display', bg.style.display || '');
      bg.style.display = 'none';

      bg.setAttribute('x', String(vx));
      bg.setAttribute('y', String(vy));
      bg.setAttribute('width', String(vw));
      bg.setAttribute('height', String(vh));
    }

    savedViewBox = svgElement.getAttribute('viewBox');
    svgElement.setAttribute('viewBox', vx + ' ' + vy + ' ' + vw + ' ' + vh);
  });

  window.addEventListener('afterprint', () => {
    const svgElement = uiState.svgElement;
    const bg = document.getElementById('venue-bg-rect');
    if (bg && bg.hasAttribute('data-old-x')) {
      bg.setAttribute('x', bg.getAttribute('data-old-x'));
      bg.setAttribute('y', bg.getAttribute('data-old-y'));
      bg.setAttribute('width', bg.getAttribute('data-old-w'));
      bg.setAttribute('height', bg.getAttribute('data-old-h'));
      if (bg.hasAttribute('data-old-display')) {
        bg.style.display = bg.getAttribute('data-old-display');
        bg.removeAttribute('data-old-display');
      }
    }

    if (svgElement && savedViewBox) {
      svgElement.setAttribute('viewBox', savedViewBox);
      savedViewBox = null;
    }
  });
}

