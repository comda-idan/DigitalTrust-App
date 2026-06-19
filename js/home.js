/* ===== Home / Profile / About ===== */
(function () {
  const { el, toast, sheet, confirmDialog } = U;
  const t = (k) => I18N.t(k);
  const go = (r, p) => App.go(r, p);

  Screens.home = function (main) {
    const s = Store.get();
    const name = (s.user && (s.user.name || s.user.email)) || '';
    main.appendChild(el('div', { style: { margin: '4px 0 18px' } }, [
      el('h1', { text: t('home_hi') + (name ? ', ' + name : '') + ' 👋' }),
      el('p', { class: 'lead', style: { margin: 0 }, text: t('home_sub') })
    ]));

    main.appendChild(el('div', {
      class: 'card tap tile', onclick: () => go('sign')
    }, [
      el('div', { class: 'badge', html: '✍️' }),
      el('div', { style: { flex: 1 } }, [el('h3', { text: t('opt_sign_title') }), el('p', { text: t('opt_sign_d') })]),
      el('div', { class: 'chev', html: '›' })
    ]));

    main.appendChild(el('div', {
      class: 'card tap tile', onclick: () => go('send')
    }, [
      el('div', { class: 'badge alt', html: '📤' }),
      el('div', { style: { flex: 1 } }, [el('h3', { text: t('opt_send_title') }), el('p', { text: t('opt_send_d') })]),
      el('div', { class: 'chev', html: '›' })
    ]));

    // quick stats
    const signedN = (s.signedDocs || []).length, sentN = (s.sentDocs || []).length;
    main.appendChild(el('div', { class: 'btn-row', style: { marginTop: '6px' } }, [
      statCard('✅', signedN, t('tab_signed'), () => go('signed')),
      statCard('📨', sentN, t('tab_sent'), () => go('sent')),
    ]));

    main.appendChild(el('div', { class: 'foot', text: 'COMDA · Digital Trust App · v' + APP_VERSION }));
  };
  function statCard(ic, n, label, onclick) {
    return el('div', { class: 'card tap center', style: { margin: 0, flex: 1 }, onclick }, [
      el('div', { html: ic, style: { fontSize: '22px' } }),
      el('div', { style: { fontWeight: '800', fontSize: '20px', color: 'var(--indigo)' }, text: String(n) }),
      el('div', { class: 'small muted', text: label })
    ]);
  }

  // ---- Profile ----
  Screens.profile = function (main) {
    const s = Store.get();
    main.appendChild(App.backBar('home', t('profile_title')));
    main.appendChild(el('div', { class: 'card center' }, [
      el('div', { class: 'avatar-btn', style: { width: '64px', height: '64px', fontSize: '24px', margin: '0 auto 10px' }, text: U.initials(s.user?.name || s.user?.email || '?') }),
      el('h3', { text: s.user?.name || '—' }),
      el('p', { class: 'small muted', text: s.user?.email || '' }),
      s.identityVerified ? el('span', { class: 'pill signed', style: { marginTop: '6px', display: 'inline-block' }, html: '🛡️ ' + t('id_success') }) : null
    ]));

    main.appendChild(el('button', { class: 'btn subtle', style: { marginBottom: '10px', justifyContent: 'flex-start' }, html: '🔢 ' + t('change_pin'), onclick: changePin }));
    main.appendChild(el('button', { class: 'btn subtle', style: { marginBottom: '10px', justifyContent: 'flex-start' }, html: '🔐 ' + t('change_pk'), onclick: changePasskey }));
    main.appendChild(el('button', { class: 'btn subtle', style: { marginBottom: '10px', justifyContent: 'flex-start' }, html: 'ℹ️ ' + t('about_title'), onclick: () => go('about') }));
    main.appendChild(el('button', { class: 'btn ghost', style: { marginTop: '6px' }, html: '↩ ' + t('logout'), onclick: () => { Store.update(st => { st.loggedIn = false; }); go('login'); } }));
  };

  function changePin() {
    let pin = '', stage = 1, first = '';
    const title = el('h3', { text: t('change_pin'), style: { marginBottom: '6px' } });
    const sub = el('p', { class: 'small muted', text: t('pin_sub') });
    const dots = el('div', { class: 'pin' }); for (let i = 0; i < 6; i++) dots.appendChild(el('div', { class: 'dot' }));
    const err = el('span', { class: 'err-txt center', style: { display: 'none', minHeight: '16px' } });
    const pad = window.PinKeypad((d) => { if (pin.length < 6) { pin += d; up(); } }, () => { pin = pin.slice(0, -1); up(); });
    const box = el('div', { class: 'center' }, [title, sub, dots, err, pad]);
    const close = sheet(box);
    function up() {
      Array.from(dots.children).forEach((c, i) => c.classList.toggle('on', i < pin.length));
      err.style.display = 'none';
      if (pin.length === 6) setTimeout(step, 120);
    }
    function step() {
      if (stage === 1) {
        const e = U.pinError(pin); if (e) { err.textContent = e; err.style.display = 'block'; reset(); return; }
        first = pin; stage = 2; sub.textContent = t('pin_confirm_sub'); reset();
      } else {
        if (pin !== first) { err.textContent = t('pin_mismatch'); err.style.display = 'block'; stage = 1; first=''; sub.textContent = t('pin_sub'); reset(); return; }
        Store.update(st => { st.pin = pin; }); close(); toast(t('pin_changed'));
      }
    }
    function reset() { pin = ''; Array.from(dots.children).forEach(c => c.classList.remove('on')); }
  }

  async function changePasskey() {
    if (!(window.PublicKeyCredential && navigator.credentials)) { toast(t('pk_unsupported')); return; }
    try {
      await window.registerPasskeyCredential(Store.get().user?.email);
      toast(t('pk_ok'));
    } catch (e) { toast(t('pk_fail')); }
  }

  // ---- About ----
  Screens.about = function (main) {
    main.appendChild(App.backBar('home', t('about_title')));
    main.appendChild(el('div', { class: 'card center' }, [
      el('img', { src: 'assets/logo.png', style: { height: '34px', margin: '8px auto 14px' } }),
      el('h2', { text: t('app_name') }),
      el('p', { class: 'lead', style: { marginBottom: '12px' }, text: t('about_app') }),
      el('span', { class: 'ver-tag', text: t('version') + ' ' + APP_VERSION }),
      el('p', { class: 'small muted', style: { marginTop: '18px' }, text: t('about_desc') })
    ]));
  };
})();
