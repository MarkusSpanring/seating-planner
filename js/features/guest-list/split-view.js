// ===== Split View (Grouped Guest Accordion & Family Blocks) =====

import { state, uiState, saveAndRender } from '../../core/state.js';
import { $, escHtml } from '../../utils/dom.js';
import {
  getFamilyForGuest,
  getFamilyMembers,
  addToFamily,
  removeFromFamily,
  dissolveFamily
} from '../../utils/family.js';
import {
  getEffectiveSeatCount,
  getAvailableTablesForGroup,
  assignGroupToTable,
  unassignedGuests,
  guestsAtTable
} from '../../utils/seating.js';
import { makeSearchableGuestPicker } from '../../components/searchable-picker.js';
import { renderGuestCard } from './guest-row.js';

export function renderFamilyGroupBlock(family, memberIdSubset, isTableView, onRerender) {
  const allMembers = getFamilyMembers(family.id);
  const members = memberIdSubset ? allMembers.filter(m => {
    return memberIdSubset.indexOf(m.id) >= 0;
  }) : allMembers;

  const tableIds = {};
  members.forEach(m => { if (m.tableId) tableIds[m.tableId] = true; });
  const tableIdList = Object.keys(tableIds);
  const isSplit = tableIdList.length > 1;

  const block = document.createElement('div');
  block.className = 'family-group-block';

  if (!isTableView) {
    if (isSplit) {
      const staticPill = document.createElement('div');
      staticPill.className = 'family-group-pill family-group-pill-static';
      staticPill.innerHTML =
        '<span class="family-group-pill-icon">👨‍👩‍👧‍👦</span>' +
        '<span class="family-group-pill-label">split tables</span>';
      block.appendChild(staticPill);
    } else {
      const pillWrap = document.createElement('div');
      pillWrap.className = 'family-group-pill-wrap';

      const pillIconEl = document.createElement('span');
      pillIconEl.className = 'family-group-pill-icon';
      pillIconEl.textContent = '👨‍👩‍👧‍👦';
      pillWrap.appendChild(pillIconEl);

      const sortedTables = getAvailableTablesForGroup(members);
      const currentTableId = tableIdList.length === 1 ? tableIdList[0] : null;

      const pillSel = document.createElement('select');
      pillSel.className = 'family-group-pill-select';
      pillSel.title = 'Ganze Familie an einen anderen Tisch verschieben';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = currentTableId ? 'Reassign...' : 'Select table...';
      if (!currentTableId) defaultOpt.selected = true;
      pillSel.appendChild(defaultOpt);

      sortedTables.forEach(t => {
        const o = document.createElement('option');
        o.value = String(t.id);
        o.textContent = 'Tisch ' + String(t.number);
        if (String(t.id) === String(currentTableId || '')) o.selected = true;
        pillSel.appendChild(o);
      });

      pillSel.addEventListener('change', e => {
        e.stopPropagation();
        assignGroupToTable(members, pillSel.value);
        saveAndRender();
      });
      pillSel.addEventListener('click', e => { e.stopPropagation(); });

      pillWrap.appendChild(pillSel);
      block.appendChild(pillWrap);
    }
  } else {
    // Full Table View Mode
    block.classList.add('family-group-block-table');
    block.style.paddingTop = '20px';

    const pillWrapFull = document.createElement('div');
    pillWrapFull.className = 'family-group-pill-wrap';
    pillWrapFull.title = 'Suchen, um der Familie ein weiteres Mitglied hinzuzufügen';

    const excludeIds = family.memberIds.slice();
    const picker = makeSearchableGuestPicker('👨‍👩‍👧‍👦 Mitglied hinzufügen...', excludeIds, selectedId => {
      addToFamily(family.id, selectedId);
    }, true);

    const pickerInput = picker.querySelector('input');
    if (pickerInput) {
      pickerInput.style.background = 'transparent';
      pickerInput.style.border = 'none';
      pickerInput.style.padding = '0 6px';
      pickerInput.style.margin = '0';
      pickerInput.style.fontSize = '0.7rem';
      pickerInput.style.fontWeight = '600';
      pickerInput.style.color = 'rgba(139, 92, 246, 0.8)';
      pickerInput.style.width = '190px';
      pickerInput.style.outline = 'none';
    }

    pillWrapFull.appendChild(picker);
    block.appendChild(pillWrapFull);

    const dissolveBtn = document.createElement('button');
    dissolveBtn.className = 'btn btn-sm family-dissolve-btn';
    dissolveBtn.textContent = '✕ Familie auflösen';
    dissolveBtn.title = 'Familie auflösen (alle Mitglieder werden wieder als Einzelpersonen geführt)';
    dissolveBtn.style.position = 'absolute';
    dissolveBtn.style.top = '-12px';
    dissolveBtn.style.right = '8px';
    dissolveBtn.style.background = 'var(--bg-secondary)';
    dissolveBtn.style.border = '1px solid rgba(139, 92, 246, 0.3)';
    dissolveBtn.style.borderRadius = '20px';
    dissolveBtn.style.padding = '2px 8px';
    dissolveBtn.style.fontSize = '0.65rem';
    dissolveBtn.style.color = 'var(--text-secondary)';
    dissolveBtn.style.fontWeight = '600';
    dissolveBtn.style.zIndex = '5';
    dissolveBtn.style.transition = 'all 0.15s ease';

    dissolveBtn.addEventListener('mouseenter', () => {
      dissolveBtn.style.background = 'rgba(239, 68, 68, 0.1)';
      dissolveBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      dissolveBtn.style.color = 'var(--danger)';
    });
    dissolveBtn.addEventListener('mouseleave', () => {
      dissolveBtn.style.background = 'var(--bg-secondary)';
      dissolveBtn.style.borderColor = 'rgba(139, 92, 246, 0.3)';
      dissolveBtn.style.color = 'var(--text-secondary)';
    });
    dissolveBtn.addEventListener('click', e => {
      e.stopPropagation();
      dissolveFamily(family.id);
    });
    block.appendChild(dissolveBtn);
  }

  members.forEach(guest => {
    const row = document.createElement('div');
    row.className = 'family-group-member-row';

    let memberCard;
    if (isTableView) {
      memberCard = renderGuestCard(guest, true, false);
      memberCard.classList.add('family-member-card');

      const actionsCell = memberCard.querySelector('.guest-col-actions');
      if (actionsCell) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-sm family-remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.title = 'Dieses Mitglied aus der Familie entfernen';
        removeBtn.addEventListener('click', e => {
          e.stopPropagation();
          removeFromFamily(family.id, guest.id);
        });
        actionsCell.appendChild(removeBtn);
      }
    } else {
      memberCard = renderGuestCard(guest);
    }

    row.appendChild(memberCard);
    block.appendChild(row);
  });

  return block;
}

