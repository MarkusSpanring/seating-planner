import { SEAT_R_CM } from '../core/constants.js';
import { state, getVenueWidth, getVenueHeight } from '../core/state.js';

export function computeCircleOrbit(seatCount, seatR) {
  const sqR = seatR * 0.925;
  const effectiveR = Math.sqrt(2) * sqR;

  // Exact polygon orbit for circumscribed circles to touch:
  let needed = 0;
  if (seatCount > 2) {
    needed = effectiveR / Math.sin(Math.PI / seatCount);
  } else if (seatCount === 2) {
    needed = effectiveR * 1.1;
  }

  // margin to table body
  const margin = seatR * 0.3;
  const minOrbit = seatR * 1.5 + seatR + margin;
  return Math.max(needed, minOrbit);
}

export function computeCircleTableR(seatCount, seatR) {
  const margin = seatR * 0.3;
  return computeCircleOrbit(seatCount, seatR) - seatR - margin;
}

export function computeRectSize(seatsLong, seatsShort, seatR) {
  const gap = seatR * 0.2; // small gap for rectangles
  const slot = 2 * seatR * 0.925 + gap;
  // ensure inner table is large enough even for 1 seat
  const w = Math.max(seatR * 3.5, (seatsLong || 1) * slot);
  const h = Math.max(seatR * 3.5, (seatsShort || 1) * slot);
  return { w: w, h: h };
}

export function getTableCenterSize(table, seatR, autoSize = false) {
  const scale = seatR / 30.0; // Custom dimensions are defined at seatR = 30
  if (table.shape === 'rectangle' && table.seatsLong != null) {
    const dims = computeRectSize(table.seatsLong, table.seatsShort, seatR);
    let w = dims.w, h = dims.h;
    if (!autoSize) {
      const cw = table.tableCustomW != null ? table.tableCustomW * scale : null;
      const ch = table.tableCustomH != null ? table.tableCustomH * scale : null;
      if (cw != null && cw >= dims.w) w = cw;
      if (ch != null && ch >= dims.h) h = ch;
    }
    return { type: 'rect', w: w, h: h };
  }
  const minR = computeCircleTableR(table.seatCount, seatR);
  const cr = table.tableCustomR != null ? table.tableCustomR * scale : null;
  const tableR = (!autoSize && cr != null && cr >= minR) ? cr : minR;
  return { type: 'circle', r: tableR };
}

export function getSeatPositions(seatCount, seatR, shape, seatsLong, seatsShort, customTableR, customTableW, customTableH) {
  const scale = seatR / 30.0;
  const cw = customTableW != null ? customTableW * scale : null;
  const ch = customTableH != null ? customTableH * scale : null;
  const cr = customTableR != null ? customTableR * scale : null;
  const margin = seatR * 0.3;

  if (shape === 'rectangle' && seatsLong != null) {
    return getRectSeatPositions(seatsLong, seatsShort || 0, seatR, cw, ch);
  }
  // Circular layout — orbit must clear both seat-seat overlap AND custom table radius
  const autoOrbit = computeCircleOrbit(seatCount, seatR);
  let orbit = autoOrbit;
  if (cr != null && cr > 0) {
    // Ensure seats don't overlap the table disc: orbit >= tableR + seatR + margin
    const minOrbitForTable = cr + seatR + margin;
    orbit = Math.max(orbit, minOrbitForTable);
  }
  const positions = [];
  for (let i = 0; i < seatCount; i++) {
    const angle = (2 * Math.PI * i) / seatCount - Math.PI / 2;
    const angleDeg = angle * 180 / Math.PI + 90;
    positions.push({
      x: orbit * Math.cos(angle),
      y: orbit * Math.sin(angle),
      number: i + 1,
      angleDeg: angleDeg
    });
  }
  return positions;
}

