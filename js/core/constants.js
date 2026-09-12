// ===== Sitzplan Constants =====

export const SVG_NS = 'http://www.w3.org/2000/svg';
export const DEFAULT_VENUE_WIDTH = 1500; // 15.0 meters (1500 cm)
export const DEFAULT_VENUE_HEIGHT = 1000; // 10.0 meters (1000 cm)
export const SEAT_R_CM = 30; // 30 cm radius (chair width ~55 cm)

export const CANVAS_W = DEFAULT_VENUE_WIDTH;
export const CANVAS_H = DEFAULT_VENUE_HEIGHT;

export const DEFAULT_DIETS = [
  { id: 'none', name: 'None', color: '#6b7280' },
  { id: 'vegetarian', name: 'Vegetarian', color: '#22c55e' },
  { id: 'vegan', name: 'Vegan', color: '#a855f7' },
  { id: 'gluten-free', name: 'Gluten-free', color: '#f97316' },
];

export const PRESET_COLORS = [
  '#22c55e', // Green
  '#a855f7', // Purple
  '#f97316', // Orange
  '#0ea5e9', // Blue
  '#ef4444', // Red
  '#eab308', // Yellow
  '#e879f9', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#84cc16'  // Lime
];

export const DEFAULT_AGES = [
  { id: 'age-adult', name: 'Erwachsen' },
  { id: 'age-under12', name: '< 12 J.' },
  { id: 'age-under6', name: '< 6 J.' },
  { id: 'age-under3', name: '< 3 J.' }
];

