// Bridge CEP ↔ Illustrator via CSInterface
var csInterface = new CSInterface();

function evalScript(func, params, callback) {
  var call = params !== undefined
    ? func + '(' + JSON.stringify(JSON.stringify(params)) + ')'
    : func + '()';
  csInterface.evalScript(call, function(result) {
    if (callback) callback(result);
  });
}

// Charge le JSX au démarrage
function loadJSX() {
  var extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION);
  csInterface.evalScript('$.evalFile("' + extensionRoot + '/jsx/nehora.jsx")');
}

// ── Actions exposées au panneau ──────────────────────────────

window.nehoraAPI = {

  getDocInfo: function(cb) {
    csInterface.evalScript('getDocInfo()', function(r) {
      try { cb(JSON.parse(r)); } catch(e) { cb({ error: r }); }
    });
  },

  getSelection: function(cb) {
    csInterface.evalScript('getSelectionData()', function(r) {
      try { cb(JSON.parse(r)); } catch(e) { cb({ error: r }); }
    });
  },

  createGrid: function(params, cb) {
    var call = 'createGrid(' + "'" + JSON.stringify(params) + "'" + ')';
    csInterface.evalScript(call, function(r) { if(cb) cb(r); });
  },

  createClearspaceGuides: function(params, cb) {
    var call = 'createClearspaceGuides(' + "'" + JSON.stringify(params) + "'" + ')';
    csInterface.evalScript(call, function(r) { if(cb) cb(r); });
  },

  clearLayers: function(cb) {
    csInterface.evalScript('clearNehoraLayers()', function(r) { if(cb) cb(r); });
  },

  decomposeSelection: function(cb) {
    csInterface.evalScript('decomposeSelection()', function(r) {
      try { cb(JSON.parse(r)); } catch(e) { cb({ error: r }); }
    });
  }
};

// Écoute les changements de sélection Illustrator
csInterface.addEventListener('documentAfterActivate', function() {
  if (window.onDocumentChange) window.onDocumentChange();
});