export function getRectSeatPositions(seatsLong, seatsShort, seatR, customW, customH) {
  const dims = computeRectSize(seatsLong, seatsShort, seatR);
  // Use custom dimensions if they are larger than the auto-computed minimum
  const actualW = Math.max(dims.w, customW || 0);
  const actualH = Math.max(dims.h, customH || 0);
  const halfW = actualW / 2;
  const halfH = actualH / 2;
  const margin = seatR * 0.3;
  const pad = seatR + margin; // margin between table edge and seat center

  const positions = [];
  let seatNum = 1;

  // Top edge: seatsLong seats, left to right
  for (let i = 0; i < seatsLong; i++) {
    const t = seatsLong === 1 ? 0.5 : (i + 0.5) / seatsLong;
    positions.push({ x: -halfW + t * actualW, y: -(halfH + pad), number: seatNum++, angleDeg: 0 });
  }
  // Right edge: seatsShort seats, top to bottom
  for (let i = 0; i < seatsShort; i++) {
    const t = seatsShort === 1 ? 0.5 : (i + 0.5) / seatsShort;
    positions.push({ x: halfW + pad, y: -halfH + t * actualH, number: seatNum++, angleDeg: 90 });
  }
  // Bottom edge: seatsLong seats, right to left
  for (let i = 0; i < seatsLong; i++) {
    const t = seatsLong === 1 ? 0.5 : (i + 0.5) / seatsLong;
    positions.push({ x: halfW - t * actualW, y: halfH + pad, number: seatNum++, angleDeg: 180 });
  }
  // Left edge: seatsShort seats, bottom to top
  for (let i = 0; i < seatsShort; i++) {
    const t = seatsShort === 1 ? 0.5 : (i + 0.5) / seatsShort;
    positions.push({ x: -(halfW + pad), y: halfH - t * actualH, number: seatNum++, angleDeg: 270 });
  }
  return positions;
}

export function getTrapezoidPoints(x, y, r) {
  const topW = r * 1.18; // narrower top
  const botW = r * 1.82; // wider bottom
  const h = r * 1.72;
  const topY = y - h / 2;
  const botY = y + h / 2;
  return [
    (x - topW / 2) + ',' + topY,
    (x + topW / 2) + ',' + topY,
    (x + botW / 2) + ',' + botY,
    (x - botW / 2) + ',' + botY
  ].join(' ');
}

export function getTableExtents(t, seatR = SEAT_R_CM) {
  if (!t || typeof t !== 'object') {
    const r = typeof t === 'number' ? t : 50;
    return { minX: -r, maxX: r, minY: -r, maxY: r };
  }
  if (!t.seatCount && !t.shape && t.type) {
    if (t.type === 'rect') {
      return { minX: -t.hw, maxX: t.hw, minY: -t.hh, maxY: t.hh };
    }
    const r = t.r || 50;
    return { minX: -r, maxX: r, minY: -r, maxY: r };
  }

  const centerGeo = getTableCenterSize(t, seatR, false);
  let minX, maxX, minY, maxY;
  if (centerGeo.type === 'rect') {
    const hw = centerGeo.w / 2;
    const hh = centerGeo.h / 2;
    minX = -hw;
    maxX = hw;
    minY = -hh;
    maxY = hh;
  } else {
    const r = centerGeo.r;
    minX = -r;
    maxX = r;
    minY = -r;
    maxY = r;
  }

  const sqR = seatR * 0.925;
  const disabled = Array.isArray(t.disabledSeats) ? t.disabledSeats : [];
  const seatPositions = getSeatPositions(
    t.seatCount,
    seatR,
    t.shape,
    t.seatsLong,
    t.seatsShort,
    t.tableCustomR,
    t.tableCustomW,
    t.tableCustomH
  );

  for (let i = 0; i < seatPositions.length; i++) {
    const seat = seatPositions[i];
    if (disabled.includes(seat.number)) continue;
    minX = Math.min(minX, seat.x - sqR);
    maxX = Math.max(maxX, seat.x + sqR);
    minY = Math.min(minY, seat.y - sqR);
    maxY = Math.max(maxY, seat.y + sqR);
  }

  return { minX, maxX, minY, maxY };
}

