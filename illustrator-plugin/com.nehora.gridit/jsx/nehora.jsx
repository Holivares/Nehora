// =============================================================
// Nehora — ExtendScript pour Adobe Illustrator
// Exécuté dans le contexte d'Illustrator via evalScript()
// =============================================================

// ── Utilitaires ──────────────────────────────────────────────

function getDoc() {
  if (!app.documents.length) return null;
  return app.activeDocument;
}

function ptToPx(pt) {
  return pt; // Illustrator travaille en points (1pt = 1px à 72dpi)
}

function colorFromHex(hex) {
  var r = parseInt(hex.slice(1,3), 16) / 255;
  var g = parseInt(hex.slice(3,5), 16) / 255;
  var b = parseInt(hex.slice(5,7), 16) / 255;
  var c = new RGBColor();
  c.red = r * 255; c.green = g * 255; c.blue = b * 255;
  return c;
}

function getOrCreateLayer(name) {
  var doc = getDoc();
  for (var i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i].name === name) {
      doc.layers[i].locked = false;
      return doc.layers[i];
    }
  }
  var layer = doc.layers.add();
  layer.name = name;
  return layer;
}

// ── 1. Lire la sélection ─────────────────────────────────────

function getSelectionData() {
  var doc = getDoc();
  if (!doc) return JSON.stringify({ error: 'Aucun document ouvert' });
  if (!doc.selection.length) return JSON.stringify({ error: 'Aucun élément sélectionné' });

  var result = {
    docWidth: doc.width,
    docHeight: doc.height,
    items: []
  };

  for (var i = 0; i < doc.selection.length; i++) {
    var item = doc.selection[i];
    var gb = item.geometricBounds; // [left, top, right, bottom]
    var itemData = {
      type: item.typename,
      left: gb[0],
      top: gb[1],
      right: gb[2],
      bottom: gb[3],
      width: gb[2] - gb[0],
      height: gb[1] - gb[3],
      paths: []
    };

    if (item.typename === 'PathItem') {
      itemData.paths.push(extractPathData(item));
    } else if (item.typename === 'CompoundPathItem') {
      for (var p = 0; p < item.pathItems.length; p++) {
        itemData.paths.push(extractPathData(item.pathItems[p]));
      }
    } else if (item.typename === 'GroupItem') {
      for (var g = 0; g < item.pathItems.length; g++) {
        itemData.paths.push(extractPathData(item.pathItems[g]));
      }
    }

    result.items.push(itemData);
  }

  // Bounding box globale de la sélection
  var sel = doc.selection;
  var minL = Infinity, maxT = -Infinity, maxR = -Infinity, minB = Infinity;
  for (var s = 0; s < sel.length; s++) {
    var b = sel[s].geometricBounds;
    if (b[0] < minL) minL = b[0];
    if (b[1] > maxT) maxT = b[1];
    if (b[2] > maxR) maxR = b[2];
    if (b[3] < minB) minB = b[3];
  }
  result.selectionBounds = { left: minL, top: maxT, right: maxR, bottom: minB,
    width: maxR - minL, height: maxT - minB };

  return JSON.stringify(result);
}

function extractPathData(pathItem) {
  var anchors = [];
  var handles = [];
  for (var i = 0; i < pathItem.pathPoints.length; i++) {
    var pt = pathItem.pathPoints[i];
    anchors.push({ x: pt.anchor[0], y: pt.anchor[1] });
    handles.push({
      leftX: pt.leftDirection[0], leftY: pt.leftDirection[1],
      rightX: pt.rightDirection[0], rightY: pt.rightDirection[1]
    });
  }
  var gb = pathItem.geometricBounds;
  return {
    anchors: anchors,
    handles: handles,
    closed: pathItem.closed,
    bounds: { left: gb[0], top: gb[1], right: gb[2], bottom: gb[3] }
  };
}

// ── 2. Créer une grille dans Illustrator ─────────────────────

