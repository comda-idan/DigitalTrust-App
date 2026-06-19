/* ===== Registration & auth flow ===== */
(function () {
  const { el, $, toast, sheet, confirmDialog, validEmail, pinError, genOtp } = U;
  const t = (k) => I18N.t(k);
  const go = (r, p) => App.go(r, p);

  // transient registration/reset state (not persisted)
  window.Reg = window.Reg || {};

  function steps(curIndex, total) {
    const wrap = el('div', { class: 'steps' });
    for (let i = 0; i < total; i++) {
      wrap.appendChild(el('div', { class: 's ' + (i < curIndex ? 'done' : i === curIndex ? 'cur' : '') }));
    }
    return wrap;
  }

  // ---------- Welcome ----------
  Screens.welcome = function (main) {
    main.appendChild(el('div', { class: 'center', style: { padding: '24px 0 8px' } }, [
      el('div', { html: '🛡️', style: { fontSize: '54px' } }),
      el('h1', { text: t('welcome_title') }),
      el('p', { class: 'lead', text: t('welcome_sub') }),
    ]));
    main.appendChild(el('button', { class: 'btn primary', text: t('register'), style: { marginBottom: '12px' }, onclick: () => { Reg = { mode: 'register' }; go('login', { m: 'register' }); } }));
    main.appendChild(el('button', { class: 'btn ghost', text: t('login'), onclick: () => go('login', { m: 'login' }) }));
    main.appendChild(el('div', { class: 'foot', text: 'COMDA · v' + APP_VERSION }));
  };

  // ---------- Register / Login (email+pw or Google) ----------
  Screens.login = function (main, params) {
    const s = Store.get();
    const registered = s.registered;
    // returning user (registered + has account) -> credential login
    if (registered && params.m !== 'register') return loginReturning(main);

    let mode = params.m === 'login' ? 'login' : 'register'; // for demo both collect email+pw
    const isReg = mode === 'register';
    main.appendChild(steps(0, 6));
    main.appendChild(el('h1', { text: isReg ? t('create_account') : t('login') }));
    main.appendChild(el('p', { class: 'lead', text: t('welcome_sub') }));

    const emailIn = el('input', { type: 'email', placeholder: t('email_ph'), value: Reg.email || '', autocomplete: 'email', inputmode: 'email' });
    const pwIn = el('input', { type: 'password', placeholder: '••••••••', autocomplete: isReg ? 'new-password' : 'current-password' });
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

    main.appendChild(el('div', { class: 'or', text: 'or' }));
    main.appendChild(el('button', {
      class: 'btn subtle', html: '<span style="color:#ea4335;font-weight:800">G</span> ' + t('signin_google'),
      onclick: googleMock
    }));

    main.appendChild(el('button', { class: 'btn link', style: { display: 'block', margin: '16px auto 0' }, text: t('forgot_pw'), onclick: () => go('forgot') }));
  };

  function googleMock() {
    // Demo Google account picker (no real OAuth without a backend / client id)
    const accounts = ['demo.user@gmail.com', 'comda.tester@gmail.com'];
    const box = el('div', {}, [
      el('h3', { text: t('signin_google'), style: { marginBottom: '12px' } }),
      ...accounts.map(a => el('button', {
        class: 'btn subtle', style: { marginBottom: '10px', justifyContent: 'flex-start' },
        html: '<span style="width:30px;height:30px;border-radius:50%;background:#4285f4;color:#fff;display:inline-grid;place-items:center;margin-inline-end:10px">' + a[0].toUpperCase() + '</span>' + a,
        onclick: () => { close(); Reg = { mode: 'register', email: a, pw: '(google)', google: true, flow: 'register' }; startOtp(); }
      })),
      el('p', { class: 'small muted center', text: 'Demo OAuth — no real Google sign-in', style: { marginTop: '6px' } })
    ]);
    const close = sheet(box);
  }

  // ---------- OTP ----------
  function startOtp() {
    Reg.otp = genOtp();
    Reg.otpExpiry = Date.now() + 5 * 60 * 1000;
    go('otp');
  }
  Screens.otp = function (main) {
    if (!Reg.otp) { go('welcome'); return; }
    main.appendChild(steps(Reg.flow === 'reset' ? 1 : 1, 6));
    main.appendChild(el('h1', { text: t('otp_title') }));
    main.appendChild(el('p', { class: 'lead', html: t('otp_sub') + '<br><b>' + (Reg.email || '') + '</b>' }));
    main.appendChild(el('div', { class: 'banner info', html: '🔑 ' + t('demo_code') + ': <b style="font-size:16px;letter-spacing:2px">' + Reg.otp + '</b>' }));

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
    const resendBtn = el('button', { class: 'btn link', style: { display: 'block', margin: '0 auto' }, text: t('otp_resend'), onclick: resend });
    main.appendChild(resendBtn);

    const verifyBtn = el('button', { class: 'btn primary', style: { marginTop: '18px' }, text: t('otp_verify'), disabled: true, onclick: verify });
    main.appendChild(verifyBtn);
    boxes[0].focus();

    function val() { return boxes.map(b => b.value).join(''); }
    function check() { verifyBtn.disabled = val().length !== 6; }
    function verify() {
      if (Date.now() > Reg.otpExpiry) { err.textContent = t('otp_expired'); err.style.display = 'block'; return; }
      if (val() !== Reg.otp) { err.textContent = t('otp_wrong'); err.style.display = 'block'; return; }
      stopTimer();
      // next step depends on flow
      if (Reg.flow === 'reset') { go('newpw'); return; }
      go('identity');
    }
    function resend() {
      Reg.otp = genOtp(); Reg.otpExpiry = Date.now() + 5 * 60 * 1000;
      boxes.forEach(b => b.value = ''); err.style.display = 'none'; check();
      $('.banner.info', main).innerHTML = '🔑 ' + t('demo_code') + ': <b style="font-size:16px;letter-spacing:2px">' + Reg.otp + '</b>';
      toast(t('otp_resent')); startTimer();
    }

    // countdown
    function startTimer() {
      stopTimer();
      window._otpTimer = setInterval(tick, 1000); tick();
    }
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
    const emailIn = el('input', { type: 'email', placeholder: t('email_ph'), inputmode: 'email' });
    const err = el('span', { class: 'err-txt', style: { display: 'none' } });
    main.appendChild(el('label', { class: 'field' }, [el('span', { text: t('email') }), emailIn]));
    main.appendChild(err);
    main.appendChild(el('button', {
      class: 'btn primary', text: t('send_reset'), onclick: () => {
        if (!validEmail(emailIn.value)) { err.textContent = t('invalid_email'); err.style.display = 'block'; return; }
        Reg = { email: emailIn.value.trim(), flow: 'reset' };
        startOtp();
      }
    }));
  };
  Screens.newpw = function (main) {
    main.appendChild(steps(2, 6));
    main.appendChild(el('h1', { text: t('reset_new_pw') }));
    const pw = el('input', { type: 'password', placeholder: '••••••••', autocomplete: 'new-password' });
    const err = el('span', { class: 'err-txt', style: { display: 'none' } });
    main.appendChild(el('label', { class: 'field' }, [el('span', { text: t('password') }), pw]));
    main.appendChild(err);
    main.appendChild(el('button', {
      class: 'btn primary', text: t('continue'), onclick: () => {
        if ((pw.value || '').length < 6) { err.textContent = t('pw_short'); err.style.display = 'block'; return; }
        Reg.pw = pw.value;
        // spec: after reset, re-verify identity
        go('identity');
      }
    }));
  };

  // ---------- Identity verification ----------
  Screens.identity = function (main) {
    main.appendChild(steps(2, 6));
    main.appendChild(el('h1', { text: t('id_title') }));
    main.appendChild(el('p', { class: 'lead', text: t('id_sub') }));

    main.appendChild(idStep('🪪', t('id_step_doc'), t('id_step_doc_d')));
    main.appendChild(idStep('😊', t('id_step_face'), t('id_step_face_d')));

    const chk = el('input', { type: 'checkbox', style: { width: 'auto', marginInlineEnd: '8px' } });
    main.appendChild(el('label', { class: 'card', style: { display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '4px' } }, [
      chk, el('span', { class: 'small', text: t('id_consent') })
    ]));
    const err = el('span', { class: 'err-txt', style: { display: 'none' } });
    main.appendChild(err);

    const startBtn = el('button', {
      class: 'btn primary', text: t('id_start'), onclick: () => {
        if (!chk.checked) { err.textContent = t('privacy_req'); err.style.display = 'block'; return; }
        err.style.display = 'none';
        beginIdentity(main);
      }
    });
    main.appendChild(startBtn);
  };
  function idStep(icon, title, desc) {
    return el('div', { class: 'card tile' }, [
      el('div', { class: 'badge', html: icon }),
      el('div', {}, [el('h3', { text: title }), el('p', { text: desc })])
    ]);
  }

  async function beginIdentity(main) {
    const url = (Store.get().settings.idUrl || '').trim();
    const available = await idServiceAvailable(url);
    const box = el('div', { class: 'center' }, []);
    if (available) {
      box.appendChild(el('div', { class: 'loading-full' }, [el('span', { class: 'spin dark' }), el('p', { text: t('id_redirect') })]));
      const close = sheet(box, { center: true, locked: true });
      // Real implementation: location.href = url + '?return=' + encodeURIComponent(location.href)
      // Demo: simulate the redirect round-trip and the returned success token.
      setTimeout(() => {
        const token = 'IDV-' + U.uid().toUpperCase();
        Store.update(st => { st.identityVerified = true; });
        close(); toast(t('id_success'));
        afterIdentity(token);
      }, 2200);
    } else {
      // Only when the service is unavailable: offer to continue without it
      const close = sheet(el('div', {}, [
        el('div', { class: 'banner warn', html: '⚠️ ' + t('id_unavailable') }),
        el('button', {
          class: 'btn ghost', text: t('id_skip'), onclick: () => {
            close(); Store.update(st => { st.identityVerified = false; }); afterIdentity(null);
          }
        }),
        el('button', { class: 'btn link', style: { display: 'block', margin: '10px auto 0' }, text: t('retry'), onclick: () => { close(); beginIdentity(main); } })
      ]), { center: true });
    }
  }
  function afterIdentity(token) {
    Reg.idToken = token;
    if (Reg.flow === 'reset') {
      // password reset complete -> persist new pw and return to login
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

  // ---------- PIN choose ----------
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
      const pol = el('div', { class: 'card', style: { marginTop: '6px' } }, [
        el('h3', { text: t('pin_policy_title'), style: { fontSize: '13px' } }),
        el('p', { class: 'small muted', style: { margin: '2px 0' }, html: '• ' + t('pin_policy_1') }),
        el('p', { class: 'small muted', style: { margin: '2px 0' }, html: '• ' + t('pin_policy_2') }),
        el('p', { class: 'small muted', style: { margin: '2px 0' }, html: '• ' + t('pin_policy_3') }),
      ]);
      main.appendChild(pol);
    }

    main.appendChild(keypad(
      (d) => { if (pin.length < 6) { pin += d; paint(); } },
      () => { pin = pin.slice(0, -1); paint(); }
    ));

    function paint() {
      Array.from(dots.children).forEach((c, i) => c.classList.toggle('on', i < pin.length));
      err.style.display = 'none';
      if (pin.length === 6) setTimeout(submit, 120);
    }
    function submit() {
      if (choose) {
        const e = pinError(pin);
        if (e) { err.textContent = e; err.style.display = 'block'; pin = ''; paint2(); return; }
        Reg.pin1 = pin; go('pinconfirm');
      } else {
        if (pin !== Reg.pin1) { err.textContent = t('pin_mismatch'); err.style.display = 'block'; pin = ''; paint2(); return; }
        Store.update(st => { st.pin = pin; });
        toast(t('pin_ok')); go('passkey');
      }
    }
    function paint2() { Array.from(dots.children).forEach((c) => c.classList.remove('on')); }
  }

  function keypad(onDigit, onDel) {
    const pad = el('div', { class: 'keypad' });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach(d =>
      pad.appendChild(el('button', { text: d, onclick: () => onDigit(d) })));
    pad.appendChild(el('span'));
    pad.appendChild(el('button', { text: '0', onclick: () => onDigit('0') }));
    pad.appendChild(el('button', { class: 'fn', html: '⌫', onclick: onDel }));
    return pad;
  }
  window.PinKeypad = keypad; // reused by sign auth & profile

  // ---------- Passkey ----------
  Screens.passkey = function (main) {
    main.appendChild(steps(4, 6));
    main.appendChild(el('div', { class: 'center', style: { padding: '10px 0' } }, [
      el('div', { html: '🔐', style: { fontSize: '52px' } }),
      el('h1', { text: t('pk_title') }),
      el('p', { class: 'lead', text: t('pk_sub') })
    ]));
    const supported = !!(window.PublicKeyCredential && navigator.credentials);
    if (!supported) main.appendChild(el('div', { class: 'banner warn', html: '⚠️ ' + t('pk_unsupported') }));

    main.appendChild(el('button', {
      class: 'btn primary', text: '👆 ' + t('pk_create'), disabled: !supported,
      onclick: createPasskey
    }));
    main.appendChild(el('button', { class: 'btn link', style: { display: 'block', margin: '14px auto 0' }, text: t('pk_skip'), onclick: () => go('regdone') }));
  };

  // Core credential creation — throws on failure, returns credId
  async function registerPasskeyCredential(email) {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Digital Trust App' },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: (email || 'user'),
          displayName: (email || 'user')
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000, attestation: 'none'
      }
    });
    const credId = bufToB64(cred.rawId);
    Store.update(st => { st.passkey = { credId }; });
    return credId;
  }
  window.registerPasskeyCredential = registerPasskeyCredential;

  async function createPasskey() {
    try {
      await registerPasskeyCredential(Reg.email || Store.get().user?.email);
      toast(t('pk_ok')); go('regdone');
    } catch (e) {
      console.warn(e); toast(t('pk_fail'));
    }
  }
  function bufToB64(buf) {
    const b = new Uint8Array(buf); let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s);
  }
  window.createPasskey = createPasskey;

  // ---------- Registration done ----------
  Screens.regdone = function (main) {
    Store.update(st => {
      st.user = { email: Reg.email, name: (Reg.email || '').split('@')[0], pw: Reg.pw };
      st.registered = true; st.loggedIn = true;
    });
    main.appendChild(el('div', { class: 'center', style: { padding: '40px 0 16px' } }, [
      el('div', { html: '✅', style: { fontSize: '64px' } }),
      el('h1', { text: t('reg_done_title') }),
      el('p', { class: 'lead', text: t('reg_done_sub') }),
    ]));
    main.appendChild(el('button', { class: 'btn primary', text: t('enter_app'), onclick: () => { Reg = {}; go('home'); } }));
  };

  // ---------- Returning login (passkey / pin) ----------
  function loginReturning(main) {
    const s = Store.get();
    main.appendChild(el('div', { class: 'center', style: { padding: '12px 0' } }, [
      el('div', { html: '🛡️', style: { fontSize: '48px' } }),
      el('h1', { text: t('login') }),
      el('p', { class: 'lead', html: (s.user?.email || '') })
    ]));

    if (s.passkey && window.PublicKeyCredential) {
      main.appendChild(el('button', { class: 'btn primary', text: '👆 ' + t('su_auth_pk'), onclick: passkeyLogin }));
      main.appendChild(el('div', { class: 'or', text: 'or' }));
    }
    main.appendChild(el('p', { class: 'center small muted', text: t('pin_enter') }));
    let pin = '';
    const dots = el('div', { class: 'pin' });
    for (let i = 0; i < 6; i++) dots.appendChild(el('div', { class: 'dot' }));
    main.appendChild(dots);
    const err = el('span', { class: 'err-txt center', style: { display: 'none' } });
    main.appendChild(err);
    main.appendChild(keypad(
      (d) => { if (pin.length < 6) { pin += d; up(); } },
      () => { pin = pin.slice(0, -1); up(); }
    ));
    function up() {
      Array.from(dots.children).forEach((c, i) => c.classList.toggle('on', i < pin.length));
      err.style.display = 'none';
      if (pin.length === 6) {
        if (pin === s.pin) { Store.update(st => { st.loggedIn = true; }); go('home'); }
        else { err.textContent = t('su_pin_wrong'); err.style.display = 'block'; pin = ''; setTimeout(() => Array.from(dots.children).forEach(c => c.classList.remove('on')), 150); }
      }
    }
    async function passkeyLogin() {
      try {
        await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            userVerification: 'required', timeout: 60000
          }
        });
        Store.update(st => { st.loggedIn = true; }); go('home');
      } catch (e) { toast(t('pk_fail')); }
    }
  }
})();
