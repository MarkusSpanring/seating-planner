// ===== Full Table View (Spreadsheet Mode) =====

import { state } from '../../core/state.js';
import { $ } from '../../utils/dom.js';
import { renderFamilyGroupBlock } from './split-view.js';
import { renderGuestCard } from './guest-row.js';

export function renderTableView(panel) {
  const hr = document.createElement('div');
  hr.className = 'guest-list-header guest-list-header-full';
  hr.innerHTML = `<div class="guest-summary-left guest-summary-left-full">
    <div class="guest-col-firstname" title="Vorname des Gastes">Vorname</div>
    <div class="guest-col-lastname" title="Nachname des Gastes">Nachname</div>
    <div class="guest-col-address" title="Adresse des Gastes">Adresse</div>
    <div class="guest-col-table" title="Zugewiesener Tisch">Tisch</div>
    <div class="guest-col-seat" title="Sitzplatznummer am Tisch">Platz</div>
    <div class="guest-col-hc" title="Hochstuhl erforderlich">HS</div>
    <div class="guest-col-age" title="Altersgruppe des Gastes">Alter</div>
    <div class="guest-col-diet" title="Ernährungsweise / Diät">Diät</div>
    <div class="guest-col-family" title="Familienzugehörigkeit">Familie</div>
    </div>
    <div class="guest-col-actions"></div>`;
  panel.appendChild(hr);

  const guestsInFamilies = {};
  state.families.forEach(fam => {
    fam.memberIds.forEach(gid => {
      guestsInFamilies[gid] = true;
    });
  });

  const filterInput = $('guest-filter-input');
  const filterText = (filterInput && filterInput.style.display !== 'none') ? filterInput.value.trim().toLowerCase() : '';
  const effectiveGrouping = filterText === '';

  // Show families first if not filtering
  if (effectiveGrouping) {
    const sortedFamilies = state.families.slice().sort((a, b) => {
      const aGuest = a.memberIds.length > 0 ? state.guests.find(g => g.id === a.memberIds[0]) : null;
      const bGuest = b.memberIds.length > 0 ? state.guests.find(g => g.id === b.memberIds[0]) : null;
      const aName = aGuest ? (aGuest.lastName || aGuest.firstName || '').toLowerCase() : '';
      const bName = bGuest ? (bGuest.lastName || bGuest.firstName || '').toLowerCase() : '';
      return aName.localeCompare(bName);
    });
    sortedFamilies.forEach(fam => {
      panel.appendChild(renderFamilyGroupBlock(fam, null, true));
    });
  }

  let allGuests = state.guests.slice();
  if (effectiveGrouping) {
    allGuests = allGuests.filter(g => !guestsInFamilies[g.id]);
  }

  allGuests.sort((a, b) => {
    const aName = (a.lastName || a.firstName || '').toLowerCase();
    const bName = (b.lastName || b.firstName || '').toLowerCase();
    return aName.localeCompare(bName);
  });

  allGuests.forEach(guest => {
    if (filterText) {
      const nameStr = ((guest.firstName || '') + ' ' + (guest.lastName || '')).toLowerCase();
      if (nameStr.indexOf(filterText) === -1) return;
    }
    panel.appendChild(renderGuestCard(guest, true));
  });
}

