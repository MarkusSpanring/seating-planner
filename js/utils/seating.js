// ===== Sitzplan Seating Domain Utilities =====

import { state, saveAndRender } from '../core/state.js';
import { findEmptySpace } from './geometry.js';

export function getDiet(id) {
  for (let i = 0; i < state.dietOptions.length; i++) {
    if (state.dietOptions[i].id === id) return state.dietOptions[i];
  }
  return state.dietOptions[0];
}

export function getTable(id) {
  for (let i = 0; i < state.tables.length; i++) {
    if (state.tables[i].id === id) return state.tables[i];
  }
  return null;
}

export function guestAtSeat(tableId, seatNum) {
  for (let i = 0; i < state.guests.length; i++) {
    const g = state.guests[i];
    if (g.tableId === tableId && g.seatNumber === seatNum) return g;
  }
  return null;
}

export function takenSeats(tableId, excludeGuestId) {
  const seats = [];
  for (let i = 0; i < state.guests.length; i++) {
    const g = state.guests[i];
    if (g.tableId === tableId && g.seatNumber && g.id !== excludeGuestId) {
      seats.push(g.seatNumber);
    }
  }
  return seats;
}

export function guestsAtTable(tableId) {
  return state.guests.filter(g => g.tableId === tableId);
}

export function unassignedGuests() {
  return state.guests.filter(g => !g.tableId);
}

export function seatedCount() {
  return state.guests.filter(g => g.tableId && g.seatNumber).length;
}

export function getEffectiveSeatCount(table) {
  const disabled = Array.isArray(table.disabledSeats) ? table.disabledSeats.length : 0;
  return table.seatCount - disabled;
}

export function totalSeatCapacity() {
  let sum = 0;
  for (let i = 0; i < state.tables.length; i++) {
    sum += getEffectiveSeatCount(state.tables[i]);
  }
  return sum;
}

export function getActiveSeatNumbers(table) {
  const disabled = Array.isArray(table.disabledSeats) ? table.disabledSeats : [];
  const active = [];
  for (let i = 1; i <= table.seatCount; i++) {
    if (disabled.indexOf(i) < 0) active.push(i);
  }
  return active;
}

export function addTable(seatCount) {
  const used = {};
  state.tables.forEach(t => {
    if (String(t.number).trim() !== '' && !isNaN(t.number)) {
      used[Number(t.number)] = true;
    }
  });
  let num = 1;
  while (used[num]) {
    num++;
  }

  const tempTable = {
    seatCount: seatCount,
    shape: 'circle',
    disabledSeats: []
  };
  const pos = findEmptySpace(tempTable);

  state.tables.push({
    id: Date.now(),
    number: num,
    seatCount: seatCount,
    x: pos.x,
    y: pos.y,
    shape: 'circle',
    seatsLong: null,
    seatsShort: null,
    disabledSeats: [],
  });
  saveAndRender();
}

export function removeTable(tableId) {
  // Unassign all guests from this table
  state.guests.forEach(g => {
    if (g.tableId === tableId) {
      g.tableId = null;
      g.seatNumber = null;
    }
  });
  state.tables = state.tables.filter(t => t.id !== tableId);
  saveAndRender();
}

export function getAvailableTablesForGroup(guestsInGroup) {
  return state.tables.filter(t => {
    if (guestsInGroup.length > 0 && guestsInGroup[0].tableId === t.id) return true;
    let takenByOthers = 0;
    state.guests.forEach(g => {
      if (g.tableId === t.id && guestsInGroup.indexOf(g) < 0) takenByOthers++;
    });
    return (getEffectiveSeatCount(t) - takenByOthers) >= guestsInGroup.length;
  }).sort((a, b) => {
    return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function assignGroupToTable(guestsInGroup, tableIdStr) {
  if (!tableIdStr || tableIdStr === '') {
    guestsInGroup.forEach(g => {
      g.tableId = null;
      g.seatNumber = null;
    });
    return;
  }
  const tId = parseInt(tableIdStr);
  const takenSeatsMap = {};
  state.guests.forEach(g => {
    if (g.tableId === tId && guestsInGroup.indexOf(g) < 0 && g.seatNumber) {
      takenSeatsMap[g.seatNumber] = true;
    }
  });
  const tObj = getTable(tId);
  if (!tObj) return;
  const activeSeats = getActiveSeatNumbers(tObj);
  const freeSeats = [];
  for (let i = 0; i < activeSeats.length; i++) {
    if (!takenSeatsMap[activeSeats[i]]) freeSeats.push(activeSeats[i]);
  }
  guestsInGroup.forEach((g, idx) => {
    g.tableId = tId;
    g.seatNumber = freeSeats[idx] || null;
  });
}

