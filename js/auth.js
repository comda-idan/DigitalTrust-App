/* ===== Registration & auth flow ===== */
(function () {
  const { el, $, toast, sheet, confirmDialog, validEmail, pinError, genOtp, iconHTML } = U;
  const t = (k) => I18N.t(k);
  const go = (r, p) => App.go(r, p);

  window.Reg = window.Reg || {};

  // segmented progress rail + step counter
  function steps(cur, total) {
    const pad = (n) => String(n).padStart(2, '0');
    const wrap = el('div', { style: { marginBottom: '20px' } });
    wrap.appendChild(el('div', { class: 'step-meta', text: pad(cur + 1) + ' / ' + pad(total) }));
    const rail = el('div', { class: 'steps', style: { margin: 0 } });
    for (let i = 0; i < total; i++) rail.appendChild(el('div', { class: 'seg ' + (i < cur ? 'done' : i === cur ? 'cur' : '') }));
    wrap.appendChild(rail);
    return wrap;
  }

  function sealNode(iconName, accent) {
    const seal = el('div', { class: 'seal' });
    const rings = el('span', { class: 'rings' });
    rings.innerHTML = '<svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1"><circle cx="50" cy="50" r="47"/><circle cx="50" cy="50" r="40" stroke-dasharray="2 3"/><circle cx="50" cy="50" r="33"/></svg>';
    seal.appendChild(rings);
    seal.appendChild(el('div', { class: 'shield', style: accent ? { background: 'linear-gradient(135deg,#ED1C24,#C71019)' } : null, html: iconHTML(iconName, 42) }));
    return seal;
  }

  // ---------- Welcome ----------
  Screens.welcome = function (main) {
    main.appendChild(el('div', { class: 'hero' }, [
      el('div', { class: 'eyebrow', text: 'COMDA · Digital Trust' }),
      sealNode('shield-check'),
      el('h1', { text: t('welcome_title') }),
      el('p', { class: 'lead', text: t('welcome_sub') })
    ]));

    main.appendChild(el('div', { class: 'trust-points' }, [
      tp('signature', t('opt_sign_title')),
      tp('id-card', t('id_title')),
      tp('fingerprint', t('pk_title')),
    ]));

    main.appendChild(el('button', { class: 'btn primary', style: { marginBottom: '12px' }, html: iconHTML('arrow-up-right', 19) + t('register'), onclick: () => { Reg = { mode: 'register' }; go('login', { m: 'register' }); } }));
    main.appendChild(el('button', { class: 'btn ghost', text: t('login'), onclick: () => go('login', { m: 'login' }) }));
    main.appendChild(el('div', { class: 'foot', text: 'v' + APP_VERSION }));
  };
  function tp(ic, label) {
    return el('div', { class: 'tp' }, [el('div', { class: 'b', html: iconHTML(ic, 20) }), el('span', { text: label })]);
  }

  // ---------- Register / Login ----------
  Screens.login = function (main, params) {
    const s = Store.get();
    if (s.registered && params.m !== 'register') return loginReturning(main);

    let mode = params.m === 'login' ? 'login' : 'register';
    const isReg = mode === 'register';
    main.appendChild(steps(0, 6));
    main.appendChild(el('h1', { text: isReg ? t('create_account') : t('login') }));
    main.appendChild(el('p', { class: 'lead', text: t('welcome_sub') }));

    const emailIn = el('input', { type: 'email', placeholder: t('email_ph'), value: Reg.email || '', autocomplete: 'email', inputmode: 'email', dir: 'ltr' });
    const pwIn = el('input', { type: 'password', placeholder: '••••••••', autocomplete: isReg ? 'new-password' : 'current-password', dir: 'ltr' });
    const errBox = el('span', { class: 'err-txt', style: { display: 'none' } });

    main.appendChild(el('label', { class: 'field' }, [el('span', { text: t('email') }), emailIn]));
    main.appendChild(el('label', { class: 'field' }, [el('span', { text: t('password') }), pwIn]));
    main.appendChild(errBox);

    main.appendChild(el('button', {
      class: 'btn primary', style: { marginTop: '6px' }, text: isReg ? t('register') : t('login'),
      onclick: () => {
        errBox.style.display = 'none';
        if (!validEmail(emailIn.value)) { errBox.textContent = t('invalid_email'); errBox.style.display = 'block'; return; }
        if ((pwIn.value || '').length < 6) { errBox.textContent = t('pw_short'); errBox.style.display = 'block'; return; }
        Reg = { mode, email: emailIn.value.trim(), pw: pwIn.value, flow: 'register' };
        startOtp();
      }
    }));

    main.appendChild(el('div', { class: 'or', text: t('or') }));
    main.appendChild(el('button', {
      class: 'btn subtle', html: '<span style="font-weight:800;font-size:17px;background:conic-gradient(from -45deg,#ea4335,#fbbc05,#34a853,#4285f4,#ea4335);-webkit-background-clip:text;background-clip:text;color:transparent">G</span> ' + t('signin_google'),
      onclick: googleMock
    }));

    main.appendChild(el('button', { class: 'btn link', style: { display: 'block', margin: '16px auto 0' }, text: t('forgot_pw'), onclick: () => go('forgot') }));
  };

  function googleMock() {
    const accounts = ['demo.user@gmail.com', 'comda.tester@gmail.com'];
    const box = el('div', {}, [
      el('h3', { text: t('signin_google'), style: { marginBottom: '14px' } }),
      ...accounts.map(a => el('button', {
        class: 'btn subtle', style: { marginBottom: '10px', justifyContent: 'flex-start' },
        html: '<span style="width:32px;height:32px;border-radius:50%;background:var(--grad);color:#fff;display:inline-grid;place-items:center;margin-inline-end:11px;font-weight:800">' + a[0].toUpperCase() + '</span>' + a,
        onclick: () => { close(); Reg = { mode: 'register', email: a, pw: '(google)', google: true, flow: 'register' }; startOtp(); }
      })),
      el('p', { class: 'small muted center', text: t('google_demo'), style: { marginTop: '6px' } })
    ]);
    const close = sheet(box);
  }

  // ---------- OTP ----------
  function startOtp() {
    Reg.otp = genOtp();
    Reg.otpExpiry = Date.now() + 5 * 60 * 1000;
    go('otp');
  }
  function demoBanner() {
    return iconHTML('key', 18) + '<span>' + t('demo_code') + ': <b class="mono" style="font-size:16px;letter-spacing:3px">' + Reg.otp + '</b></span>';
  }
  Screens.otp = function (main) {
    if (!Reg.otp) { go('welcome'); return; }
    main.appendChild(steps(1, 6));
    main.appendChild(el('h1', { text: t('otp_title') }));
    main.appendChild(el('p', { class: 'lead', html: t('otp_sub') + '<br><b>' + (Reg.email || '') + '</b>' }));
    main.appendChild(el('div', { class: 'banner info', html: demoBanner() }));

    const boxes = [];
    const row = el('div', { class: 'otp' });
    for (let i = 0; i < 6; i++) {
      const inp = el('input', { type: 'tel', maxlength: '1', inputmode: 'numeric' });
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
        if (inp.value && i < 5) boxes[i + 1].focus();
        check();
      });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && i > 0) boxes[i - 1].focus(); });
      boxes.push(inp); row.appendChild(inp);
    }
    main.appendChild(row);
    const err = el('span', { class: 'err-txt center', style: { display: 'none' } });
    main.appendChild(err);

    const cdLine = el('p', { class: 'center', style: { margin: '14px 0 4px' } });
    main.appendChild(cdLine);
    main.appendChild(el('button', { class: 'btn link', style: { display: 'block', margin: '0 auto' }, text: t('otp_resend'), onclick: resend }));
    const verifyBtn = el('button', { class: 'btn primary', style: { marginTop: '18px' }, text: t('otp_verify'), disabled: true, onclick: verify });
    main.appendChild(verifyBtn);
    boxes[0].focus();

    function val() { return boxes.map(b => b.value).join(''); }
    function check() { verifyBtn.disabled = val().length !== 6; }
    function verify() {
      if (Date.now() > Reg.otpExpiry) { err.textContent = t('otp_expired'); err.style.display = 'block'; return; }
      if (val() !== Reg.otp) { err.textContent = t('otp_wrong'); err.style.display = 'block'; return; }
      stopTimer();
      if (Reg.flow === 'reset') { go('newpw'); return; }
      go('identity');
    }
    function resend() {
      Reg.otp = genOtp(); Reg.otpExpiry = Date.now() + 5 * 60 * 1000;
      boxes.forEach(b => b.value = ''); err.style.display = 'none'; check();
      $('.banner.info', main).innerHTML = demoBanner();
      toast(t('otp_resent')); startTimer();
    }
    function startTimer() { stopTimer(); window._otpTimer = setInterval(tick, 1000); tick(); }
    function tick() {
      const ms = Reg.otpExpiry - Date.now();
      if (ms <= 0) { cdLine.innerHTML = '<span class="countdown warn">00:00</span>'; stopTimer(); return; }
      const m = Math.floor(ms / 60000), sec = Math.floor((ms % 60000) / 1000);
      cdLine.innerHTML = t('otp_expires') + ' <span class="countdown ' + (ms < 60000 ? 'warn' : '') + '">' +
        String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0') + '</span>';
    }
    startTimer();
  };
  function stopTimer() { if (window._otpTimer) { clearInterval(window._otpTimer); window._otpTimer = null; } }

  // ---------- Forgot / reset ----------
  Screens.forgot = function (main) {
    main.appendChild(App.backBar('login', t('forgot_title')));
    main.appendChild(el('p', { class: 'lead', text: t('forgot_sub') }));
    const emailIn = el('input', { type: 'email', placeholder: t('email_ph'), inputmode: 'email', dir: 'ltr' });
    const err = el('span', { class: 'err-txt', style: { display: 'none' } });
    main.appendChild(el('label', { class: 'field' }, [el('span', { text: t('email') }), emailIn]));
    main.appendChild(err);
    main.appendChild(el('button', {
      class: 'btn primary', html: iconHTML('mail', 19) + t('send_reset'), onclick: () => {
        if (!validEmail(emailIn.value)) { err.textContent = t('invalid_email'); err.style.display = 'block'; return; }
        Reg = { email: emailIn.value.trim(), flow: 'reset' };
        startOtp();
      }
    }));
  };
  Screens.newpw = function (main) {
    main.appendChild(steps(2, 6));
    main.appendChild(el('h1', { text: t('reset_new_pw') }));
    const pw = el('input', { type: 'password', placeholder: '••••••••', autocomplete: 'new-password', dir: 'ltr' });
    const err = el('span', { class: 'err-txt', style: { display: 'none' } });
    main.appendChild(el('label', { class: 'field' }, [el('span', { text: t('password') }), pw]));
    main.appendChild(err);
    main.appendChild(el('button', {
      class: 'btn primary', text: t('continue'), onclick: () => {
        if ((pw.value || '').length < 6) { err.textContent = t('pw_short'); err.style.display = 'block'; return; }
        Reg.pw = pw.value;
        go('identity');
      }
    }));
  };

  // ---------- Identity verification ----------
  Screens.identity = function (main) {
    main.appendChild(steps(2, 6));
    main.appendChild(el('h1', { text: t('id_title') }));
    main.appendChild(el('p', { class: 'lead', text: t('id_sub') }));

    main.appendChild(idStep('id-card', t('id_step_doc'), t('id_step_doc_d')));
    main.appendChild(idStep('scan-face', t('id_step_face'), t('id_step_face_d')));

    const chk = el('input', { type: 'checkbox' });
    main.appendChild(el('label', { class: 'consent' }, [chk, el('span', { text: t('id_consent') })]));
    const err = el('span', { class: 'err-txt', style: { display: 'none' } });
    main.appendChild(err);

    main.appendChild(el('button', {
      class: 'btn primary', style: { marginTop: '14px' }, html: iconHTML('shield-check', 19) + t('id_start'), onclick: () => {
        if (!chk.checked) { err.textContent = t('privacy_req'); err.style.display = 'block'; return; }
        err.style.display = 'none';
        beginIdentity(main);
      }
    }));
  };
  function idStep(ic, title, desc) {
    return el('div', { class: 'card tile' }, [
      el('div', { class: 'badge', html: iconHTML(ic, 26) }),
      el('div', { class: 'tx' }, [el('h3', { text: title }), el('p', { text: desc })])
    ]);
  }

  async function beginIdentity(main) {
    const url = (Store.get().settings.idUrl || '').trim();
    const available = await idServiceAvailable(url);
    if (available) {
      const box = el('div', { class: 'center' }, [el('div', { class: 'loading-full' }, [el('span', { class: 'spin dark' }), el('p', { text: t('id_redirect') })])]);
      const close = sheet(box, { center: true, locked: true });
      setTimeout(() => {
        const token = 'IDV-' + U.uid().toUpperCase();
        Store.update(st => { st.identityVerified = true; });
        close(); toast(t('id_success'));
        afterIdentity(token);
      }, 2200);
    } else {
      const close = sheet(el('div', {}, [
        el('div', { class: 'banner warn', html: iconHTML('alert') + t('id_unavailable') }),
        el('button', {
          class: 'btn ghost', text: t('id_skip'), onclick: () => { close(); Store.update(st => { st.identityVerified = false; }); afterIdentity(null); }
        }),
        el('button', { class: 'btn link', style: { display: 'block', margin: '10px auto 0' }, text: t('retry'), onclick: () => { close(); beginIdentity(main); } })
      ]), { center: true });
    }
  }
  function afterIdentity(token) {
    Reg.idToken = token;
    if (Reg.flow === 'reset') {
      Store.update(st => { if (st.user) st.user.pw = Reg.pw; });
      toast(t('pin_ok')); go('login', { m: 'login' });
      return;
    }
    go('pin');
  }
  function idServiceAvailable(url) {
    if (!url) return Promise.resolve(false);
    return new Promise((resolve) => {
      const ctrl = new AbortController();
      const tm = setTimeout(() => { ctrl.abort(); resolve(false); }, 2500);
      fetch(url, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal })
        .then(() => { clearTimeout(tm); resolve(true); })
        .catch(() => { clearTimeout(tm); resolve(false); });
    });
  }

  // ---------- PIN ----------
  Screens.pin = function (main) { pinScreen(main, 'choose'); };
  Screens.pinconfirm = function (main) { pinScreen(main, 'confirm'); };

  function pinScreen(main, phase) {
    const choose = phase === 'choose';
    main.appendChild(steps(3, 6));
    main.appendChild(el('h1', { text: choose ? t('pin_title') : t('pin_confirm_title') }));
    main.appendChild(el('p', { class: 'lead', text: choose ? t('pin_sub') : t('pin_confirm_sub') }));

    let pin = '';
    const dots = el('div', { class: 'pin' });
    for (let i = 0; i < 6; i++) dots.appendChild(el('div', { class: 'dot' }));
    main.appendChild(dots);
    const err = el('span', { class: 'err-txt center', style: { display: 'none', minHeight: '18px' } });
    main.appendChild(err);

    if (choose) {
      main.appendChild(el('div', { class: 'card', style: { marginTop: '6px' } }, [
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--brand)' }, html: iconHTML('shield', 17) + '<b style="font-size:13px;color:var(--ink)">' + t('pin_policy_title') + '</b>' }),
        policyRow(t('pin_policy_1')), policyRow(t('pin_policy_2')), policyRow(t('pin_policy_3'))
      ]));
    }

    main.appendChild(keypad((d) => { if (pin.length < 6) { pin += d; paint(); } }, () => { pin = pin.slice(0, -1); paint(); }));

    function paint() {
      Array.from(dots.children).forEach((c, i) => c.classList.toggle('on', i < pin.length));
      err.style.display = 'none';
      if (pin.length === 6) setTimeout(submit, 120);
    }
    function submit() {
      if (choose) {
        const e = pinError(pin);
        if (e) { err.textContent = e; err.style.display = 'block'; pin = ''; clr(); return; }
        Reg.pin1 = pin; go('pinconfirm');
      } else {
        if (pin !== Reg.pin1) { err.textContent = t('pin_mismatch'); err.style.display = 'block'; pin = ''; clr(); return; }
        Store.update(st => { st.pin = pin; });
        toast(t('pin_ok')); go('passkey');
      }
    }
    function clr() { Array.from(dots.children).forEach((c) => c.classList.remove('on')); }
  }
  function policyRow(text) {
    return el('div', { style: { display: 'flex', gap: '7px', alignItems: 'flex-start', margin: '3px 0', color: 'var(--muted)' } }, [
      el('span', { style: { color: 'var(--ok)', marginTop: '1px' }, html: iconHTML('check', 14) }),
      el('span', { class: 'small', text: text })
    ]);
  }

  function keypad(onDigit, onDel) {
    const pad = el('div', { class: 'keypad' });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(d =>
      pad.appendChild(el('button', { text: d, onclick: () => onDigit(d) })));
    pad.appendChild(el('span'));
    pad.appendChild(el('button', { text: '0', onclick: () => onDigit('0') }));
    pad.appendChild(el('button', { class: 'fn', html: iconHTML('backspace', 24), onclick: onDel }));
    return pad;
  }
  window.PinKeypad = keypad;

  // ---------- Passkey ----------
  Screens.passkey = function (main) {
    main.appendChild(steps(4, 6));
    main.appendChild(el('div', { class: 'auth-head' }, [
      el('div', { class: 'glyph', html: iconHTML('fingerprint', 30) }),
      el('h1', { text: t('pk_title') }),
      el('p', { class: 'lead', text: t('pk_sub') })
    ]));
    const supported = !!(window.PublicKeyCredential && navigator.credentials);
    if (!supported) main.appendChild(el('div', { class: 'banner warn', html: iconHTML('alert') + t('pk_unsupported') }));

    main.appendChild(el('button', { class: 'btn primary', html: iconHTML('fingerprint', 19) + t('pk_create'), disabled: !supported, onclick: createPasskey }));
    main.appendChild(el('button', { class: 'btn link', style: { display: 'block', margin: '14px auto 0' }, text: t('pk_skip'), onclick: () => go('regdone') }));
  };

  // ---- real WebAuthn helpers ----
  function bufToB64url(buf) {
    const b = new Uint8Array(buf); let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlToBuf(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr.buffer;
  }

  // Acquire (create) a real platform passkey, store its credential id.
  async function registerPasskeyCredential(email) {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Digital Trust App', id: location.hostname || undefined },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: (email || 'user'),
          displayName: (email || 'Digital Trust user')
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000, attestation: 'none'
      }
    });
    if (!cred) throw new Error('no credential');
    const credId = bufToB64url(cred.rawId);
    Store.update(st => { st.passkey = { credId, rpId: location.hostname || '', created: Date.now() }; });
    return credId;
  }
  window.registerPasskeyCredential = registerPasskeyCredential;

  // Verify (assert) against the stored passkey — real biometric prompt.
  async function verifyPasskey() {
    const pk = Store.get().passkey || {};
    const pub = { challenge: crypto.getRandomValues(new Uint8Array(32)), userVerification: 'required', timeout: 60000 };
    if (pk.credId) pub.allowCredentials = [{ type: 'public-key', id: b64urlToBuf(pk.credId), transports: ['internal', 'hybrid'] }];
    if (pk.rpId) pub.rpId = pk.rpId;
    const assertion = await navigator.credentials.get({ publicKey: pub });
    if (!assertion) throw new Error('no assertion');
    return assertion;
  }
  window.verifyPasskey = verifyPasskey;

  async function createPasskey() {
    try {
      await registerPasskeyCredential(Reg.email || Store.get().user?.email);
      toast(t('pk_ok')); go('regdone');
    } catch (e) { console.warn(e); toast(t('pk_fail')); }
  }
  window.createPasskey = createPasskey;

  // ---------- Registration done ----------
  Screens.regdone = function (main) {
    Store.update(st => {
      st.user = { email: Reg.email, name: (Reg.email || '').split('@')[0], pw: Reg.pw };
      st.registered = true; st.loggedIn = true;
    });
    main.appendChild(el('div', { class: 'hero', style: { padding: '34px 8px 8px' } }, [
      sealNode('check'),
      el('h1', { text: t('reg_done_title') }),
      el('p', { class: 'lead', text: t('reg_done_sub') })
    ]));
    main.appendChild(el('button', { class: 'btn primary', html: iconHTML('arrow-up-right', 19) + t('enter_app'), onclick: () => { Reg = {}; go('home'); } }));
  };

  // ---------- Returning login (passkey / pin) ----------
  function loginReturning(main) {
    const s = Store.get();
    main.appendChild(el('div', { class: 'auth-head', style: { paddingTop: '14px' } }, [
      el('div', { class: 'glyph', html: iconHTML('shield-check', 30) }),
      el('h1', { text: t('login') }),
      el('p', { class: 'lead', text: (s.user?.email || '') })
    ]));

    if (s.passkey && s.passkey.credId && window.PublicKeyCredential) {
      main.appendChild(el('button', { class: 'btn primary', html: iconHTML('fingerprint', 19) + t('su_auth_pk'), onclick: passkeyLogin }));
      main.appendChild(el('div', { class: 'or', text: t('su_auth_fallback') }));
    }
    main.appendChild(el('p', { class: 'center small muted', text: t('pin_enter') }));
    let pin = '';
    const dots = el('div', { class: 'pin' });
    for (let i = 0; i < 6; i++) dots.appendChild(el('div', { class: 'dot' }));
    main.appendChild(dots);
    const err = el('span', { class: 'err-txt center', style: { display: 'none' } });
    main.appendChild(err);
    main.appendChild(keypad((d) => { if (pin.length < 6) { pin += d; up(); } }, () => { pin = pin.slice(0, -1); up(); }));
    function up() {
      Array.from(dots.children).forEach((c, i) => c.classList.toggle('on', i < pin.length));
      err.style.display = 'none';
      if (pin.length === 6) {
        if (pin === s.pin) { Store.update(st => { st.loggedIn = true; }); go('home'); }
        else { err.textContent = t('su_pin_wrong'); err.style.display = 'block'; pin = ''; setTimeout(() => Array.from(dots.children).forEach(c => c.classList.remove('on')), 150); }
      }
    }
    async function passkeyLogin() {
      try { await verifyPasskey(); Store.update(st => { st.loggedIn = true; }); go('home'); }
      catch (e) { toast(t('pk_fail')); }
    }
  }
})();