function createGrid(paramsJson) {
  var p = JSON.parse(paramsJson);
  var doc = getDoc();
  if (!doc) return 'Erreur: aucun document';

  var layer = getOrCreateLayer('Nehora — Grille');
  layer.locked = false;

  // Centre de la sélection ou du canvas
  var cx, cy, size;
  if (p.useSelection && doc.selection.length) {
    var sb = JSON.parse(getSelectionData()).selectionBounds;
    cx = (sb.left + sb.right) / 2;
    cy = (sb.top + sb.bottom) / 2;
    size = Math.max(sb.width, sb.height) * 1.2;
  } else {
    cx = doc.width / 2;
    cy = -doc.height / 2;
    size = p.size || 400;
  }

  var half = size / 2;
  var color = colorFromHex(p.color || '#a78bfa');
  var secColor = colorFromHex(p.secColor || '#4b4b6a');

  if (p.type === 'square') {
    createSquareGrid(doc, layer, cx, cy, size, p.subdivisions || 8, color, secColor, p.strokeWidth || 0.5);
  } else if (p.type === 'iso') {
    createIsoGrid(doc, layer, cx, cy, size, p.subdivisions || 8, color, secColor, p.strokeWidth || 0.5);
  } else if (p.type === 'hex') {
    createHexGrid(doc, layer, cx, cy, size, p.subdivisions || 4, color, p.strokeWidth || 0.5);
  } else if (p.type === 'golden') {
    createGoldenGrid(doc, layer, cx, cy, size, color, secColor, p.strokeWidth || 0.5);
  }

  layer.locked = true;
  doc.redraw();
  return 'Grille créée sur le calque "Nehora — Grille"';
}

function addLine(doc, layer, x1, y1, x2, y2, color, sw, opacity) {
  var line = layer.pathItems.add();
  line.setEntirePath([[x1, -y1], [x2, -y2]]);
  line.filled = false;
  line.stroked = true;
  line.strokeColor = color;
  line.strokeWidth = sw || 0.5;
  line.opacity = opacity || 60;
  return line;
}

function createSquareGrid(doc, layer, cx, cy, size, sub, color, secColor, sw) {
  var half = size / 2;
  var step = size / sub;
  for (var i = 0; i <= sub; i++) {
    var pos = -half + i * step;
    var isMain = (i === 0 || i === sub || i === sub/2);
    var c = isMain ? color : secColor;
    var op = isMain ? 80 : 40;
    var w = isMain ? sw * 1.5 : sw;
    addLine(doc, layer, cx + pos, cy - half, cx + pos, cy + half, c, w, op);
    addLine(doc, layer, cx - half, cy + pos, cx + half, cy + pos, c, w, op);
  }
  // Cercle d'inscription
  var circle = layer.pathItems.ellipse(-cy + half, cx - half, size, size);
  circle.filled = false; circle.stroked = true;
  circle.strokeColor = color; circle.strokeWidth = sw; circle.opacity = 40;
  circle.strokeDashes = [4, 4];
  // Diagonales
  addLine(doc, layer, cx - half, cy - half, cx + half, cy + half, colorFromHex('#f87171'), sw, 40);
  addLine(doc, layer, cx + half, cy - half, cx - half, cy + half, colorFromHex('#f87171'), sw, 40);
}

function createIsoGrid(doc, layer, cx, cy, size, sub, color, secColor, sw) {
  var half = size / 2;
  var step = size / sub;
  var cos60 = 0.5, sin60 = 0.866;
  var ext = size * 1.5;
  // horizontales
  for (var i = 0; i <= sub; i++) {
    var y = -half + i * step;
    var isMain = (i === 0 || i === sub || i === sub/2);
    addLine(doc, layer, cx - half, cy + y, cx + half, cy + y,
      isMain ? color : secColor, isMain ? sw*1.5 : sw, isMain ? 80 : 40);
  }
  // diagonales
  for (var j = -sub * 2; j <= sub * 2; j++) {
    var x0 = j * step;
    var isM = (j % (sub/2) === 0);
    addLine(doc, layer, cx + x0 - ext*cos60, cy - ext*sin60, cx + x0 + ext*cos60, cy + ext*sin60,
      isM ? color : secColor, isM ? sw*1.5 : sw, isM ? 70 : 35);
    addLine(doc, layer, cx + x0 + ext*cos60, cy - ext*sin60, cx + x0 - ext*cos60, cy + ext*sin60,
      isM ? color : secColor, isM ? sw*1.5 : sw, isM ? 70 : 35);
  }
}

