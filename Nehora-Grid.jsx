// ============================================================
//  NEHORA — Logo Grid Generator  v2.0
//  Adobe Illustrator CC 2019 – 2026
//  Fichier → Scripts → Nehora-Grid
// ============================================================
#target illustrator
#targetengine main

// ── Constantes ───────────────────────────────────────────────
var VERSION   = '2.0';
var LAYER_GRID  = 'Nehora — Grille';
var LAYER_LOGO  = 'Nehora — Logo';
var LAYER_CLEAR = 'Nehora — Clearspace';
var PRESET_FILE = Folder.myDocuments + '/Nehora-presets.json';
var PHI = 1.6180339887;

// ── Couleurs par défaut ──────────────────────────────────────
var DEFAULTS = {
  gridType   : 0,
  gridSize   : 400,
  gridSub    : 8,
  gridSW     : 0.5,
  gridMain   : '#a78bfa',
  gridSec    : '#3a3a5c',
  useSelection: true,
  // logo
  logoMain   : '#cc88ff',
  logoHandles: '#60a5fa',
  logoGrid   : '#2a2a40',
  // clearspace
  clearMargin: 20,
  clearColor : '#f59e0b',
  clearGuides: true,
  clearXmode : true,
  clearMult  : 1.0
};

// ═════════════════════════════════════════════════════════════
//  UTILITAIRES
// ═════════════════════════════════════════════════════════════

function hexToRGB(hex) {
  hex = hex.replace(/[^0-9a-fA-F]/g, '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  return {
    r: parseInt(hex.substring(0,2),16),
    g: parseInt(hex.substring(2,4),16),
    b: parseInt(hex.substring(4,6),16)
  };
}

function makeColor(hex) {
  var rgb = hexToRGB(hex);
  var c = new RGBColor();
  c.red = rgb.r; c.green = rgb.g; c.blue = rgb.b;
  return c;
}

function getOrCreateLayer(doc, name) {
  for (var i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i].name === name) {
      doc.layers[i].locked  = false;
      doc.layers[i].visible = true;
      return doc.layers[i];
    }
  }
  var l = doc.layers.add();
  l.name = name;
  l.zOrder(ZOrderMethod.BRINGTOFRONT);
  return l;
}

function removeLayer(doc, name) {
  for (var i = 0; i < doc.layers.length; i++) {
    if (doc.layers[i].name === name) {
      doc.layers[i].locked = false;
      doc.layers[i].remove();
      return;
    }
  }
}

function addLine(layer, x1, y1, x2, y2, col, sw, op) {
  var p = layer.pathItems.add();
  p.setEntirePath([[x1,y1],[x2,y2]]);
  p.filled = false; p.stroked = true;
  p.strokeColor = makeColor(col);
  p.strokeWidth = sw || 0.5;
  p.opacity = op || 60;
  return p;
}

function addRect(layer, left, top, w, h, col, sw, op, dashes) {
  var r = layer.pathItems.rectangle(top, left, w, h);
  r.filled = false; r.stroked = true;
  r.strokeColor = makeColor(col);
  r.strokeWidth = sw || 0.5;
  r.opacity = op || 60;
  if (dashes) r.strokeDashes = [6,4];
  return r;
}

function addSquare(layer, cx, cy, size, fillCol, strokeCol, sw) {
  var h = size / 2;
  var r = layer.pathItems.rectangle(cy+h, cx-h, size, size);
  r.filled = true; r.stroked = true;
  r.fillColor = makeColor(fillCol);
  r.strokeColor = makeColor(strokeCol);
  r.strokeWidth = sw;
  r.opacity = 90;
  return r;
}

function addCircle(layer, cx, cy, r, fillCol, strokeCol, sw) {
  var c = layer.pathItems.ellipse(cy+r, cx-r, r*2, r*2);
  c.filled = (fillCol !== 'none');
  c.stroked = true;
  if (fillCol !== 'none') c.fillColor = makeColor(fillCol);
  else { var n = new NoColor(); c.fillColor = n; }
  c.strokeColor = makeColor(strokeCol);
  c.strokeWidth = sw;
  c.opacity = 85;
  return c;
}

function addLabel(layer, x, y, txt, col, size) {
  var t = layer.textFrames.pointText([x, y]);
  t.contents = txt;
  t.textRange.characterAttributes.size = size || 7;
  t.textRange.characterAttributes.fillColor = makeColor(col || '#ffffff');
  return t;
}

function getSelectionBounds(doc) {
  if (!doc.selection || !doc.selection.length) return null;
  var minX=1e9, maxX=-1e9, minY=1e9, maxY=-1e9;
  for (var i=0; i<doc.selection.length; i++) {
    var b = doc.selection[i].geometricBounds;
    if (b[0]<minX) minX=b[0]; if (b[2]>maxX) maxX=b[2];
    if (b[3]<minY) minY=b[3]; if (b[1]>maxY) maxY=b[1];
  }
  return { left:minX, top:maxY, right:maxX, bottom:minY,
           cx:(minX+maxX)/2, cy:(maxY+minY)/2,
           w:maxX-minX, h:maxY-minY };
}

