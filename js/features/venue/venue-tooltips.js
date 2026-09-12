import { state } from '../../core/state.js';
import { $, escHtml } from '../../utils/dom.js';
import { getDiet, guestsAtTable } from '../../utils/seating.js';

export function showTooltip(e, table, seatNum, guest, diet) {
  const tt = $('seat-tooltip');
  if (!tt) return;
  const rect = e.target.getBoundingClientRect();
  tt.style.display = 'block';
  tt.style.left = (rect.left + rect.width / 2) + 'px';
  tt.style.top = (rect.top - 8) + 'px';
  tt.style.transform = 'translate(-50%, -100%)';

  if (guest) {
    tt.innerHTML =
      '<div class="tt-name">' + escHtml(guest.firstName + ' ' + (guest.lastName || '')) + '</div>' +
      '<div class="tt-detail">Tisch ' + table.number + ' · Platz ' + seatNum + '</div>' +
      '<div class="tt-detail">' + (guest.needsHighChair ? 'Hochstuhl · ' : '') + escHtml(diet ? diet.name : 'Keine Diät') + '</div>';
  } else {
    tt.innerHTML =
      '<div class="tt-detail">Tisch ' + table.number + ' · Platz ' + seatNum + ' — Leer</div>';
  }
}

export function hideTooltip() {
  const tt = $('seat-tooltip');
  if (tt) tt.style.display = 'none';
}

export function showTableTooltip(e, table) {
  const seated = guestsAtTable(table.id)
    .filter(g => g.seatNumber)
    .sort((a, b) => a.seatNumber - b.seatNumber);
  if (seated.length === 0) return;

  const tt = $('seat-tooltip');
  if (!tt) return;
  const rect = e.target.getBoundingClientRect();
  tt.style.display = 'block';
  tt.style.left = (rect.right + 60) + 'px';
  tt.style.top = (rect.top + rect.height / 2) + 'px';
  tt.style.transform = 'translate(0, -50%)';

  let html = '<div class="tt-name" style="font-size:0.9rem;margin-bottom:4px;">Tisch ' + escHtml(String(table.number)) + '</div>';
  seated.forEach(g => {
    html += '<div class="tt-detail" style="font-size:0.84rem;padding:1px 0;">' + g.seatNumber + ' · ' +
      escHtml((g.firstName || '') + (g.lastName ? ' ' + g.lastName : '')) + '</div>';
  });
  tt.innerHTML = html;
}

export function renderLegends(svgOrDietIds, maybeDietIds) {
  const globalDietIds = Array.isArray(svgOrDietIds) ? svgOrDietIds : (maybeDietIds || []);
  const container = $('venue-legends-overlay');
  if (!container) return;

  let html = '';

  // 1. Diäten legend (only if at least one diet is in use)
  if (globalDietIds.length > 0) {
    let rowsHtml = '';
    globalDietIds.forEach(id => {
      const diet = getDiet(id);
      if (!diet) return;
      rowsHtml += `
        <div class="venue-legend-row">
          <span class="venue-legend-swatch" style="background: ${diet.color};"></span>
          <span class="venue-legend-label">${escHtml(diet.name)}</span>
        </div>`;
    });
    html += `
      <div class="venue-legend-card" id="legend-diet">
        <div class="venue-legend-title">Diäten</div>
        ${rowsHtml}
      </div>`;
  }

  // 2. Sitztypen legend (always shown)
  const hasHighChair = state.guests.some(g => g.tableId && g.needsHighChair);
  let shapeRowsHtml = `
    <div class="venue-legend-row">
      <span class="venue-legend-normal-seat"></span>
      <span class="venue-legend-label">Normaler Platz</span>
    </div>`;

  if (hasHighChair) {
    shapeRowsHtml += `
      <div class="venue-legend-row">
        <svg width="12" height="12" viewBox="0 0 12 12" style="flex-shrink:0; vertical-align:middle; overflow:visible;">
          <polygon points="2,10 10,10 8.5,2 3.5,2" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.4)" stroke-width="1.8" stroke-linejoin="round"></polygon>
        </svg>
        <span class="venue-legend-label">Hochstuhl</span>
      </div>`;
  }

  html += `
    <div class="venue-legend-card" id="legend-shape">
      <div class="venue-legend-title">Sitztypen</div>
      ${shapeRowsHtml}
    </div>`;

  // 3. Age summary legend
  const ageCounts = {};
  state.ageGroups.forEach(a => { ageCounts[a.id] = 0; });

  state.guests.forEach(g => {
    const aId = g.age || 'age-adult';
    if (ageCounts[aId] !== undefined) ageCounts[aId]++;
  });

  const ageRows = [];
  state.ageGroups.forEach(a => {
    if (ageCounts[a.id] > 0) ageRows.push({ label: a.name, count: ageCounts[a.id] });
  });

  let ageRowsHtml = '';
  ageRows.forEach(row => {
    ageRowsHtml += `
      <div class="venue-legend-row">
        <span class="venue-legend-age-label">${escHtml(row.label)}</span>
        <span class="venue-legend-age-count">${row.count}</span>
      </div>`;
  });

  html += `
    <div class="venue-legend-card" id="legend-age">
      <div class="venue-legend-title">Gäste</div>
      ${ageRowsHtml}
      <div class="venue-legend-sep"></div>
      <div class="venue-legend-row">
        <span class="venue-legend-total-label">Gesamt</span>
        <span class="venue-legend-total-count">${state.guests.length}</span>
      </div>
    </div>`;

  container.innerHTML = html;
}


