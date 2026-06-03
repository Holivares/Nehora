/**
 * CSInterface - Adobe CEP (Common Extensibility Platform)
 * Version minimale compatible Illustrator CC 2021-2026
 */

var SystemPath = {
  APPLICATION: 'application',
  EXTENSION: 'extension',
  DESKTOP: 'desktop',
  DOCUMENTS: 'documents',
  USER_DATA: 'userData',
  COMMON_FILES: 'commonFiles',
  MY_DOCUMENTS: 'myDocuments',
  HOST_APPLICATION: 'hostApplication'
};

var CSInterface = function() {
  this.getSystemPath = function(pathType) {
    return window.__adobe_cep__ ? JSON.parse(window.__adobe_cep__.getSystemPath(pathType)) : '';
  };
  this.evalScript = function(script, callback) {
    if (window.__adobe_cep__) {
      var callbackID = Math.random().toString(36).substr(2, 8);
      if (callback) {
        window['__cs_callback_' + callbackID] = function(result) {
          callback(result);
          delete window['__cs_callback_' + callbackID];
        };
        window.__adobe_cep__.evalScript(script, '__cs_callback_' + callbackID);
      } else {
        window.__adobe_cep__.evalScript(script, '');
      }
    } else {
      if (callback) callback('undefined');
    }
  };
  this.addEventListener = function(type, listener) {
    if (window.__adobe_cep__) window.__adobe_cep__.addEventListener(type, listener);
  };
  this.removeEventListener = function(type, listener) {
    if (window.__adobe_cep__) window.__adobe_cep__.removeEventListener(type, listener);
  };
  this.requestOpenExtension = function(extensionId, params) {
    if (window.__adobe_cep__) window.__adobe_cep__.requestOpenExtension(extensionId, params || '');
  };
  this.closeExtension = function() {
    if (window.__adobe_cep__) window.__adobe_cep__.closeExtension();
  };
  this.getHostEnvironment = function() {
    return window.__adobe_cep__ ? JSON.parse(window.__adobe_cep__.getHostEnvironment()) : {};
  };
};