// ═════════════════════════════════════════════════════════════
//  PRÉSETS  (lecture / écriture JSON simplifié)
// ═════════════════════════════════════════════════════════════

function savePreset(name, data) {
  try {
    var f = new File(PRESET_FILE);
    var existing = {};
    if (f.exists) {
      f.open('r'); var txt = f.read(); f.close();
      try { existing = eval('('+txt+')'); } catch(e) {}
    }
    existing[name] = data;
    f.open('w');
    f.write(objToJSON(existing));
    f.close();
    return true;
  } catch(e) { return false; }
}

function loadPresets() {
  try {
    var f = new File(PRESET_FILE);
    if (!f.exists) return {};
    f.open('r'); var txt = f.read(); f.close();
    return eval('('+txt+')');
  } catch(e) { return {}; }
}

function objToJSON(obj) {
  var s = '{';
  for (var k in obj) {
    if (!obj.hasOwnProperty(k)) continue;
    var v = obj[k];
    s += '"'+k+'":';
    if (typeof v === 'object' && v !== null) s += objToJSON(v);
    else if (typeof v === 'string') s += '"'+v+'"';
    else s += v;
    s += ',';
  }
  return s.replace(/,$/, '') + '}';
}

// ═════════════════════════════════════════════════════════════
//  GRILLES DE BASE
// ═════════════════════════════════════════════════════════════

function drawSquareGrid(layer, cx, cy, size, sub, mc, sc, sw) {
  var half = size/2, step = size/sub;
  for (var i=0; i<=sub; i++) {
    var pos = -half + i*step;
    var isMain = (i===0||i===sub||i===sub/2);
    var c = isMain?mc:sc, op=isMain?80:35, w=isMain?sw*2:sw;
    addLine(layer, cx+pos, cy-half, cx+pos, cy+half, c, w, op);
    addLine(layer, cx-half, cy+pos, cx+half, cy+pos, c, w, op);
  }
  // Cercle d'inscription
  var circ = layer.pathItems.ellipse(cy+half, cx-half, size, size);
  circ.filled=false; circ.stroked=true;
  circ.strokeColor=makeColor(mc); circ.strokeWidth=sw;
  circ.opacity=30; circ.strokeDashes=[5,5];
  // Diagonales
  addLine(layer, cx-half, cy-half, cx+half, cy+half, '#f06060', sw, 30);
  addLine(layer, cx+half, cy-half, cx-half, cy+half, '#f06060', sw, 30);
  // Centre
  addCircle(layer, cx, cy, sw*1.5, mc, mc, 0.5);
}

function drawIsoGrid(layer, cx, cy, size, sub, mc, sc, sw) {
  var half=size/2, step=size/sub;
  var c60=0.5, s60=0.866, ext=size*2;
  for (var i=0; i<=sub; i++) {
    var y=-half+i*step, isM=(i===0||i===sub||i===sub/2);
    addLine(layer, cx-half, cy+y, cx+half, cy+y, isM?mc:sc, isM?sw*2:sw, isM?80:35);
  }
  for (var j=-sub*3; j<=sub*3; j++) {
    var x0=j*step, isM2=(j%(Math.max(1,Math.round(sub/2)))===0);
    addLine(layer, cx+x0-ext*c60, cy-ext*s60, cx+x0+ext*c60, cy+ext*s60, isM2?mc:sc, isM2?sw*2:sw, isM2?70:28);
    addLine(layer, cx+x0+ext*c60, cy-ext*s60, cx+x0-ext*c60, cy+ext*s60, isM2?mc:sc, isM2?sw*2:sw, isM2?70:28);
  }
}

function drawHexGrid(layer, cx, cy, size, sub, mc, sw) {
  var half=size/2;
  sub = Math.max(2,Math.floor(sub/2));
  var R=half/(sub+0.5), hW=R*2, hH=Math.sqrt(3)*R;
  for (var row=-sub*3; row<=sub*3; row++) {
    for (var col=-sub*3; col<=sub*3; col++) {
      var hx=cx+col*hW*0.75, hy=cy+row*hH+(col%2===0?0:hH/2);
      if (Math.abs(hx-cx)>half+R||Math.abs(hy-cy)>half+R) continue;
      var pts=[];
      for (var k=0;k<6;k++){var a=Math.PI/180*(60*k-30);pts.push([hx+R*Math.cos(a),hy+R*Math.sin(a)]);}
      var h=layer.pathItems.add();
      h.setEntirePath(pts); h.closed=true; h.filled=false; h.stroked=true;
      h.strokeColor=makeColor(mc); h.strokeWidth=sw; h.opacity=55;
    }
  }
  addLine(layer, cx, cy-half, cx, cy+half, mc, sw, 45);
  addLine(layer, cx-half, cy, cx+half, cy, mc, sw, 45);
}

