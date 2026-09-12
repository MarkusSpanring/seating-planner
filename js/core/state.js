import { DEFAULT_DIETS, DEFAULT_AGES, DEFAULT_VENUE_WIDTH, DEFAULT_VENUE_HEIGHT } from './constants.js';
import { events } from './events.js';

// Core persistent data model
export const state = {
  venueName: 'Hauptsaal',
  venueWidth: DEFAULT_VENUE_WIDTH,
  venueHeight: DEFAULT_VENUE_HEIGHT,
  guests: [],
  dietOptions: DEFAULT_DIETS.map(d => Object.assign({}, d)),
  ageGroups: DEFAULT_AGES.map(a => Object.assign({}, a)),
  tables: [],
  families: [],
  customBlueprints: [],
};

export function getVenueWidth() {
  return state.venueWidth || DEFAULT_VENUE_WIDTH;
}

export function getVenueHeight() {
  return state.venueHeight || DEFAULT_VENUE_HEIGHT;
}

// Application UI states (transient)
export const uiState = {
  venues: [],
  activeVenue: 'Hauptsaal',
  collapsedGroups: {},
  venueCollapsed: false,
  allGroupsExpanded: false,
  selectedDetailSeat: null,
  detailEditMode: false,
  detailZoom: 1.0,
  detailPanX: 0,
  detailPanY: 0,
  dragState: null,
  currentEditingTableId: null,
  bpPreviewDisabledSeats: [],
  editingBlueprintId: null,
  svgElement: null,
};

// ── State Change Observer Pattern ────────────────────────────────────
const changeListeners = [];

export function registerStateChangeListener(callback) {
  changeListeners.push(callback);
}

export function notifyStateChange() {
  changeListeners.forEach(callback => {
    try {
      callback();
    } catch (e) {
      console.error('Error during state change callback:', e);
    }
  });
  events.emit('state:changed', state);
}

// ── REST API Persistence ─────────────────────────────────────────────
export function loadState(callback, venueToLoad) {
  if (typeof fetch !== 'function') {
    if (callback) callback();
    return;
  }

  fetch('/api/venues')
    .then(res => res.ok ? res.json() : { venues: [], activeVenue: 'Hauptsaal' })
    .catch(() => ({ venues: [], activeVenue: 'Hauptsaal' }))
    .then(venuesData => {
      uiState.venues = venuesData.venues || [];
      const storedVenue = localStorage.getItem('sitzplan_active_venue');
      let target = venueToLoad;
      if (!target) {
        if (storedVenue && uiState.venues.some(v => v.name === storedVenue)) {
          target = storedVenue;
        } else {
          target = venuesData.activeVenue || (uiState.venues[0] ? uiState.venues[0].name : 'Hauptsaal');
        }
      }
      uiState.activeVenue = target;
      localStorage.setItem('sitzplan_active_venue', target);

      return fetch(`/api/state?venue=${encodeURIComponent(target)}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load state');
          return res.json();
        })
        .then(data => {
          if (data) {
            state.venueName = data.venueName || target;
            state.venueWidth = data.venueWidth;
            state.venueHeight = data.venueHeight;
            state.guests = data.guests || [];
            state.dietOptions = data.dietOptions || DEFAULT_DIETS.map(d => Object.assign({}, d));
            state.ageGroups = data.ageGroups || DEFAULT_AGES.map(a => Object.assign({}, a));
            state.tables = data.tables || [];
            state.families = data.families || [];
            state.customBlueprints = data.customBlueprints || [];

            // Migration: ensure required table fields exist
            state.tables.forEach(t => {
              t.shape = t.shape || 'circle';
              if (t.seatsLong == null) t.seatsLong = null;
              if (t.seatsShort == null) t.seatsShort = null;
              if (!Array.isArray(t.disabledSeats)) t.disabledSeats = [];
            });

            // Legacy migration: if venueWidth / venueHeight are missing
            if (!state.venueWidth || !state.venueHeight) {
              if (state.tables.length > 0) {
                const maxCoordX = Math.max(...state.tables.map(t => t.x || 0));
                const maxCoordY = Math.max(...state.tables.map(t => t.y || 0));
                if (maxCoordX <= 1200 && maxCoordY <= 700) {
                  // Legacy scale factor 2.5 converts 1200x700 canvas to 3000x1750 cm room
                  state.tables.forEach(t => {
                    t.x = Math.round(t.x * 2.5);
                    t.y = Math.round(t.y * 2.5);
                  });
                  state.venueWidth = 3000;
                  state.venueHeight = 1750;
                } else {
                  state.venueWidth = Math.max(DEFAULT_VENUE_WIDTH, Math.ceil(maxCoordX + 200));
                  state.venueHeight = Math.max(DEFAULT_VENUE_HEIGHT, Math.ceil(maxCoordY + 200));
                }
              } else {
                state.venueWidth = DEFAULT_VENUE_WIDTH;
                state.venueHeight = DEFAULT_VENUE_HEIGHT;
              }
              saveState();
            }
          }
          events.emit('venues:updated', { venues: uiState.venues, activeVenue: uiState.activeVenue });
          events.emit('state:loaded', state);
          if (callback) callback();
        });
    })
    .catch(err => {
      console.warn('Could not load state from backend:', err);
      if (callback) callback();
    });
}

export function saveState() {
  if (typeof fetch !== 'function') return;
  const targetVenue = state.venueName || uiState.activeVenue || 'Hauptsaal';
  fetch(`/api/state?venue=${encodeURIComponent(targetVenue)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueName: targetVenue,
      venueWidth: state.venueWidth,
      venueHeight: state.venueHeight,
      guests: state.guests,
      dietOptions: state.dietOptions,
      ageGroups: state.ageGroups,
      tables: state.tables,
      families: state.families,
      customBlueprints: state.customBlueprints,
    })
  }).catch(err => {
    console.error('Failed to save state to backend', err);
  });
}

