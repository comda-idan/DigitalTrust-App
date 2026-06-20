/* ===== Option 1: Upload & digitally sign ===== */
(function () {
  const { el, $, toast, sheet, detectType, fileToBase64, downloadBase64, MIME, iconHTML, fileIcon } = U;
  const t = (k) => I18N.t(k);
  const go = (r, p) => App.go(r, p);

  const epKey = (type) => type === 'docx' ? 'word' : type === 'xlsx' ? 'excel' : 'pdf';

  Screens.sign = function (main) {
    main.appendChild(App.backBar('home', t('su_title')));

    let picked = null;
    const drop = el('div', { class: 'card tap center', style: { padding: '30px 18px', border: '1.5px dashed var(--line-2)' } }, [
      el('div', { style: { width: '64px', height: '64px', borderRadius: '18px', background: 'var(--brand-50)', color: 'var(--brand)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }, html: iconHTML('upload', 30) }),
      el('h3', { text: t('su_drop') }),
      el('p', { class: 'small muted', text: t('su_types') })
    ]);
    const fileIn = el('input', { type: 'file', accept: '.pdf,.docx,.xlsx', style: { display: 'none' } });
    drop.addEventListener('click', () => fileIn.click());
    main.appendChild(drop);
    main.appendChild(fileIn);

    const info = el('div', {});
    main.appendChild(info);

    fileIn.addEventListener('change', async () => {
      const f = fileIn.files[0]; if (!f) return;
      const type = await detectType(f);
      if (!type) { info.innerHTML = ''; info.appendChild(el('div', { class: 'banner err', html: iconHTML('alert') + t('su_bad_type') })); picked = null; return; }
      const base64 = await fileToBase64(f);
      picked = { file: f, type, base64 };
      renderPicked();
    });

    function renderPicked() {
      info.innerHTML = '';
      info.appendChild(el('div', { class: 'filebar' }, [
        fileIcon(picked.type, 40),
        el('div', { class: 'main' }, [
          el('div', { class: 't', text: picked.file.name }),
          el('div', { class: 'sub', text: t('su_detected') + ': ' + picked.type.toUpperCase() + ' · ' + Math.ceil(picked.file.size / 1024) + ' KB' })
        ]),
        el('span', { class: 'pill signed', html: iconHTML('check', 12) + picked.type.toUpperCase() })
      ]));
      info.appendChild(el('button', { class: 'btn primary', style: { marginTop: '4px' }, html: iconHTML('signature', 19) + t('su_sign'), onclick: () => authThenSign(picked) }));
    }
  };

  // ---- auth (passkey assertion or pin fallback) then sign ----
  function authThenSign(picked) {
    const s = Store.get();
    const hasPk = s.passkey && s.passkey.credId && window.PublicKeyCredential;
    const body = el('div', { class: 'center' }, [
      el('div', { class: 'auth-head' }, [
        el('div', { class: 'glyph', html: iconHTML(hasPk ? 'fingerprint' : 'keypad', 30) }),
        el('h3', { text: t('su_auth_title') })
      ])
    ]);

    if (hasPk) {
      body.appendChild(el('button', {
        class: 'btn primary', html: iconHTML('fingerprint', 19) + t('su_auth_pk'),
        onclick: async () => {
          try {
            await window.verifyPasskey();
            close(); doSign(picked, s.pin);
          } catch (e) { toast(t('pk_fail')); }
        }
      }));
      body.appendChild(el('div', { class: 'or', text: t('su_auth_fallback') }));
    }
    let pin = '';
    const dots = el('div', { class: 'pin' }); for (let i = 0; i < 6; i++) dots.appendChild(el('div', { class: 'dot' }));
    const err = el('span', { class: 'err-txt center', style: { display: 'none' } });
    body.appendChild(dots); body.appendChild(err);
    body.appendChild(window.PinKeypad((d) => { if (pin.length < 6) { pin += d; up(); } }, () => { pin = pin.slice(0, -1); up(); }));
    const close = sheet(body);
    function up() {
      Array.from(dots.children).forEach((c, i) => c.classList.toggle('on', i < pin.length));
      err.style.display = 'none';
      if (pin.length === 6) {
        if (pin === s.pin) { close(); doSign(picked, pin); }
        else { err.textContent = t('su_pin_wrong'); err.style.display = 'block'; pin = ''; setTimeout(() => Array.from(dots.children).forEach(c => c.classList.remove('on')), 150); }
      }
    }
  }

  // Known ResCode values from the Signer1 API reference (partial table 0–7;
  // other codes are shown verbatim with a pointer to the API error-code table).
  const RESCODE = {
    0: ['SUCCESS', 'Operation succeeded'],
    1: ['ALGORITHM_NOT_SUPPORTED', 'Hashing algorithm not supported'],
    2: ['CANNOT_LOAD_MODULE', 'Failed to load HSM driver'],
    3: ['FAILED_TO_OPEN_SESSION', 'HSM session opening failed'],
    5: ['GENERAL_ERROR', 'Unspecified server error'],
    6: ['INPUT_ERROR', 'Invalid parameters or corrupted file'],
    7: ['PARAM_ERROR', 'Required parameter is missing'],
  };

  async function doSign(picked, pin) {
    const overlay = el('div', { class: 'center' }, [el('div', { class: 'loading-full' }, [el('span', { class: 'spin dark' }), el('p', { text: t('su_calling') })])]);
    const close = sheet(overlay, { center: true, locked: true });
    let result;
    try { result = await callSigningService(picked, pin); }
    catch (e) { result = { ok: false, networkError: String(e.message || e) }; }
    close();

    if (result.nourl) { showNoUrl(picked, pin); return; }
    if (result.ok) { saveSigned(picked, result.signed); showSuccess(picked, result.signed); return; }
    showFailure(result);
  }

  function firstDefined(obj, keys) { for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k]; return null; }

  async function callSigningService(picked, pin) {
    const ep = Store.get().settings.endpoints[epKey(picked.type)];
    const url = ep && ep.url ? ep.url.trim() : '';
    if (!url) return { nourl: true };
    const tmpl = ep.body == null ? '' : String(ep.body);
    const body = tmpl
      .replace(/\{\{FILE_BASE64\}\}/g, picked.base64)
      .replace(/\{\{PINCODE\}\}/g, pin || '')
      .replace(/\{\{FILENAME\}\}/g, picked.file.name);

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const text = await res.text();

    let data = null; try { data = JSON.parse(text); } catch (e) { /* non-JSON */ }
    // .NET / WCF (.svc) endpoints commonly wrap the payload in a { "d": ... } envelope
    let payload = data;
    if (payload && typeof payload.d !== 'undefined') {
      try { payload = typeof payload.d === 'string' ? JSON.parse(payload.d) : payload.d; } catch (e) { payload = payload.d; }
    }
    payload = payload || {};

    const signed = firstDefined(payload, ['SignedBytes', 'signedBytes', 'SignedFile', 'Output', 'output', 'SignedData', 'Data']);
    const code = firstDefined(payload, ['Result', 'result', 'ResCode', 'resCode', 'rescode', 'ResultCode', 'resultCode', 'Code', 'code', 'Status', 'status', 'ErrorCode', 'errorCode']);
    const message = firstDefined(payload, ['ResultMessage', 'Message', 'message', 'Error', 'error', 'ErrorMessage', 'errorMessage', 'Description', 'description', 'ResultDescription', 'Detail', 'detail', 'Reason']);
    const isSuccess = code === 0 || code === '0' || /^success$/i.test(String(code)) || (signed && code == null);

    if (signed && isSuccess) return { ok: true, signed };
    return { ok: false, httpStatus: res.status, httpOk: res.ok, code, message, raw: text, url, hasSigned: !!signed };
  }

  function showFailure(result) {
    const rows = [];
    rows.push(el('div', { class: 'auth-head accent' }, [el('div', { class: 'glyph', html: iconHTML('x-circle', 30) }), el('h3', { text: t('su_failed') })]));

    if (result.networkError) {
      rows.push(el('div', { class: 'banner err', html: iconHTML('alert') + String(result.networkError) }));
    } else {
      const codeStr = result.code == null ? '—' : String(result.code);
      const numeric = /^\d+$/.test(codeStr) ? Number(codeStr) : null;
      const known = numeric != null ? RESCODE[numeric] : null;
      rows.push(detailBlock(t('su_code'), el('span', { class: 'mono', style: { fontSize: '17px', fontWeight: '700', color: 'var(--accent)' }, text: codeStr })));
      if (known) rows.push(el('p', { style: { margin: '-6px 0 12px', fontWeight: '700' }, text: known[0] + ' — ' + known[1] }));
      if (result.message) rows.push(detailBlock(t('su_server_msg'), el('span', { text: String(result.message) })));
      if (!result.httpOk) rows.push(detailBlock(t('su_http'), el('span', { class: 'mono', text: String(result.httpStatus) })));
      if (result.raw) {
        rows.push(el('details', { class: 'card', style: { textAlign: 'start', marginTop: '6px' } }, [
          el('summary', { html: iconHTML('info', 18) + t('su_raw') }),
          el('pre', { class: 'mono', style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '11.5px', maxHeight: '180px', overflow: 'auto', margin: '10px 0 0', color: 'var(--ink-2)' }, text: String(result.raw).slice(0, 4000) })
        ]));
      }
    }
    rows.push(el('div', { class: 'btn-row', style: { marginTop: '14px' } }, [
      el('button', { class: 'btn subtle', text: t('close'), onclick: () => $('.scrim')?.remove() }),
      el('button', { class: 'btn ghost', html: iconHTML('settings', 18) + t('settings'), onclick: () => { $('.scrim')?.remove(); go('admin'); } })
    ]));
    sheet(el('div', {}, rows), { center: true });
  }
  function detailBlock(label, valueNode) {
    return el('div', { style: { textAlign: 'start', marginBottom: '12px' } }, [
      el('div', { class: 'lbl', style: { marginBottom: '3px' }, text: label }),
      valueNode
    ]);
  }

  function showNoUrl(picked, pin) {
    sheet(el('div', { class: 'center' }, [
      el('div', { class: 'banner warn', style: { textAlign: 'start' }, html: iconHTML('alert') + '<b>' + t('su_no_url') + '</b><br>' + t('su_no_url_d') }),
      el('button', { class: 'btn primary', style: { marginBottom: '10px' }, html: iconHTML('settings', 18) + t('settings'), onclick: () => { $('.scrim')?.remove(); go('admin'); } }),
      el('button', {
        class: 'btn ghost', text: t('su_demo_sign'), onclick: () => {
          $('.scrim')?.remove();
          saveSigned(picked, picked.base64);
          showSuccess(picked, picked.base64);
        }
      })
    ]), { center: true });
  }

  function saveSigned(picked, b64) {
    Store.update(st => { st.signedDocs.unshift({ id: U.uid(), name: 'signed_' + picked.file.name, type: picked.type, date: Date.now(), b64 }); });
  }
  function showSuccess(picked, b64) {
    const name = 'signed_' + picked.file.name;
    sheet(el('div', { class: 'center' }, [
      el('div', { class: 'auth-head' }, [el('div', { class: 'glyph', style: { background: 'var(--ok-bg)', color: 'var(--ok)' }, html: iconHTML('check-circle', 32) }), el('h3', { text: t('su_success') })]),
      el('p', { class: 'small muted', text: name }),
      el('button', { class: 'btn primary', style: { marginTop: '14px' }, html: iconHTML('download', 19) + t('su_dl_signed'), onclick: () => downloadBase64(b64, name, MIME[picked.type]) }),
      el('button', { class: 'btn ghost', style: { marginTop: '10px' }, html: iconHTML('share', 18) + t('share'), onclick: () => shareDoc(b64, name, picked.type) }),
      el('button', { class: 'btn link', style: { display: 'block', margin: '8px auto 0' }, text: t('tab_signed'), onclick: () => { $('.scrim')?.remove(); go('signed'); } })
    ]), { center: true });
  }

  async function shareDoc(b64, name, type) {
    const r = await U.shareFile(b64, name, MIME[type], { title: name });
    if (r === 'unsupported') toast(t('share_unsupported'));
  }

  // ---- Signed documents list (last 30 days) ----
  Screens.signed = function (main) {
    main.appendChild(el('div', { class: 'ptitle' }, [el('h1', { text: t('signed_title') }), el('p', { text: t('signed_sub') })]));
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const docs = (Store.get().signedDocs || []).filter(d => d.date >= cutoff);
    if (!docs.length) { main.appendChild(emptyState('signature', t('signed_empty'))); return; }
    const list = el('div', { class: 'card' });
    docs.forEach(d => {
      list.appendChild(el('div', { class: 'row' }, [
        el('div', { class: 'ic file' }, [U.fileIcon(d.type, 38)]),
        el('div', { class: 'main' }, [el('div', { class: 't', text: d.name }), el('div', { class: 'sub', text: U.fmtDate(d.date) })]),
        el('div', { class: 'actions' }, [
          el('button', { class: 'icon-btn', html: iconHTML('share', 18), title: t('share'), onclick: () => shareDoc(d.b64, d.name, d.type) }),
          el('button', { class: 'icon-btn', html: iconHTML('download', 18), title: t('download'), onclick: () => downloadBase64(d.b64, d.name, MIME[d.type]) })
        ])
      ]));
    });
    main.appendChild(list);
  };

  function emptyState(ic, msg) {
    return el('div', { class: 'empty' }, [el('div', { class: 'big', html: iconHTML(ic, 34) }), el('p', { text: msg })]);
  }
  window.emptyState = emptyState;
})();
