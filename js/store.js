/* ===== Store: state, config, persistence ===== */
window.APP_VERSION = '1.0.0';

window.Store = (function () {
  const KEY = 'dt_state_v1';

  // Default admin settings — pre-filled from the Signer1 API (SignPDF_PIN / SignWord_PIN / SignExcel_PIN).
  // {{FILE_BASE64}}, {{PINCODE}}, {{FILENAME}} are injected automatically at sign time.
  function defaultSettings() {
    return {
      idUrl: '', // identity verification service (redirect). Empty => treated as unavailable.
      endpoints: {
        pdf: {
          url: '',
          body: JSON.stringify({
            CertID: 'Signer-01',
            Pincode: '{{PINCODE}}',
            InputFile: '{{FILE_BASE64}}',
            Page: -1, Left: 100, Top: 700, Width: 200, Height: 50,
            Image: null, Token: null, TransactionID: null
          }, null, 2)
        },
        word: {
          url: '',
          body: JSON.stringify({
            CertID: 'Signer-01',
            InputFile: '{{FILE_BASE64}}',
            Pincode: '{{PINCODE}}',
            Name: '{{FILENAME}}',
            Token: null, TransactionID: null
          }, null, 2)
        },
        excel: {
          url: '',
          body: JSON.stringify({
            CertID: 'Signer-01',
            InputFile: '{{FILE_BASE64}}',
            Pincode: '{{PINCODE}}',
            Name: '{{FILENAME}}',
            Token: null, TransactionID: null
          }, null, 2)
        }
      }
    };
  }

  function fresh() {
    return {
      version: window.APP_VERSION,
      user: null,            // {email, name}
      registered: false,
      pin: null,
      passkey: null,         // {credId}
      identityVerified: false,
      loggedIn: false,
      signedDocs: [],        // option 1 outputs
      sentDocs: [],          // option 2 outputs
      contacts: [],
      settings: defaultSettings()
    };
  }

  let state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : fresh();
  } catch (e) { state = fresh(); }
  // keep version current, merge any newly added settings keys
  state.version = window.APP_VERSION;
  if (!state.settings) state.settings = defaultSettings();
  if (!state.settings.endpoints) state.settings.endpoints = defaultSettings().endpoints;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('save failed', e); }
  }
  function get() { return state; }
  function set(patch) { Object.assign(state, patch); save(); }
  function update(fn) { fn(state); save(); }

  function clearAll() {
    localStorage.removeItem(KEY);
    state = fresh();
    save();
  }

  // export/import only the admin settings
  function exportSettings() {
    return JSON.stringify({ app: 'DigitalTrustApp', version: window.APP_VERSION, settings: state.settings, contacts: state.contacts }, null, 2);
  }
  function importSettings(jsonText) {
    const obj = JSON.parse(jsonText);
    if (!obj || !obj.settings) throw new Error('bad');
    state.settings = obj.settings;
    if (Array.isArray(obj.contacts)) state.contacts = obj.contacts;
    save();
  }

  function defaults() { return defaultSettings(); }

  return { get, set, update, save, clearAll, exportSettings, importSettings, defaults };
})();