function drawGoldenGrid(layer, cx, cy, size, mc, sc, sw) {
  var half=size/2;

  // Rectangle principal
  addRect(layer, cx-half, cy+half, size, size, mc, sw*2, 75);

  // Subdivision récursive
  function goldenRect(x, y, w, h, d, dir) {
    if (d<=0||w<3||h<3) return;
    var op = Math.max(20, 80 - d*10);
    var ww = sw * Math.max(0.3, 1 - d*0.1);

    if (w >= h) {
      var sq = h;
      // carré
      addRect(layer, x, y, sq, sq, d%2===0?mc:sc, ww, op);
      // arc de spirale en bezier (approx quart de cercle)
      var arc = layer.pathItems.add();
      arc.setEntirePath([
        [x,       y-sq],
        [x+sq*0.552, y-sq],
        [x+sq,    y-sq+sq*0.448],
        [x+sq,    y]
      ]);
      arc.filled=false; arc.stroked=true;
      arc.strokeColor=makeColor(sc); arc.strokeWidth=ww*0.8; arc.opacity=op*0.6;
      goldenRect(x+sq, y, w-sq, h, d-1, dir);
    } else {
      var sq2 = w;
      addRect(layer, x, y, sq2, sq2, d%2===0?mc:sc, ww, op);
      var arc2 = layer.pathItems.add();
      arc2.setEntirePath([
        [x,      y-sq2],
        [x,      y-sq2+sq2*0.552],
        [x+sq2*0.448, y],
        [x+sq2,  y]
      ]);
      arc2.filled=false; arc2.stroked=true;
      arc2.strokeColor=makeColor(sc); arc2.strokeWidth=ww*0.8; arc2.opacity=op*0.6;
      goldenRect(x, y-sq2, w, h-sq2, d-1, dir);
    }
  }

  goldenRect(cx-half, cy+half, size, size/PHI, 9, 0);

  // Lignes guides phi
  var gx = half - size/PHI;
  var gy = -(half - size/PHI/PHI);
  addLine(layer, cx+gx, cy-half, cx+gx, cy+half, sc, sw, 40);
  addLine(layer, cx-half, cy+gy, cx+half, cy+gy, sc, sw, 40);

  // Diagonales
  addLine(layer, cx-half, cy-half, cx+half, cy+half, '#f06060', sw, 25);
  addLine(layer, cx+half, cy-half, cx-half, cy+half, '#f06060', sw, 25);
}

// ═════════════════════════════════════════════════════════════
//  GRILLE LOGO (décomposition de la sélection)
// ═════════════════════════════════════════════════════════════

function drawLogoGrid(doc, layer, opts) {
  var sb = getSelectionBounds(doc);
  if (!sb) { alert('Sélectionnez un ou plusieurs éléments.'); return false; }

  var mc = opts.main || '#cc88ff';
  var hc = opts.handles || '#60a5fa';
  var gc = opts.grid || '#2a2a40';
  var sw = opts.sw || 0.4;

  // ── Grille de construction alignée sur le logo
  var pad = Math.max(sb.w, sb.h) * 0.15;
  var gLeft = sb.left - pad, gTop = sb.top + pad;
  var gW = sb.w + pad*2, gH = sb.h + pad*2;
  var step = Math.max(sb.w, sb.h) / 8;

  if (step > 1) {
    for (var x = gLeft; x <= gLeft+gW+step; x += step) {
      addLine(layer, x, gTop, x, gTop-gH, gc, sw*0.7, 35);
    }
    for (var y = gTop; y >= gTop-gH-step; y -= step) {
      addLine(layer, gLeft, y, gLeft+gW, y, gc, sw*0.7, 35);
    }
  }

  // Lignes d'alignement sur les bords du logo
  addLine(layer, sb.left, gTop+pad, sb.left, gTop-gH-pad, mc, sw, 55);
  addLine(layer, sb.right, gTop+pad, sb.right, gTop-gH-pad, mc, sw, 55);
  addLine(layer, gLeft-pad, sb.top, gLeft+gW+pad, sb.top, mc, sw, 55);
  addLine(layer, gLeft-pad, sb.bottom, gLeft+gW+pad, sb.bottom, mc, sw, 55);
  // Ligne centrale
  addLine(layer, sb.cx, gTop, sb.cx, gTop-gH, mc, sw*1.5, 65);
  addLine(layer, gLeft, sb.cy, gLeft+gW, sb.cy, mc, sw*1.5, 65);

  // ── Décomposition des paths sélectionnés
  var anchorSize = Math.max(sb.w, sb.h) * 0.012;
  anchorSize = Math.max(2, Math.min(anchorSize, 6));
  var handleR  = anchorSize * 0.7;

  function processPath(pi) {
    var pts = pi.pathPoints;
    for (var i=0; i<pts.length; i++) {
      var pt = pts[i];
      var ax = pt.anchor[0], ay = pt.anchor[1];
      var lx = pt.leftDirection[0],  ly = pt.leftDirection[1];
      var rx = pt.rightDirection[0], ry = pt.rightDirection[1];

      // Contour du path
      // (les paths originaux restent visibles)

      // Ligne ancre → poignée gauche
      if (Math.abs(lx-ax)>0.5 || Math.abs(ly-ay)>0.5) {
        addLine(layer, ax, ay, lx, ly, hc, sw*0.7, 65);
        addCircle(layer, lx, ly, handleR, 'none', hc, sw*0.8);
      }
      // Ligne ancre → poignée droite
      if (Math.abs(rx-ax)>0.5 || Math.abs(ry-ay)>0.5) {
        addLine(layer, ax, ay, rx, ry, hc, sw*0.7, 65);
        addCircle(layer, rx, ry, handleR, 'none', hc, sw*0.8);
      }
      // Ancre carrée
      addSquare(layer, ax, ay, anchorSize, '#2a2a40', '#ffffff', sw*0.5);
    }
  }

  function processItem(item) {
    if (item.typename === 'PathItem') {
      processPath(item);
    } else if (item.typename === 'CompoundPathItem') {
      for (var p=0; p<item.pathItems.length; p++) processPath(item.pathItems[p]);
    } else if (item.typename === 'GroupItem') {
      for (var c=0; c<item.pageItems.length; c++) processItem(item.pageItems[c]);
    }
  }

  for (var i=0; i<doc.selection.length; i++) processItem(doc.selection[i]);

  // Bounding box du logo
  addRect(layer, sb.left, sb.top, sb.w, sb.h, mc, sw, 50, false);

  return true;
}

