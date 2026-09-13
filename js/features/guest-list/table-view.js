// ===== Full Table View (Spreadsheet Mode with Keyboard Navigation & Quick-Add) =====

import { state, saveState, saveAndRender } from '../../core/state.js';
import { $, escHtml } from '../../utils/dom.js';
import { renderFamilyGroupBlock } from './split-view.js';
import { renderGuestCard } from './guest-row.js';
import { updateStats } from './guest-list.js';
import { getTable, getActiveSeatNumbers } from '../../utils/seating.js';
import { getFamilyForGuest } from '../../utils/family.js';

export function renderTableView(panel) {
  panel.innerHTML = '';

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

  if (effectiveGrouping && state.families.length > 0 && allGuests.length > 0) {
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'spreadsheet-section-title';
    sectionTitle.innerHTML = '<span>👤</span> <span>Einzelgäste</span>';
    panel.appendChild(sectionTitle);
  }

  allGuests.forEach(guest => {
    if (filterText) {
      const nameStr = ((guest.firstName || '') + ' ' + (guest.lastName || '')).toLowerCase();
      if (nameStr.indexOf(filterText) === -1) return;
    }
    panel.appendChild(renderGuestCard(guest, true));
  });

  // Tag all rendered rows with sequential data-grid-row indices
  const allCards = panel.querySelectorAll('.guest-card:not(.quick-add-row)');
  allCards.forEach((card, rIdx) => {
    card.classList.add('spreadsheet-row');
    const controls = card.querySelectorAll('.spreadsheet-cell-control');
    controls.forEach(ctrl => {
      ctrl.setAttribute('data-grid-row', String(rIdx));
    });
  });

  const nextRowIndex = allCards.length;

  // Append empty quick-add row at the bottom if not filtering
  if (!filterText) {
    appendQuickAddRow(panel, nextRowIndex);
  }

  // Attach keyboard grid navigation
  panel.onkeydown = handleGridKeyDown;
}

// ── Keyboard Grid Navigation ──
export function handleGridKeyDown(e) {
  const target = e.target.closest('.spreadsheet-cell-control');
  if (!target) return;

  const row = parseInt(target.getAttribute('data-grid-row'), 10);
  const col = parseInt(target.getAttribute('data-grid-col'), 10);
  if (isNaN(row) || isNaN(col)) return;

  const panel = $('guest-list');
  if (!panel) return;

  const isTextInput = (target.tagName === 'INPUT' && target.type === 'text');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusGridCell(panel, row + 1, col);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusGridCell(panel, row - 1, col);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    focusGridCell(panel, row + 1, col);
  } else if (e.key === 'ArrowRight') {
    if (isTextInput) {
      if (target.selectionStart === target.value.length) {
        e.preventDefault();
        focusGridCell(panel, row, col + 1);
      }
    } else {
      e.preventDefault();
      focusGridCell(panel, row, col + 1);
    }
  } else if (e.key === 'ArrowLeft') {
    if (isTextInput) {
      if (target.selectionStart === 0 && target.selectionEnd === 0) {
        e.preventDefault();
        focusGridCell(panel, row, col - 1);
      }
    } else {
      e.preventDefault();
      focusGridCell(panel, row, col - 1);
    }
  } else if (e.key === 'Tab') {
    if (!e.shiftKey) {
      const nextCell = panel.querySelector(`[data-grid-row="${row}"][data-grid-col="${col + 1}"]`);
      if (!nextCell) {
        const nextRowFirstCell = panel.querySelector(`[data-grid-row="${row + 1}"][data-grid-col="0"]`);
        if (nextRowFirstCell) {
          e.preventDefault();
          nextRowFirstCell.focus();
          if (nextRowFirstCell.select) nextRowFirstCell.select();
        }
      }
    } else {
      if (col === 0 && row > 0) {
        const prevRowCells = Array.from(panel.querySelectorAll(`[data-grid-row="${row - 1}"]`));
        if (prevRowCells.length > 0) {
          e.preventDefault();
          const lastCell = prevRowCells[prevRowCells.length - 1];
          lastCell.focus();
          if (lastCell.select) lastCell.select();
        }
      }
    }
  }
}

