/* ===== Hidden admin / system settings ===== */
(function () {
  const { el, $, toast, downloadText, confirmDialog, iconHTML, fileIcon } = U;
  const t = (k) => I18N.t(k);
  const go = (r, p) => App.go(r, p);

  const EP = [
    ['pdf', 'method_pdf', 'pdf'],
    ['word', 'method_word', 'docx'],
    ['excel', 'method_excel', 'xlsx'],
  ];

  Screens.admin = function (main) {
    main.appendChild(App.backBar('home', t('admin_title')));
    main.appendChild(el('div', { class: 'banner warn', html: iconHTML('lock', 18) + t('admin_warn') }));

    const s = Store.get();

    // ---- Identity verification service URL ----
    const idInput = el('input', {
      class: 'inp', type: 'url', dir: 'ltr',
      placeholder: t('admin_id_url_ph'), value: s.settings.idUrl || ''
    });
    main.appendChild(card([
      el('label', { class: 'lbl', text: t('admin_id_url') }),
      idInput
    ]));

    // ---- Signing endpoints (one card per method) ----
    main.appendChild(el('h3', { class: 'sec-title', text: t('admin_endpoints') }));
    const epInputs = {};
    const DEFAULTS = Store.defaults().endpoints || {};
    EP.forEach(([key, label, ic]) => {
      const ep = s.settings.endpoints[key] || { url: '', body: '' };
      const url = el('input', { class: 'inp', type: 'url', dir: 'ltr', placeholder: 'https://…/api/Sign/…', value: ep.url || '' });
      const body = el('textarea', { class: 'inp mono', rows: 8, dir: 'ltr', spellcheck: 'false', text: ep.body || '' });
      epInputs[key] = { url, body };

      const validity = el('span', { class: 'pill', style: { fontSize: '10.5px' } });
      function checkJson() {
        const raw = (body.value || '').replace(/\{\{[A-Z_]+\}\}/g, '0'); // placeholders are valid stand-ins
        let ok = true; try { JSON.parse(raw); } catch (e) { ok = false; }
        validity.className = 'pill ' + (ok ? 'signed' : 'pending');
        validity.innerHTML = iconHTML(ok ? 'check' : 'alert', 12) + (ok ? t('json_ok') : t('json_bad'));
      }
      body.addEventListener('input', checkJson);
      checkJson();

      const restore = el('button', {
        class: 'btn subtle sm', style: { marginTop: '8px' }, html: iconHTML('refresh', 16) + t('admin_restore'),
        onclick: () => { body.value = (DEFAULTS[key] && DEFAULTS[key].body) || ''; checkJson(); }
      });

      main.appendChild(card([
        el('div', { class: 'ep-head' }, [el('span', { class: 'ic' }, [fileIcon(ic, 26)]), el('b', { text: t(label) })]),
        el('label', { class: 'lbl', text: t('admin_url') }), url,
        el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' } }, [
          el('label', { class: 'lbl', style: { margin: 0 }, text: t('admin_body') }), validity
        ]),
        body,
        restore,
        el('p', { class: 'small muted', style: { marginTop: '8px' }, html: t('admin_body_hint') })
      ]));
    });

    // ---- Save ----
    main.appendChild(el('button', {
      class: 'btn primary', html: iconHTML('save', 19) + t('save'),
      onclick: () => {
        Store.update(st => {
          st.settings.idUrl = idInput.value.trim();
          EP.forEach(([key]) => {
            st.settings.endpoints[key] = {
              url: epInputs[key].url.value.trim(),
              body: epInputs[key].body.value
            };
          });
        });
        toast(t('admin_saved'));
      }
    }));

    // ---- Contacts import (xlsx) ----
    main.appendChild(el('h3', { class: 'sec-title', text: t('admin_contacts_import') }));
    const contactsIn = el('input', { type: 'file', accept: '.xlsx,.xls,.csv', style: { display: 'none' } });
    contactsIn.addEventListener('change', () => importContacts(contactsIn.files[0]));
    main.appendChild(card([
      el('button', { class: 'btn subtle', html: iconHTML('contacts', 18) + t('admin_contacts_import'), onclick: () => contactsIn.click() }),
      contactsIn,
      el('p', { class: 'small muted', text: 'name · email · phone' })
    ]));

    // ---- Export / Import settings JSON ----
    main.appendChild(el('h3', { class: 'sec-title', text: t('settings') }));
    const importIn = el('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
    importIn.addEventListener('change', () => importJson(importIn.files[0]));
    main.appendChild(card([
      el('button', {
        class: 'btn subtle', style: { marginBottom: '10px' }, html: iconHTML('download', 18) + t('admin_export'),
        onclick: () => downloadText(Store.exportSettings(), 'digital-trust-settings.json')
      }),
      el('button', { class: 'btn subtle', html: iconHTML('upload', 18) + t('admin_import'), onclick: () => importIn.click() }),
      importIn
    ]));

    // ---- Danger zone: clear all data ----
    main.appendChild(el('div', { class: 'danger-zone' }, [
      el('button', {
        class: 'btn danger', html: iconHTML('trash', 19) + t('admin_clear'),
        onclick: () => confirmDialog(t('admin_clear_q'), () => {
          Store.clearAll();
          toast(t('admin_cleared'));
          I18N.set(I18N.get()); // keep language
          go('welcome');
        }, { danger: true, yesText: t('admin_clear') })
      })
    ]));

    main.appendChild(el('p', { class: 'center small muted', style: { marginTop: '18px' }, text: t('app_name') + ' · ' + t('version') + ' ' + window.APP_VERSION }));
  };

  function card(children) { return el('div', { class: 'card form' }, children); }

  // Parse an uploaded contacts spreadsheet via SheetJS (loaded from CDN at runtime).
  async function importContacts(file) {
    if (!file) return;
    if (!window.XLSX) { toast(t('admin_import_bad')); return; }
    try {
      const buf = await U.fileToArrayBuffer(file);
      const wb = XLSX.read(buf, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      let added = 0;
      Store.update(st => {
        rows.forEach(r => {
          // tolerant header matching (he/en)
          const name = pick(r, ['name', 'Name', 'שם', 'fullname', 'Full Name']);
          const email = pick(r, ['email', 'Email', 'מייל', 'אימייל', 'דוא"ל', 'e-mail']);
          const phone = pick(r, ['phone', 'Phone', 'טלפון', 'מספר', 'mobile', 'נייד']);
          if (!name && !email && !phone) return;
          const exists = st.contacts.some(c => (email && c.email === email) || (phone && c.phone === phone));
          if (exists) return;
          st.contacts.push({ id: U.uid(), name: String(name || email || phone), email: String(email || ''), phone: String(phone || '') });
          added++;
        });
      });
      toast(t('admin_contacts_imported') + ' (' + added + ')');
    } catch (e) {
      console.error(e);
      toast(t('admin_import_bad'));
    }
  }
  function pick(row, keys) {
    for (const k of keys) if (row[k] != null && String(row[k]).trim() !== '') return String(row[k]).trim();
    return '';
  }

  async function importJson(file) {
    if (!file) return;
    try {
      const text = await file.text();
      Store.importSettings(text);
      toast(t('admin_imported'));
      App.render();
    } catch (e) {
      toast(t('admin_import_bad'));
    }
  }
})();