// ═════════════════════════════════════════════════════════════
//  CLEARSPACE
// ═════════════════════════════════════════════════════════════

function drawClearspace(doc, layer, opts) {
  var sb = getSelectionBounds(doc);
  if (!sb) { alert('Sélectionnez un élément.'); return false; }

  var margin = opts.margin || 20;
  var col    = opts.color  || '#f59e0b';
  var sw     = 0.75;

  var left   = sb.left  - margin;
  var top    = sb.top   + margin;
  var right  = sb.right + margin;
  var bottom = sb.bottom- margin;
  var w = sb.w + margin*2;
  var h = sb.h + margin*2;

  // Rectangle clearspace (pointillé)
  addRect(layer, left, top, w, h, col, sw, 80, true);

  // Rectangle intérieur (bounding box logo)
  addRect(layer, sb.left, sb.top, sb.w, sb.h, col, sw*0.6, 40, false);

  // ── Lignes de cote avec flèches ──────────────────────────

  function dimLine(x1, y1, x2, y2, label, lx, ly) {
    addLine(layer, x1, y1, x2, y2, col, sw*0.8, 75);
    // Ticks aux extrémités
    var dx = x2-x1, dy = y2-y1, len = Math.sqrt(dx*dx+dy*dy);
    if (len > 0) {
      var px = (-dy/len)*4, py = (dx/len)*4;
      addLine(layer, x1-px, y1-py, x1+px, y1+py, col, sw, 75);
      addLine(layer, x2-px, y2-py, x2+px, y2+py, col, sw, 75);
    }
    addLabel(layer, lx, ly, label, col, Math.max(5, margin*0.4));
  }

  var m = Math.round(margin);
  // Marge supérieure
  dimLine(sb.left, sb.top+margin, sb.right, sb.top+margin,
    m+' pt', sb.cx - 12, sb.top + margin*0.5 + 3);
  // Marge inférieure
  dimLine(sb.left, sb.bottom-margin, sb.right, sb.bottom-margin,
    m+' pt', sb.cx - 12, sb.bottom - margin*0.5 - 1);
  // Marge gauche
  dimLine(sb.left-margin, sb.top, sb.left-margin, sb.bottom,
    m+' pt', sb.left - margin - 18, sb.cy + 3);
  // Marge droite
  dimLine(sb.right+margin, sb.top, sb.right+margin, sb.bottom,
    m+' pt', sb.right + margin + 3, sb.cy + 3);

  // ── Guides Illustrator ───────────────────────────────────
  if (opts.guides) {
    try {
      doc.guides.add(Orientation.horizontal, top);
      doc.guides.add(Orientation.horizontal, bottom);
      doc.guides.add(Orientation.vertical,   left);
      doc.guides.add(Orientation.vertical,   right);
    } catch(e) {}
  }

  return true;
}

// ═════════════════════════════════════════════════════════════
//  EXPORT PDF
// ═════════════════════════════════════════════════════════════