export function focusGridCell(panel, targetRow, targetCol) {
  if (targetRow < 0 || targetCol < 0) return;
  const container = panel || $('guest-list');
  if (!container) return;

  let cell = container.querySelector(`[data-grid-row="${targetRow}"][data-grid-col="${targetCol}"]`);
  if (!cell) {
    const rowCells = Array.from(container.querySelectorAll(`[data-grid-row="${targetRow}"]`));
    if (rowCells.length === 0) return;
    cell = rowCells.reduce((prev, curr) => {
      const prevCol = parseInt(prev.getAttribute('data-grid-col') || '0', 10);
      const currCol = parseInt(curr.getAttribute('data-grid-col') || '0', 10);
      return Math.abs(currCol - targetCol) < Math.abs(prevCol - targetCol) ? curr : prev;
    });
  }

  if (cell) {
    cell.focus();
    if (cell.tagName === 'INPUT' && cell.type === 'text') {
      cell.select();
    }
    cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

// ── Quick-Add Bottom Row ──
export function appendQuickAddRow(panel, rowIndex) {
  const card = document.createElement('div');
  card.className = 'guest-card spreadsheet-row quick-add-row';
  card.setAttribute('data-is-quick-add', 'true');

  const nameRow = document.createElement('div');
  nameRow.className = 'guest-card-name';
  nameRow.style.cursor = 'default';

  const leftContainer = document.createElement('div');
  leftContainer.className = 'guest-summary-left guest-summary-left-full';

  // 0: Vorname
  const firstNameInput = document.createElement('input');
  firstNameInput.type = 'text';
  firstNameInput.className = 'name-input guest-col-firstname spreadsheet-cell-control';
  firstNameInput.placeholder = '+ Vorname…';
  firstNameInput.title = 'Neuen Gast schnell hinzufügen (Vorname)';
  firstNameInput.setAttribute('data-grid-row', String(rowIndex));
  firstNameInput.setAttribute('data-grid-col', '0');
  leftContainer.appendChild(firstNameInput);

  // 1: Nachname
  const lastNameInput = document.createElement('input');
  lastNameInput.type = 'text';
  lastNameInput.className = 'name-input guest-col-lastname spreadsheet-cell-control';
  lastNameInput.placeholder = 'Nachname…';
  lastNameInput.title = 'Nachname';
  lastNameInput.setAttribute('data-grid-row', String(rowIndex));
  lastNameInput.setAttribute('data-grid-col', '1');
  leftContainer.appendChild(lastNameInput);

  // 2: Adresse
  const addressInput = document.createElement('input');
  addressInput.type = 'text';
  addressInput.className = 'name-input guest-col-address spreadsheet-cell-control';
  addressInput.placeholder = 'Adresse…';
  addressInput.setAttribute('data-grid-row', String(rowIndex));
  addressInput.setAttribute('data-grid-col', '2');
  leftContainer.appendChild(addressInput);

  // 3: Tisch
  const tableCol = document.createElement('div');
  tableCol.className = 'guest-col-table';
  const tableSel = document.createElement('select');
  tableSel.className = 'inline-select spreadsheet-cell-control';
  tableSel.setAttribute('data-grid-row', String(rowIndex));
  tableSel.setAttribute('data-grid-col', '3');
  tableSel.innerHTML = '<option value="">—</option>';
  state.tables.forEach(t => {
    tableSel.innerHTML += `<option value="${t.id}">${t.number}</option>`;
  });
  tableCol.appendChild(tableSel);
  leftContainer.appendChild(tableCol);

  // 4: Platz
  const seatCol = document.createElement('div');
  seatCol.className = 'guest-col-seat';
  const seatSel = document.createElement('select');
  seatSel.className = 'inline-select spreadsheet-cell-control';
  seatSel.setAttribute('data-grid-row', String(rowIndex));
  seatSel.setAttribute('data-grid-col', '4');
  seatSel.innerHTML = '<option value="">—</option>';
  seatCol.appendChild(seatSel);
  leftContainer.appendChild(seatCol);

  tableSel.addEventListener('change', () => {
    const tblId = tableSel.value ? parseInt(tableSel.value) : null;
    seatSel.innerHTML = '<option value="">—</option>';
    if (tblId) {
      const tbl = getTable(tblId);
      if (tbl) {
        const activeSeats = getActiveSeatNumbers(tbl);
        activeSeats.forEach(sn => {
          seatSel.innerHTML += `<option value="${sn}">${sn}</option>`;
        });
      }
    }
  });

  // 5: HS
  const hcCol = document.createElement('div');
  hcCol.className = 'guest-col-hc';
  const hcSel = document.createElement('select');
  hcSel.className = 'inline-select spreadsheet-cell-control';
  hcSel.setAttribute('data-grid-row', String(rowIndex));
  hcSel.setAttribute('data-grid-col', '5');
  hcSel.innerHTML = '<option value="no">No</option><option value="yes">Yes</option>';
  hcCol.appendChild(hcSel);
  leftContainer.appendChild(hcCol);

  // 6: Alter
  const ageCol = document.createElement('div');
  ageCol.className = 'guest-col-age';
  const ageSel = document.createElement('select');
  ageSel.className = 'inline-select spreadsheet-cell-control';
  ageSel.setAttribute('data-grid-row', String(rowIndex));
  ageSel.setAttribute('data-grid-col', '6');
  state.ageGroups.forEach(a => {
    ageSel.innerHTML += `<option value="${a.id}">${a.name}</option>`;
  });
  ageCol.appendChild(ageSel);
  leftContainer.appendChild(ageCol);

  // 7: Diät
  const dietCol = document.createElement('div');
  dietCol.className = 'guest-col-diet';
  const dietSel = document.createElement('select');
  dietSel.className = 'inline-select inline-diet-select spreadsheet-cell-control';
  dietSel.setAttribute('data-grid-row', String(rowIndex));
  dietSel.setAttribute('data-grid-col', '7');
  state.dietOptions.forEach(d => {
    dietSel.innerHTML += `<option value="${d.id}">${d.name}</option>`;
  });
  dietCol.appendChild(dietSel);
  leftContainer.appendChild(dietCol);

  // 8: Actions
  const actionsCol = document.createElement('div');
  actionsCol.className = 'guest-col-actions';
  actionsCol.innerHTML = '<span style="font-size:0.72rem; color:var(--text-muted); opacity:0.4;">+ neu</span>';

  nameRow.appendChild(leftContainer);
  nameRow.appendChild(actionsCol);
  card.appendChild(nameRow);

  // Quick-Add Trigger:
  let guestCreated = null;
  let spawnedNextRow = null;

  const commitNewGuest = () => {
    if (guestCreated) return;
    const fn = firstNameInput.value.trim();
    const ln = lastNameInput.value.trim();
    const addr = addressInput.value.trim();
    const hasTable = Boolean(tableSel.value);
    if (fn === '' && ln === '' && addr === '' && !hasTable) return;

    guestCreated = {
      id: Date.now(),
      firstName: firstNameInput.value,
      lastName: lastNameInput.value,
      address: addressInput.value || '',
      dietId: dietSel.value || 'none',
      needsHighChair: hcSel.value === 'yes',
      age: ageSel.value || 'age-adult',
      tableId: tableSel.value ? parseInt(tableSel.value) : null,
      seatNumber: seatSel.value ? parseInt(seatSel.value) : null
    };

    state.guests.push(guestCreated);
    card.removeAttribute('data-is-quick-add');
    card.classList.remove('quick-add-row');
    actionsCol.innerHTML = '';

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-sm btn-danger guest-delete-btn spreadsheet-cell-control';
    delBtn.setAttribute('data-grid-row', String(rowIndex));
    delBtn.setAttribute('data-grid-col', '8');
    delBtn.innerHTML = '🗑️';
    delBtn.title = 'Gast löschen';
    delBtn.style.padding = '0px 4px';
    delBtn.style.marginLeft = '4px';
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      state.guests = state.guests.filter(g => g.id !== guestCreated.id);
      saveAndRender();
    });
    actionsCol.appendChild(delBtn);

    // Immediately append next empty quick-add row below
    spawnedNextRow = appendQuickAddRow(panel, rowIndex + 1);

    saveState();
    updateStats();
  };

  const syncGuestData = () => {
    if (!guestCreated) return;
    const fn = firstNameInput.value.trim();
    const ln = lastNameInput.value.trim();
    const addr = addressInput.value.trim();
    const hasTable = Boolean(tableSel.value);

    // If completely cleared back to blank and spawned row is still empty, remove spawned row and revert this row back to quick-add
    if (fn === '' && ln === '' && addr === '' && !hasTable && spawnedNextRow && spawnedNextRow.getAttribute('data-is-quick-add') === 'true') {
      state.guests = state.guests.filter(g => g.id !== guestCreated.id);
      guestCreated = null;
      spawnedNextRow.remove();
      spawnedNextRow = null;
      card.setAttribute('data-is-quick-add', 'true');
      card.classList.add('quick-add-row');
      actionsCol.innerHTML = '<span style="font-size:0.72rem; color:var(--text-muted); opacity:0.4;">+ neu</span>';
      saveState();
      updateStats();
      return;
    }

    guestCreated.firstName = firstNameInput.value;
    guestCreated.lastName = lastNameInput.value;
    guestCreated.address = addressInput.value;
    guestCreated.dietId = dietSel.value;
    guestCreated.needsHighChair = hcSel.value === 'yes';
    guestCreated.age = ageSel.value;
    guestCreated.tableId = tableSel.value ? parseInt(tableSel.value) : null;
    guestCreated.seatNumber = seatSel.value ? parseInt(seatSel.value) : null;
    saveState();
    updateStats();
  };

  const onInput = () => {
    commitNewGuest();
    syncGuestData();
  };

  firstNameInput.addEventListener('input', onInput);
  lastNameInput.addEventListener('input', onInput);
  addressInput.addEventListener('input', onInput);

  firstNameInput.addEventListener('blur', syncGuestData);
  lastNameInput.addEventListener('blur', syncGuestData);
  addressInput.addEventListener('blur', syncGuestData);
  tableSel.addEventListener('change', () => {
    commitNewGuest();
    syncGuestData();
  });
  seatSel.addEventListener('change', syncGuestData);
  hcSel.addEventListener('change', () => {
    commitNewGuest();
    syncGuestData();
  });
  ageSel.addEventListener('change', () => {
    commitNewGuest();
    syncGuestData();
  });
  dietSel.addEventListener('change', () => {
    commitNewGuest();
    syncGuestData();
  });

  panel.appendChild(card);
  return card;
}
