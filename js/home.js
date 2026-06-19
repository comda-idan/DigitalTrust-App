/* ===== Home / Profile / About ===== */
(function () {
  const { el, toast, sheet, confirmDialog, iconHTML } = U;
  const t = (k) => I18N.t(k);
  const go = (r, p) => App.go(r, p);

  Screens.home = function (main) {
    const s = Store.get();
    const name = (s.user && (s.user.name || s.user.email)) || '';
    main.appendChild(el('div', { class: 'ptitle', style: { marginBottom: '18px' } }, [
      el('div', { class: 'eyebrow', text: t('home_sub') }),
      el('h1', { text: t('home_hi') + (name ? ', ' + firstName(name) : '') })
    ]));

    main.appendChild(el('div', { class: 'card tap tile elevated', onclick: () => go('sign') }, [
      el('div', { class: 'badge', html: iconHTML('signature', 27) }),
      el('div', { class: 'tx' }, [el('h3', { text: t('opt_sign_title') }), el('p', { text: t('opt_sign_d') })]),
      el('div', { class: 'chev', html: iconHTML('chevron-right', 20) })
    ]));

    main.appendChild(el('div', { class: 'card tap tile elevated', onclick: () => go('send') }, [
      el('div', { class: 'badge alt', html: iconHTML('send', 25) }),
      el('div', { class: 'tx' }, [el('h3', { text: t('opt_send_title') }), el('p', { text: t('opt_send_d') })]),
      el('div', { class: 'chev', html: iconHTML('chevron-right', 20) })
    ]));

    const signedN = (s.signedDocs || []).length, sentN = (s.sentDocs || []).length;
    main.appendChild(el('div', { class: 'stats' }, [
      statCard(signedN, t('tab_signed'), () => go('signed')),
      statCard(sentN, t('tab_sent'), () => go('sent')),
    ]));

    main.appendChild(el('div', { class: 'foot', text: 'COMDA · Digital Trust · v' + APP_VERSION }));
  };
  function firstName(s) { return String(s).split(/\s|@/)[0]; }
  function statCard(n, label, onclick) {
    return el('div', { class: 'stat tap', style: { cursor: 'pointer' }, onclick }, [
      el('div', { class: 'n', text: String(n) }),
      el('div', { class: 'l', text: label })
    ]);
  }

  // ---- Profile ----
  Screens.profile = function (main) {
    const s = Store.get();
    main.appendChild(App.backBar('home', t('profile_title')));
    main.appendChild(el('div', { class: 'card center elevated' }, [
      el('div', { class: 'avatar-btn', style: { width: '66px', height: '66px', fontSize: '24px', margin: '4px auto 12px' }, text: U.initials(s.user?.name || s.user?.email || '?') }),
      el('h3', { text: s.user?.name || '—' }),
      el('p', { class: 'small muted', text: s.user?.email || '' }),
      s.identityVerified ? el('span', { class: 'pill signed', style: { marginTop: '10px' }, html: iconHTML('shield-check', 12) + t('id_success') }) : null,
      s.passkey ? el('span', { class: 'pill sent', style: { marginTop: '10px', marginInlineStart: '6px' }, html: iconHTML('key', 12) + 'Passkey' }) : null
    ]));

    main.appendChild(menuBtn('keypad', t('change_pin'), changePin));
    main.appendChild(menuBtn('key', t('change_pk'), changePasskey));
    main.appendChild(menuBtn('info', t('about_title'), () => go('about')));
    main.appendChild(el('button', { class: 'btn link', style: { marginTop: '6px' }, html: iconHTML('logout', 18) + ' ' + t('logout'), onclick: () => { Store.update(st => { st.loggedIn = false; }); go('login'); } }));
  };
  function menuBtn(ic, label, onclick) {
    return el('button', { class: 'btn subtle', style: { marginBottom: '10px', justifyContent: 'flex-start' }, html: iconHTML(ic, 19) + '<span style="margin-inline-start:4px">' + label + '</span>', onclick });
  }

  function changePin() {
    let pin = '', stage = 1, first = '';
    const sub = el('p', { class: 'small muted', text: t('pin_sub') });
    const dots = el('div', { class: 'pin' }); for (let i = 0; i < 6; i++) dots.appendChild(el('div', { class: 'dot' }));
    const err = el('span', { class: 'err-txt center', style: { display: 'none', minHeight: '16px' } });
    const pad = window.PinKeypad((d) => { if (pin.length < 6) { pin += d; up(); } }, () => { pin = pin.slice(0, -1); up(); });
    const box = el('div', { class: 'center' }, [el('h3', { text: t('change_pin'), style: { marginBottom: '6px' } }), sub, dots, err, pad]);
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
        if (pin !== first) { err.textContent = t('pin_mismatch'); err.style.display = 'block'; stage = 1; first = ''; sub.textContent = t('pin_sub'); reset(); return; }
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
    main.appendChild(el('div', { class: 'card center elevated' }, [
      el('div', { class: 'seal', style: { width: '96px', height: '96px', margin: '6px auto 18px' } }, [
        ringsSVG(),
        el('div', { class: 'shield', style: { width: '56px', height: '56px' }, html: iconHTML('shield-check', 30) })
      ]),
      el('h2', { text: t('app_name') }),
      el('p', { class: 'lead', style: { marginBottom: '14px' }, text: t('about_app') }),
      el('span', { class: 'ver-tag', html: iconHTML('check-circle', 12) + t('version') + ' ' + APP_VERSION }),
      el('p', { class: 'small muted', style: { marginTop: '18px' }, text: t('about_desc') })
    ]));
  };

  function ringsSVG() {
    const span = el('span', { class: 'rings' });
    span.innerHTML = '<svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="39" stroke-dasharray="2 3"/></svg>';
    return span;
  }
  window.ringsSVG = ringsSVG;
})();
