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

  async function doSign(picked, pin) {
    const overlay = el('div', { class: 'center' }, [el('div', { class: 'loading-full' }, [el('span', { class: 'spin dark' }), el('p', { text: t('su_calling') })])]);
    const close = sheet(overlay, { center: true, locked: true });
    let result;
    try { result = await callSigningService(picked, pin); }
    catch (e) { result = { ok: false, error: String(e.message || e) }; }
    close();

    if (result.nourl) { showNoUrl(picked, pin); return; }
    if (result.ok) { saveSigned(picked, result.signed); showSuccess(picked, result.signed); }
    else {
      sheet(el('div', { class: 'center' }, [
        el('div', { class: 'auth-head accent' }, [el('div', { class: 'glyph', html: iconHTML('x-circle', 30) }), el('h3', { text: t('su_failed') })]),
        el('p', { class: 'small muted', style: { wordBreak: 'break-word' }, text: result.error || '' }),
        el('button', { class: 'btn subtle', style: { marginTop: '12px' }, text: t('close'), onclick: () => $('.scrim')?.remove() })
      ]), { center: true });
    }
  }

  async function callSigningService(picked, pin) {
    const ep = Store.get().settings.endpoints[epKey(picked.type)];
    if (!ep || !ep.url || !ep.url.trim()) return { nourl: true };
    let body = ep.body
      .replace(/\{\{FILE_BASE64\}\}/g, picked.base64)
      .replace(/\{\{PINCODE\}\}/g, pin || '')
      .replace(/\{\{FILENAME\}\}/g, picked.file.name);
    const res = await fetch(ep.url.trim(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch (e) { data = {}; }
    const signed = data.SignedBytes || data.signedBytes || data.SignedFile || data.Output || data.output;
    const code = (data.Result != null) ? data.Result : (data.result != null ? data.result : (data.ResultCode != null ? data.ResultCode : null));
    if (signed && (code === 0 || code === '0' || code === 'SUCCESS' || code == null)) return { ok: true, signed };
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status + ' — ' + text.slice(0, 200) };
    return { ok: false, error: 'ResCode: ' + code + (signed ? '' : ' (no SignedBytes in response)') };
  }

  function showNoUrl(picked, pin) {
    sheet(el('div', { class: 'center' }, [
      el('div', { class: 'banner warn', html: iconHTML('alert') + t('su_no_url') }),
      el('button', { class: 'btn subtle', style: { marginBottom: '10px' }, html: iconHTML('settings', 18) + t('settings'), onclick: () => { $('.scrim')?.remove(); go('admin'); } }),
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
      el('button', { class: 'btn link', style: { display: 'block', margin: '8px auto 0' }, text: t('tab_signed'), onclick: () => { $('.scrim')?.remove(); go('signed'); } })
    ]), { center: true });
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
        el('div', { class: 'actions' }, [el('button', { class: 'icon-btn', html: iconHTML('download', 18), title: t('download'), onclick: () => downloadBase64(d.b64, d.name, MIME[d.type]) })])
      ]));
    });
    main.appendChild(list);
  };

  function emptyState(ic, msg) {
    return el('div', { class: 'empty' }, [el('div', { class: 'big', html: iconHTML(ic, 34) }), el('p', { text: msg })]);
  }
  window.emptyState = emptyState;
})();
