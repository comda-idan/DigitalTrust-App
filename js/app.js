/* ===== App core: router + chrome + bootstrap ===== */
window.Screens = window.Screens || {};

window.App = (function () {
  const { el, $, toast, sheet } = U;
  const t = (k) => I18N.t(k);

  // routes that show the bottom tab bar
  const NAV_ROUTES = ['home', 'signed', 'send', 'sent'];
  // routes with no top chrome at all (full-screen editor)
  const BARE_ROUTES = ['editor'];

  let current = null;

  function go(route, params) {
    const hash = '#/' + route + (params ? '?' + new URLSearchParams(params) : '');
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function parseHash() {
    const h = location.hash.replace(/^#\//, '') || '';
    const [route, qs] = h.split('?');
    const params = Object.fromEntries(new URLSearchParams(qs || ''));
    return { route: route || '', params };
  }

  // ---- chrome ----
  function header(bare) {
    const s = Store.get();
    const brand = el('div', { class: 'brand-mark' }, [
      el('img', { class: 'logo', src: 'assets/logo.png', alt: 'COMDA' }),
      el('div', { class: 'wordmark' }, [
        el('b', { text: 'Digital Trust' }),
        el('span', { text: 'by COMDA' })
      ])
    ]);
    const right = [langPill()];
    if (s.loggedIn) right.unshift(avatarBtn());
    return el('header', { class: 'app-hdr' }, [
      brand, el('div', { class: 'spacer' }), ...right
    ]);
  }

  function langPill() {
    return el('button', {
      class: 'lang-pill', onclick: openLangMenu,
      html: U.iconHTML('globe', 15) + '<span>' + I18N.get().toUpperCase() + '</span>'
    });
  }
  function openLangMenu() {
    const box = el('div', {}, [
      el('h3', { html: U.iconHTML('globe', 18) + ' ' + t('lang_he') + ' · ' + t('lang_en') + ' · ' + t('lang_ru'), style: { marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' } }),
      ...I18N.langs().map(([code, name]) =>
        el('button', {
          class: 'btn ' + (code === I18N.get() ? 'primary' : 'subtle'),
          style: { marginBottom: '10px' }, text: name,
          onclick: () => { I18N.set(code); close(); render(); }
        })
      )
    ]);
    const close = sheet(box);
  }

  function avatarBtn() {
    const s = Store.get();
    const name = (s.user && (s.user.name || s.user.email)) || '';
    return el('button', { class: 'avatar-btn', text: U.initials(name), onclick: openProfileMenu });
  }
  function openProfileMenu() {
    const items = [
      ['user', t('profile_title'), () => go('profile')],
      ['info', t('about_title'), () => go('about')],
      ['settings', t('settings'), () => go('admin')],
    ];
    const box = el('div', {}, [
      el('h3', { text: t('profile'), style: { marginBottom: '14px' } }),
      ...items.map(([ic, label, fn]) => el('button', {
        class: 'btn subtle', style: { marginBottom: '10px', justifyContent: 'flex-start' },
        html: U.iconHTML(ic, 19) + '<span style="margin-inline-start:4px">' + label + '</span>',
        onclick: () => { close(); fn(); }
      })),
      el('button', {
        class: 'btn link', style: { marginTop: '4px' }, html: U.iconHTML('logout', 18) + ' ' + t('logout'),
        onclick: () => { close(); Store.update(st => { st.loggedIn = false; }); go('login'); }
      })
    ]);
    const close = sheet(box);
  }

  function tabbar(route) {
    const tabs = [
      ['home', 'home', t('tab_home')],
      ['signed', 'signature', t('tab_signed')],
      ['sent', 'send', t('tab_sent')],
    ];
    return el('nav', { class: 'tabbar' }, tabs.map(([r, ic, label]) =>
      el('button', {
        class: route === r ? 'active' : '', onclick: () => go(r),
        html: '<span class="tb-ic">' + U.iconHTML(ic, 23) + '</span><span>' + label + '</span>'
      })
    ));
  }

  // back button helper for sub screens
  function backBar(toRoute, title) {
    return el('div', { class: 'backbar' }, [
      el('button', {
        class: 'icon-btn', html: U.iconHTML(I18N.dir() === 'rtl' ? 'arrow-right' : 'arrow-left', 20),
        onclick: () => toRoute ? go(toRoute) : history.back()
      }),
      el('h1', { text: title })
    ]);
  }

  // ---- render ----
  function render() {
    const { route, params } = parseHash();
    const s = Store.get();

    // route guards
    let r = route;
    if (!r) r = !s.registered ? 'welcome' : (!s.loggedIn ? 'login' : 'home');
    if (!Screens[r]) r = s.loggedIn ? 'home' : (s.registered ? 'login' : 'welcome');
    // protect app routes
    const appRoute = NAV_ROUTES.concat(['profile', 'about', 'sign', 'editor', 'recipient']).includes(r);
    if (appRoute && !s.loggedIn && r !== 'admin') r = s.registered ? 'login' : 'welcome';

    current = r;
    const root = $('#root');
    root.innerHTML = '';

    const bare = BARE_ROUTES.includes(r);
    if (!bare) root.appendChild(header());

    const main = el('main', { class: 'app-main' + (NAV_ROUTES.includes(r) ? ' with-nav' : '') });
    root.appendChild(main);

    try {
      Screens[r](main, params);
    } catch (e) {
      console.error(e);
      main.appendChild(el('div', { class: 'banner err', text: 'Error: ' + e.message }));
    }

    if (NAV_ROUTES.includes(r)) root.appendChild(tabbar(r));

    // scroll top
    main.scrollTop = 0; window.scrollTo(0, 0);
    ensureAdminTap();
  }

  // hidden admin tap target (bottom corner, invisible)
  function ensureAdminTap() {
    if ($('#admin-tap')) return;
    const b = el('button', { id: 'admin-tap', 'aria-label': 'admin', title: '' , onclick: () => go('admin') });
    document.body.appendChild(b);
  }

  function boot() {
    window.addEventListener('hashchange', render);
    render();
    // service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  }

  return { go, render, backBar, boot, current: () => current };
})();
