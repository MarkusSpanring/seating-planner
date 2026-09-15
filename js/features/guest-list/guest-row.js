// ===== Guest Row & Card Component =====

import { state, uiState, saveAndRender } from '../../core/state.js';
import { escHtml } from '../../utils/dom.js';
import {
  getDiet,
  getTable,
  takenSeats,
  guestAtSeat,
  getActiveSeatNumbers,
  getAvailableTablesForGroup,
  assignGroupToTable
} from '../../utils/seating.js';
import {
  getFamilyForGuest,
  createFamily,
  removeFromFamily
} from '../../utils/family.js';
import { makeSearchableGuestPicker } from '../../components/searchable-picker.js';

export function renderGuestCard(guest, isDetailView, skipFamily, forceFullWidth, isTableDetailModal = false) {
  const diet = getDiet(guest.dietId);
  const table = guest.tableId ? getTable(guest.tableId) : null;
  const taken = guest.tableId ? takenSeats(guest.tableId, guest.id) : [];

  if (!isDetailView && !forceFullWidth) {
    const splitCard = document.createElement('div');
    splitCard.className = 'family-card';

    const header = document.createElement('div');
    header.className = 'family-card-header';
    header.style.cursor = 'default';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'family-header-left';
    leftDiv.innerHTML =
      '<span class="group-chevron" style="visibility:hidden">▶</span>' +
      '<span class="family-icon">👤</span>' +
      '<span class="family-name-text">' + escHtml(guest.firstName + ' ' + (guest.lastName || '')) + '</span>';
    header.appendChild(leftDiv);

    const rightDiv = document.createElement('div');
    rightDiv.style.display = 'flex';
    rightDiv.style.alignItems = 'center';
    rightDiv.style.gap = '24px';
    rightDiv.style.flexShrink = '0';

    const sortedTables = getAvailableTablesForGroup([guest]);

    const tableSel = document.createElement('select');
    tableSel.className = 'inline-select';
    tableSel.style.maxWidth = '100px';
    tableSel.title = 'Tisch für diesen Gast zuweisen';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '—';
    if (!guest.tableId) defaultOpt.selected = true;
    tableSel.appendChild(defaultOpt);

    sortedTables.forEach(t => {
      const o = document.createElement('option');
      o.value = String(t.id);
      o.textContent = String(t.number);
      if (String(t.id) === String(guest.tableId || '')) o.selected = true;
      tableSel.appendChild(o);
    });
    tableSel.addEventListener('change', e => {
      e.stopPropagation();
      assignGroupToTable([guest], tableSel.value);
      saveAndRender();
    });
    tableSel.addEventListener('click', e => { e.stopPropagation(); });
    rightDiv.appendChild(tableSel);

    const rightIcons = document.createElement('div');
    rightIcons.className = 'guest-right-icons guest-col-actions';
    rightIcons.style.width = '75px';
    rightIcons.style.justifyContent = 'flex-end';
    const dot = document.createElement('span');
    dot.className = 'diet-dot';
    if (diet && diet.id !== 'none') {
      dot.style.backgroundColor = diet.color;
      dot.title = 'Diät: ' + diet.name;
    } else {
      dot.style.backgroundColor = 'transparent';
      dot.title = 'Keine Diät-Einschränkung';
    }
    rightIcons.appendChild(dot);

    rightDiv.appendChild(rightIcons);
    header.appendChild(rightDiv);
    splitCard.appendChild(header);

    return splitCard;
  }

  const card = document.createElement('div');
  card.className = 'guest-card';

  // Name row
  const nameRow = document.createElement('div');
  nameRow.className = 'guest-card-name';

  if (isDetailView) {
    nameRow.style.cursor = 'default';
  }

  const leftContainer = document.createElement('div');
  leftContainer.className = 'guest-summary-left' + ((isDetailView && uiState.venueCollapsed) || forceFullWidth ? ' guest-summary-left-full' : '');

  const guestFam = getFamilyForGuest(guest.id);
  if (guestFam) {
    card.classList.add('family-member-row');
  }

  const firstNameInput = document.createElement('input');
  firstNameInput.type = 'text';
  firstNameInput.value = guest.firstName || '';
  firstNameInput.className = 'name-input guest-col-firstname spreadsheet-cell-control';
  firstNameInput.setAttribute('data-grid-col', '0');
  firstNameInput.placeholder = 'First';
  firstNameInput.title = 'Vorname bearbeiten (Enter zum Speichern, Esc zum Abbrechen)';
  firstNameInput.addEventListener('click', e => { e.stopPropagation(); });
  firstNameInput.addEventListener('blur', () => {
    const v = firstNameInput.value.trim();
    if (v !== guest.firstName) {
      guest.firstName = v;
      saveAndRender();
    }
  });
  firstNameInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      firstNameInput.value = guest.firstName;
      firstNameInput.blur();
      e.stopPropagation();
    }
  });
  leftContainer.appendChild(firstNameInput);

  const lastNameInput = document.createElement('input');
  lastNameInput.type = 'text';
  lastNameInput.value = guest.lastName || '';
  lastNameInput.className = 'name-input guest-col-lastname spreadsheet-cell-control';
  lastNameInput.setAttribute('data-grid-col', '1');
  lastNameInput.placeholder = 'Last';
  lastNameInput.title = 'Nachname bearbeiten (Enter zum Speichern, Esc zum Abbrechen)';
  lastNameInput.addEventListener('click', e => { e.stopPropagation(); });
  lastNameInput.addEventListener('blur', () => {
    const v = lastNameInput.value.trim();
    if (v !== guest.lastName) {
      guest.lastName = v;
      saveAndRender();
    }
  });
  lastNameInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      lastNameInput.value = guest.lastName;
      lastNameInput.blur();
      e.stopPropagation();
    }
  });
  leftContainer.appendChild(lastNameInput);

  if (isDetailView && !forceFullWidth) {
    const addressInput = document.createElement('input');
    addressInput.type = 'text';
    addressInput.value = guest.address || '';
    addressInput.className = 'name-input guest-col-address spreadsheet-cell-control';
    addressInput.setAttribute('data-grid-col', '2');
    addressInput.placeholder = 'Adresse';
    addressInput.title = 'Adresse bearbeiten (Enter zum Speichern, Esc zum Abbrechen)';
    addressInput.addEventListener('click', e => { e.stopPropagation(); });
    addressInput.addEventListener('blur', () => {
      const v = addressInput.value.trim();
      if (v !== (guest.address || '')) {
        guest.address = v;
        saveAndRender();
      }
    });
    addressInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        addressInput.value = guest.address || '';
        addressInput.blur();
        e.stopPropagation();
      }
    });
    leftContainer.appendChild(addressInput);
  }

  // Table Inline Select
  const sortedTables = getAvailableTablesForGroup([guest]);
  const tableOptions = [{ value: '', label: '—' }];
  sortedTables.forEach(t => {
    tableOptions.push({
      value: String(t.id),
      label: String(t.number),
    });
  });

  const tableCol = document.createElement('div');
  tableCol.className = 'guest-col-table';

  const tableSel = document.createElement('select');
  tableSel.className = 'inline-select spreadsheet-cell-control';
  tableSel.setAttribute('data-grid-col', '3');
  tableSel.title = 'Tisch für diesen Gast auswählen';
  tableOptions.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (String(opt.value) === String(guest.tableId || '')) o.selected = true;
    tableSel.appendChild(o);
  });
  tableSel.addEventListener('change', e => {
    e.stopPropagation();
    assignGroupToTable([guest], tableSel.value);
    saveAndRender();
  });
  tableSel.addEventListener('click', e => { e.stopPropagation(); });
  tableCol.appendChild(tableSel);
  leftContainer.appendChild(tableCol);

  // Seat Inline Select
  const seatCol = document.createElement('div');
  seatCol.className = 'guest-col-seat';

  if (guest.tableId) {
    const seatOptions = [{ value: '', label: '—' }];
    const activeSeatNums = table ? getActiveSeatNumbers(table) : [];
    for (let s = 0; s < activeSeatNums.length; s++) {
      const sn = activeSeatNums[s];
      const isTaken = taken.indexOf(sn) >= 0;
      seatOptions.push({
        value: String(sn),
        label: String(sn) + (isTaken ? ' ⇄' : ''),
      });
    }
    const seatSel = document.createElement('select');
    seatSel.className = 'inline-select spreadsheet-cell-control';
    seatSel.setAttribute('data-grid-col', '4');
    seatSel.title = 'Sitzplatz auswählen (⇄ markiert bereits belegte Plätze, die getauscht werden)';
    seatOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (String(opt.value) === String(guest.seatNumber || '')) o.selected = true;
      seatSel.appendChild(o);
    });
    seatSel.addEventListener('change', e => {
      e.stopPropagation();
      const v = seatSel.value;
      const newSeat = v ? parseInt(v) : null;

      if (newSeat) {
        const existingGuest = guestAtSeat(guest.tableId, newSeat);
        if (existingGuest && existingGuest.id !== guest.id) {
          existingGuest.seatNumber = guest.seatNumber;
        }
      }
      guest.seatNumber = newSeat;
      saveAndRender();
    });
    seatSel.addEventListener('click', e => { e.stopPropagation(); });
    seatCol.appendChild(seatSel);
  }
  leftContainer.appendChild(seatCol);

  if (isDetailView) {
    // High Chair Inline Select
    const hcCol = document.createElement('div');
    hcCol.className = 'guest-col-hc';
    const hcSel = document.createElement('select');
    hcSel.className = 'inline-select spreadsheet-cell-control';
    hcSel.setAttribute('data-grid-col', '5');
    hcSel.title = 'Hochstuhl erforderlich (Ja / Nein)';
    const hcOptions = [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' }
    ];
    hcOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (String(opt.value) === (guest.needsHighChair ? 'yes' : 'no')) o.selected = true;
      hcSel.appendChild(o);
    });
    hcSel.addEventListener('change', e => {
      e.stopPropagation();
      const v = hcSel.value;
      guest.needsHighChair = (v === 'yes');
      saveAndRender();
    });
    hcSel.addEventListener('click', e => { e.stopPropagation(); });
    hcCol.appendChild(hcSel);
    leftContainer.appendChild(hcCol);

    // Age Inline Select
    const ageCol = document.createElement('div');
    ageCol.className = 'guest-col-age';
    const ageSel = document.createElement('select');
    ageSel.className = 'inline-select spreadsheet-cell-control';
    ageSel.setAttribute('data-grid-col', '6');
    ageSel.title = 'Altersgruppe auswählen';
    const currentAge = guest.age || 'age-adult';
    state.ageGroups.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.id;
      o.textContent = opt.name;
      if (opt.id === currentAge) o.selected = true;
      ageSel.appendChild(o);
    });
    ageSel.addEventListener('change', e => {
      e.stopPropagation();
      guest.age = ageSel.value;
      saveAndRender();
    });
    ageSel.addEventListener('click', e => { e.stopPropagation(); });
    ageCol.appendChild(ageSel);
    leftContainer.appendChild(ageCol);

    // Diet Inline Select
    const dietCol = document.createElement('div');
    dietCol.className = 'guest-col-diet';
    const dietSel = document.createElement('select');
    dietSel.className = 'inline-select inline-diet-select spreadsheet-cell-control';
    dietSel.setAttribute('data-grid-col', '7');
    dietSel.title = 'Ernährungsweise / Diät auswählen';
    state.dietOptions.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id;
      o.textContent = d.name;
      if (String(d.id) === String(guest.dietId)) o.selected = true;
      dietSel.appendChild(o);
    });
    dietSel.addEventListener('change', e => {
      e.stopPropagation();
      guest.dietId = dietSel.value;
      saveAndRender();
    });
    dietSel.addEventListener('click', e => { e.stopPropagation(); });
    dietCol.appendChild(dietSel);
    leftContainer.appendChild(dietCol);

  }

  nameRow.appendChild(leftContainer);

  const rightIcons = document.createElement('div');
  rightIcons.className = 'guest-right-icons guest-col-actions';

  const dot = document.createElement('span');
  dot.className = 'diet-dot';
  if (diet && diet.id !== 'none') {
    dot.style.backgroundColor = diet.color;
    dot.title = 'Diät: ' + diet.name;
  } else {
    dot.style.backgroundColor = 'transparent';
    dot.title = 'Keine Diät-Einschränkung';
  }
  rightIcons.appendChild(dot);

  if (isDetailView) {
    if (uiState.venueCollapsed && !getFamilyForGuest(guest.id) && !isTableDetailModal) {
      const famBtn = createFamilyButton(guest, rightIcons);
      rightIcons.appendChild(famBtn);
    }

    if (isTableDetailModal) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn btn-sm btn-danger guest-remove-btn spreadsheet-cell-control';
      removeBtn.setAttribute('data-grid-col', '8');
      removeBtn.innerHTML = '✕';
      removeBtn.title = 'Gast vom Tisch entfernen';
      removeBtn.style.padding = '0px 6px';
      removeBtn.style.marginLeft = '4px';
      removeBtn.style.fontSize = '0.75rem';
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        guest.tableId = null;
        guest.seatNumber = null;
        saveAndRender();
      });
      rightIcons.appendChild(removeBtn);
    } else {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-danger guest-delete-btn spreadsheet-cell-control';
      delBtn.setAttribute('data-grid-col', '8');
      delBtn.innerHTML = '🗑️';
      delBtn.title = 'Gast endgültig löschen';
      delBtn.style.padding = '0px 4px';
      delBtn.style.marginLeft = '4px';
      delBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('Diesen Gast wirklich unwiderruflich löschen?')) {
          const fam = getFamilyForGuest(guest.id);
          if (fam) removeFromFamily(fam.id, guest.id);
          state.guests = state.guests.filter(g => g.id !== guest.id);
          saveAndRender();
        }
      });
      rightIcons.appendChild(delBtn);
    }
  }

  nameRow.appendChild(rightIcons);
  card.appendChild(nameRow);

  return card;
}