export function getTableBounds(t, seatR = SEAT_R_CM) {
  const ext = getTableExtents(t, seatR);
  const hw = Math.max(Math.abs(ext.minX), Math.abs(ext.maxX));
  const hh = Math.max(Math.abs(ext.minY), Math.abs(ext.maxY));
  const r = Math.max(hw, hh);
  const isRect = t && t.shape === 'rectangle';
  return {
    type: isRect ? 'rect' : 'circle',
    isRect,
    hw,
    hh,
    r,
    minX: ext.minX,
    maxX: ext.maxX,
    minY: ext.minY,
    maxY: ext.maxY
  };
}

export function getTablesEnvelope(tables = state.tables) {
  if (!tables || tables.length === 0) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      width: 0,
      height: 0,
      minVenueWidth: 300,
      minVenueHeight: 300
    };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  tables.forEach(t => {
    const ext = getTableExtents(t, SEAT_R_CM);
    const left = t.x + ext.minX;
    const right = t.x + ext.maxX;
    const top = t.y + ext.minY;
    const bottom = t.y + ext.maxY;

    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (top < minY) minY = top;
    if (bottom > maxY) maxY = bottom;
  });

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  // Minimum venue width/height required to contain all tables starting from origin (0, 0)
  const minVenueWidth = Math.max(300, Math.ceil(maxX));
  const minVenueHeight = Math.max(300, Math.ceil(maxY));

  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    height,
    minVenueWidth,
    minVenueHeight
  };
}