function exportPDF(doc) {
  var saveDlg = new File(doc.fullName.parent + '/Nehora-Export.pdf');
  var f = saveDlg.saveDlg ? saveDlg.saveDlg('Enregistrer PDF', 'PDF:*.pdf') : saveDlg;
  if (!f) return;

  var opts = new PDFSaveOptions();
  opts.compatibility = PDFCompatibility.ACROBAT5;
  opts.generateThumbnails = true;
  opts.preserveEditability = false;

  try {
    doc.saveAs(f, opts);
    alert('PDF exporté :\n' + f.fsName);
  } catch(e) {
    alert('Erreur export : ' + e.message);
  }
}

// ═════════════════════════════════════════════════════════════
//  INTERFACE PRINCIPALE
// ═════════════════════════════════════════════════════════════

function showDialog() {
  var doc;
  try { doc = app.activeDocument; }
  catch(e) { alert('Ouvrez un document Illustrator.'); return; }

  var presets = loadPresets();

  // ── Fenêtre principale ───────────────────────────────────
  var win = new Window('dialog', 'Nehora  v'+VERSION+'  —  Logo Grid Generator');
  win.orientation = 'column';
  win.alignChildren = 'fill';
  win.spacing = 8;
  win.margins = [16, 14, 16, 14];
  win.preferredSize = [400, -1];

  // ── Titre ────────────────────────────────────────────────
  var hdr = win.add('group');
  hdr.orientation = 'row'; hdr.alignChildren = 'center';
  var hdrTxt = hdr.add('statictext', undefined, '◈  NEHORA  —  Logo Grid Generator');
  hdrTxt.graphics.font = ScriptUI.newFont('dialog', ScriptUI.FontStyle.BOLD, 12);
  hdr.add('statictext', undefined, 'v'+VERSION);

  win.add('panel').alignment = 'fill';

  // ── Navigation par onglets ───────────────────────────────
  var tabBar = win.add('group');
  tabBar.orientation = 'row';
  tabBar.spacing = 4;
  var tabNames = ['  Grille  ', '  Logo  ', '  Clearspace  ', '  Présets  '];
  var tabBtns = [];
  for (var t=0; t<tabNames.length; t++) {
    tabBtns.push(tabBar.add('button', undefined, tabNames[t]));
    tabBtns[tabBtns.length-1].preferredSize = [-1, 26];
  }

  // ── Panels des onglets ───────────────────────────────────
  var panels = [];
  for (var p=0; p<4; p++) {
    var panel = win.add('group');
    panel.orientation = 'column';
    panel.alignChildren = 'fill';
    panel.spacing = 8;
    panels.push(panel);
  }

  function showTab(idx) {
    for (var i=0; i<panels.length; i++) panels[i].visible = (i===idx);
    win.layout.layout(true);
  }
  for (var ti=0; ti<tabBtns.length; ti++) {
    (function(idx){ tabBtns[idx].onClick = function(){ showTab(idx); }; })(ti);
  }

  // ═══════════════════════════════════
  //  ONGLET 0 — GRILLE DE BASE
  // ═══════════════════════════════════
  var pGrid = panels[0];

  // Type
  var typePanel = pGrid.add('panel', undefined, 'Type de grille');
  typePanel.orientation = 'row'; typePanel.margins = 10; typePanel.spacing = 6;
  var typeList = typePanel.add('dropdownlist', undefined,
    ['Carré', 'Isométrique', 'Hexagone', 'Golden Ratio']);
  typeList.selection = DEFAULTS.gridType;
  typeList.preferredSize = [160, -1];

  // Paramètres
  var paramPanel = pGrid.add('panel', undefined, 'Paramètres');
  paramPanel.orientation = 'column'; paramPanel.alignChildren = 'fill';
  paramPanel.margins = 10; paramPanel.spacing = 6;

  function addRow(parent, label, defVal, unit) {
    var row = parent.add('group'); row.orientation='row'; row.alignChildren='center';
    row.add('statictext', undefined, label).preferredSize=[110,-1];
    var inp = row.add('edittext', undefined, String(defVal));
    inp.preferredSize=[65,-1];
    if (unit) row.add('statictext', undefined, unit);
    return inp;
  }

  var sizeInp = addRow(paramPanel, 'Taille :', DEFAULTS.gridSize, 'pt');
  var subInp  = addRow(paramPanel, 'Subdivisions :', DEFAULTS.gridSub, '');
  var swInp   = addRow(paramPanel, 'Épaisseur :', DEFAULTS.gridSW, 'pt');
  var selChk  = paramPanel.add('checkbox', undefined, 'Centrer sur la sélection active');
  selChk.value = DEFAULTS.useSelection;

  // Couleurs
  var colPanel = pGrid.add('panel', undefined, 'Couleurs');
  colPanel.orientation = 'column'; colPanel.alignChildren = 'fill';
  colPanel.margins = 10; colPanel.spacing = 6;

  var mainColInp = addRow(colPanel, 'Principale :', DEFAULTS.gridMain, '');
  var secColInp  = addRow(colPanel, 'Secondaire :', DEFAULTS.gridSec, '');

  // Actions grille
  var gridActPanel = pGrid.add('panel', undefined, 'Actions');
  gridActPanel.orientation = 'row'; gridActPanel.margins = 10; gridActPanel.spacing = 6;
  var btnGenGrid = gridActPanel.add('button', undefined, '▶  Générer la grille');
  btnGenGrid.preferredSize = [160, 28];
  var btnRemGrid = gridActPanel.add('button', undefined, '✕  Supprimer');
  btnRemGrid.preferredSize = [-1, 28];

  btnGenGrid.onClick = function() {
    var size = parseFloat(sizeInp.text)||400;
    var sub  = parseInt(subInp.text)||8;
    var sw   = parseFloat(swInp.text)||0.5;
    var mc   = mainColInp.text||'#a78bfa';
    var sc   = secColInp.text||'#3a3a5c';

    var cx, cy;
    if (selChk.value && doc.selection && doc.selection.length) {
      var sb = getSelectionBounds(doc);
      cx = sb.cx; cy = sb.cy;
      size = Math.max(sb.w, sb.h) * 1.35;
    } else {
      cx = doc.width/2;
      cy = -doc.height/2;
    }

    var layer = getOrCreateLayer(doc, LAYER_GRID);
    var type = typeList.selection.index;

    if (type===0) drawSquareGrid(layer, cx, cy, size, sub, mc, sc, sw);
    else if (type===1) drawIsoGrid(layer, cx, cy, size, sub, mc, sc, sw);
    else if (type===2) drawHexGrid(layer, cx, cy, size, sub, mc, sw);
    else if (type===3) drawGoldenGrid(layer, cx, cy, size, mc, sc, sw);

    layer.locked = true;
    doc.redraw();

    var names = ['Carré','Isométrique','Hexagone','Golden Ratio'];
    showToast('Grille '+names[type]+' générée sur "'+LAYER_GRID+'"');
  };

  btnRemGrid.onClick = function() {
    removeLayer(doc, LAYER_GRID);
    doc.redraw();
    showToast('Calque "'+LAYER_GRID+'" supprimé.');
  };

  // ═══════════════════════════════════
  //  ONGLET 1 — LOGO
  // ═══════════════════════════════════
  var pLogo = panels[1];

  var logoInfoPanel = pLogo.add('panel', undefined, 'Informations sélection');
  logoInfoPanel.orientation = 'column'; logoInfoPanel.margins = 10;
  var selInfoTxt = logoInfoPanel.add('statictext', undefined,
    'Sélectionnez un logo dans Illustrator puis cliquez Analyser.');
  selInfoTxt.preferredSize = [-1, 32];

  var logoOptPanel = pLogo.add('panel', undefined, 'Composants à afficher');
  logoOptPanel.orientation = 'column'; logoOptPanel.alignChildren = 'fill';
  logoOptPanel.margins = 10; logoOptPanel.spacing = 5;
  var chkAnchors  = logoOptPanel.add('checkbox', undefined, 'Ancres (nœuds carrés)');   chkAnchors.value=true;
  var chkHandles  = logoOptPanel.add('checkbox', undefined, 'Poignées Bézier');          chkHandles.value=true;
  var chkGridlines= logoOptPanel.add('checkbox', undefined, 'Grille de construction');    chkGridlines.value=true;
  var chkBbox     = logoOptPanel.add('checkbox', undefined, 'Bounding box');              chkBbox.value=true;

  var logoColPanel = pLogo.add('panel', undefined, 'Couleurs');
  logoColPanel.orientation = 'column'; logoColPanel.alignChildren = 'fill';
  logoColPanel.margins = 10; logoColPanel.spacing = 5;
  var logoMainInp    = addRow(logoColPanel, 'Contours / grille :', DEFAULTS.logoMain, '');
  var logoHandlesInp = addRow(logoColPanel, 'Poignées :', DEFAULTS.logoHandles, '');
  var logoGridInp    = addRow(logoColPanel, 'Grille fond :', DEFAULTS.logoGrid, '');

  var logoActPanel = pLogo.add('panel', undefined, 'Actions');
  logoActPanel.orientation = 'row'; logoActPanel.margins = 10; logoActPanel.spacing = 6;
  var btnAnalyze  = logoActPanel.add('button', undefined, '⟳  Analyser sélection');
  btnAnalyze.preferredSize = [150,28];
  var btnRemLogo  = logoActPanel.add('button', undefined, '✕  Supprimer');
  btnRemLogo.preferredSize = [-1,28];

  btnAnalyze.onClick = function() {
    var sb = getSelectionBounds(doc);
    if (!sb) { alert('Aucun élément sélectionné.'); return; }

    var nPaths=0, nAnchors=0;
    function countItem(item) {
      if (item.typename==='PathItem') { nPaths++; nAnchors+=item.pathPoints.length; }
      else if (item.typename==='CompoundPathItem') {
        for (var p=0;p<item.pathItems.length;p++){nPaths++;nAnchors+=item.pathItems[p].pathPoints.length;}
      } else if (item.typename==='GroupItem') {
        for (var c=0;c<item.pageItems.length;c++) countItem(item.pageItems[c]);
      }
    }
    for (var i=0;i<doc.selection.length;i++) countItem(doc.selection[i]);

    selInfoTxt.text = doc.selection.length + ' élément(s)  ·  ' + nPaths +
      ' chemin(s)  ·  ' + nAnchors + ' nœuds\nTaille : ' +
      Math.round(sb.w) + ' × ' + Math.round(sb.h) + ' pt';

    var layer = getOrCreateLayer(doc, LAYER_LOGO);
    var opts = {
      main   : logoMainInp.text||'#cc88ff',
      handles: chkHandles.value ? (logoHandlesInp.text||'#60a5fa') : null,
      grid   : chkGridlines.value ? (logoGridInp.text||'#2a2a40') : null,
      sw     : parseFloat(swInp.text)||0.4
    };
    if (!chkGridlines.value) opts.grid = null;
    if (!chkHandles.value)   opts.handles = null;

    var ok = drawLogoGrid(doc, layer, opts);
    if (ok) { layer.locked=true; doc.redraw(); showToast('Décomposition appliquée sur "'+LAYER_LOGO+'"'); }
  };

  btnRemLogo.onClick = function() {
    removeLayer(doc, LAYER_LOGO);
    doc.redraw();
    showToast('Calque "'+LAYER_LOGO+'" supprimé.');
  };

  // ═══════════════════════════════════
  //  ONGLET 2 — CLEARSPACE
  // ═══════════════════════════════════
  var pClear = panels[2];

  var clearMetPanel = pClear.add('panel', undefined, 'Méthode de calcul');
  clearMetPanel.orientation = 'column'; clearMetPanel.alignChildren = 'fill';
  clearMetPanel.margins = 10; clearMetPanel.spacing = 6;

  var xhChk = clearMetPanel.add('checkbox', undefined, 'Basé sur X-height');
  xhChk.value = DEFAULTS.clearXmode;
  var xhInp   = addRow(clearMetPanel, 'X-height :', 20, 'pt');
  var multInp  = addRow(clearMetPanel, 'Multiplicateur :', DEFAULTS.clearMult, '×');
  var margInp  = addRow(clearMetPanel, 'Marge fixe :', DEFAULTS.clearMargin, 'pt');

  xhChk.onClick = function() {
    xhInp.enabled = xhChk.value;
    multInp.enabled = xhChk.value;
    margInp.enabled = !xhChk.value;
  };
  xhInp.enabled = true; multInp.enabled = true; margInp.enabled = false;

  var clearColPanel = pClear.add('panel', undefined, 'Apparence');
  clearColPanel.orientation = 'column'; clearColPanel.alignChildren = 'fill';
  clearColPanel.margins = 10; clearColPanel.spacing = 6;
  var clearColInp = addRow(clearColPanel, 'Couleur zone :', DEFAULTS.clearColor, '');
  var guideChk = clearColPanel.add('checkbox', undefined, 'Créer des guides Illustrator');
  guideChk.value = DEFAULTS.clearGuides;

  var clearActPanel = pClear.add('panel', undefined, 'Actions');
  clearActPanel.orientation = 'row'; clearActPanel.margins = 10; clearActPanel.spacing = 6;
  var btnClear    = clearActPanel.add('button', undefined, '▶  Appliquer');
  btnClear.preferredSize = [130,28];
  var btnRemClear = clearActPanel.add('button', undefined, '✕  Supprimer');
  btnRemClear.preferredSize = [-1,28];

  btnClear.onClick = function() {
    var sb = getSelectionBounds(doc);
    if (!sb) { alert('Sélectionnez un élément.'); return; }

    var margin;
    if (xhChk.value) {
      margin = (parseFloat(xhInp.text)||20) * (parseFloat(multInp.text)||1);
    } else {
      margin = parseFloat(margInp.text)||20;
    }

    var layer = getOrCreateLayer(doc, LAYER_CLEAR);
    var ok = drawClearspace(doc, layer, {
      margin: margin,
      color : clearColInp.text||'#f59e0b',
      guides: guideChk.value
    });
    if (ok) { layer.locked=true; doc.redraw(); showToast('Clearspace généré — marge : '+Math.round(margin)+' pt'); }
  };

  btnRemClear.onClick = function() {
    removeLayer(doc, LAYER_CLEAR);
    doc.redraw();
    showToast('Calque "'+LAYER_CLEAR+'" supprimé.');
  };

  // ═══════════════════════════════════
  //  ONGLET 3 — PRÉSETS + EXPORT
  // ═══════════════════════════════════
  var pPresets = panels[3];

  var presetPanel = pPresets.add('panel', undefined, 'Sauvegarder un préset');
  presetPanel.orientation = 'column'; presetPanel.alignChildren = 'fill';
  presetPanel.margins = 10; presetPanel.spacing = 6;
  var presetNameInp = addRow(presetPanel, 'Nom du préset :', 'Mon préset', '');
  var presetActRow = presetPanel.add('group');
  var btnSavePreset = presetActRow.add('button', undefined, '💾  Sauvegarder');
  btnSavePreset.preferredSize = [140,26];

  var loadPanel = pPresets.add('panel', undefined, 'Charger un préset');
  loadPanel.orientation = 'column'; loadPanel.alignChildren = 'fill';
  loadPanel.margins = 10; loadPanel.spacing = 6;

  function refreshPresetList() {
    while (presetList.items.length) presetList.remove(0);
    var p = loadPresets();
    for (var k in p) { if (p.hasOwnProperty(k)) presetList.add('item', k); }
    if (presetList.items.length) presetList.selection=0;
  }

  var presetList = loadPanel.add('listbox', undefined, [], { numberOfColumns:1, showHeaders:false });
  presetList.preferredSize = [-1, 80];
  refreshPresetList();

  var loadActRow = loadPanel.add('group');
  var btnLoadPreset = loadActRow.add('button', undefined, '↩  Charger');
  btnLoadPreset.preferredSize=[120,26];
  var btnDelPreset  = loadActRow.add('button', undefined, '✕  Supprimer');
  btnDelPreset.preferredSize=[-1,26];

  btnSavePreset.onClick = function() {
    var name = presetNameInp.text||'Préset';
    var data = {
      gridType: typeList.selection ? typeList.selection.index : 0,
      gridSize: sizeInp.text, gridSub: subInp.text, gridSW: swInp.text,
      gridMain: mainColInp.text, gridSec: secColInp.text,
      clearMargin: margInp.text, clearColor: clearColInp.text,
      logoMain: logoMainInp.text, logoHandles: logoHandlesInp.text
    };
    if (savePreset(name, data)) {
      refreshPresetList();
      showToast('Préset "'+name+'" sauvegardé.');
    } else {
      alert('Impossible de sauvegarder.');
    }
  };

  btnLoadPreset.onClick = function() {
    if (!presetList.selection) return;
    var name = presetList.selection.text;
    var p = loadPresets();
    var d = p[name];
    if (!d) return;
    if (d.gridType!==undefined) typeList.selection=d.gridType;
    if (d.gridSize) sizeInp.text=d.gridSize;
    if (d.gridSub)  subInp.text=d.gridSub;
    if (d.gridSW)   swInp.text=d.gridSW;
    if (d.gridMain) mainColInp.text=d.gridMain;
    if (d.gridSec)  secColInp.text=d.gridSec;
    if (d.clearMargin) margInp.text=d.clearMargin;
    if (d.clearColor)  clearColInp.text=d.clearColor;
    if (d.logoMain)    logoMainInp.text=d.logoMain;
    if (d.logoHandles) logoHandlesInp.text=d.logoHandles;
    showTab(0);
    showToast('Préset "'+name+'" chargé.');
  };

  btnDelPreset.onClick = function() {
    if (!presetList.selection) return;
    var name = presetList.selection.text;
    var p = loadPresets();
    delete p[name];
    try {
      var f = new File(PRESET_FILE);
      f.open('w'); f.write(objToJSON(p)); f.close();
    } catch(e) {}
    refreshPresetList();
    showToast('Préset "'+name+'" supprimé.');
  };

  // Export PDF
  var exportPanel = pPresets.add('panel', undefined, 'Export');
  exportPanel.orientation = 'row'; exportPanel.margins = 10; exportPanel.spacing = 6;
  var btnExportPDF = exportPanel.add('button', undefined, '↓  Exporter en PDF');
  btnExportPDF.preferredSize = [160,28];

  btnExportPDF.onClick = function() {
    exportPDF(doc);
  };

  // ── Toast (message de feedback) ──────────────────────────
  var feedbackTxt = win.add('statictext', undefined, ' ');
  feedbackTxt.alignment = 'center';
  feedbackTxt.graphics.foregroundColor = feedbackTxt.graphics.newPen(
    feedbackTxt.graphics.PenType.SOLID_COLOR, [0.3,0.7,0.5,1], 1);

  function showToast(msg) {
    feedbackTxt.text = '✓  ' + msg;
    app.redraw();
  }

  // ── Bouton fermer ────────────────────────────────────────
  win.add('panel').alignment = 'fill';
  var closeRow = win.add('group');
  closeRow.alignment = 'right';
  var btnClose = closeRow.add('button', undefined, 'Fermer', {name:'cancel'});
  btnClose.preferredSize = [90, 28];
  btnClose.onClick = function() { win.close(); };

  // ── Init ─────────────────────────────────────────────────
  showTab(0);
  win.center();
  win.show();
}

// ── Lancement ────────────────────────────────────────────────
showDialog();
