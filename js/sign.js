/* ===== Option 1: Upload & digitally sign ===== */
(function () {
  const { el, $, toast, sheet, detectType, fileToBase64, downloadBase64, MIME } = U;
  const t = (k) => I18N.t(k);
  const go = (r, p) => App.go(r, p);

  const epKey = (type) => type === 'docx' ? 'word' : type === 'xlsx' ? 'excel' : 'pdf';

  Screens.sign = function (main) {
    main.appendChild(App.backBar('home', t('su_title')));

    let picked = null; // {file, type, base64}
    const drop = el('div', { class: 'card center', style: { padding: '30px 16px', cursor: 'pointer', border: '1.5px dashed var(--line)' } }, [
      el('div', { html: '📄', style: { fontSize: '46px' } }),
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
      if (!type) { info.innerHTML = ''; info.appendChild(el('div', { class: 'banner err', html: '⚠️ ' + t('su_bad_type') })); picked = null; return; }
      const base64 = await fileToBase64(f);
      picked = { file: f, type, base64 };
      renderPicked();
    });

    function renderPicked() {
      info.innerHTML = '';
      const icon = picked.type === 'pdf' ? '📕' : picked.type === 'docx' ? '📘' : '📗';
      info.appendChild(el('div', { class: 'card row', style: { display: 'flex' } }, [
        el('div', { class: 'ic', html: icon }),
        el('div', { class: 'main' }, [
          el('div', { class: 't', text: picked.file.name }),
          el('div', { class: 'sub', text: t('su_detected') + ': ' + picked.type.toUpperCase() + ' · ' + Math.ceil(picked.file.size / 1024) + ' KB' })
        ]),
        el('span', { class: 'pill signed', text: '✓ ' + picked.type.toUpperCase() })
      ]));
      info.appendChild(el('button', { class: 'btn primary', style: { marginTop: '6px' }, html: '🔏 ' + t('su_sign'), onclick: () => authThenSign(picked) }));
    }
  };

  // ---- auth (passkey or pin fallback) then sign ----
  function authThenSign(picked) {
    const s = Store.get();
    const hasPk = s.passkey && window.PublicKeyCredential;
    const body = el('div', {}, [el('h3', { text: t('su_auth_title'), style: { marginBottom: '12px' } })]);

    if (hasPk) {
      body.appendChild(el('button', {
        class: 'btn primary', html: '👆 ' + t('su_auth_pk'),
        onclick: async () => {
          try {
            await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), userVerification: 'required', timeout: 60000 } });
            close(); doSign(picked, s.pin);
          } catch (e) { toast(t('pk_fail')); }
        }
      }));
      body.appendChild(el('div', { class: 'or', text: 'or' }));
    }
    body.appendChild(el('p', { class: 'center small muted', text: t('su_auth_fallback') }));
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
    if (result.ok) {
      saveSigned(picked, result.signed);
      showSuccess(picked, result.signed);
    } else {
      sheet(el('div', { class: 'center' }, [
        el('div', { html: '❌', style: { fontSize: '44px' } }),
        el('h3', { text: t('su_failed') }),
        el('p', { class: 'small muted', style: { wordBreak: 'break-word' }, text: result.error || '' }),
        el('button', { class: 'btn subtle', style: { marginTop: '10px' }, text: t('close'), onclick: () => $('.scrim')?.remove() })
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

  // demo fallback when admin URL not set: let user still show the result UX
  function showNoUrl(picked, pin) {
    sheet(el('div', { class: 'center' }, [
      el('div', { class: 'banner warn', html: '⚠️ ' + t('su_no_url') }),
      el('button', { class: 'btn subtle', style: { marginBottom: '10px' }, html: '⚙️ ' + t('settings'), onclick: () => { $('.scrim')?.remove(); go('admin'); } }),
      el('button', {
        class: 'btn ghost', text: 'Demo sign (no server)', onclick: () => {
          $('.scrim')?.remove();
          saveSigned(picked, picked.base64); // demo: original bytes as "signed"
          showSuccess(picked, picked.base64);
        }
      })
    ]), { center: true });
  }

  function saveSigned(picked, b64) {
    Store.update(st => {
      st.signedDocs.unshift({ id: U.uid(), name: 'signed_' + picked.file.name, type: picked.type, date: Date.now(), b64 });
    });
  }
  function showSuccess(picked, b64) {
    const name = 'signed_' + picked.file.name;
    sheet(el('div', { class: 'center' }, [
      el('div', { html: '✅', style: { fontSize: '54px' } }),
      el('h3', { text: t('su_success') }),
      el('p', { class: 'small muted', text: name }),
      el('button', { class: 'btn primary', style: { marginTop: '12px' }, html: '⬇️ ' + t('su_dl_signed'), onclick: () => downloadBase64(b64, name, MIME[picked.type]) }),
      el('button', { class: 'btn link', style: { display: 'block', margin: '10px auto 0' }, text: t('tab_signed'), onclick: () => { $('.scrim')?.remove(); go('signed'); } })
    ]), { center: true });
  }

  // ---- Signed documents list (last 30 days) ----
  Screens.signed = function (main) {
    main.appendChild(el('div', { style: { marginBottom: '8px' } }, [
      el('h1', { text: t('signed_title') }), el('p', { class: 'lead', style: { margin: 0 }, text: t('signed_sub') })
    ]));
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const docs = (Store.get().signedDocs || []).filter(d => d.date >= cutoff);
    if (!docs.length) { main.appendChild(emptyState('✅', t('signed_empty'))); return; }
    const list = el('div', { class: 'card' });
    docs.forEach(d => {
      const icon = d.type === 'pdf' ? '📕' : d.type === 'docx' ? '📘' : '📗';
      list.appendChild(el('div', { class: 'row' }, [
        el('div', { class: 'ic', html: icon }),
        el('div', { class: 'main' }, [el('div', { class: 't', text: d.name }), el('div', { class: 'sub', text: U.fmtDate(d.date) })]),
        el('div', { class: 'actions' }, [
          el('button', { class: 'icon-btn', html: '⬇️', title: t('download'), onclick: () => downloadBase64(d.b64, d.name, MIME[d.type]) })
        ])
      ]));
    });
    main.appendChild(list);
  };
  function emptyState(ic, msg) {
    return el('div', { class: 'empty' }, [el('div', { class: 'big', html: ic }), el('p', { text: msg })]);
  }
  window.emptyState = emptyState;
})();