export function createFamilyButton(guest, rightIcons) {
  const famBtn = document.createElement('button');
  famBtn.className = 'btn btn-sm family-header-action-btn spreadsheet-cell-control';
  famBtn.innerHTML = '👨‍👩‍👧‍👦';
  famBtn.title = 'Gast mit Familie oder anderem Gast verknüpfen';
  famBtn.style.padding = '0px 4px';
  famBtn.style.marginRight = '2px';
  famBtn.style.fontSize = '0.72rem';
  famBtn.addEventListener('click', e => {
    e.stopPropagation();
    const existingWrap = rightIcons.querySelector('.single-fam-picker-wrap');
    if (existingWrap) {
      existingWrap.remove();
      return;
    }
    const pickerWrap = document.createElement('div');
    pickerWrap.className = 'single-fam-picker-wrap';
    pickerWrap.style.cssText = 'position:absolute; right:36px; z-index:10; background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; padding:4px 6px; box-shadow:0 4px 14px rgba(0,0,0,0.4); display:flex; align-items:center; gap:4px;';
    const picker = makeSearchableGuestPicker('Partner / Gast wählen…', [guest.id], selectedId => {
      createFamily(guest.id, selectedId);
    }, true);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.75rem; padding:0 4px;';
    closeBtn.addEventListener('click', ev => { ev.stopPropagation(); pickerWrap.remove(); });
    pickerWrap.appendChild(picker);
    pickerWrap.appendChild(closeBtn);
    rightIcons.insertBefore(pickerWrap, famBtn);
    const pInput = picker.querySelector('input');
    if (pInput) setTimeout(() => pInput.focus(), 20);
  });
  return famBtn;
}


