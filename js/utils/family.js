// ===== Sitzplan Family Management Utilities =====

import { state, saveAndRender } from '../core/state.js';

export function getFamilyForGuest(guestId) {
  for (let i = 0; i < state.families.length; i++) {
    if (state.families[i].memberIds.indexOf(guestId) >= 0) return state.families[i];
  }
  return null;
}

export function getFamily(familyId) {
  for (let i = 0; i < state.families.length; i++) {
    if (state.families[i].id === familyId) return state.families[i];
  }
  return null;
}

export function getFamilyMembers(familyId) {
  const fam = getFamily(familyId);
  if (!fam) return [];
  return fam.memberIds.map(gid => {
    return state.guests.find(g => g.id === gid);
  }).filter(Boolean);
}

export function createFamily(initiatorId, memberId) {
  const initiator = state.guests.find(g => g.id === initiatorId);
  if (!initiator) return;

  const existingFam = getFamilyForGuest(initiatorId);

  // If user selected an existing family from the dropdown, add initiator to it
  if (String(memberId).startsWith('fam-')) {
    if (existingFam) {
      addToFamily(memberId, existingFam.id);
    } else {
      addToFamily(memberId, initiatorId);
    }
    return;
  }

  if (existingFam) {
    addToFamily(existingFam.id, memberId);
    return;
  }
  const fam = {
    id: 'fam-' + Date.now(),
    name: (initiator.firstName || '') + (initiator.lastName ? ' ' + initiator.lastName : ''),
    nameSourceGuestId: initiatorId,
    memberIds: [initiatorId, memberId],
  };
  state.families.push(fam);
  saveAndRender();
}

export function addToFamily(familyId, guestId) {
  const fam = getFamily(familyId);
  if (!fam) return;

  // Handle merging if guestId is actually another family
  if (String(guestId).startsWith('fam-')) {
    const otherFam = getFamily(guestId);
    if (otherFam && otherFam.id !== familyId) {
      otherFam.memberIds.forEach(mid => {
        if (fam.memberIds.indexOf(mid) < 0) fam.memberIds.push(mid);
      });
      state.families = state.families.filter(f => f.id !== otherFam.id);
    }
    saveAndRender();
    return;
  }

  // Standard guest addition
  // Remove guest from any other family first
  const otherFam = getFamilyForGuest(guestId);
  if (otherFam && otherFam.id !== familyId) {
    otherFam.memberIds = otherFam.memberIds.filter(id => id !== guestId);
    if (otherFam.memberIds.length <= 1) {
      state.families = state.families.filter(f => f.id !== otherFam.id);
    }
  }
  if (fam.memberIds.indexOf(guestId) < 0) {
    fam.memberIds.push(guestId);
  }
  saveAndRender();
}

export function removeFromFamily(familyId, guestId) {
  const fam = getFamily(familyId);
  if (!fam) return;
  fam.memberIds = fam.memberIds.filter(id => id !== guestId);

  // If name source was removed, pick new source
  if (fam.nameSourceGuestId === guestId && fam.memberIds.length > 0) {
    const newSource = state.guests.find(g => g.id === fam.memberIds[0]);
    if (newSource) {
      fam.nameSourceGuestId = newSource.id;
      fam.name = (newSource.firstName || '') + (newSource.lastName ? ' ' + newSource.lastName : '');
    }
  }

  // Dissolve if only 1 or 0 members left
  if (fam.memberIds.length <= 1) {
    state.families = state.families.filter(f => f.id !== familyId);
  }
  saveAndRender();
}

export function dissolveFamily(familyId) {
  state.families = state.families.filter(f => f.id !== familyId);
  saveAndRender();
}