export function renderGuestGroup(key, title, guests, maxSeats, tableObj, onRerender) {
  const collapsed = uiState.collapsedGroups[key] !== undefined
    ? uiState.collapsedGroups[key]
    : !!(tableObj && tableObj.fixed);
  const div = document.createElement('div');
  div.className = 'guest-group';

  const header = document.createElement('div');
  header.className = 'guest-group-header' + (tableObj && tableObj.fixed ? ' table-fixed' : '');
  header.title = 'Klicken zum ' + (collapsed ? 'Ausklappen' : 'Einklappen');
  header.innerHTML =
    '<h3><span class="group-chevron ' + (collapsed ? '' : 'open') + '">▶</span> ' +
    escHtml(title) +
    (tableObj ? ' <span class="table-indicator-pill">' + tableObj.seatCount + 'er Tisch</span>' : '') +
    '</h3>' +
    '<span class="count">' + guests.length + (maxSeats ? '/' + maxSeats : '') + '</span>';
  header.addEventListener('click', () => {
    uiState.collapsedGroups[key] = !collapsed;
    if (onRerender) onRerender();
  });

  // "Fixiert" checkbox
  if (tableObj) {
    const fixedLabel = document.createElement('label');
    fixedLabel.className = 'table-fixed-label';
    fixedLabel.title = 'Tisch als platziert/fixiert markieren (grüne Umrandung, standardmäßig eingeklappt)';
    fixedLabel.addEventListener('click', e => { e.stopPropagation(); });

    const fixedCb = document.createElement('input');
    fixedCb.type = 'checkbox';
    fixedCb.checked = !!tableObj.fixed;
    fixedCb.className = 'table-fixed-cb';
    fixedCb.title = 'Tisch als platziert/fixiert markieren';
    fixedCb.addEventListener('change', e => {
      e.stopPropagation();
      tableObj.fixed = fixedCb.checked;
      if (!fixedCb.checked) {
        tableObj.seatsFixed = false;
      }
      saveAndRender();
    });

    const fixedSpan = document.createElement('span');
    fixedSpan.textContent = 'Gäste platziert';

    fixedLabel.appendChild(fixedCb);
    fixedLabel.appendChild(fixedSpan);
    header.appendChild(fixedLabel);
  }

  div.appendChild(header);

  if (!collapsed) {
    const familyBuckets = {};
    const renderedFamIds = {};
    guests.forEach(g => {
      const fam = getFamilyForGuest(g.id);
      if (fam) {
        if (!familyBuckets[fam.id]) familyBuckets[fam.id] = [];
        familyBuckets[fam.id].push(g.id);
      }
    });
    guests.forEach(guest => {
      const fam = getFamilyForGuest(guest.id);
      if (fam && familyBuckets[fam.id] && familyBuckets[fam.id].length >= 2) {
        if (!renderedFamIds[fam.id]) {
          renderedFamIds[fam.id] = true;
          div.appendChild(renderFamilyGroupBlock(fam, familyBuckets[fam.id], false, onRerender));
        }
      } else {
        div.appendChild(renderGuestCard(guest));
      }
    });
  }

  return div;
}

export function renderSplitView(panel, onRerender) {
  const sortedTables = state.tables.slice().sort((a, b) => {
    return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' });
  });

  sortedTables.forEach(table => {
    const guests = guestsAtTable(table.id);
    if (guests.length === 0) return;
    guests.sort((a, b) => (a.seatNumber || 999) - (b.seatNumber || 999));
    panel.appendChild(renderGuestGroup(
      'table-' + table.id,
      'Tisch ' + table.number,
      guests,
      getEffectiveSeatCount(table),
      table,
      onRerender
    ));
  });

  const unassigned = unassignedGuests();
  if (unassigned.length > 0) {
    unassigned.sort((a, b) => {
      const aName = (a.lastName || a.firstName || '').toLowerCase();
      const bName = (b.lastName || b.firstName || '').toLowerCase();
      return aName.localeCompare(bName);
    });
    panel.appendChild(renderGuestGroup('unassigned', 'Nicht zugeteilt', unassigned, null, null, onRerender));
  }
}