function createHexGrid(doc, layer, cx, cy, size, sub, color, sw) {
  var half = size / 2;
  var R = half / (sub + 0.5);
  var hexW = R * 2;
  var hexH = Math.sqrt(3) * R;
  for (var row = -sub*2; row <= sub*2; row++) {
    for (var col = -sub*2; col <= sub*2; col++) {
      var hx = cx + col * hexW * 0.75;
      var hy = cy + row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
      if (Math.abs(hx - cx) > half + R || Math.abs(hy - cy) > half + R) continue;
      var pts = [];
      for (var k = 0; k < 6; k++) {
        var a = Math.PI / 180 * (60 * k - 30);
        pts.push([hx + R * Math.cos(a), -(hy + R * Math.sin(a))]);
      }
      var hex = layer.pathItems.add();
      hex.setEntirePath(pts);
      hex.closed = true; hex.filled = false; hex.stroked = true;
      hex.strokeColor = color; hex.strokeWidth = sw; hex.opacity = 60;
    }
  }
}

function createGoldenGrid(doc, layer, cx, cy, size, color, secColor, sw) {
  var phi = 1.6180339887;
  var half = size / 2;

  function goldenRect(x, y, w, h, depth) {
    if (depth <= 0 || w < 2 || h < 2) return;
    var border = layer.pathItems.rectangle(-(cy + y), cx + x, w, h);
    border.filled = false; border.stroked = true;
    border.strokeColor = color; border.strokeWidth = sw * Math.max(0.3, 1 - depth * 0.1);
    border.opacity = 70;
    if (w > h) {
      goldenRect(x, y, h, h, depth - 1);
      goldenRect(x + h, y, w - h, h, depth - 1);
    } else {
      goldenRect(x, y, w, w, depth - 1);
      goldenRect(x, y + w, w, h - w, depth - 1);
    }
  }

  goldenRect(-half, -half, size, size / phi, 7);
}

// ── 3. Créer les guides de clearspace ────────────────────────

function createClearspaceGuides(paramsJson) {
  var p = JSON.parse(paramsJson);
  var doc = getDoc();
  if (!doc) return 'Erreur: aucun document';
  if (!doc.selection.length) return 'Erreur: sélectionnez un élément';

  var selData = JSON.parse(getSelectionData());
  var sb = selData.selectionBounds;
  var margin = p.margin || 20;

  // Guides horizontaux
  doc.guides.add(Orientation.horizontal, -(sb.top + margin));
  doc.guides.add(Orientation.horizontal, -(sb.bottom - margin));
  // Guides verticaux
  doc.guides.add(Orientation.vertical, sb.left - margin);
  doc.guides.add(Orientation.vertical, sb.right + margin);

  // Rectangle visuel de clearspace
  var layer = getOrCreateLayer('Nehora — Clearspace');
  layer.locked = false;
  var rect = layer.pathItems.rectangle(-(sb.top + margin), sb.left - margin,
    sb.width + margin * 2, sb.height + margin * 2);
  rect.filled = false; rect.stroked = true;
  var oc = colorFromHex(p.color || '#f59e0b');
  rect.strokeColor = oc; rect.strokeWidth = 1;
  rect.opacity = 70; rect.strokeDashes = [6, 4];
  layer.locked = true;

  doc.redraw();
  return 'Guides clearspace créés (marge: ' + Math.round(margin) + 'pt)';
}

// ── 4. Décomposer la sélection → JSON pour le panneau ───────

function decomposeSelection() {
  return getSelectionData();
}

// ── 5. Supprimer les calques Nehora ─────────────────────────

function clearNehoraLayers() {
  var doc = getDoc();
  if (!doc) return;
  var names = ['Nehora — Grille', 'Nehora — Clearspace'];
  for (var i = 0; i < doc.layers.length; i++) {
    for (var n = 0; n < names.length; n++) {
      if (doc.layers[i].name === names[n]) {
        doc.layers[i].locked = false;
        doc.layers[i].remove();
        i--;
        break;
      }
    }
  }
  doc.redraw();
  return 'Calques Nehora supprimés';
}

// ── 6. Info document ─────────────────────────────────────────

function getDocInfo() {
  var doc = getDoc();
  if (!doc) return JSON.stringify({ error: 'Aucun document ouvert' });
  return JSON.stringify({
    name: doc.name,
    width: doc.width,
    height: doc.height,
    selectionCount: doc.selection.length,
    unit: 'pt'
  });
}