export function shapesOverlap(shapeA, ax, ay, shapeB, bx, by) {
  if (shapeA.type === 'circle' && shapeB.type === 'circle') {
    const distSq = (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
    const rSum = shapeA.r + shapeB.r;
    return distSq < rSum * rSum;
  }
  if (shapeA.type === 'rect' && shapeB.type === 'rect') {
    return Math.abs(ax - bx) < (shapeA.hw + shapeB.hw) &&
           Math.abs(ay - by) < (shapeA.hh + shapeB.hh);
  }
  // One rect, one circle
  const rect = shapeA.type === 'rect' ? shapeA : shapeB;
  const rx = shapeA.type === 'rect' ? ax : bx;
  const ry = shapeA.type === 'rect' ? ay : by;
  const circ = shapeA.type === 'circle' ? shapeA : shapeB;
  const cx = shapeA.type === 'circle' ? ax : bx;
  const cy = shapeA.type === 'circle' ? ay : by;

  const closestX = Math.max(rx - rect.hw, Math.min(cx, rx + rect.hw));
  const closestY = Math.max(ry - rect.hh, Math.min(cy, ry + rect.hh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (circ.r * circ.r);
}

export function getTableCollisionRadius(t) {
  const ext = getTableExtents(t);
  return Math.max(Math.abs(ext.minX), Math.abs(ext.maxX), Math.abs(ext.minY), Math.abs(ext.maxY));
}

export function getTableComponents(table, seatR = SEAT_R_CM) {
  if (!table || typeof table !== 'object') {
    const r = typeof table === 'number' ? table : 50;
    return [{ shape: { type: 'circle', r }, relX: 0, relY: 0, boundingR: r }];
  }
  if (!table.seatCount && !table.shape && table.type) {
    const br = table.type === 'rect' ? Math.hypot(table.hw, table.hh) : (table.r || 50);
    return [{ shape: table, relX: 0, relY: 0, boundingR: br }];
  }

  const components = [];
  const sqR = seatR * 0.925;

  // 1. Table center body
  const centerGeo = getTableCenterSize(table, seatR, false);
  if (centerGeo.type === 'rect') {
    const hw = centerGeo.w / 2;
    const hh = centerGeo.h / 2;
    components.push({
      shape: { type: 'rect', hw, hh },
      relX: 0,
      relY: 0,
      boundingR: Math.hypot(hw, hh)
    });
  } else {
    components.push({
      shape: { type: 'circle', r: centerGeo.r },
      relX: 0,
      relY: 0,
      boundingR: centerGeo.r
    });
  }

  // 2. Enabled chairs
  const disabled = Array.isArray(table.disabledSeats) ? table.disabledSeats : [];
  const seatPositions = getSeatPositions(
    table.seatCount,
    seatR,
    table.shape,
    table.seatsLong,
    table.seatsShort,
    table.tableCustomR,
    table.tableCustomW,
    table.tableCustomH
  );

  for (let i = 0; i < seatPositions.length; i++) {
    const seat = seatPositions[i];
    if (disabled.includes(seat.number)) continue;

    if (table.shape === 'rectangle') {
      components.push({
        shape: { type: 'rect', hw: sqR, hh: sqR },
        relX: seat.x,
        relY: seat.y,
        boundingR: Math.hypot(seat.x, seat.y) + Math.SQRT2 * sqR
      });
    } else {
      components.push({
        shape: { type: 'circle', r: sqR },
        relX: seat.x,
        relY: seat.y,
        boundingR: Math.hypot(seat.x, seat.y) + sqR
      });
    }
  }

  return components;
}

export function tablesOverlap(tableA, ax, ay, tableB, bx, by, seatR = SEAT_R_CM) {
  const compA = getTableComponents(tableA, seatR);
  const compB = getTableComponents(tableB, seatR);

  // Broad-phase: check maximum bounding radius
  let maxRadA = 0;
  for (let i = 0; i < compA.length; i++) {
    if (compA[i].boundingR > maxRadA) maxRadA = compA[i].boundingR;
  }
  let maxRadB = 0;
  for (let j = 0; j < compB.length; j++) {
    if (compB[j].boundingR > maxRadB) maxRadB = compB[j].boundingR;
  }

  const dx = ax - bx;
  const dy = ay - by;
  const rSum = maxRadA + maxRadB;
  if (dx * dx + dy * dy >= rSum * rSum) {
    return false;
  }

  // Narrow-phase: exact component collision
  for (let i = 0; i < compA.length; i++) {
    const ca = compA[i];
    const posX_A = ax + ca.relX;
    const posY_A = ay + ca.relY;

    for (let j = 0; j < compB.length; j++) {
      const cb = compB[j];
      const posX_B = bx + cb.relX;
      const posY_B = by + cb.relY;

      if (shapesOverlap(ca.shape, posX_A, posY_A, cb.shape, posX_B, posY_B)) {
        return true;
      }
    }
  }
  return false;
}

export function isCollidingAt(x, y, tableOrBoundsOrRadius, excludeTableId, tables = state.tables) {
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    if (t.id === excludeTableId) continue;
    if (tablesOverlap(tableOrBoundsOrRadius, x, y, t, t.x, t.y)) {
      return true;
    }
  }
  return false;
}

export function findEmptySpace(tempTable, tables = state.tables) {
  const ext = getTableExtents(tempTable, SEAT_R_CM);
  const venueW = getVenueWidth();
  const venueH = getVenueHeight();
  const startX = venueW / 2;
  const startY = venueH / 2;

  let radius = 0;
  const maxRadius = Math.max(venueW, venueH);
  const stepRadius = 40; // Outward step size in cm

  const minLeft = -ext.minX + 25;
  const maxRight = venueW - ext.maxX - 25;
  const minTop = -ext.minY + 25;
  const maxBottom = venueH - ext.maxY - 25;

  while (radius < maxRadius) {
    if (radius === 0) {
      if (!isCollidingAt(startX, startY, tempTable, null, tables)) {
        return { x: startX, y: startY };
      }
      radius += stepRadius;
      continue;
    }

    const circumference = 2 * Math.PI * radius;
    const numPoints = Math.max(8, Math.floor(circumference / 60));
    for (let i = 0; i < numPoints; i++) {
      const angle = (2 * Math.PI * i) / numPoints;
      const testX = startX + radius * Math.cos(angle);
      const testY = startY + radius * Math.sin(angle);

      if (testX < minLeft || testX > maxRight || testY < minTop || testY > maxBottom) {
        continue;
      }

      if (!isCollidingAt(testX, testY, tempTable, null, tables)) {
        return { x: testX, y: testY };
      }
    }
    radius += stepRadius;
  }

  return {
    x: startX + (Math.random() - 0.5) * 200,
    y: startY + (Math.random() - 0.5) * 200
  };
}

