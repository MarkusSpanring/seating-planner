// ===== Venue Size Modal & Controls =====

import { state, saveAndRender, getVenueWidth, getVenueHeight } from '../../core/state.js';
import { events } from '../../core/events.js';
import { $ } from '../../utils/dom.js';
import { getTablesEnvelope } from '../../utils/geometry.js';

let isModalMounted = false;

export function updateVenueSizeButton() {
  const btn = $('btn-venue-size');
  const label = $('venue-size-label');
  const w = getVenueWidth();
  const h = getVenueHeight();
  const wM = (w / 100).toFixed(1).replace('.0', '');
  const hM = (h / 100).toFixed(1).replace('.0', '');

  if (label) {
    label.textContent = `📐 ${wM} × ${hM} m (${w} × ${h} cm)`;
  }
  if (btn) {
    btn.title = `Saalgröße: ${w} × ${h} cm (${wM} × ${hM} m). Klicken zum Anpassen.`;
  }
}

export function mountVenueSizeModal() {
  if (isModalMounted || $('modal-venue-size')) return;
  const container = $('modal-container') || document.body;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <!-- Venue Size Modal -->
    <div class="modal-overlay" id="modal-venue-size" style="display: none;">
      <div class="modal venue-dialog-modal" style="width: 520px; max-width: 95vw;">
        <div class="modal-header">
          <h2>📐 Saalgröße anpassen</h2>
          <button class="modal-close" id="btn-modal-venue-size-close" title="Schließen">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.4;">
            Jeder Punkt im Saalplan entspricht genau <strong>1 cm</strong> (1:1 Maßstab).
            Hier kannst du die Außenmaße des Saals für die aktuelle Venue festlegen.
          </div>

          <!-- Envelope Info Box -->
          <div id="venue-envelope-info-box" style="padding: 10px 14px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.3); border-radius: 8px; margin-bottom: 16px; font-size: 0.82rem;">
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
              📦 Bounding Envelope der Tische:
            </div>
            <div id="venue-envelope-desc" style="color: var(--text-secondary);">
              Lädt...
            </div>
          </div>

          <!-- Size Input Fields -->
          <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            <div class="venue-dialog-field" style="flex: 1;">
              <label for="input-venue-size-w" style="display: flex; justify-content: space-between;">
                <span>Breite (cm)</span>
                <span id="venue-size-w-m-hint" style="color: var(--accent-purple); font-weight: 600;"></span>
              </label>
              <input type="number" id="input-venue-size-w" step="10" class="searchable-picker-input" style="width: 100%;" title="Saalbreite in Zentimetern">
              <span id="venue-size-w-min-hint" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; display: block;"></span>
            </div>

            <div class="venue-dialog-field" style="flex: 1;">
              <label for="input-venue-size-h" style="display: flex; justify-content: space-between;">
                <span>Länge / Tiefe (cm)</span>
                <span id="venue-size-h-m-hint" style="color: var(--accent-purple); font-weight: 600;"></span>
              </label>
              <input type="number" id="input-venue-size-h" step="10" class="searchable-picker-input" style="width: 100%;" title="Saallänge / Tiefe in Zentimetern">
              <span id="venue-size-h-min-hint" style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; display: block;"></span>
            </div>
          </div>

          <!-- Presets Section -->
          <div style="margin-bottom: 18px;">
            <label style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 6px; display: block;">
              Schnellauswahl & Anpassung
            </label>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              <button type="button" class="btn btn-sm venue-preset-btn" id="btn-venue-preset-fit" title="Saal exakt an die Tische anpassen mit 80 cm Rand">
                ✂️ An Tische anpassen (+ 80 cm)
              </button>
              <button type="button" class="btn btn-sm venue-preset-btn" data-w="1200" data-h="700">12 × 7 m</button>
              <button type="button" class="btn btn-sm venue-preset-btn" data-w="1500" data-h="1000">15 × 10 m</button>
              <button type="button" class="btn btn-sm venue-preset-btn" data-w="2000" data-h="1200">20 × 12 m</button>
              <button type="button" class="btn btn-sm venue-preset-btn" data-w="2500" data-h="1500">25 × 15 m</button>
              <button type="button" class="btn btn-sm venue-preset-btn" data-w="3000" data-h="1750">30 × 17.5 m</button>
            </div>
          </div>

          <!-- Error Feedback Banner -->
          <div id="venue-size-error-msg" style="display: none; padding: 8px 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; color: #f87171; font-size: 0.8rem; margin-bottom: 14px;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button class="btn btn-sm" id="btn-modal-venue-size-cancel" title="Abbrechen und unverändert schließen">Abbrechen</button>
            <button class="btn btn-accent btn-sm" id="btn-modal-venue-size-submit" title="Saalgröße speichern">Größe anwenden</button>
          </div>
        </div>
      </div>
    </div>
  `;

  while (wrap.firstChild) {
    container.appendChild(wrap.firstChild);
  }
  isModalMounted = true;
  attachModalListeners();
}

function updateInputMetersHints() {
  const wInput = $('input-venue-size-w');
  const hInput = $('input-venue-size-h');
  const wHint = $('venue-size-w-m-hint');
  const hHint = $('venue-size-h-m-hint');

  const w = parseFloat(wInput ? wInput.value : 0) || 0;
  const h = parseFloat(hInput ? hInput.value : 0) || 0;

  if (wHint) wHint.textContent = `${(w / 100).toFixed(2)} m`;
  if (hHint) hHint.textContent = `${(h / 100).toFixed(2)} m`;

  validateInputs();
}

function validateInputs() {
  const env = getTablesEnvelope(state.tables);
  const wInput = $('input-venue-size-w');
  const hInput = $('input-venue-size-h');
  const errorMsg = $('venue-size-error-msg');
  const submitBtn = $('btn-modal-venue-size-submit');

  const w = parseInt(wInput ? wInput.value : 0, 10);
  const h = parseInt(hInput ? hInput.value : 0, 10);

  let error = null;

  if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0) {
    error = 'Bitte gültige positive Maße in Zentimetern eingeben.';
  } else if (w < env.minVenueWidth) {
    error = `Die Breite kann nicht kleiner als die platzierten Tische sein (mindestens ${env.minVenueWidth} cm / ${(env.minVenueWidth / 100).toFixed(2)} m).`;
  } else if (h < env.minVenueHeight) {
    error = `Die Länge kann nicht kleiner als die platzierten Tische sein (mindestens ${env.minVenueHeight} cm / ${(env.minVenueHeight / 100).toFixed(2)} m).`;
  }

  if (errorMsg) {
    if (error) {
      errorMsg.textContent = '⚠️ ' + error;
      errorMsg.style.display = 'block';
    } else {
      errorMsg.style.display = 'none';
    }
  }

  if (submitBtn) {
    submitBtn.disabled = !!error;
    submitBtn.style.opacity = error ? '0.5' : '1';
  }

  // Update preset buttons disabled status
  const presetBtns = document.querySelectorAll('.venue-preset-btn[data-w]');
  presetBtns.forEach(p => {
    const pw = parseInt(p.getAttribute('data-w'), 10);
    const ph = parseInt(p.getAttribute('data-h'), 10);
    const tooSmall = (pw < env.minVenueWidth || ph < env.minVenueHeight);
    p.disabled = tooSmall;
    p.style.opacity = tooSmall ? '0.4' : '1';
    p.title = tooSmall
      ? `Zu klein für platzierte Tische (benötigt min. ${env.minVenueWidth} × ${env.minVenueHeight} cm)`
      : `Saal auf ${pw / 100} × ${ph / 100} m setzen`;
  });

  return !error;
}

export function openVenueSizeModal() {
  mountVenueSizeModal();
  const modal = $('modal-venue-size');
  if (!modal) return;

  const currentW = getVenueWidth();
  const currentH = getVenueHeight();
  const env = getTablesEnvelope(state.tables);

  const wInput = $('input-venue-size-w');
  const hInput = $('input-venue-size-h');
  const descEl = $('venue-envelope-desc');
  const wMinHint = $('venue-size-w-min-hint');
  const hMinHint = $('venue-size-h-min-hint');

  if (wInput) {
    wInput.value = currentW;
    wInput.min = String(env.minVenueWidth);
  }
  if (hInput) {
    hInput.value = currentH;
    hInput.min = String(env.minVenueHeight);
  }

  if (wMinHint) {
    wMinHint.textContent = `Min. erforderlich: ${env.minVenueWidth} cm (${(env.minVenueWidth / 100).toFixed(2)} m)`;
  }
  if (hMinHint) {
    hMinHint.textContent = `Min. erforderlich: ${env.minVenueHeight} cm (${(env.minVenueHeight / 100).toFixed(2)} m)`;
  }

  if (descEl) {
    if (state.tables.length === 0) {
      descEl.textContent = 'Aktuell sind keine Tische im Saal platziert. Mindestgröße: 300 × 300 cm (3.0 × 3.0 m).';
    } else {
      descEl.innerHTML = `
        Tische beanspruchen Raum bis <strong>X = ${env.minVenueWidth} cm</strong> (${(env.minVenueWidth / 100).toFixed(2)} m)
        und <strong>Y = ${env.minVenueHeight} cm</strong> (${(env.minVenueHeight / 100).toFixed(2)} m).
        Der Saal kann nicht unter diese Hülle verkleinert werden.
      `;
    }
  }

  updateInputMetersHints();

  modal.style.display = 'flex';
  if (wInput) setTimeout(() => wInput.focus(), 50);
}

export function closeVenueSizeModal() {
  const modal = $('modal-venue-size');
  if (modal) modal.style.display = 'none';
}

function attachModalListeners() {
  const modal = $('modal-venue-size');
  if (!modal) return;

  const closeBtn = $('btn-modal-venue-size-close');
  if (closeBtn) closeBtn.addEventListener('click', closeVenueSizeModal);

  const cancelBtn = $('btn-modal-venue-size-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', closeVenueSizeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeVenueSizeModal();
  });

  const wInput = $('input-venue-size-w');
  const hInput = $('input-venue-size-h');

  if (wInput) wInput.addEventListener('input', updateInputMetersHints);
  if (hInput) hInput.addEventListener('input', updateInputMetersHints);

  // Preset buttons
  const fitBtn = $('btn-venue-preset-fit');
  if (fitBtn) {
    fitBtn.addEventListener('click', () => {
      const env = getTablesEnvelope(state.tables);
      const newW = Math.max(env.minVenueWidth + 80, 500);
      const newH = Math.max(env.minVenueHeight + 80, 500);
      if (wInput) wInput.value = newW;
      if (hInput) hInput.value = newH;
      updateInputMetersHints();
    });
  }

  const presetBtns = modal.querySelectorAll('.venue-preset-btn[data-w]');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const pw = btn.getAttribute('data-w');
      const ph = btn.getAttribute('data-h');
      if (wInput) wInput.value = pw;
      if (hInput) hInput.value = ph;
      updateInputMetersHints();
    });
  });

  // Submit button
  const submitBtn = $('btn-modal-venue-size-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (!validateInputs()) return;

      const env = getTablesEnvelope(state.tables);
      const newW = Math.max(env.minVenueWidth, parseInt(wInput.value, 10));
      const newH = Math.max(env.minVenueHeight, parseInt(hInput.value, 10));

      state.venueWidth = newW;
      state.venueHeight = newH;

      closeVenueSizeModal();
      updateVenueSizeButton();
      saveAndRender();
    });
  }

  [wInput, hInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitBtn.click();
        if (e.key === 'Escape') closeVenueSizeModal();
      });
    }
  });
}

export function initVenueSizeControls() {
  mountVenueSizeModal();

  const sizeBtn = $('btn-venue-size');
  if (sizeBtn) {
    sizeBtn.addEventListener('click', openVenueSizeModal);
  }

  const sizeDropdownBtn = $('btn-venue-size-dropdown');
  if (sizeDropdownBtn) {
    sizeDropdownBtn.addEventListener('click', () => {
      const menu = $('venue-dropdown-menu');
      if (menu) menu.style.display = 'none';
      openVenueSizeModal();
    });
  }

  updateVenueSizeButton();

  events.on('state:loaded', updateVenueSizeButton);
  events.on('state:changed', updateVenueSizeButton);
  events.on('venues:updated', updateVenueSizeButton);
}

