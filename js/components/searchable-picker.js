// ===== Searchable Guest Picker Component =====

import { state } from '../core/state.js';
import { getFamilyForGuest } from '../utils/family.js';
import { getTable } from '../utils/seating.js';
import { escHtml } from '../utils/dom.js';

function getGuestListForPicker(excludeIds, onlyUngrouped) {
  const list = [];
  const addedFamilies = {};
  state.guests.forEach(g => {
    if (excludeIds && excludeIds.indexOf(g.id) >= 0) return;
    const fam = getFamilyForGuest(g.id);
    if (fam) {
      if (onlyUngrouped) return;
      if (!addedFamilies[fam.id]) {
        // Ensure no member of this family is in excludeIds
        const hasExcluded = fam.memberIds.some(mid => excludeIds && excludeIds.indexOf(mid) >= 0);
        if (!hasExcluded) {
          addedFamilies[fam.id] = true;
          list.push({
            id: fam.id,
            label: 'Group: ' + fam.name,
            sortKey: (fam.name || '').toLowerCase(),
          });
        }
      }
    } else {
      list.push({
        id: g.id,
        label: (g.lastName || '') + (g.firstName ? (g.lastName ? ', ' : '') + g.firstName : ''),
        sortKey: (g.lastName || '').toLowerCase() + ' ' + (g.firstName || '').toLowerCase(),
      });
    }
  });
  list.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return list;
}

export function makeSearchableGuestPicker(placeholder, excludeIds, onSelect, onlyUngrouped) {
  const container = document.createElement('div');
  container.className = 'searchable-picker';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'searchable-picker-input';
  input.placeholder = placeholder || 'Search guest…';
  input.title = placeholder || 'Gast suchen und auswählen';
  input.addEventListener('click', e => { e.stopPropagation(); });

  // Use a body-level dropdown to avoid overflow clipping
  const dropdown = document.createElement('div');
  dropdown.className = 'searchable-picker-dropdown';
  dropdown.style.display = 'none';
  document.body.appendChild(dropdown);

  const guestList = getGuestListForPicker(excludeIds, onlyUngrouped);

  function positionDropdown() {
    const rect = input.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = (rect.bottom + 2) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = Math.max(rect.width, 180) + 'px';
  }

  function renderOptions(filter) {
    dropdown.innerHTML = '';
    const filterLower = (filter || '').toLowerCase();
    let count = 0;
    guestList.forEach(item => {
      if (filterLower && item.label.toLowerCase().indexOf(filterLower) < 0 &&
        item.sortKey.indexOf(filterLower) < 0) return;
      const opt = document.createElement('div');
      opt.className = 'searchable-picker-option';
      opt.textContent = item.label;
      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        dropdown.style.display = 'none';
        onSelect(item.id);
      });
      dropdown.appendChild(opt);
      count++;
    });
    if (count === 0) {
      const empty = document.createElement('div');
      empty.className = 'searchable-picker-empty';
      empty.textContent = 'Keine Treffer';
      dropdown.appendChild(empty);
    }
  }

  input.addEventListener('focus', () => {
    positionDropdown();
    renderOptions(input.value);
    dropdown.style.display = 'block';
  });
  input.addEventListener('input', () => {
    renderOptions(input.value);
  });
  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 150);
  });
  input.addEventListener('keydown', e => { e.stopPropagation(); });

  container.appendChild(input);
  return container;
}

