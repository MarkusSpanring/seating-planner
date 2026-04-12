// ===== Sitzplan – Wedding Seating Planner =====
// Pure vanilla JS, no build step required.

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────
  var STORAGE_KEY = 'sitzplan-data';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var AGE_OPTIONS = ['Adult', '0-3', '3-6', '6-12'];
  var CANVAS_W = 1200;
  var CANVAS_H = 700;

  var DEFAULT_DIETS = [
    { id: 'none', name: 'None', color: '#6b7280' },
    { id: 'vegetarian', name: 'Vegetarian', color: '#22c55e' },
    { id: 'vegan', name: 'Vegan', color: '#a855f7' },
    { id: 'gluten-free', name: 'Gluten-free', color: '#f97316' },
  ];

  var PRESET_COLORS = [
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

  var DEFAULT_AGES = [
    { id: 'age-adult', name: 'Erwachsen' },
    { id: 'age-under12', name: '< 12 J.' },
    { id: 'age-under6', name: '< 6 J.' },
    { id: 'age-under3', name: '< 3 J.' }
  ];

  // ── State ──────────────────────────────────────────────────────────
  var state = {
    guests: [],
    dietOptions: DEFAULT_DIETS.map(function (d) { return Object.assign({}, d); }),
    ageGroups: DEFAULT_AGES.map(function (a) { return Object.assign({}, a); }),
    tables: [],
    families: [],
    nextTableNumber: 1,
  };
  var collapsedGroups = {};
  var expandedGuests = {}; // Track expanded state of individual guest cards main view
  var expandedGuestsDetail = {}; // Track expanded state in detail view
  var expandedFamilies = {}; // Track expanded state of family cards
  var venueCollapsed = false; // Track venue panel collapsed state
  var useFamilyGrouping = true; // Toggle for displaying family cards vs individual lines
  var allGroupsExpanded = false; // Track whether all groups are force-expanded
  var selectedDetailSeat = null; // Seat number selected for swap in the detail SVG

  // Drag state
  var dragState = null; // { tableId, offsetX, offsetY, groupEl }

  // Modal state
  var currentEditingTableId = null;

  function loadState(callback) {
    fetch('/api/state')
      .then(function (res) {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(function (data) {
        if (data) {
          state.guests = data.guests || [];
          state.dietOptions = data.dietOptions || DEFAULT_DIETS.map(function (d) { return Object.assign({}, d); });
          state.ageGroups = data.ageGroups || DEFAULT_AGES.map(function (a) { return Object.assign({}, a); });
          state.tables = data.tables || [];
          state.families = data.families || [];
          state.nextTableNumber = data.nextTableNumber || 1;
        }
        if (callback) callback();
      })
      .catch(function (err) {
        console.warn('Could not load state from backend:', err);
        if (callback) callback();
      });
  }

  function saveState() {
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guests: state.guests,
        dietOptions: state.dietOptions,
        ageGroups: state.ageGroups,
        tables: state.tables,
        families: state.families,
        nextTableNumber: state.nextTableNumber,
      })
    }).catch(function (err) {
      console.error('Failed to save state to backend', err);
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  // ── Family Helpers ─────────────────────────────────────────────────
  function getFamilyForGuest(guestId) {
    for (var i = 0; i < state.families.length; i++) {
      if (state.families[i].memberIds.indexOf(guestId) >= 0) return state.families[i];
    }
    return null;
  }

  function getFamily(familyId) {
    for (var i = 0; i < state.families.length; i++) {
      if (state.families[i].id === familyId) return state.families[i];
    }
    return null;
  }

  function getFamilyMembers(familyId) {
    var fam = getFamily(familyId);
    if (!fam) return [];
    return fam.memberIds.map(function (gid) {
      return state.guests.find(function (g) { return g.id === gid; });
    }).filter(Boolean);
  }

  function getGuestsNotInFamily(excludeFamilyId) {
    return state.guests.filter(function (g) {
      var fam = getFamilyForGuest(g.id);
      if (!fam) return true;
      if (excludeFamilyId && fam.id === excludeFamilyId) return false;
      return false;
    });
  }

  function createFamily(initiatorId, memberId) {
    var initiator = state.guests.find(function (g) { return g.id === initiatorId; });
    if (!initiator) return;
    // Check if initiator is already in a family
    var existingFam = getFamilyForGuest(initiatorId);

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
    var fam = {
      id: 'fam-' + Date.now(),
      name: (initiator.firstName || '') + (initiator.lastName ? ' ' + initiator.lastName : ''),
      nameSourceGuestId: initiatorId,
      memberIds: [initiatorId, memberId],
    };
    state.families.push(fam);
    saveAndRender();
  }

  function addToFamily(familyId, guestId) {
    var fam = getFamily(familyId);
    if (!fam) return;

    // Handle merging if guestId is actually another family
    if (String(guestId).startsWith('fam-')) {
      var otherFam = getFamily(guestId);
      if (otherFam && otherFam.id !== familyId) {
        otherFam.memberIds.forEach(function (mid) {
          if (fam.memberIds.indexOf(mid) < 0) fam.memberIds.push(mid);
        });
        state.families = state.families.filter(function (f) { return f.id !== otherFam.id; });
      }
      saveAndRender();
      return;
    }

    // Standard guest addition
    // Remove guest from any other family first
    var otherFam = getFamilyForGuest(guestId);
    if (otherFam && otherFam.id !== familyId) {
      otherFam.memberIds = otherFam.memberIds.filter(function (id) { return id !== guestId; });
      if (otherFam.memberIds.length <= 1) {
        state.families = state.families.filter(function (f) { return f.id !== otherFam.id; });
      }
    }
    if (fam.memberIds.indexOf(guestId) < 0) {
      fam.memberIds.push(guestId);
    }
    saveAndRender();
  }

  function removeFromFamily(familyId, guestId) {
    var fam = getFamily(familyId);
    if (!fam) return;
    fam.memberIds = fam.memberIds.filter(function (id) { return id !== guestId; });
    // If name source was removed, pick new source
    if (fam.nameSourceGuestId === guestId && fam.memberIds.length > 0) {
      var newSource = state.guests.find(function (g) { return g.id === fam.memberIds[0]; });
      if (newSource) {
        fam.nameSourceGuestId = newSource.id;
        fam.name = (newSource.firstName || '') + (newSource.lastName ? ' ' + newSource.lastName : '');
      }
    }
    // Dissolve if only 1 or 0 members left
    if (fam.memberIds.length <= 1) {
      state.families = state.families.filter(function (f) { return f.id !== familyId; });
    }
    saveAndRender();
  }

  function dissolveFamily(familyId) {
    state.families = state.families.filter(function (f) { return f.id !== familyId; });
    delete expandedFamilies[familyId];
    saveAndRender();
  }

  function setFamilyNameSource(familyId, guestId) {
    var fam = getFamily(familyId);
    if (!fam) return;
    var guest = state.guests.find(function (g) { return g.id === guestId; });
    if (!guest) return;
    fam.nameSourceGuestId = guestId;
    fam.name = (guest.firstName || '') + (guest.lastName ? ' ' + guest.lastName : '');
    saveAndRender();
  }

  function getDiet(id) {
    for (var i = 0; i < state.dietOptions.length; i++) {
      if (state.dietOptions[i].id === id) return state.dietOptions[i];
    }
    return state.dietOptions[0];
  }

  function getTable(id) {
    for (var i = 0; i < state.tables.length; i++) {
      if (state.tables[i].id === id) return state.tables[i];
    }
    return null;
  }

  function guestAtSeat(tableId, seatNum) {
    for (var i = 0; i < state.guests.length; i++) {
      var g = state.guests[i];
      if (g.tableId === tableId && g.seatNumber === seatNum) return g;
    }
    return null;
  }

  function takenSeats(tableId, excludeGuestId) {
    var seats = [];
    for (var i = 0; i < state.guests.length; i++) {
      var g = state.guests[i];
      if (g.tableId === tableId && g.seatNumber && g.id !== excludeGuestId) {
        seats.push(g.seatNumber);
      }
    }
    return seats;
  }

  function guestsAtTable(tableId) {
    return state.guests.filter(function (g) { return g.tableId === tableId; });
  }

  function unassignedGuests() {
    return state.guests.filter(function (g) { return !g.tableId; });
  }

  function seatedCount() {
    return state.guests.filter(function (g) { return g.tableId && g.seatNumber; }).length;
  }

  function totalSeatCapacity() {
    var sum = 0;
    for (var i = 0; i < state.tables.length; i++) sum += state.tables[i].seatCount;
    return sum;
  }

  // ── Add / Remove Table ─────────────────────────────────────────────
  function addTable(seatCount) {
    var used = {};
    state.tables.forEach(function (t) {
      if (String(t.number).trim() !== '' && !isNaN(t.number)) {
        used[Number(t.number)] = true;
      }
    });
    var num = 1;
    while (used[num]) {
      num++;
    }

    // Place new table near center with slight random offset to avoid stacking
    var offsetX = (Math.random() - 0.5) * 100;
    var offsetY = (Math.random() - 0.5) * 100;
    state.tables.push({
      id: Date.now(),
      number: num,
      seatCount: seatCount,
      x: CANVAS_W / 2 + offsetX,
      y: CANVAS_H / 2 + offsetY,
    });
    saveAndRender();
  }

  function removeTable(tableId) {
    // Unassign all guests from this table
    state.guests.forEach(function (g) {
      if (g.tableId === tableId) {
        g.tableId = null;
        g.seatNumber = null;
      }
    });
    state.tables = state.tables.filter(function (t) { return t.id !== tableId; });
    saveAndRender();
  }

  function openTableDetail(tableId) {
    var tbl = getTable(tableId);
    if (!tbl) return;

    currentEditingTableId = tableId;
    $('table-detail-rename').value = tbl.number;

    // Populate seat-count selector; disable options smaller than current seated count
    var seatSel = $('table-detail-seatcount');
    seatSel.value = String(tbl.seatCount);
    var seatedAtTable = guestsAtTable(tableId).filter(function (g) { return g.seatNumber; }).length;
    Array.prototype.forEach.call(seatSel.options, function (opt) {
      opt.disabled = parseInt(opt.value) < seatedAtTable;
    });

    $('table-detail-fixed').checked = !!tbl.seatsFixed;

    renderTableDetailSVG(tbl.id);
    renderTableDetailGuests(tbl.id);

    $('table-detail-modal').style.display = 'flex';
  }

  function saveTableNumber() {
    if (!currentEditingTableId) return;
    var tbl = getTable(currentEditingTableId);
    if (!tbl) return;

    var input = $('table-detail-rename');
    var newNum = input.value.trim();

    if (newNum !== '' && newNum !== String(tbl.number)) {
      var existingTbl = state.tables.find(function (t) { return String(t.number) === newNum && t.id !== tbl.id; });
      if (existingTbl) {
        var oldNum = tbl.number;
        existingTbl.number = oldNum;
      }
      tbl.number = newNum;

      saveAndRender();
      renderTableDetailSVG(tbl.id);
    }
  }

  function closeTableDetailModal() {
    $('table-detail-modal').style.display = 'none';
    currentEditingTableId = null;
    selectedDetailSeat = null; // clear any pending swap selection
  }

  function renderTableDetailGuests(tableId) {
    var container = $('table-detail-guests');
    if (!container) return;
    container.innerHTML = '';

    var guests = guestsAtTable(tableId);
    if (guests.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size: 0.85rem; text-align:center;">Keine Gäste zugewiesen</p>';
      return;
    }

    guests.sort(function (a, b) { return (a.seatNumber || 999) - (b.seatNumber || 999); });

    var hr = document.createElement('div');
    hr.className = 'guest-list-header guest-list-header-full';
    hr.innerHTML = `
      <div class="guest-summary-left guest-summary-left-full">
        <div class="guest-col-firstname">First</div>
        <div class="guest-col-lastname">Last</div>
        <div class="guest-col-table">Table</div>
        <div class="guest-col-seat">Seat</div>
        <div class="guest-col-hc">HC</div>
        <div class="guest-col-age">Age</div>
        <div class="guest-col-diet">Diet</div>
      </div>
      <div class="guest-col-actions"></div>
    `;
    container.appendChild(hr);

    guests.forEach(function (g) {
      // Render card with inline editing (isDetailView), no family link (skipFamily), and fixed column widths (forceFullWidth)
      container.appendChild(renderGuestCard(g, true, true, true));
    });
  }

  function renderTableDetailSVG(tableId) {
    var tbl = getTable(tableId);
    var container = $('table-detail-svg-container');
    container.innerHTML = '';
    if (!tbl) return;

    var svgW = 400;
    var svgH = 400;
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + svgW + ' ' + svgH,
      width: '100%',
      xmlns: SVG_NS,
    });

    var g = svgEl('g', {
      transform: 'translate(' + (svgW / 2) + ',' + (svgH / 2) + ')'
    });

    var tableR = tbl.seatCount > 8 ? 95 : 85;
    var seatR = 44;

    // Table center
    var center = svgEl('circle', {
      cx: 0, cy: 0, r: tableR,
      fill: '#4b5563', stroke: '#6b7280',
      'stroke-width': 3,
    });
    g.appendChild(center);

    g.appendChild(svgEl('text', {
      x: 0, y: 0,
      fill: '#f3f4f6', 'font-size': '22px', 'font-weight': 700,
      'font-family': "'Inter',sans-serif", 'text-anchor': 'middle',
      'dominant-baseline': 'central'
    }, 'Table ' + tbl.number));

    var seats = getSeatPositions(tbl.seatCount, tableR, seatR);
    seats.forEach(function (seat) {
      var guest = guestAtSeat(tbl.id, seat.number);
      var diet = guest ? getDiet(guest.dietId) : null;
      var fillColor = (diet && diet.id !== 'none') ? diet.color : (guest ? '#e5e7eb' : '#ffffff');
      var strokeColor = guest ? '#9ca3af' : '#d1d5db';

      var shapeEl;
      var hcR = seatR * 0.85;
      if (guest && guest.needsHighChair) {
        shapeEl = svgEl('rect', {
          x: seat.x - hcR, y: seat.y - hcR,
          width: hcR * 2, height: hcR * 2,
          fill: fillColor,
          stroke: strokeColor, 'stroke-width': 2.5,
          rx: 4
        });
      } else {
        shapeEl = svgEl('circle', {
          cx: seat.x, cy: seat.y, r: seatR,
          fill: fillColor,
          stroke: strokeColor, 'stroke-width': guest ? 2.5 : 1.5,
        });
      }
      // Highlight selected seat for swap
      var isSelected = (selectedDetailSeat === seat.number);
      if (isSelected) {
        shapeEl.setAttribute('stroke', '#f59e0b');
        shapeEl.setAttribute('stroke-width', '3.5');
        shapeEl.style.filter = 'drop-shadow(0 0 6px rgba(245,158,11,0.7))';
      }
      shapeEl.style.cursor = 'pointer';
      g.appendChild(shapeEl);

      // Click handler: select / deselect / swap
      (function (seatNum) {
        shapeEl.addEventListener('click', function () {
          if (selectedDetailSeat === null) {
            // Select this seat
            selectedDetailSeat = seatNum;
            renderTableDetailSVG(currentEditingTableId);
          } else if (selectedDetailSeat === seatNum) {
            // Deselect
            selectedDetailSeat = null;
            renderTableDetailSVG(currentEditingTableId);
          } else {
            // Swap guests between selectedDetailSeat and seatNum
            var tblId = currentEditingTableId;
            var gA = guestAtSeat(tblId, selectedDetailSeat);
            var gB = guestAtSeat(tblId, seatNum);
            var tmpSeat = selectedDetailSeat;
            if (gA) gA.seatNumber = seatNum;
            if (gB) gB.seatNumber = tmpSeat;
            selectedDetailSeat = null;
            saveAndRender();
            renderTableDetailSVG(tblId);
            renderTableDetailGuests(tblId);
          }
        });
      }(seat.number));

      var hasDiet = guest ? (diet && diet.id !== 'none') : false;
      var textColor = hasDiet ? '#ffffff' : '#374151';

      // Always render seat number (small, offset above name when occupied)
      g.appendChild(svgEl('text', {
        x: seat.x, y: seat.y - (guest ? seatR * 0.52 : 0),
        fill: guest ? (hasDiet ? 'rgba(255,255,255,0.75)' : '#6b7280') : '#9ca3af',
        'font-size': '13px', 'font-weight': 700,
        'font-family': "'Inter',sans-serif", 'text-anchor': 'middle',
        'dominant-baseline': 'central',
        style: 'pointer-events: none;'
      }, String(seat.number)));

      if (guest) {
        var names = guest.firstName.split(' ');
        if (guest.lastName) names.push(guest.lastName);

        var yOffset = names.length > 1 ? -4 : 4;
        g.appendChild(svgEl('text', {
          x: seat.x, y: seat.y + yOffset,
          fill: textColor, 'font-size': '15px', 'font-weight': 600,
          'font-family': "'Inter',sans-serif", 'text-anchor': 'middle',
          'dominant-baseline': 'central',
          style: 'pointer-events: none;'
        }, names[0]));

        if (names.length > 1) {
          g.appendChild(svgEl('text', {
            x: seat.x, y: seat.y + 16,
            fill: textColor, 'font-size': '15px', 'font-weight': 600,
            'font-family': "'Inter',sans-serif", 'text-anchor': 'middle',
            'dominant-baseline': 'central',
            style: 'pointer-events: none;'
          }, names[1].charAt(0) + '.'));
        }
      }
    });

    svg.appendChild(g);
    container.appendChild(svg);
  }

  // ── SVG Helpers ────────────────────────────────────────────────────
  function svgEl(tag, attrs, text) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
      }
    }
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function getSeatPositions(count, tableR, seatR) {
    var positions = [];
    var orbit = tableR + seatR + 5;
    for (var i = 0; i < count; i++) {
      var angle = (2 * Math.PI * i) / count - Math.PI / 2;
      positions.push({
        x: orbit * Math.cos(angle),
        y: orbit * Math.sin(angle),
        number: i + 1,
      });
    }
    return positions;
  }

  // ── SVG Mouse → "SVG coordinates" ─────────────────────────────────
  var svgElement = null; // set in renderVenue

  function svgPoint(clientX, clientY) {
    var pt = svgElement.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svgElement.getScreenCTM().inverse());
  }

  // ── Venue Rendering ────────────────────────────────────────────────
  function renderVenue() {
    var container = $('venue-container');
    container.innerHTML = '';

    var svg = svgEl('svg', {
      viewBox: '0 0 ' + CANVAS_W + ' ' + CANVAS_H,
      width: '100%',
      height: '100%',
      class: 'venue-svg',
      xmlns: SVG_NS,
    });
    svgElement = svg;

    // Canvas background (subtle grid)
    svg.appendChild(svgEl('rect', {
      id: 'venue-bg-rect',
      x: 0, y: 0, width: CANVAS_W, height: CANVAS_H,
      fill: 'rgba(30,34,46,0.4)', rx: 8,
    }));

    // Grid dots for visual reference
    var dotsGroup = svgEl('g', { id: 'venue-grid-dots' });
    for (var gx = 50; gx < CANVAS_W; gx += 50) {
      for (var gy = 50; gy < CANVAS_H; gy += 50) {
        dotsGroup.appendChild(svgEl('circle', {
          cx: gx, cy: gy, r: 0.8,
          fill: 'rgba(255,255,255,0.06)',
        }));
      }
    }
    svg.appendChild(dotsGroup);

    // Empty state message
    if (state.tables.length === 0) {
      svg.appendChild(svgEl('text', {
        x: CANVAS_W / 2, y: CANVAS_H / 2 - 10,
        fill: 'rgba(255,255,255,0.15)', 'font-size': '18px',
        'font-family': "'Inter',sans-serif", 'font-weight': 500,
        'text-anchor': 'middle',
      }, 'Tische mit den Schaltflächen oben hinzufügen'));
      svg.appendChild(svgEl('text', {
        x: CANVAS_W / 2, y: CANVAS_H / 2 + 18,
        fill: 'rgba(255,255,255,0.1)', 'font-size': '13px',
        'font-family': "'Inter',sans-serif", 'font-weight': 400,
        'text-anchor': 'middle',
      }, 'Dann ziehen und anordnen'));
    }

    // Render each table as a draggable group
    state.tables.forEach(function (table) {
      var tableR = table.seatCount > 8 ? 36 : 30;
      var seatR = 12;

      var group = svgEl('g', {
        transform: 'translate(' + table.x + ',' + table.y + ')',
        style: 'cursor: grab;',
        'data-table-id': table.id,
      });

      // Table center circle
      var center = svgEl('circle', {
        cx: 0, cy: 0, r: tableR,
        fill: table.fixed ? 'rgba(34,197,94,0.12)' : 'rgba(139,92,246,0.15)',
        stroke: table.fixed ? '#22c55e' : 'rgba(139,92,246,0.35)',
        'stroke-width': table.fixed ? 2.5 : 2,
      });
      group.appendChild(center);
      center.addEventListener('mouseenter', function (e) {
        if (dragState) return;
        showTableTooltip(e, table);
      });
      center.addEventListener('mouseleave', function () {
        hideTooltip();
      });

      // Table number
      var textEl = svgEl('text', {
        x: 0, y: 0,
        fill: '#e8eaed', 'font-size': '15px', 'font-weight': 700,
        'font-family': "'Inter',sans-serif", 'text-anchor': 'middle',
        'dominant-baseline': 'central', style: 'pointer-events:none;',
      }, String(table.number));

      group.appendChild(textEl);

      // Seats
      var seats = getSeatPositions(table.seatCount, tableR, seatR);
      seats.forEach(function (seat) {
        var guest = guestAtSeat(table.id, seat.number);
        var diet = guest ? getDiet(guest.dietId) : null;
        var fillColor = (diet && diet.id !== 'none') ? diet.color : 'rgba(255,255,255,0.06)';

        var strokeColor = table.seatsFixed
          ? (guest ? '#22c55e' : 'rgba(34,197,94,0.3)')
          : (guest ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.15)');
        var strokeWidth = 2.5;

        var shapeEl;
        var hcR = seatR * 0.85;
        if (guest && guest.needsHighChair) {
          shapeEl = svgEl('rect', {
            x: seat.x - hcR, y: seat.y - hcR,
            width: hcR * 2, height: hcR * 2,
            fill: fillColor,
            stroke: strokeColor, 'stroke-width': strokeWidth,
            rx: 3,
            style: 'cursor:pointer;transition:all 0.2s ease;',
            'data-seat': seat.number,
          });
        } else {
          shapeEl = svgEl('circle', {
            cx: seat.x, cy: seat.y, r: seatR,
            fill: fillColor,
            stroke: strokeColor, 'stroke-width': strokeWidth,
            style: 'cursor:pointer;transition:all 0.2s ease;',
            'data-seat': seat.number,
          });
        }

        shapeEl.addEventListener('mouseenter', function (e) {
          if (dragState) return;
          showTooltip(e, table, seat.number, guest, diet);
          shapeEl.setAttribute('stroke', '#8b5cf6');
          shapeEl.setAttribute('stroke-width', '2.5');
        });
        shapeEl.addEventListener('mouseleave', function () {
          hideTooltip();
          shapeEl.setAttribute('stroke', strokeColor);
          shapeEl.setAttribute('stroke-width', strokeWidth);
        });
        group.appendChild(shapeEl);

        // Always show seat number in the center
        group.appendChild(svgEl('text', {
          x: seat.x, y: seat.y,
          fill: guest ? '#dedede' : '#5f6368', 'font-size': '10px', 'font-weight': 600,
          'font-family': "'Inter',sans-serif", 'text-anchor': 'middle',
          'dominant-baseline': 'central', style: 'pointer-events:none;',
        }, String(seat.number)));
      });

      // ── Drag handlers ──────────────────────────────────────────
      group.addEventListener('mousedown', function (e) {
        var p = svgPoint(e.clientX, e.clientY);
        dragState = {
          tableId: table.id,
          offsetX: p.x - table.x,
          offsetY: p.y - table.y,
          groupEl: group,
          moved: false
        };
        group.style.cursor = 'grabbing';
        hideTooltip();
      });

      group.addEventListener('click', function (e) {
        if (!lastMouseUpWasDrag) {
          openTableDetail(table.id);
        }
      });

      svg.appendChild(group);
    });

    // ── SVG-level mouse handlers for drag ────────────────────────
    var lastMouseUpWasDrag = false;

    svg.addEventListener('mousemove', function (e) {
      if (!dragState) return;
      e.preventDefault();
      var p = svgPoint(e.clientX, e.clientY);
      var newX = p.x - dragState.offsetX;
      var newY = p.y - dragState.offsetY;

      var tbl = getTable(dragState.tableId);
      if (Math.abs(newX - tbl.x) > 3 || Math.abs(newY - tbl.y) > 3) {
        dragState.moved = true;
      }

      // Clamp within canvas
      newX = Math.max(60, Math.min(CANVAS_W - 60, newX));
      newY = Math.max(60, Math.min(CANVAS_H - 60, newY));

      dragState.groupEl.setAttribute('transform', 'translate(' + newX + ',' + newY + ')');

      // Update state live
      tbl.x = newX;
      tbl.y = newY;
    });

    svg.addEventListener('mouseup', function () {
      if (!dragState) return;
      dragState.groupEl.style.cursor = 'grab';
      lastMouseUpWasDrag = dragState.moved;
      dragState = null;
      saveState();
    });

    svg.addEventListener('mouseleave', function () {
      if (!dragState) return;
      dragState.groupEl.style.cursor = 'grab';
      lastMouseUpWasDrag = dragState.moved;
      dragState = null;
      saveState();
    });

    var globalUsedDiets = {};
    state.guests.forEach(function (g) {
      if (g.tableId && g.seatNumber && g.dietId !== 'none') {
        globalUsedDiets[g.dietId] = true;
      }
    });

    var globalDietIds = Object.keys(globalUsedDiets);

    // Dynamically calculate legend width based on longest text
    var maxStrLen = 12; // Base length for "Regular Seat"
    globalDietIds.forEach(function (id) {
      var d = getDiet(id);
      if (d && d.name.length > maxStrLen) maxStrLen = d.name.length;
    });
    var lgW = Math.max(140, 50 + maxStrLen * 7.5);

    if (globalDietIds.length > 0) {
      var legendGroup = svgEl('g', { id: 'legend-diet', style: 'pointer-events: none;' });
      var lgH = 34 + globalDietIds.length * 22;
      legendGroup.appendChild(svgEl('rect', {
        x: CANVAS_W - lgW - 24, y: 24, width: lgW, height: lgH,
        fill: 'rgba(30,34,46,0.85)', rx: 8, stroke: 'rgba(255,255,255,0.1)'
      }));
      legendGroup.appendChild(svgEl('text', {
        x: CANVAS_W - 24 - (lgW / 2), y: 40,
        fill: 'rgba(255,255,255,0.5)', 'font-size': '11px', 'font-weight': 600,
        'font-family': "'Inter',sans-serif", 'text-anchor': 'middle'
      }, 'DIÄTEN'));

      globalDietIds.forEach(function (id, idx) {
        var diet = getDiet(id);
        if (!diet) return;
        var yPos = 62 + idx * 22;
        legendGroup.appendChild(svgEl('circle', {
          cx: CANVAS_W - lgW - 24 + 20, cy: yPos, r: 5,
          fill: diet.color
        }));
        legendGroup.appendChild(svgEl('text', {
          x: CANVAS_W - lgW - 24 + 34, y: yPos,
          fill: 'rgba(255,255,255,0.85)', 'font-size': '12px',
          'font-family': "'Inter',sans-serif", 'dominant-baseline': 'central',
          'text-anchor': 'start'
        }, diet.name));
      });
      svg.appendChild(legendGroup);
    }

    // ── Shape legend (always shown) ───────────────────────────────
    var hasHighChair = state.guests.some(function (g) { return g.tableId && g.needsHighChair; });
    var shapeGroup = svgEl('g', { id: 'legend-shape', style: 'pointer-events: none;' });
    var slW = lgW; // Keep same width as diet legend
    var slRows = hasHighChair ? 2 : 1;
    var slH = 28 + slRows * 22;
    var slX = CANVAS_W - slW - 24;
    var slY = (globalDietIds.length > 0) ? (24 + 34 + globalDietIds.length * 22 + 12) : 24;
    shapeGroup.appendChild(svgEl('rect', {
      x: slX, y: slY, width: slW, height: slH,
      fill: 'rgba(30,34,46,0.85)', rx: 8, stroke: 'rgba(255,255,255,0.1)'
    }));
    shapeGroup.appendChild(svgEl('text', {
      x: slX + slW / 2, y: slY + 16,
      fill: 'rgba(255,255,255,0.5)', 'font-size': '11px', 'font-weight': 600,
      'font-family': "'Inter',sans-serif", 'text-anchor': 'middle'
    }, 'SITZTYPEN'));
    // Circle = regular seat
    shapeGroup.appendChild(svgEl('circle', {
      cx: slX + 20, cy: slY + 36, r: 5,
      fill: 'rgba(255,255,255,0.06)', stroke: 'rgba(255,255,255,0.4)', 'stroke-width': 1.5
    }));
    shapeGroup.appendChild(svgEl('text', {
      x: slX + 34, y: slY + 36,
      fill: 'rgba(255,255,255,0.85)', 'font-size': '12px',
      'font-family': "'Inter',sans-serif", 'dominant-baseline': 'central', 'text-anchor': 'start'
    }, 'Normaler Platz'));
    if (hasHighChair) {
      shapeGroup.appendChild(svgEl('rect', {
        x: slX + 15, y: slY + 52, width: 10, height: 10,
        fill: 'rgba(255,255,255,0.06)', stroke: 'rgba(255,255,255,0.4)', 'stroke-width': 1.5, rx: 2
      }));
      shapeGroup.appendChild(svgEl('text', {
        x: slX + 34, y: slY + 58,
        fill: 'rgba(255,255,255,0.85)', 'font-size': '12px',
        'font-family': "'Inter',sans-serif", 'dominant-baseline': 'central', 'text-anchor': 'start'
      }, 'Hochstuhl'));
    }
    svg.appendChild(shapeGroup);

    // ── Age summary legend ───────────────────────────────────────
    var ageCounts = {};
    state.ageGroups.forEach(function(a) { ageCounts[a.id] = 0; });
    
    state.guests.forEach(function (g) {
      var aId = g.age || 'age-adult';
      if (ageCounts[aId] !== undefined) ageCounts[aId]++;
    });
    
    var ageRows = [];
    state.ageGroups.forEach(function(a) {
      if (ageCounts[a.id] > 0) ageRows.push({ label: a.name, count: ageCounts[a.id] });
    });

    var alW = slW;
    var alH = 32 + ageRows.length * 20 + 20; // header + rows + total
    var alX = slX;
    var alY = slY + slH + 12;

    var ageGroup = svgEl('g', { id: 'legend-age', style: 'pointer-events: none;' });
    ageGroup.appendChild(svgEl('rect', {
      x: alX, y: alY, width: alW, height: alH,
      fill: 'rgba(30,34,46,0.85)', rx: 8, stroke: 'rgba(255,255,255,0.1)'
    }));
    ageGroup.appendChild(svgEl('text', {
      x: alX + alW / 2, y: alY + 16,
      fill: 'rgba(255,255,255,0.5)', 'font-size': '11px', 'font-weight': 600,
      'font-family': "'Inter',sans-serif", 'text-anchor': 'middle'
    }, 'GÄSTE'));
    ageRows.forEach(function (row, idx) {
      var yPos = alY + 30 + idx * 20;
      ageGroup.appendChild(svgEl('text', {
        x: alX + 12, y: yPos,
        fill: 'rgba(255,255,255,0.75)', 'font-size': '11px',
        'font-family': "'Inter',sans-serif", 'dominant-baseline': 'central', 'text-anchor': 'start'
      }, row.label));
      ageGroup.appendChild(svgEl('text', {
        x: alX + alW - 12, y: yPos,
        fill: 'rgba(255,255,255,0.95)', 'font-size': '11px', 'font-weight': 700,
        'font-family': "'Inter',sans-serif", 'dominant-baseline': 'central', 'text-anchor': 'end'
      }, String(row.count)));
    });
    // Separator + total
    var sepY = alY + 28 + ageRows.length * 20;
    ageGroup.appendChild(svgEl('line', {
      x1: alX + 8, y1: sepY, x2: alX + alW - 8, y2: sepY,
      stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 1
    }));
    ageGroup.appendChild(svgEl('text', {
      x: alX + 12, y: sepY + 12,
      fill: 'rgba(255,255,255,0.45)', 'font-size': '10px',
      'font-family': "'Inter',sans-serif", 'dominant-baseline': 'central', 'text-anchor': 'start'
    }, 'Gesamt'));
    ageGroup.appendChild(svgEl('text', {
      x: alX + alW - 12, y: sepY + 12,
      fill: 'rgba(255,255,255,0.95)', 'font-size': '11px', 'font-weight': 700,
      'font-family': "'Inter',sans-serif", 'dominant-baseline': 'central', 'text-anchor': 'end'
    }, String(state.guests.length)));
    svg.appendChild(ageGroup);

    container.appendChild(svg);
    renderPrintTablePages();
  }

  // ── Per-table print pages ──────────────────────────────────────────
  function renderPrintTablePages() {
    var container = $('print-table-pages');
    if (!container) return;
    container.innerHTML = '';

    var sortedTables = state.tables.slice().sort(function (a, b) {
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' });
    });

    sortedTables.forEach(function (table) {
      var guests = guestsAtTable(table.id)
        .filter(function (g) { return g.seatNumber; })
        .sort(function (a, b) { return a.seatNumber - b.seatNumber; });

      // Page wrapper — each gets its own printed page
      var page = document.createElement('div');
      page.className = 'print-table-page';

      // ── Header ──────────────────────────────────────────────────
      var heading = document.createElement('h1');
      heading.className = 'print-table-heading';
      heading.textContent = 'Tisch ' + table.number;
      page.appendChild(heading);

      // ── Layout: SVG left, list right ────────────────────────────
      var layout = document.createElement('div');
      layout.className = 'print-table-layout';

      // SVG
      var svgWrap = document.createElement('div');
      svgWrap.className = 'print-table-svg-wrap';
      svgWrap.appendChild(buildTableSVGForPrint(table));
      layout.appendChild(svgWrap);

      // Guest list
      var listWrap = document.createElement('div');
      listWrap.className = 'print-table-list-wrap';

      var listTitle = document.createElement('h2');
      listTitle.className = 'print-table-list-title';
      listTitle.textContent = 'Gäste';
      listWrap.appendChild(listTitle);

      if (guests.length === 0) {
        var empty = document.createElement('p');
        empty.style.cssText = 'color:#999;font-style:italic;font-size:12px;';
        empty.textContent = 'Keine Gäste zugewiesen.';
        listWrap.appendChild(empty);
      } else {
        var tbl = document.createElement('table');
        tbl.className = 'print-table-guest-table';
        var thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Platz</th><th>Vorname</th><th>Nachname</th><th>Alter</th></tr>';
        tbl.appendChild(thead);
        var tbody = document.createElement('tbody');
        guests.forEach(function (g) {
          var aGrp = state.ageGroups.find(function(a) { return a.id === (g.age || 'age-adult'); });
          var aName = aGrp ? aGrp.name : 'Erwachsen';
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td class="print-seat-num">' + g.seatNumber + '</td>' +
            '<td>' + escHtml(g.firstName || '') + '</td>' +
            '<td>' + escHtml(g.lastName || '') + '</td>' +
            '<td>' + escHtml(aName) + '</td>';
          tbody.appendChild(tr);
        });
        tbl.appendChild(tbody);
        listWrap.appendChild(tbl);

        // ── Legend: diet colours + high chair ───────────────────────
        var usedDietsMap = {};
        var hasHC = false;
        guests.forEach(function (g) {
          var diet = getDiet(g.dietId);
          if (diet && diet.id !== 'none') usedDietsMap[diet.id] = diet;
          if (g.needsHighChair) hasHC = true;
        });
        var usedDiets = Object.values ? Object.values(usedDietsMap) : Object.keys(usedDietsMap).map(function(k){ return usedDietsMap[k]; });
        if (usedDiets.length > 0 || hasHC) {
          var legend = document.createElement('div');
          legend.className = 'print-table-legend';
          if (usedDiets.length > 0) {
            var dietTitle = document.createElement('div');
            dietTitle.className = 'print-legend-title';
            dietTitle.textContent = 'Diäten';
            legend.appendChild(dietTitle);
            usedDiets.forEach(function (diet) {
              var row = document.createElement('div');
              row.className = 'print-legend-row';
              row.innerHTML =
                '<span class="print-legend-swatch" style="background:' + diet.color + '"></span>' +
                '<span class="print-legend-label">' + escHtml(diet.name) + '</span>';
              legend.appendChild(row);
            });
          }
          if (hasHC) {
            if (usedDiets.length > 0) {
              var sep = document.createElement('div');
              sep.className = 'print-legend-sep';
              legend.appendChild(sep);
            }
            var hcTitle = document.createElement('div');
            hcTitle.className = 'print-legend-title';
            hcTitle.textContent = 'Symbol';
            legend.appendChild(hcTitle);
            var hcRow = document.createElement('div');
            hcRow.className = 'print-legend-row';
            hcRow.innerHTML =
              '<span class="print-legend-hc-symbol"></span>' +
              '<span class="print-legend-label">Hochstuhl</span>';
            legend.appendChild(hcRow);
          }
          listWrap.appendChild(legend);
        }
      }

      layout.appendChild(listWrap);
      page.appendChild(layout);
      container.appendChild(page);
    });
  }

  function buildTableSVGForPrint(tbl) {
    var svgW = 360, svgH = 360;
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + svgW + ' ' + svgH,
      width: svgW + 'px',
      height: svgH + 'px',
      xmlns: SVG_NS,
    });

    var g = svgEl('g', { transform: 'translate(' + svgW / 2 + ',' + svgH / 2 + ')' });

    var tableR = tbl.seatCount > 8 ? 82 : 72;
    var seatR = tbl.seatCount > 8 ? 28 : 30;

    // Table disc
    g.appendChild(svgEl('circle', {
      cx: 0, cy: 0, r: tableR,
      fill: '#f3f4f6', stroke: '#d1d5db', 'stroke-width': 2.5,
    }));
    g.appendChild(svgEl('text', {
      x: 0, y: 0,
      fill: '#374151', 'font-size': '16px', 'font-weight': 700,
      'font-family': "'Inter',sans-serif",
      'text-anchor': 'middle', 'dominant-baseline': 'central',
    }, 'Tisch ' + tbl.number));

    // Seats
    var seats = getSeatPositions(tbl.seatCount, tableR, seatR);
    seats.forEach(function (seat) {
      var guest = guestAtSeat(tbl.id, seat.number);
      var diet = guest ? getDiet(guest.dietId) : null;
      var hasDiet = diet && diet.id !== 'none';

      // Light Grey when occupied, White when empty
      var fill = hasDiet ? diet.color : (guest ? '#e5e7eb' : '#ffffff');
      var stroke = guest ? '#9ca3af' : '#d1d5db';
      var hcR = seatR * 0.88;

      if (guest && guest.needsHighChair) {
        g.appendChild(svgEl('rect', {
          x: seat.x - hcR, y: seat.y - hcR,
          width: hcR * 2, height: hcR * 2,
          fill: fill, stroke: stroke, 'stroke-width': 2, rx: 4,
        }));
      } else {
        g.appendChild(svgEl('circle', {
          cx: seat.x, cy: seat.y, r: seatR,
          fill: fill, stroke: stroke, 'stroke-width': guest ? 2 : 1.5,
        }));
      }

      var textColor = guest ? (hasDiet ? '#ffffff' : '#374151') : '#9ca3af';

      // Seat number badge
      g.appendChild(svgEl('text', {
        x: seat.x, y: seat.y - (guest ? seatR * 0.55 : 0),
        fill: textColor,
        'font-size': '9px', 'font-weight': 700,
        'font-family': "'Inter',sans-serif",
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        style: 'pointer-events:none;',
      }, String(seat.number)));

      if (guest) {
        var first = guest.firstName || '';
        var last = guest.lastName ? guest.lastName.charAt(0) + '.' : '';
        g.appendChild(svgEl('text', {
          x: seat.x, y: seat.y + (last ? -3 : 3),
          fill: textColor, 'font-size': '10px', 'font-weight': 600,
          'font-family': "'Inter',sans-serif",
          'text-anchor': 'middle', 'dominant-baseline': 'central',
          style: 'pointer-events:none;',
        }, first));
        if (last) {
          g.appendChild(svgEl('text', {
            x: seat.x, y: seat.y + 9,
            fill: hasDiet ? '#f3f4f6' : '#6b7280', 'font-size': '9px', 'font-weight': 500,
            'font-family': "'Inter',sans-serif",
            'text-anchor': 'middle', 'dominant-baseline': 'central',
            style: 'pointer-events:none;',
          }, last));
        }
      }
    });

    svg.appendChild(g);
    return svg;
  }

  function showTooltip(e, table, seatNum, guest, diet) {
    var tt = $('seat-tooltip');
    var rect = e.target.getBoundingClientRect();
    tt.style.display = 'block';
    tt.style.left = (rect.left + rect.width / 2) + 'px';
    tt.style.top = (rect.top - 8) + 'px';
    tt.style.transform = 'translate(-50%, -100%)';

    if (guest) {
      tt.innerHTML =
        '<div class="tt-name">' + escHtml(guest.firstName + ' ' + (guest.lastName || '')) + '</div>' +
        '<div class="tt-detail">Tisch ' + table.number + ' · Platz ' + seatNum + '</div>' +
        '<div class="tt-detail">' + (guest.needsHighChair ? 'Hochstuhl · ' : '') + escHtml(diet ? diet.name : 'Keine Diät') + '</div>';
    } else {
      tt.innerHTML =
        '<div class="tt-detail">Tisch ' + table.number + ' · Platz ' + seatNum + ' — Leer</div>';
    }
  }

  function hideTooltip() {
    $('seat-tooltip').style.display = 'none';
  }

  function showTableTooltip(e, table) {
    var seated = guestsAtTable(table.id)
      .filter(function (g) { return g.seatNumber; })
      .sort(function (a, b) { return a.seatNumber - b.seatNumber; });
    if (seated.length === 0) return;

    var tt = $('seat-tooltip');
    var rect = e.target.getBoundingClientRect();
    tt.style.display = 'block';
    tt.style.left = (rect.right + 60) + 'px';
    tt.style.top = (rect.top + rect.height / 2) + 'px';
    tt.style.transform = 'translate(0, -50%)';

    var html = '<div class="tt-name" style="font-size:0.9rem;margin-bottom:4px;">Tisch ' + escHtml(String(table.number)) + '</div>';
    seated.forEach(function (g) {
      html += '<div class="tt-detail" style="font-size:0.84rem;padding:1px 0;">' + g.seatNumber + ' · ' +
        escHtml((g.firstName || '') + (g.lastName ? ' ' + g.lastName : '')) + '</div>';
    });
    tt.innerHTML = html;
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Stats Badge ────────────────────────────────────────────────────
  function updateStats() {
    var seated = seatedCount();
    var total = state.guests.length;
    var capacity = totalSeatCapacity();
    $('stats-badge').innerHTML =
      '<strong>' + seated + '</strong> / ' + total + ' · ' + capacity + ' Plätze gesamt';
  }

  // ── Guest Panel Rendering ──────────────────────────────────────────
  function renderGuestList() {
    var panel = $('guest-list');
    panel.innerHTML = '';

    if (state.guests.length === 0) {
      panel.innerHTML =
        '<div class="empty-state">' +
        '<p>Noch keine Gäste</p>' +
        '<button class="btn btn-accent" id="btn-import-empty">Gästeliste importieren</button>' +
        '</div>';
      var emptyBtn = $('btn-import-empty');
      if (emptyBtn) emptyBtn.addEventListener('click', function () { $('csv-input').click(); });
      return;
    }

    if (venueCollapsed) {
      // Full table view: flat list with all columns
      renderGuestListTable(panel);
      return;
    }

    // Per-table groups with families inline
    var sortedTables = state.tables.slice().sort(function (a, b) {
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' });
    });
    sortedTables.forEach(function (table) {
      var guests = guestsAtTable(table.id);
      if (guests.length === 0) return;
      guests.sort(function (a, b) { return (a.seatNumber || 999) - (b.seatNumber || 999); });
      panel.appendChild(renderGuestGroup(
        'table-' + table.id,
        'Tisch ' + table.number,
        guests,
        table.seatCount,
        table
      ));
    });

    // Unassigned group at the bottom
    var unassigned = unassignedGuests();
    if (unassigned.length > 0) {
      unassigned.sort(function (a, b) {
        var aName = (a.lastName || a.firstName || '').toLowerCase();
        var bName = (b.lastName || b.firstName || '').toLowerCase();
        return aName.localeCompare(bName);
      });
      panel.appendChild(renderGuestGroup('unassigned', 'Nicht zugeteilt', unassigned, null));
    }
  }

  function renderGuestListTable(panel) {
    // Full table view with all settings as columns
    var hr = document.createElement('div');
    hr.className = 'guest-list-header guest-list-header-full';
    hr.innerHTML = '<div class="guest-summary-left guest-summary-left-full">' +
      '<div class="guest-col-firstname">Vorname</div>' +
      '<div class="guest-col-lastname">Nachname</div>' +
      '<div class="guest-col-address">Adresse</div>' +
      '<div class="guest-col-table">Tisch</div>' +
      '<div class="guest-col-seat">Platz</div>' +
      '<div class="guest-col-hc">HS</div>' +
      '<div class="guest-col-age">Alter</div>' +
      '<div class="guest-col-diet">Diät</div>' +
      '<div class="guest-col-family">Familie</div>' +
      '</div>' +
      '<div class="guest-col-actions"></div>';
    panel.appendChild(hr);

    // Collect IDs of guests in families
    var guestsInFamilies = {};
    state.families.forEach(function (fam) {
      fam.memberIds.forEach(function (gid) { guestsInFamilies[gid] = true; });
    });

    var filterInput = $('guest-filter-input');
    var filterText = (filterInput && filterInput.style.display !== 'none') ? filterInput.value.trim().toLowerCase() : '';
    var effectiveGrouping = filterText === '';

    // Show families first if not filtering
    if (effectiveGrouping) {
      var sortedFamilies = state.families.slice().sort(function (a, b) {
        var aGuest = a.memberIds.length > 0 ? state.guests.find(function (g) { return g.id === a.memberIds[0]; }) : null;
        var bGuest = b.memberIds.length > 0 ? state.guests.find(function (g) { return g.id === b.memberIds[0]; }) : null;
        var aName = aGuest ? (aGuest.lastName || aGuest.firstName || '').toLowerCase() : '';
        var bName = bGuest ? (bGuest.lastName || bGuest.firstName || '').toLowerCase() : '';
        return aName.localeCompare(bName);
      });
      sortedFamilies.forEach(function (fam) {
        panel.appendChild(renderFamilyGroupBlock(fam, null, true));
      });
    }

    var allGuests = state.guests.slice();
    if (effectiveGrouping) {
      allGuests = allGuests.filter(function (g) { return !guestsInFamilies[g.id]; });
    }
    
    allGuests.sort(function (a, b) {
      var aName = (a.lastName || a.firstName || '').toLowerCase();
      var bName = (b.lastName || b.firstName || '').toLowerCase();
      return aName.localeCompare(bName);
    });

    allGuests.forEach(function (guest) {
      if (filterText) {
        var nameStr = ((guest.firstName || '') + ' ' + (guest.lastName || '')).toLowerCase();
        if (nameStr.indexOf(filterText) === -1) return;
      }
      panel.appendChild(renderGuestCard(guest, true));
    });
  }

  function toggleVenue() {
    venueCollapsed = !venueCollapsed;
    var venuePanel = $('venue-panel');
    var venueCanvasArea = $('venue-canvas-area');
    var toggleIcon = $('venue-toggle-icon');
    var toggleLabel = $('venue-toggle-label');
    var toolbarInline = $('venue-toolbar-inline');
    var guestPanel = document.querySelector('.guest-panel');

    if (venueCollapsed) {
      venuePanel.classList.add('venue-collapsed');
      venueCanvasArea.style.display = 'none';
      toolbarInline.style.display = 'none';
      toggleIcon.textContent = '\u25b6';
      toggleLabel.textContent = 'Venue einblenden';
      if (guestPanel) guestPanel.classList.add('guest-panel-expanded');
      var tLabel = $('toggle-family-label'); if (tLabel) tLabel.style.display = 'flex';
      var fInput = $('guest-filter-input'); if (fInput) fInput.style.display = 'inline-block';
      var addBtn = $('btn-add-guest'); if (addBtn) addBtn.style.display = 'block';
      var importBtn = $('btn-import'); if (importBtn) importBtn.style.display = 'inline-block';
      var agesBtn = $('btn-ages'); if (agesBtn) agesBtn.style.display = 'inline-block';
      var dietsBtn = $('btn-diets'); if (dietsBtn) dietsBtn.style.display = 'inline-block';
      var exBtn = $('btn-expand-all'); if (exBtn) exBtn.style.display = 'none'; // hide in full-table view
    } else {
      venuePanel.classList.remove('venue-collapsed');
      venueCanvasArea.style.display = '';
      toolbarInline.style.display = '';
      toggleIcon.textContent = '\u25c0';
      toggleLabel.textContent = 'Venue ausblenden';
      if (guestPanel) guestPanel.classList.remove('guest-panel-expanded');
      var tLabel = $('toggle-family-label'); if (tLabel) tLabel.style.display = 'none';
      var fInput = $('guest-filter-input'); if (fInput) { fInput.style.display = 'none'; fInput.value = ''; }
      var addBtn = $('btn-add-guest'); if (addBtn) addBtn.style.display = 'none';
      var importBtn = $('btn-import'); if (importBtn) importBtn.style.display = 'none';
      var agesBtn = $('btn-ages'); if (agesBtn) agesBtn.style.display = 'none';
      var dietsBtn = $('btn-diets'); if (dietsBtn) dietsBtn.style.display = 'none';
      var exBtn = $('btn-expand-all');
      if (exBtn) {
        exBtn.style.display = 'inline-flex';
        exBtn.textContent = '⬇ Alle ausklappen'; // reset label when entering split view
        allGroupsExpanded = false;
      }
    }
    renderGuestList();
  }

  function getAvailableTablesForGroup(guestsInGroup) {
    return state.tables.filter(function (t) {
      if (guestsInGroup.length > 0 && guestsInGroup[0].tableId === t.id) return true;
      var takenByOthers = 0;
      state.guests.forEach(function (g) {
        if (g.tableId === t.id && guestsInGroup.indexOf(g) < 0) takenByOthers++;
      });
      return (t.seatCount - takenByOthers) >= guestsInGroup.length;
    }).sort(function (a, b) {
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  function assignGroupToTable(guestsInGroup, tableIdStr) {
    if (!tableIdStr || tableIdStr === '') {
      guestsInGroup.forEach(function (g) { g.tableId = null; g.seatNumber = null; });
      return;
    }
    var tId = parseInt(tableIdStr);
    var takenSeats = {};
    state.guests.forEach(function (g) {
      if (g.tableId === tId && guestsInGroup.indexOf(g) < 0 && g.seatNumber) takenSeats[g.seatNumber] = true;
    });
    var tObj = getTable(tId);
    if (!tObj) return;
    var freeSeats = [];
    for (var i = 1; i <= tObj.seatCount; i++) {
      if (!takenSeats[i]) freeSeats.push(i);
    }
    guestsInGroup.forEach(function (g, idx) {
      g.tableId = tId;
      g.seatNumber = freeSeats[idx] || null;
    });
  }



  function renderGuestGroup(key, title, guests, maxSeats, tableObj) {
    // Default: fixed tables collapse unless the user has explicitly expanded them
    var collapsed = collapsedGroups[key] !== undefined
      ? collapsedGroups[key]
      : !!(tableObj && tableObj.fixed);
    var div = document.createElement('div');
    div.className = 'guest-group';

    var header = document.createElement('div');
    header.className = 'guest-group-header' + (tableObj && tableObj.fixed ? ' table-fixed' : '');
    header.innerHTML =
      '<h3><span class="group-chevron ' + (collapsed ? '' : 'open') + '">▶</span> ' +
      escHtml(title) +
      (tableObj ? ' <span class="table-indicator-pill">' + maxSeats + 'er Tisch</span>' : '') +
      '</h3>' +
      '<span class="count">' + guests.length + (maxSeats ? '/' + maxSeats : '') + '</span>';
    header.addEventListener('click', function () {
      collapsedGroups[key] = !collapsed; // flip the resolved value, not the raw undefined
      renderGuestList();
    });

    // "Fixiert" checkbox — only for real table groups
    if (tableObj) {
      var fixedLabel = document.createElement('label');
      fixedLabel.className = 'table-fixed-label';
      fixedLabel.title = 'Tisch fixieren';
      fixedLabel.addEventListener('click', function (e) { e.stopPropagation(); });

      var fixedCb = document.createElement('input');
      fixedCb.type = 'checkbox';
      fixedCb.checked = !!tableObj.fixed;
      fixedCb.className = 'table-fixed-cb';
      fixedCb.addEventListener('change', function (e) {
        e.stopPropagation();
        tableObj.fixed = fixedCb.checked;
        saveAndRender();
      });

      var fixedSpan = document.createElement('span');
      fixedSpan.textContent = 'Fixiert';

      fixedLabel.appendChild(fixedCb);
      fixedLabel.appendChild(fixedSpan);
      header.appendChild(fixedLabel);
    }

    div.appendChild(header);

    if (!collapsed) {
      // Detect families within this guest group - always group families in split view
      var familyBuckets = {};
      var renderedFamIds = {};
      guests.forEach(function (g) {
        var fam = getFamilyForGuest(g.id);
        if (fam) {
          if (!familyBuckets[fam.id]) familyBuckets[fam.id] = [];
          familyBuckets[fam.id].push(g.id);
        }
      });
      guests.forEach(function (guest) {
        var fam = getFamilyForGuest(guest.id);
        if (fam && familyBuckets[fam.id] && familyBuckets[fam.id].length >= 2) {
          // Render subtle inline family group block (always expanded)
          if (!renderedFamIds[fam.id]) {
            renderedFamIds[fam.id] = true;
            div.appendChild(renderFamilyGroupBlock(fam, familyBuckets[fam.id]));
          }
        } else {
          div.appendChild(renderGuestCard(guest));
        }
      });
    }

    return div;
  }

  // Renders a subtle grouped block for a family in the table view
  // Renders a subtle grouped block for a family in the table view
  // Always expanded, no collapse toggle, pill select in top-left corner
  function renderFamilyGroupBlock(family, memberIdSubset, isTableView) {
    var allMembers = getFamilyMembers(family.id);
    var members = memberIdSubset ? allMembers.filter(function (m) {
      return memberIdSubset.indexOf(m.id) >= 0;
    }) : allMembers;

    // Check if all members are at the same table (or all unassigned)
    var tableIds = {};
    members.forEach(function (m) { if (m.tableId) tableIds[m.tableId] = true; });
    var tableIdList = Object.keys(tableIds);
    var canAssign = tableIdList.length <= 1;
    var isSplit = tableIdList.length > 1;

    var block = document.createElement('div');
    block.className = 'family-group-block';

    // ── Pill (is itself a native select) ────────────────────────────
    if (!isTableView) {
      if (isSplit) {
        // Static non-interactive pill for split families
        var staticPill = document.createElement('div');
        staticPill.className = 'family-group-pill family-group-pill-static';
        staticPill.innerHTML =
          '<span class="family-group-pill-icon">\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66</span>' +
          '<span class="family-group-pill-label">split tables</span>';
        block.appendChild(staticPill);
      } else {
        // Pill wrapper — the select is placed over it so clicking opens immediately
        var pillWrap = document.createElement('div');
        pillWrap.className = 'family-group-pill-wrap';

        var pillIconEl = document.createElement('span');
        pillIconEl.className = 'family-group-pill-icon';
        pillIconEl.textContent = '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66';
        pillWrap.appendChild(pillIconEl);

        var sortedTables = getAvailableTablesForGroup(members);
        var currentTableId = tableIdList.length === 1 ? tableIdList[0] : null;

        var pillSel = document.createElement('select');
        pillSel.className = 'family-group-pill-select';
        pillSel.title = 'Assign family to a table';

        var defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = currentTableId ? 'Reassign...' : 'Select table...';
        if (!currentTableId) defaultOpt.selected = true;
        pillSel.appendChild(defaultOpt);

        sortedTables.forEach(function (t) {
          var o = document.createElement('option');
          o.value = String(t.id);
          o.textContent = 'Tisch ' + String(t.number);
          if (String(t.id) === String(currentTableId || '')) o.selected = true;
          pillSel.appendChild(o);
        });

        pillSel.addEventListener('change', function (e) {
          e.stopPropagation();
          assignGroupToTable(members, pillSel.value);
          saveAndRender();
        });
        pillSel.addEventListener('click', function (e) { e.stopPropagation(); });

        pillWrap.appendChild(pillSel);
        block.appendChild(pillWrap);
      }
    } else {
      // Full Table View Logic
      block.style.paddingTop = '20px';

      // Pill: Searchable Picker for Adding Members
      var pillWrapFull = document.createElement('div');
      pillWrapFull.className = 'family-group-pill-wrap';
      pillWrapFull.title = 'Suchen, um der Familie ein weiteres Mitglied hinzuzufügen';

      var excludeIds = family.memberIds.slice();
      var picker = makeSearchableGuestPicker('\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66 Mitglied hinzufügen...', excludeIds, function (selectedId) {
        addToFamily(family.id, selectedId);
      }, true);

      var pickerInput = picker.querySelector('input');
      pickerInput.style.background = 'transparent';
      pickerInput.style.border = 'none';
      pickerInput.style.padding = '0 6px';
      pickerInput.style.margin = '0';
      pickerInput.style.fontSize = '0.7rem';
      pickerInput.style.fontWeight = '600';
      pickerInput.style.color = 'rgba(139, 92, 246, 0.8)';
      pickerInput.style.width = '190px';
      pickerInput.style.outline = 'none';

      pillWrapFull.appendChild(picker);
      block.appendChild(pillWrapFull);

      // Top-Right Dissolve Family Button
      var dissolveBtn = document.createElement('button');
      dissolveBtn.className = 'btn btn-sm family-dissolve-btn';
      dissolveBtn.textContent = '✕ Familie auflösen';
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
      
      dissolveBtn.addEventListener('mouseenter', function() {
        dissolveBtn.style.background = 'rgba(239, 68, 68, 0.1)';
        dissolveBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        dissolveBtn.style.color = 'var(--danger)';
      });
      dissolveBtn.addEventListener('mouseleave', function() {
        dissolveBtn.style.background = 'var(--bg-secondary)';
        dissolveBtn.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        dissolveBtn.style.color = 'var(--text-secondary)';
      });
      dissolveBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dissolveFamily(family.id);
      });
      block.appendChild(dissolveBtn);
    }

    // ── Member rows (always visible) ─────────────────────────────────
    members.forEach(function (guest) {
      var row = document.createElement('div');
      row.className = 'family-group-member-row';

      var memberCard;
      if (isTableView) {
        memberCard = renderGuestCard(guest, true, true);
        memberCard.classList.add('family-member-card');
        
        var actionsCell = memberCard.querySelector('.guest-col-actions');
        if (actionsCell) {
          var removeBtn = document.createElement('button');
          removeBtn.className = 'btn btn-sm family-remove-btn';
          removeBtn.textContent = '✕';
          removeBtn.title = 'Aus Familie entfernen';
          removeBtn.addEventListener('click', (function(g) { return function(e) {
            e.stopPropagation();
            removeFromFamily(family.id, g.id);
          }; })(guest));
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

  function renderGuestCard(guest, isDetailView, skipFamily, forceFullWidth) {
    var diet = getDiet(guest.dietId);
    var table = guest.tableId ? getTable(guest.tableId) : null;
    var taken = guest.tableId ? takenSeats(guest.tableId, guest.id) : [];
    var maxSeats = table ? table.seatCount : 8;
    var isExpanded = isDetailView ? !!expandedGuestsDetail[guest.id] : !!expandedGuests[guest.id];

    if (!isDetailView && !forceFullWidth) {
      var splitCard = document.createElement('div');
      splitCard.className = 'family-card';

      var header = document.createElement('div');
      header.className = 'family-card-header';
      header.style.cursor = 'default';

      var leftDiv = document.createElement('div');
      leftDiv.className = 'family-header-left';
      leftDiv.innerHTML =
        '<span class="group-chevron" style="visibility:hidden">▶</span>' +
        '<span class="family-icon">👤</span>' +
        '<span class="family-name-text">' + escHtml(guest.firstName + ' ' + (guest.lastName || '')) + '</span>';
      header.appendChild(leftDiv);

      var rightDiv = document.createElement('div');
      rightDiv.style.display = 'flex';
      rightDiv.style.alignItems = 'center';
      rightDiv.style.gap = '24px';
      rightDiv.style.flexShrink = '0';

      var sortedTables = getAvailableTablesForGroup([guest]);

      var tableSel = document.createElement('select');
      tableSel.className = 'inline-select';
      tableSel.style.maxWidth = '100px';

      var defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '—';
      if (!guest.tableId) defaultOpt.selected = true;
      tableSel.appendChild(defaultOpt);

      sortedTables.forEach(function (t) {
        var o = document.createElement('option');
        o.value = String(t.id);
        o.textContent = String(t.number);
        if (String(t.id) === String(guest.tableId || '')) o.selected = true;
        tableSel.appendChild(o);
      });
      tableSel.addEventListener('change', function (e) {
        e.stopPropagation();
        assignGroupToTable([guest], tableSel.value);
        saveAndRender();
      });
      tableSel.addEventListener('click', function (e) { e.stopPropagation(); });
      rightDiv.appendChild(tableSel);

      var rightIcons = document.createElement('div');
      rightIcons.className = 'guest-right-icons guest-col-actions';
      rightIcons.style.width = '75px';
      rightIcons.style.justifyContent = 'flex-end';
      var dot = document.createElement('span');
      dot.className = 'diet-dot';
      if (diet && diet.id !== 'none') {
        dot.style.backgroundColor = diet.color;
        dot.title = diet.name;
      } else {
        dot.style.backgroundColor = 'transparent';
      }
      rightIcons.appendChild(dot);

      rightDiv.appendChild(rightIcons);
      header.appendChild(rightDiv);
      splitCard.appendChild(header);

      return splitCard;
    }

    var card = document.createElement('div');
    card.className = 'guest-card' + (isExpanded ? ' expanded' : '');

    // Name row
    var nameRow = document.createElement('div');
    nameRow.className = 'guest-card-name';

    if (isDetailView) {
      nameRow.style.cursor = 'default';
    }

    var leftContainer = document.createElement('div');
    leftContainer.className = 'guest-summary-left' + ((isDetailView && venueCollapsed) || forceFullWidth ? ' guest-summary-left-full' : '');


    var firstNameInput = document.createElement('input');
    firstNameInput.type = 'text';
    firstNameInput.value = guest.firstName || '';
    firstNameInput.className = 'name-input guest-col-firstname';
    firstNameInput.placeholder = 'First';
    firstNameInput.addEventListener('click', function (e) { e.stopPropagation(); });
    firstNameInput.addEventListener('blur', function () {
      var v = firstNameInput.value.trim();
      if (v !== guest.firstName) { guest.firstName = v; saveAndRender(); }
    });
    firstNameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { firstNameInput.blur(); }
      else if (e.key === 'Escape') { firstNameInput.value = guest.firstName; firstNameInput.blur(); }
      e.stopPropagation();
    });
    leftContainer.appendChild(firstNameInput);

    var lastNameInput = document.createElement('input');
    lastNameInput.type = 'text';
    lastNameInput.value = guest.lastName || '';
    lastNameInput.className = 'name-input guest-col-lastname';
    lastNameInput.placeholder = 'Last';
    lastNameInput.addEventListener('click', function (e) { e.stopPropagation(); });
    lastNameInput.addEventListener('blur', function () {
      var v = lastNameInput.value.trim();
      if (v !== guest.lastName) { guest.lastName = v; saveAndRender(); }
    });
    lastNameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { lastNameInput.blur(); }
      else if (e.key === 'Escape') { lastNameInput.value = guest.lastName; lastNameInput.blur(); }
      e.stopPropagation();
    });
    leftContainer.appendChild(lastNameInput);

    if (isDetailView && !forceFullWidth) {
      var addressInput = document.createElement('input');
      addressInput.type = 'text';
      addressInput.value = guest.address || '';
      addressInput.className = 'name-input guest-col-address';
      addressInput.placeholder = 'Adresse';
      addressInput.title = 'Adresse';
      addressInput.addEventListener('click', function (e) { e.stopPropagation(); });
      addressInput.addEventListener('blur', function () {
        var v = addressInput.value.trim();
        if (v !== (guest.address || '')) { guest.address = v; saveAndRender(); }
      });
      addressInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { addressInput.blur(); }
        else if (e.key === 'Escape') { addressInput.value = guest.address || ''; addressInput.blur(); }
        e.stopPropagation();
      });
      leftContainer.appendChild(addressInput);
    }

    // Table Inline Select
    var sortedTables = getAvailableTablesForGroup([guest]);
    var tableOptions = [{ value: '', label: '—' }];
    sortedTables.forEach(function (t) {
      tableOptions.push({
        value: String(t.id),
        label: String(t.number),
      });
    });

    var tableCol = document.createElement('div');
    tableCol.className = 'guest-col-table';

    var tableSel = document.createElement('select');
    tableSel.className = 'inline-select';
    tableOptions.forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (String(opt.value) === String(guest.tableId || '')) o.selected = true;
      tableSel.appendChild(o);
    });
    tableSel.addEventListener('change', function (e) {
      e.stopPropagation();
      assignGroupToTable([guest], tableSel.value);
      saveAndRender();
    });
    tableSel.addEventListener('click', function (e) { e.stopPropagation(); });
    tableCol.appendChild(tableSel);
    leftContainer.appendChild(tableCol);

    // Seat Inline Select
    var seatCol = document.createElement('div');
    seatCol.className = 'guest-col-seat';

    if (guest.tableId) {
      var seatOptions = [{ value: '', label: '—' }];
      for (var s = 1; s <= maxSeats; s++) {
        var isTaken = taken.indexOf(s) >= 0;
        seatOptions.push({
          value: String(s),
          label: String(s) + (isTaken ? ' ⇄' : ''),
        });
      }
      var seatSel = document.createElement('select');
      seatSel.className = 'inline-select';
      seatOptions.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (String(opt.value) === String(guest.seatNumber || '')) o.selected = true;
        seatSel.appendChild(o);
      });
      seatSel.addEventListener('change', function (e) {
        e.stopPropagation();
        var v = seatSel.value;
        var newSeat = v ? parseInt(v) : null;

        if (newSeat) {
          var existingGuest = guestAtSeat(guest.tableId, newSeat);
          if (existingGuest && existingGuest.id !== guest.id) {
            existingGuest.seatNumber = guest.seatNumber;
          }
        }
        guest.seatNumber = newSeat;
        saveAndRender();
      });
      seatSel.addEventListener('click', function (e) { e.stopPropagation(); });
      seatCol.appendChild(seatSel);
    }
    leftContainer.appendChild(seatCol);

    if (isDetailView) {
      // High Chair Inline Select
      var hcCol = document.createElement('div');
      hcCol.className = 'guest-col-hc';
      var hcSel = document.createElement('select');
      hcSel.className = 'inline-select';
      var hcOptions = [
        { value: 'no', label: 'No' },
        { value: 'yes', label: 'Yes' }
      ];
      hcOptions.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (String(opt.value) === (guest.needsHighChair ? 'yes' : 'no')) o.selected = true;
        hcSel.appendChild(o);
      });
      hcSel.addEventListener('change', function (e) {
        e.stopPropagation();
        var v = hcSel.value;
        guest.needsHighChair = (v === 'yes');
        saveAndRender();
      });
      hcSel.addEventListener('click', function (e) { e.stopPropagation(); });
      hcCol.appendChild(hcSel);
      leftContainer.appendChild(hcCol);

      // Age Inline Select
      var ageCol = document.createElement('div');
      ageCol.className = 'guest-col-age';
      var ageSel = document.createElement('select');
      ageSel.className = 'inline-select';
      var currentAge = guest.age || 'age-adult';
      state.ageGroups.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.id;
        o.textContent = opt.name;
        if (opt.id === currentAge) o.selected = true;
        ageSel.appendChild(o);
      });
      ageSel.addEventListener('change', function (e) {
        e.stopPropagation();
        guest.age = ageSel.value;
        saveAndRender();
      });
      ageSel.addEventListener('click', function (e) { e.stopPropagation(); });
      ageCol.appendChild(ageSel);
      leftContainer.appendChild(ageCol);

      // Diet Inline Select
      var dietCol = document.createElement('div');
      dietCol.className = 'guest-col-diet';
      var dietSel = document.createElement('select');
      dietSel.className = 'inline-select inline-diet-select';
      state.dietOptions.forEach(function (d) {
        var o = document.createElement('option');
        o.value = d.id;
        o.textContent = d.name;
        if (String(d.id) === String(guest.dietId)) o.selected = true;
        dietSel.appendChild(o);
      });
      dietSel.addEventListener('change', function (e) {
        e.stopPropagation();
        guest.dietId = dietSel.value;
        saveAndRender();
      });
      dietSel.addEventListener('click', function (e) { e.stopPropagation(); });
      dietCol.appendChild(dietSel);
      leftContainer.appendChild(dietCol);

      // Family Link Inline Select (only for guests not in a family and not inside a family card)
      if (!skipFamily) {
        var guestFamInline = getFamilyForGuest(guest.id);
        if (!guestFamInline) {
          var famCol = document.createElement('div');
          famCol.className = 'guest-col-family';
          var picker = makeSearchableGuestPicker('Link\u2026', [guest.id], function (selectedId) {
            createFamily(guest.id, selectedId);
          });
          famCol.appendChild(picker);
          leftContainer.appendChild(famCol);
        } else {
          var famCol = document.createElement('div');
          famCol.className = 'guest-col-family';
          var famLabel = document.createElement('span');
          famLabel.className = 'family-inline-label';
          famLabel.textContent = guestFamInline.name;
          famLabel.title = 'Family: ' + guestFamInline.name;
          famCol.appendChild(famLabel);
          leftContainer.appendChild(famCol);
        }
      } else if (isDetailView && venueCollapsed) {
        // In full-table view, add an invisible placeholder so the flex layout is
        // identical to standalone rows — without it the address column is 130px wider
        // in family member rows, shifting all fixed-width columns (Tisch, Platz…) out of alignment.
        var famPlaceholder = document.createElement('div');
        famPlaceholder.className = 'guest-col-family';
        famPlaceholder.style.visibility = 'hidden';
        famPlaceholder.setAttribute('aria-hidden', 'true');
        leftContainer.appendChild(famPlaceholder);
      }
    }

    nameRow.appendChild(leftContainer);

    var rightIcons = document.createElement('div');
    rightIcons.className = 'guest-right-icons guest-col-actions';

    var dot = document.createElement('span');
    dot.className = 'diet-dot';
    if (diet && diet.id !== 'none') {
      dot.style.backgroundColor = diet.color;
      dot.title = diet.name;
    } else {
      dot.style.backgroundColor = 'transparent';
    }
    rightIcons.appendChild(dot);

    if (isDetailView) {
      var delBtn = document.createElement('button');
      delBtn.className = 'btn btn-sm btn-danger';
      delBtn.innerHTML = '🗑️';
      delBtn.title = 'Delete Guest';
      delBtn.style.padding = '0px 4px';
      delBtn.style.marginLeft = '4px';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (confirm('Permanently delete this guest?')) {
          var fam = getFamilyForGuest(guest.id);
          if (fam) removeFromFamily(fam.id, guest.id);
          state.guests = state.guests.filter(function (g) { return g.id !== guest.id; });
          if (currentEditingTableId && guestAtSeat(currentEditingTableId, guest.seatNumber)) {
            // clean up if needed
          }
          saveAndRender();
        }
      });
      rightIcons.appendChild(delBtn);
    }

    nameRow.appendChild(rightIcons);
    card.appendChild(nameRow);

    return card;
  }

  function makeSelectField(labelText, currentValue, options, onChange) {
    var wrap = document.createElement('div');
    var lbl = document.createElement('label');
    lbl.textContent = labelText;
    wrap.appendChild(lbl);

    var sel = document.createElement('select');
    options.forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.disabled) o.disabled = true;
      if (String(opt.value) === String(currentValue)) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { onChange(sel.value); });
    wrap.appendChild(sel);
    return wrap;
  }

  // Searchable guest picker for family linking
  function getGuestListForPicker(excludeIds, onlyUngrouped) {
    var list = [];
    var addedFamilies = {};
    state.guests.forEach(function (g) {
      if (excludeIds && excludeIds.indexOf(g.id) >= 0) return;
      var fam = getFamilyForGuest(g.id);
      if (fam) {
        if (onlyUngrouped) return;
        if (!addedFamilies[fam.id]) {
          // Ensure no member of this family is in excludeIds (to avoid linking a family to itself)
          var hasExcluded = fam.memberIds.some(function (mid) { return excludeIds && excludeIds.indexOf(mid) >= 0; });
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
    list.sort(function (a, b) { return a.sortKey.localeCompare(b.sortKey); });
    return list;
  }

  function makeSearchableGuestPicker(placeholder, excludeIds, onSelect, onlyUngrouped) {
    var container = document.createElement('div');
    container.className = 'searchable-picker';

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'searchable-picker-input';
    input.placeholder = placeholder || 'Search guest\u2026';
    input.addEventListener('click', function (e) { e.stopPropagation(); });

    // Use a body-level dropdown to avoid overflow clipping
    var dropdown = document.createElement('div');
    dropdown.className = 'searchable-picker-dropdown';
    dropdown.style.display = 'none';
    document.body.appendChild(dropdown);

    var guestList = getGuestListForPicker(excludeIds, onlyUngrouped);

    function positionDropdown() {
      var rect = input.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.top = rect.bottom + 2 + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.width = Math.max(rect.width, 180) + 'px';
    }

    function renderOptions(filter) {
      dropdown.innerHTML = '';
      var filterLower = (filter || '').toLowerCase();
      var count = 0;
      guestList.forEach(function (item) {
        if (filterLower && item.label.toLowerCase().indexOf(filterLower) < 0 &&
          item.sortKey.indexOf(filterLower) < 0) return;
        var opt = document.createElement('div');
        opt.className = 'searchable-picker-option';
        opt.textContent = item.label;
        opt.addEventListener('mousedown', function (e) {
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
        var empty = document.createElement('div');
        empty.className = 'searchable-picker-empty';
        empty.textContent = 'Keine Treffer';
        dropdown.appendChild(empty);
      }
    }

    input.addEventListener('focus', function () {
      positionDropdown();
      renderOptions(input.value);
      dropdown.style.display = 'block';
    });
    input.addEventListener('input', function () {
      renderOptions(input.value);
    });
    input.addEventListener('blur', function () {
      setTimeout(function () { dropdown.style.display = 'none'; }, 150);
    });
    input.addEventListener('keydown', function (e) { e.stopPropagation(); });

    container.appendChild(input);
    return container;
  }

  // ── Diet Modal ─────────────────────────────────────────────────────
  function renderDietModal() {
    var body = $('diet-modal-body');
    body.innerHTML = '';

    state.dietOptions.forEach(function (d) {
      var item = document.createElement('div');
      item.className = 'diet-item';

      var swatch = document.createElement('div');
      swatch.className = 'diet-swatch';
      swatch.style.backgroundColor = d.color;
      item.appendChild(swatch);

      var name = document.createElement('span');
      name.className = 'diet-name';
      name.textContent = d.name;
      item.appendChild(name);

      if (d.id !== 'none') {
        var btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-danger';
        btn.textContent = 'Entfernen';
        btn.addEventListener('click', function () {
          state.dietOptions = state.dietOptions.filter(function (x) { return x.id !== d.id; });
          state.guests.forEach(function (g) {
            if (g.dietId === d.id) g.dietId = 'none';
          });
          saveAndRender();
          renderDietModal();
        });
        item.appendChild(btn);
      }

      body.appendChild(item);
    });

    // Add new row
    var addRow = document.createElement('div');
    addRow.className = 'add-diet-row';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'New option name…';
    nameInput.id = 'new-diet-name';
    addRow.appendChild(nameInput);

    var colorInput = document.createElement('input');
    colorInput.type = 'color';
    var nextColorIdx = Math.max(0, state.dietOptions.length - 1) % PRESET_COLORS.length;
    colorInput.value = PRESET_COLORS[nextColorIdx];
    colorInput.id = 'new-diet-color';
    addRow.appendChild(colorInput);

    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-accent btn-sm';
    addBtn.textContent = 'Hinzufügen';
    addBtn.addEventListener('click', addDiet);
    addRow.appendChild(addBtn);

    nameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addDiet();
    });

    body.appendChild(addRow);
  }

  function addDiet() {
    var nameInput = $('new-diet-name');
    var colorInput = $('new-diet-color');
    var name = nameInput.value.trim();
    if (!name) return;
    var id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    state.dietOptions.push({ id: id, name: name, color: colorInput.value });
    saveAndRender();
    renderDietModal();
  }

  // ── Age Modal ──────────────────────────────────────────────────────
  function renderAgeModal() {
    var body = $('age-modal-body');
    body.innerHTML = '';

    state.ageGroups.forEach(function (a) {
      var item = document.createElement('div');
      item.className = 'diet-item'; // Reuse same layout CSS class
      item.style.gridTemplateColumns = '1fr auto';

      var name = document.createElement('span');
      name.className = 'diet-name';
      name.textContent = a.name;
      item.appendChild(name);

      if (a.id !== 'age-adult') {
        var btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-danger';
        btn.textContent = 'Entfernen';
        btn.addEventListener('click', function () {
          state.ageGroups = state.ageGroups.filter(function (x) { return x.id !== a.id; });
          state.guests.forEach(function (g) {
            if (g.age === a.id) g.age = 'age-adult'; // Fallback to adult
          });
          saveAndRender();
          renderAgeModal();
        });
        item.appendChild(btn);
      }

      body.appendChild(item);
    });

    // Add new row
    var addRow = document.createElement('div');
    addRow.className = 'add-diet-row'; // reuse same CSS layout

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Neue Altersgruppe (z.B. Teenager)…';
    nameInput.id = 'new-age-name';
    addRow.appendChild(nameInput);

    var addBtn = document.createElement('button');
    addBtn.className = 'btn btn-accent btn-sm';
    addBtn.textContent = 'Hinzufügen';
    addBtn.addEventListener('click', addAge);
    addRow.appendChild(addBtn);

    nameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addAge();
    });

    body.appendChild(addRow);
  }

  function addAge() {
    var nameInput = $('new-age-name');
    var name = nameInput.value.trim();
    if (!name) return;
    var id = 'age-' + Date.now();
    state.ageGroups.push({ id: id, name: name });
    saveAndRender();
    renderAgeModal();
  }

  // ── CSV Import ─────────────────────────────────────────────────────
  function handleCSVImport(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (ev) {
      var text = ev.target.result;
      var lines = text.split('\n').filter(function (l) { return l.trim(); });
      var existing = {};
      state.guests.forEach(function (g) { existing[g.firstName + '|' + g.lastName] = true; });

      var count = 0;
      lines.forEach(function (line, idx) {
        var parts = line.split(',').map(function (s) { return s.trim(); });
        var firstName = parts[0] || '';
        var lastName = parts[1] || '';
        var highChairCol = (parts[2] || '').trim().toLowerCase();

        if (firstName || lastName) {
          state.guests.push({
            id: 'g-' + Date.now() + '-' + idx + '-' + count,
            firstName: firstName,
            lastName: lastName,
            needsHighChair: highChairCol === 'yes' || highChairCol === 'true',
            dietId: 'none',
            tableId: null,
            seatNumber: null,
          });
          count++;
        }
      });

      saveAndRender();
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // ── Render Table List (in toolbar) ─────────────────────────────────
  function renderTableList() {
    // Table chips removed — tables are managed via the detail modal.
    $('table-list').innerHTML = '';
  }

  // ── Save + Render all ──────────────────────────────────────────────
  function renderAll() {
    renderVenue();
    renderGuestList();
    renderTableList();
    updateStats();
    if (currentEditingTableId) {
      renderTableDetailSVG(currentEditingTableId);
      renderTableDetailGuests(currentEditingTableId);
    }
  }

  function saveAndRender() {
    saveState();
    renderAll();
  }

  // ── Init ───────────────────────────────────────────────────────────
  function init() {
    // Wire up buttons
    $('btn-add-guest').addEventListener('click', function () {
      $('add-guest-first').value = '';
      $('add-guest-last').value = '';
      $('add-guest-hc').checked = false;

      var dietSelect = $('add-guest-diet');
      dietSelect.innerHTML = '';
      state.dietOptions.forEach(function (d) {
        var opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        if (d.id === 'none') opt.selected = true;
        dietSelect.appendChild(opt);
      });

      $('add-guest-modal').style.display = 'flex';
      setTimeout(function () { $('add-guest-first').focus(); }, 50);
    });

    $('add-guest-close').addEventListener('click', function () { $('add-guest-modal').style.display = 'none'; });
    $('add-guest-cancel').addEventListener('click', function () { $('add-guest-modal').style.display = 'none'; });
    $('add-guest-save').addEventListener('click', function () {
      var newId = 'g-' + Date.now();
      state.guests.push({
        id: newId,
        firstName: $('add-guest-first').value.trim(),
        lastName: $('add-guest-last').value.trim(),
        dietId: $('add-guest-diet').value || 'none',
        needsHighChair: $('add-guest-hc').checked,
        tableId: null,
        seatNumber: null
      });
      expandedGuests[newId] = true;
      $('add-guest-modal').style.display = 'none';
      saveAndRender();
    });
    $('add-guest-modal').addEventListener('click', function (e) {
      if (e.target === $('add-guest-modal')) $('add-guest-modal').style.display = 'none';
    });
    $('guest-filter-input').addEventListener('input', function () {
      renderGuestList();
    });
    $('btn-import').addEventListener('click', function () { $('csv-input').click(); });
    $('btn-diets').addEventListener('click', function () {
      renderDietModal();
      $('diet-modal').style.display = '';
    });
    $('csv-input').addEventListener('change', handleCSVImport);
    $('diet-modal-close').addEventListener('click', function () {
      $('diet-modal').style.display = 'none';
    });
    $('diet-modal').addEventListener('click', function (e) {
      if (e.target === $('diet-modal')) $('diet-modal').style.display = 'none';
    });

    $('btn-ages').addEventListener('click', function () {
      renderAgeModal();
      $('age-modal').style.display = '';
    });
    $('age-modal-close').addEventListener('click', function () {
      $('age-modal').style.display = 'none';
    });
    $('age-modal').addEventListener('click', function (e) {
      if (e.target === $('age-modal')) $('age-modal').style.display = 'none';
    });

    // Table Detail Modal
    $('table-detail-close').addEventListener('click', closeTableDetailModal);
    $('table-detail-save').addEventListener('click', saveTableNumber);
    $('table-detail-rename').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') saveTableNumber();
      if (e.key === 'Escape') closeTableDetailModal();
    });
    $('table-detail-modal').addEventListener('click', function (e) {
      if (e.target === $('table-detail-modal')) closeTableDetailModal();
    });
    $('table-detail-remove').addEventListener('click', function () {
      if (!currentEditingTableId) return;
      var tbl = getTable(currentEditingTableId);
      if (!tbl) return;
      var count = guestsAtTable(currentEditingTableId).length;
      if (count > 0 && !confirm('Tisch ' + tbl.number + ' entfernen? ' + count + ' Gast/Gäste werden nicht mehr zugewiesen.')) return;
      
      var targetId = currentEditingTableId;
      closeTableDetailModal();
      removeTable(targetId);
    });
    $('table-detail-seatcount').addEventListener('change', function () {
      if (!currentEditingTableId) return;
      var tbl = getTable(currentEditingTableId);
      if (!tbl) return;
      tbl.seatCount = parseInt(this.value);

      // Compact seat numbers: remove gaps caused by dropped empty seats.
      // Sort seated guests by their current number and reassign 1, 2, 3…
      // so nobody ends up on a seat index that no longer exists.
      var seated = state.guests
        .filter(function (g) { return g.tableId === tbl.id && g.seatNumber; })
        .sort(function (a, b) { return a.seatNumber - b.seatNumber; });
      seated.forEach(function (g, i) { g.seatNumber = i + 1; });

      saveAndRender();
      renderTableDetailSVG(currentEditingTableId);
      renderTableDetailGuests(currentEditingTableId);
    });
    $('table-detail-fixed').addEventListener('change', function () {
      if (!currentEditingTableId) return;
      var tbl = getTable(currentEditingTableId);
      if (!tbl) return;
      tbl.seatsFixed = this.checked;
      saveAndRender(); // re-renders venue SVG seat borders only
    });

    // Add table buttons
    $('btn-add-7').addEventListener('click', function () { addTable(7); });
    $('btn-add-8').addEventListener('click', function () { addTable(8); });
    $('btn-add-10').addEventListener('click', function () { addTable(10); });

    // Venue toggle button
    $('btn-toggle-venue').addEventListener('click', toggleVenue);

    // Expand / collapse-fixed toggle (split view only)
    $('btn-expand-all').addEventListener('click', function () {
      var btn = $('btn-expand-all');
      if (!allGroupsExpanded) {
        // Expand everything explicitly
        state.tables.forEach(function (t) { collapsedGroups['table-' + t.id] = false; });
        collapsedGroups['unassigned'] = false;
        allGroupsExpanded = true;
        btn.textContent = '⬆ Fixierte einklappen';
      } else {
        // Clear all explicit states — defaults kick in (fixed = collapsed, rest = expanded)
        state.tables.forEach(function (t) { delete collapsedGroups['table-' + t.id]; });
        delete collapsedGroups['unassigned'];
        allGroupsExpanded = false;
        btn.textContent = '⬇ Alle ausklappen';
      }
      renderGuestList();
    });

    // Print button
    $('btn-print').addEventListener('click', function () {
      window.print();
    });

    // ── Print: crop SVG viewBox tightly around tables ─────────────
    var _savedViewBox = null;
    window.addEventListener('beforeprint', function () {
      if (!svgElement || state.tables.length === 0) return;

      var PAD = 80;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      state.tables.forEach(function (t) {
        var r = (t.seatCount > 8 ? 36 : 30) + 12 + 5 + 12; // max table radius + seat
        minX = Math.min(minX, t.x - r);
        minY = Math.min(minY, t.y - r);
        maxX = Math.max(maxX, t.x + r);
        maxY = Math.max(maxY, t.y + r);
      });

      var vx = minX - PAD;
      var vy = minY - PAD;
      var vw = (maxX - minX) + PAD * 2;
      var vh = (maxY - minY) + PAD * 2;

      // Expand width strictly to fit legends (plus 40px spacing)
      var ldNode = document.querySelector('#legend-shape rect');
      var printLgW = ldNode ? parseFloat(ldNode.getAttribute('width')) : 140;
      vw += (printLgW + 40);

      // Update background rect so the gray box covers the new printed area
      var bg = document.getElementById('venue-bg-rect');
      if (bg) {
        bg.setAttribute('data-old-x', bg.getAttribute('x'));
        bg.setAttribute('data-old-y', bg.getAttribute('y'));
        bg.setAttribute('data-old-w', bg.getAttribute('width'));
        bg.setAttribute('data-old-h', bg.getAttribute('height'));

        bg.setAttribute('x', vx);
        bg.setAttribute('y', vy);
        bg.setAttribute('width', vw);
        bg.setAttribute('height', vh);
      }

      // Translate legends so they dock exactly to the top-right of our new viewBox
      var dx = (vx + vw) - CANVAS_W;
      var dy = vy;

      var ld = document.getElementById('legend-diet');
      if (ld) ld.setAttribute('transform', 'translate(' + dx + ',' + dy + ')');

      var ls = document.getElementById('legend-shape');
      if (ls) ls.setAttribute('transform', 'translate(' + dx + ',' + dy + ')');

      var la = document.getElementById('legend-age');
      if (la) la.setAttribute('transform', 'translate(' + dx + ',' + dy + ')');

      _savedViewBox = svgElement.getAttribute('viewBox');
      svgElement.setAttribute('viewBox', vx + ' ' + vy + ' ' + vw + ' ' + vh);
    });

    window.addEventListener('afterprint', function () {
      var ld = document.getElementById('legend-diet');
      if (ld) ld.removeAttribute('transform');
      var ls = document.getElementById('legend-shape');
      if (ls) ls.removeAttribute('transform');
      var la = document.getElementById('legend-age');
      if (la) la.removeAttribute('transform');

      var bg = document.getElementById('venue-bg-rect');
      if (bg && bg.hasAttribute('data-old-x')) {
        bg.setAttribute('x', bg.getAttribute('data-old-x'));
        bg.setAttribute('y', bg.getAttribute('data-old-y'));
        bg.setAttribute('width', bg.getAttribute('data-old-w'));
        bg.setAttribute('height', bg.getAttribute('data-old-h'));
      }

      if (svgElement && _savedViewBox) {
        svgElement.setAttribute('viewBox', _savedViewBox);
        _savedViewBox = null;
      }
    });

    // Initial render after loading state
    loadState(function () {
      renderAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
