import { SEAT_R_CM } from '../../core/constants.js';
import { state, uiState } from '../../core/state.js';
import { $ } from '../../utils/dom.js';
import { getTableBounds } from '../../utils/geometry.js';
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
    const svgElement = uiState.svgElement;
    if (!svgElement || state.tables.length === 0) return;

    const PAD = 80;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.tables.forEach(t => {
      const b = getTableBounds(t, SEAT_R_CM);
      if (b.isRect) {
        minX = Math.min(minX, t.x - b.hw);
        minY = Math.min(minY, t.y - b.hh);
        maxX = Math.max(maxX, t.x + b.hw);
        maxY = Math.max(maxY, t.y + b.hh);
      } else {
        minX = Math.min(minX, t.x - b.r);
        minY = Math.min(minY, t.y - b.r);
        maxX = Math.max(maxX, t.x + b.r);
        maxY = Math.max(maxY, t.y + b.r);
      }
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
    }

    if (svgElement && savedViewBox) {
      svgElement.setAttribute('viewBox', savedViewBox);
      savedViewBox = null;
    }
  });
}