export function makeSeatGuestPicker(placeholder, currentTableId, onSelect) {
  const container = document.createElement('div');
  container.className = 'searchable-picker seat-guest-picker';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'searchable-picker-input seat-picker-input';
  input.placeholder = placeholder || 'Gast suchen & zuweisen…';
  input.title = placeholder || 'Gast suchen und zuweisen';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.addEventListener('click', e => { e.stopPropagation(); });

  const dropdown = document.createElement('div');
  dropdown.className = 'searchable-picker-dropdown table-detail-picker-dropdown';
  dropdown.style.display = 'none';
  document.body.appendChild(dropdown);

  let activeIndex = -1;
  let currentFiltered = [];

  function getGuestItems() {
    const list = [];
    state.guests.forEach(g => {
      const first = (g.firstName || '').trim();
      const last = (g.lastName || '').trim();
      const fullName = (first + ' ' + last).trim() || 'Unbenannter Gast';
      const sortName = (last + ' ' + first).trim() || 'Unbenannter Gast';

      let statusText = 'Nicht zugeteilt';
      let statusType = 'unassigned';
      if (g.tableId) {
        const t = getTable(g.tableId);
        const tNum = t ? t.number : '?';
        if (g.tableId === currentTableId) {
          statusText = `Aktuell Platz ${g.seatNumber || '?'}`;
          statusType = 'current-table';
        } else {
          statusText = `Tisch ${tNum}${g.seatNumber ? ', Platz ' + g.seatNumber : ''}`;
          statusType = 'other-table';
        }
      }

      list.push({
        id: g.id,
        guest: g,
        fullName,
        sortName,
        statusText,
        statusType,
        isUnassigned: !g.tableId,
      });
    });

    list.sort((a, b) => {
      if (a.isUnassigned && !b.isUnassigned) return -1;
      if (!a.isUnassigned && b.isUnassigned) return 1;
      return a.sortName.localeCompare(b.sortName, undefined, { sensitivity: 'base' });
    });

    return list;
  }

  function positionDropdown() {
    const rect = input.getBoundingClientRect();
    const width = Math.max(rect.width, 280);
    const left = Math.min(rect.left, window.innerWidth - width - 10);
    dropdown.style.position = 'fixed';
    dropdown.style.width = width + 'px';
    dropdown.style.left = Math.max(10, left) + 'px';
    dropdown.style.zIndex = '10000';

    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 200 && rect.top > 200) {
      dropdown.style.top = 'auto';
      dropdown.style.bottom = (window.innerHeight - rect.top + 2) + 'px';
    } else {
      dropdown.style.bottom = 'auto';
      dropdown.style.top = (rect.bottom + 2) + 'px';
    }
  }

  function renderOptions(filter) {
    dropdown.innerHTML = '';
    const items = getGuestItems();
    const q = (filter || '').trim().toLowerCase();

    currentFiltered = items.filter(item => {
      if (!q) return true;
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.sortName.toLowerCase().includes(q) ||
        item.statusText.toLowerCase().includes(q)
      );
    });

    activeIndex = -1;

    if (currentFiltered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'searchable-picker-empty';
      empty.textContent = q ? `Keine Treffer für „${q}“` : 'Keine Gäste vorhanden';
      dropdown.appendChild(empty);
      return;
    }

    currentFiltered.forEach((item, idx) => {
      const opt = document.createElement('div');
      opt.className = 'seat-picker-option';
      opt.dataset.index = idx;

      let badgeClass = 'is-unassigned';
      if (item.statusType === 'other-table') badgeClass = 'is-seated';
      else if (item.statusType === 'current-table') badgeClass = 'is-current-table';

      opt.innerHTML = `
        <div class="seat-picker-opt-main">
          <span class="seat-picker-opt-name">${escHtml(item.fullName)}</span>
          ${item.guest.needsHighChair ? '<span class="seat-picker-opt-hc" title="Hochstuhl">👶</span>' : ''}
        </div>
        <span class="seat-picker-opt-badge ${badgeClass}">${escHtml(item.statusText)}</span>
      `;

      opt.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        dropdown.style.display = 'none';
        onSelect(item.id);
      });

      dropdown.appendChild(opt);
    });
  }

  function updateActiveOption() {
    const opts = dropdown.querySelectorAll('.seat-picker-option');
    opts.forEach((opt, idx) => {
      if (idx === activeIndex) {
        opt.classList.add('active');
        opt.scrollIntoView({ block: 'nearest' });
      } else {
        opt.classList.remove('active');
      }
    });
  }

  input.addEventListener('focus', () => {
    positionDropdown();
    renderOptions(input.value);
    dropdown.style.display = 'block';
  });

  input.addEventListener('input', () => {
    positionDropdown();
    renderOptions(input.value);
    dropdown.style.display = 'block';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentFiltered.length > 0) {
        activeIndex = (activeIndex + 1) % currentFiltered.length;
        updateActiveOption();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentFiltered.length > 0) {
        activeIndex = (activeIndex - 1 + currentFiltered.length) % currentFiltered.length;
        updateActiveOption();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < currentFiltered.length) {
        const selId = currentFiltered[activeIndex].id;
        input.value = '';
        dropdown.style.display = 'none';
        onSelect(selId);
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      input.blur();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      dropdown.style.display = 'none';
    }, 150);
  });

  container.appendChild(input);
  return container;
}