export function saveAndRender() {
  saveState();
  notifyStateChange();
}

// ── Multi-Venue Operations ───────────────────────────────────────────
export function switchVenue(venueName, callback) {
  saveState();
  uiState.selectedDetailSeat = null;
  uiState.currentEditingTableId = null;
  uiState.detailEditMode = false;
  loadState(() => {
    notifyStateChange();
    if (callback) callback();
  }, venueName);
}

export function createVenue(name, copyGuests = false, venueWidth = DEFAULT_VENUE_WIDTH, venueHeight = DEFAULT_VENUE_HEIGHT, callback) {
  if (typeof venueWidth === 'function') {
    callback = venueWidth;
    venueWidth = DEFAULT_VENUE_WIDTH;
    venueHeight = DEFAULT_VENUE_HEIGHT;
  }
  saveState();
  const trimmed = name.trim();
  if (!trimmed) return;

  const initialState = {
    venueName: trimmed,
    venueWidth: parseInt(venueWidth) || DEFAULT_VENUE_WIDTH,
    venueHeight: parseInt(venueHeight) || DEFAULT_VENUE_HEIGHT,
    guests: copyGuests
      ? state.guests.map(g => Object.assign({}, g, { tableId: null, seatNumber: null }))
      : [],
    dietOptions: state.dietOptions.map(d => Object.assign({}, d)),
    ageGroups: state.ageGroups.map(a => Object.assign({}, a)),
    tables: [],
    families: copyGuests ? state.families.map(f => Object.assign({}, f)) : [],
    customBlueprints: state.customBlueprints.map(b => Object.assign({}, b)),
  };

  fetch('/api/venues/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: trimmed, initialState })
  })
    .then(res => res.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
        return;
      }
      switchVenue(trimmed, callback);
    })
    .catch(err => {
      console.error('Failed to create venue:', err);
      alert('Fehler beim Erstellen der Venue');
    });
}

export function renameVenue(newName, callback) {
  const trimmed = newName.trim();
  if (!trimmed || trimmed === state.venueName) return;

  saveState();
  fetch('/api/venues/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName: state.venueName, newName: trimmed })
  })
    .then(res => res.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
        return;
      }
      state.venueName = trimmed;
      uiState.activeVenue = trimmed;
      localStorage.setItem('sitzplan_active_venue', trimmed);
      loadState(() => {
        notifyStateChange();
        if (callback) callback();
      }, trimmed);
    })
    .catch(err => {
      console.error('Failed to rename venue:', err);
      alert('Fehler beim Umbenennen der Venue');
    });
}

export function deleteVenue(venueName, callback) {
  fetch('/api/venues/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: venueName })
  })
    .then(res => res.json())
    .then(res => {
      if (res.error) {
        alert(res.error);
        return;
      }
      const newActive = res.activeVenue || 'Hauptsaal';
      switchVenue(newActive, callback);
    })
    .catch(err => {
      console.error('Failed to delete venue:', err);
      alert('Fehler beim Löschen der Venue');
    });
}
