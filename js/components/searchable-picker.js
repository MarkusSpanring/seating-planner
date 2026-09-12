// ===== Searchable Guest Picker Component =====

import { state } from '../core/state.js';
import { getFamilyForGuest } from '../utils/family.js';

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

