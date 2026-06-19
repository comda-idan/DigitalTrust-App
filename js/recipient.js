/* ===== Option 2: send a document for recipient signing ===== */
(function () {
  const { el, $, $$, toast, sheet, detectType, fileToBase64, fileToArrayBuffer, downloadBase64, MIME, confirmDialog } = U;
  const t = (k) => I18N.t(k);
  const go = (r, p) => App.go(r, p);

  // transient working document, shared between editor & recipient screens
  window.SendDoc = window.SendDoc || { sources: [], fields: [] };
  function resetDoc() { window.SendDoc = { sources: [], fields: [] }; }

  const PAGE_FALLBACK_W = 720;

  /* ---------------------------------------------------------------- *
   *  SCREEN: upload & merge
   * ---------------------------------------------------------------- */
  Screens.send = function (main) {
    main.appendChild(App.backBar('home', '📨 ' + t('se_title')));

    const sources = []; // {file, type, base64}
    const drop = el('div', { class: 'card center', style: { padding: '28px 16px', cursor: 'pointer', border: '1.5px dashed var(--line)' } }, [
      el('div', { html: '📨', style: { fontSize: '44px' } }),
      el('h3', { text: t('se_upload') }),
      el('p', { class: 'small muted', text: t('se_upload_d') })
    ]);
    const fileIn = el('input', { type: 'file', accept: '.pdf,.docx,.doc', multiple: 'multiple', style: { display: 'none' } });
    drop.addEventListener('click', () => fileIn.click());
    main.appendChild(drop);
    main.appendChild(fileIn);

    const list = el('div', {});
    main.appendChild(list);
    const cont = el('button', { class: 'btn primary', style: { display: 'none', marginTop: '6px' }, html: t('se_edit') + ' →' });
    main.appendChild(cont);

    fileIn.addEventListener('change', async () => {
      for (const f of Array.from(fileIn.files)) {
        const type = await detectType(f);
        if (type !== 'pdf' && type !== 'docx') { toast(t('se_bad_type')); continue; }
        sources.push({ file: f, type, base64: await fileToBase64(f) });
      }
      fileIn.value = '';
      renderList();
    });

    function renderList() {
      list.innerHTML = '';
      if (!sources.length) { cont.style.display = 'none'; return; }
      const card = el('div', { class: 'card' });
      sources.forEach((s, i) => {
        const icon = s.type === 'pdf' ? '📕' : '📘';
        card.appendChild(el('div', { class: 'row' }, [
          el('div', { class: 'ic', html: icon }),
          el('div', { class: 'main' }, [el('div', { class: 't', text: s.file.name }), el('div', { class: 'sub', text: s.type.toUpperCase() + ' · ' + Math.ceil(s.file.size / 1024) + ' KB' })]),
          el('div', { class: 'actions' }, [el('button', { class: 'icon-btn', html: '✕', onclick: () => { sources.splice(i, 1); renderList(); } })])
        ]));
      });
      list.appendChild(card);
      if (sources.length > 1) list.appendChild(el('p', { class: 'small muted center', text: t('se_upload_d') }));
      cont.style.display = 'block';
    }

    cont.addEventListener('click', () => {
      resetDoc();
      window.SendDoc.sources = sources.slice();
      go('editor');
    });
  };

  /* ---------------------------------------------------------------- *
   *  SCREEN: field editor (BARE / full-screen)
   * ---------------------------------------------------------------- */
  const TOOLS = [
    ['sign', 'tool_sign', '✍️'],
    ['text', 'tool_text', '🔤'],
    ['date', 'tool_date', '📅'],
    ['check', 'tool_check', '☑️'],
  ];
  // default field size as % of page (w,h). kept modest; user can shrink very small.
  const DEF = { sign: [26, 9], text: [24, 5], date: [18, 5], check: [7, 5] };

  Screens.editor = function (main) {
    const doc = window.SendDoc;
    if (!doc || !doc.sources || !doc.sources.length) { go('send'); return; }

    let activeTool = null;
    let scale = 1, baseScale = 1;
    let selected = null;

    const wrap = el('div', { class: 'editor-wrap' });

    // --- toolbar ---
    const toolbar = el('div', { class: 'editor-toolbar' });
    toolbar.appendChild(el('button', {
      class: 'tool', html: '<span class="ic">' + (I18N.dir() === 'rtl' ? '→' : '←') + '</span><span>' + t('back') + '</span>',
      onclick: () => go('send')
    }));
    const toolBtns = {};
    TOOLS.forEach(([key, label, ic]) => {
      const b = el('button', { class: 'tool', html: '<span class="ic">' + ic + '</span><span>' + t(label) + '</span>', onclick: () => selectTool(key) });
      toolBtns[key] = b; toolbar.appendChild(b);
    });
    wrap.appendChild(toolbar);
    wrap.appendChild(el('div', { class: 'banner info', style: { margin: '8px 10px 0', fontSize: '12px' }, html: '💡 ' + t('tool_hint') }));

    // --- scrollable canvas with zoomable page stack ---
    const canvas = el('div', { class: 'editor-canvas' });
    const stack = el('div', { class: 'page-stack' });
    canvas.appendChild(stack);
    wrap.appendChild(canvas);

    // --- footer: zoom + continue ---
    const footer = el('div', { class: 'editor-footer' });
    footer.appendChild(el('div', { class: 'zoom-ctl' }, [
      el('button', { html: '−', onclick: () => setZoom(scale - 0.2) }),
      el('span', { id: 'zlevel', class: 'small muted', text: '100%' }),
      el('button', { html: '+', onclick: () => setZoom(scale + 0.2) }),
    ]));
    footer.appendChild(el('button', {
      class: 'btn primary', html: t('ed_continue') + ' →',
      onclick: () => { if (!doc.fields.length) { toast(t('ed_no_fields')); return; } go('recipient'); }
    }));
    wrap.appendChild(footer);
    main.appendChild(wrap);

    function selectTool(key) {
      activeTool = activeTool === key ? null : key;
      Object.entries(toolBtns).forEach(([k, b]) => b.classList.toggle('active', k === activeTool));
    }

    function setZoom(z) {
      scale = Math.max(0.5, Math.min(4, z));
      stack.style.transform = 'scale(' + scale + ')';
      $('#zlevel').textContent = Math.round(scale * 100) + '%';
      refreshFonts();
    }

    // ---------- build pages ----------
    const pageEls = [];
    buildPages(stack, doc.sources, () => {
      // restore any previously placed fields (when returning from recipient via back)
      (doc.fields || []).forEach(f => mountField(f));
      refreshFonts();
    });

    async function buildPages(stackEl, sources, done) {
      const baseW = Math.max(280, (canvas.clientWidth || PAGE_FALLBACK_W) - 28);
      for (const src of sources) {
        if (src.type === 'pdf' && window.pdfjsLib) {
          try { await renderPdf(src, baseW, stackEl); continue; } catch (e) { console.warn('pdf render failed', e); }
        }
        if (src.type === 'docx' && window.mammoth) {
          try { await renderDocx(src, baseW, stackEl); continue; } catch (e) { console.warn('docx render failed', e); }
        }
        placeholderPage(src, baseW, stackEl);
      }
      done && done();
    }

    async function renderPdf(src, baseW, stackEl) {
      const buf = await fileToArrayBuffer(src.file);
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const vp1 = page.getViewport({ scale: 1 });
        const rs = baseW / vp1.width;
        const vp = page.getViewport({ scale: rs * dpr });
        const cv = el('canvas', {}); cv.width = vp.width; cv.height = vp.height;
        cv.style.width = baseW + 'px'; cv.style.height = (vp.height / dpr) + 'px';
        const pageEl = el('div', { class: 'pdf-page', style: { width: baseW + 'px', height: (vp.height / dpr) + 'px' } }, [cv]);
        stackEl.appendChild(pageEl);
        registerPage(pageEl);
        await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      }
    }

    async function renderDocx(src, baseW, stackEl) {
      const buf = await fileToArrayBuffer(src.file);
      const r = await window.mammoth.convertToHtml({ arrayBuffer: buf });
      const inner = el('div', { class: 'docx-body', html: r.value });
      const pageEl = el('div', { class: 'pdf-page', style: { width: baseW + 'px', minHeight: Math.round(baseW * 1.414) + 'px', padding: '28px 30px' } }, [inner]);
      stackEl.appendChild(pageEl);
      registerPage(pageEl);
    }

    function placeholderPage(src, baseW, stackEl) {
      const pageEl = el('div', { class: 'pdf-page ph', style: { width: baseW + 'px', height: Math.round(baseW * 1.414) + 'px' } }, [
        el('div', { class: 'ph-body' }, [
          el('div', { html: src.type === 'pdf' ? '📕' : '📘', style: { fontSize: '40px' } }),
          el('div', { class: 't', text: src.file.name }),
          el('p', { class: 'small muted', text: t('se_edit') })
        ])
      ]);
      stackEl.appendChild(pageEl);
      registerPage(pageEl);
    }

    function registerPage(pageEl) {
      const idx = pageEls.length;
      pageEl.dataset.page = idx;
      pageEls.push(pageEl);
      pageEl.addEventListener('click', (e) => {
        if (!activeTool) return;
        if (e.target.closest('.fld')) return;
        const rect = pageEl.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        addField(activeTool, idx, xPct, yPct);
      });
    }

    // ---------- field model ----------
    function addField(type, pageIdx, xPct, yPct) {
      const [w, h] = DEF[type];
      const f = {
        id: U.uid(), type, page: pageIdx,
        x: clamp(xPct - w / 2, 0, 100 - w),
        y: clamp(yPct - h / 2, 0, 100 - h),
        w, h
      };
      doc.fields.push(f);
      mountField(f, true);
    }

    function fieldLabel(type) {
      return type === 'sign' ? '✍️ ' + t('tool_sign')
        : type === 'date' ? t('tool_date')
        : type === 'check' ? '☑' : t('tool_text');
    }

    function mountField(f, select) {
      const pageEl = pageEls[f.page]; if (!pageEl) return;
      const node = el('div', {
        class: 'fld', 'data-id': f.id,
        style: { left: f.x + '%', top: f.y + '%', width: f.w + '%', height: f.h + '%' }
      }, [
        el('span', { class: 'lbl', text: fieldLabel(f.type) }),
        el('button', { class: 'del', html: '✕', onclick: (e) => { e.stopPropagation(); removeField(f, node); } }),
        el('span', { class: 'handle' })
      ]);
      f._node = node;
      pageEl.appendChild(node);
      attachFieldGestures(f, node, pageEl);
      if (select) selectField(f);
      autoFont(node);
    }

    function removeField(f, node) {
      const i = doc.fields.indexOf(f); if (i >= 0) doc.fields.splice(i, 1);
      node.remove(); if (selected === f) selected = null;
    }

    function selectField(f) {
      selected = f;
      $$('.fld', stack).forEach(n => n.classList.remove('sel'));
      f._node && f._node.classList.add('sel');
    }

    // ---------- gestures: tap-select, long-press drag, corner resize ----------
    function attachFieldGestures(f, node, pageEl) {
      let mode = null;          // 'drag' | 'resize'
      let lpTimer = null;
      let start = null;

      const handle = node.querySelector('.handle');

      handle.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault();
        mode = 'resize';
        const rect = pageEl.getBoundingClientRect();
        start = { px: e.clientX, py: e.clientY, w: f.w, h: f.h, rw: rect.width, rh: rect.height };
        handle.setPointerCapture(e.pointerId);
        selectField(f);
      });

      node.addEventListener('pointerdown', (e) => {
        if (e.target === handle || e.target.classList.contains('del')) return;
        e.stopPropagation();
        selectField(f);
        const rect = pageEl.getBoundingClientRect();
        start = { px: e.clientX, py: e.clientY, x: f.x, y: f.y, rw: rect.width, rh: rect.height, moved: false };
        node.setPointerCapture(e.pointerId);
        lpTimer = setTimeout(() => { mode = 'drag'; node.classList.add('drag'); }, 320);
      });

      node.addEventListener('pointermove', (e) => {
        if (!start) return;
        const dx = e.clientX - start.px, dy = e.clientY - start.py;
        if (mode === 'resize') {
          const dxPct = (dx / start.rw) * 100, dyPct = (dy / start.rh) * 100;
          const dir = I18N.dir() === 'rtl' ? -1 : 1;
          f.w = clamp(start.w + dxPct * dir, 2, 100 - f.x);
          f.h = clamp(start.h + dyPct, 1.5, 100 - f.y);
          node.style.width = f.w + '%'; node.style.height = f.h + '%';
          autoFont(node);
          return;
        }
        if (Math.abs(dx) + Math.abs(dy) > 6 && !start.moved) { start.moved = true; }
        if (mode === 'drag') {
          const dxPct = (dx / start.rw) * 100, dyPct = (dy / start.rh) * 100;
          f.x = clamp(start.x + dxPct, 0, 100 - f.w);
          f.y = clamp(start.y + dyPct, 0, 100 - f.h);
          node.style.left = f.x + '%'; node.style.top = f.y + '%';
        }
      });

      function endPointer(e) {
        clearTimeout(lpTimer);
        node.classList.remove('drag');
        mode = null; start = null;
      }
      node.addEventListener('pointerup', endPointer);
      node.addEventListener('pointercancel', endPointer);
      handle.addEventListener('pointerup', () => { mode = null; start = null; });
      handle.addEventListener('pointercancel', () => { mode = null; start = null; });
    }

    function autoFont(node) {
      const h = node.offsetHeight || 0;
      node.querySelector('.lbl').style.fontSize = Math.max(6, Math.min(h * 0.5, 30)) + 'px';
    }
    function refreshFonts() { $$('.fld', stack).forEach(autoFont); }

    // ---------- pinch-zoom on canvas ----------
    const pts = new Map();
    let pinchStart = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.fld')) return;
      pts.set(e.pointerId, e);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinchStart = { dist: dist(a, b), scale };
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e);
      if (pts.size === 2 && pinchStart) {
        const [a, b] = [...pts.values()];
        const ratio = dist(a, b) / (pinchStart.dist || 1);
        setZoom(pinchStart.scale * ratio);
      }
    });
    function liftPt(e) { pts.delete(e.pointerId); if (pts.size < 2) pinchStart = null; }
    canvas.addEventListener('pointerup', liftPt);
    canvas.addEventListener('pointercancel', liftPt);
  };

  function dist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------------------------------------------------------------- *
   *  SCREEN: recipient selection
   * ---------------------------------------------------------------- */
  Screens.recipient = function (main) {
    const doc = window.SendDoc;
    if (!doc || !doc.sources || !doc.sources.length) { go('send'); return; }
    main.appendChild(App.backBar('editor', '👥 ' + t('rc_title')));

    let chosen = null;       // {name, email, phone}
    let channel = 'email';   // 'email' | 'sms'

    // chosen recipient chip
    const chipWrap = el('div', { style: { marginBottom: '6px' } });

    // search + autocomplete
    const search = el('input', { type: 'text', placeholder: t('rc_search'), autocomplete: 'off' });
    const suggest = el('div', { class: 'suggest', style: { display: 'none' } });
    const searchWrap = el('div', { class: 'search-wrap' }, [search, suggest]);
    main.appendChild(el('label', { class: 'field' }, [el('span', { text: t('rc_title') }), searchWrap]));

    function contacts() { return Store.get().contacts || []; }
    function renderSuggest() {
      const q = search.value.trim().toLowerCase();
      suggest.innerHTML = '';
      if (!q) { suggest.style.display = 'none'; return; }
      const matches = contacts().filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      ).slice(0, 6);
      if (!matches.length) { suggest.style.display = 'none'; return; }
      matches.forEach(c => suggest.appendChild(el('div', {
        class: 'opt', onclick: () => pick(c),
        html: '<b>' + esc(c.name) + '</b><br><span class="small muted">' + esc(c.email || c.phone || '') + '</span>'
      })));
      suggest.style.display = 'block';
    }
    search.addEventListener('input', renderSuggest);

    // device contacts
    main.appendChild(el('button', {
      class: 'btn subtle', style: { marginBottom: '10px' }, html: '📱 ' + t('rc_from_device'),
      onclick: pickFromDevice
    }));

    // add-new form
    const nameIn = el('input', { type: 'text', placeholder: t('rc_name') });
    const emailIn = el('input', { type: 'email', placeholder: t('email_ph'), inputmode: 'email', dir: 'ltr' });
    const phoneIn = el('input', { type: 'tel', placeholder: t('rc_phone'), inputmode: 'tel', dir: 'ltr' });
    main.appendChild(el('details', { class: 'card' }, [
      el('summary', { text: '➕ ' + t('rc_add_new'), style: { cursor: 'pointer', fontWeight: '600' } }),
      el('div', { style: { marginTop: '12px' } }, [
        el('label', { class: 'field' }, [el('span', { text: t('rc_name') }), nameIn]),
        el('label', { class: 'field' }, [el('span', { text: t('email') }), emailIn]),
        el('label', { class: 'field' }, [el('span', { text: t('rc_phone') }), phoneIn]),
        el('button', {
          class: 'btn subtle', text: t('save'),
          onclick: () => {
            const name = nameIn.value.trim(), email = emailIn.value.trim(), phone = phoneIn.value.trim();
            if (!name || (!email && !phone)) { toast(t('required')); return; }
            const c = { id: U.uid(), name, email, phone };
            Store.update(st => { st.contacts.push(c); });
            toast(t('rc_saved'));
            pick(c);
            nameIn.value = emailIn.value = phoneIn.value = '';
          }
        })
      ])
    ]));

    // channel + send (built once a recipient is chosen)
    const tail = el('div', {});
    main.appendChild(tail);

    function pick(c) {
      chosen = c;
      search.value = ''; suggest.style.display = 'none';
      renderChip(); renderTail();
    }
    function renderChip() {
      chipWrap.innerHTML = '';
      if (chosen) chipWrap.appendChild(el('div', { class: 'chip' }, [
        document.createTextNode('👤 ' + (chosen.name || chosen.email || chosen.phone)),
        el('button', { html: '✕', onclick: () => { chosen = null; renderChip(); renderTail(); } })
      ]));
    }
    main.insertBefore(chipWrap, searchWrap.parentNode); // chip above search label

    function renderTail() {
      tail.innerHTML = '';
      if (!chosen) return;
      const hasEmail = !!chosen.email, hasPhone = !!chosen.phone;
      if (!hasEmail) channel = 'sms'; if (!hasPhone) channel = 'email';
      const seg = el('div', { class: 'seg', style: { display: 'flex', gap: '8px', margin: '6px 0 14px' } }, [
        segBtn('email', '✉️ ' + t('rc_via_email'), hasEmail),
        segBtn('sms', '💬 ' + t('rc_via_sms'), hasPhone)
      ]);
      tail.appendChild(seg);
      tail.appendChild(el('button', { class: 'btn primary', html: '📨 ' + t('rc_send'), onclick: doSend }));

      function segBtn(val, label, enabled) {
        return el('button', {
          class: 'btn ' + (channel === val ? 'primary' : 'subtle'), style: { flex: '1', opacity: enabled ? '1' : '.4' },
          text: label, disabled: enabled ? null : 'disabled',
          onclick: () => { if (!enabled) return; channel = val; renderTail(); }
        });
      }
    }

    function doSend() {
      if (!chosen) { toast(t('rc_pick')); return; }
      const names = doc.sources.map(s => s.file.name);
      const docName = names.length === 1 ? names[0] : (names[0] + ' +' + (names.length - 1));
      const rec = {
        id: U.uid(),
        name: docName,
        files: doc.sources.map(s => ({ name: s.file.name, type: s.type, b64: s.base64 })),
        fields: doc.fields.length,
        recipient: { name: chosen.name || '', email: chosen.email || '', phone: chosen.phone || '', channel },
        date: Date.now(),
        status: 'pending'
      };
      Store.update(st => { st.sentDocs.unshift(rec); });
      resetDoc();
      sheet(el('div', { class: 'center' }, [
        el('div', { html: '📨', style: { fontSize: '54px' } }),
        el('h3', { text: t('rc_sent_title') }),
        el('p', { class: 'small muted', text: t('rc_sent_sub') }),
        el('button', { class: 'btn primary', style: { marginTop: '12px' }, text: t('ok'), onclick: () => { $('.scrim')?.remove(); go('sent'); } })
      ]), { center: true, locked: true });
    }

    async function pickFromDevice() {
      if (!(navigator.contacts && navigator.contacts.select)) { toast(t('rc_device_unsupported')); return; }
      try {
        const sel = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: false });
        if (!sel || !sel.length) return;
        const d = sel[0];
        const c = { id: U.uid(), name: (d.name && d.name[0]) || '', email: (d.email && d.email[0]) || '', phone: (d.tel && d.tel[0]) || '' };
        Store.update(st => { if (!st.contacts.some(x => x.email === c.email && x.phone === c.phone)) st.contacts.push(c); });
        pick(c);
      } catch (e) { toast(t('rc_device_unsupported')); }
    }
  };

  /* ---------------------------------------------------------------- *
   *  SCREEN: sent documents status list
   * ---------------------------------------------------------------- */
  Screens.sent = function (main) {
    main.appendChild(el('div', { style: { marginBottom: '8px' } }, [
      el('h1', { text: t('sent_title') })
    ]));
    const docs = Store.get().sentDocs || [];
    if (!docs.length) { main.appendChild(window.emptyState('📨', t('sent_empty'))); return; }

    const list = el('div', { class: 'card' });
    docs.forEach(d => list.appendChild(renderSentRow(d)));
    main.appendChild(list);
  };

  function renderSentRow(d) {
    const pillClass = d.status === 'signed' ? 'signed' : (d.status === 'sent' ? 'sent' : 'pending');
    const pillText = d.status === 'signed' ? t('st_signed') : (d.status === 'sent' ? t('st_sent') : t('st_pending'));
    const icon = (d.files && d.files[0] && d.files[0].type === 'pdf') ? '📕' : '📘';

    const actions = el('div', { class: 'actions' });
    // resend
    actions.appendChild(el('button', { class: 'icon-btn', title: t('act_resend'), html: '🔁', onclick: () => toast(t('resent_ok')) }));
    // change recipient (only if not yet signed)
    if (d.status !== 'signed') {
      actions.appendChild(el('button', { class: 'icon-btn', title: t('act_change'), html: '👤', onclick: () => changeRecipient(d) }));
    }
    // view
    actions.appendChild(el('button', {
      class: 'icon-btn', title: t('act_view'), html: '👁️',
      onclick: () => { const f = d.files && d.files[0]; if (f) downloadBase64(f.b64, f.name, MIME[f.type]); }
    }));
    // download signed (only if signed)
    if (d.status === 'signed') {
      actions.appendChild(el('button', {
        class: 'icon-btn', title: t('act_dl'), html: '⬇️',
        onclick: () => { const f = d.files && d.files[0]; if (f) downloadBase64(f.b64, 'signed_' + f.name, MIME[f.type]); }
      }));
    } else {
      // demo helper: mark as signed
      actions.appendChild(el('button', { class: 'icon-btn', title: t('mark_signed'), html: '✅', onclick: () => markSigned(d) }));
    }

    return el('div', { class: 'row' }, [
      el('div', { class: 'ic', html: icon }),
      el('div', { class: 'main' }, [
        el('div', { class: 't', text: d.name }),
        el('div', { class: 'sub', text: U.fmtDate(d.date) + ' · ' + (d.recipient.name || d.recipient.email || d.recipient.phone || '') })
      ]),
      el('span', { class: 'pill ' + pillClass, text: pillText }),
      actions
    ]);
  }

  function markSigned(d) {
    Store.update(st => { const x = st.sentDocs.find(s => s.id === d.id); if (x) x.status = 'signed'; });
    toast(t('st_signed'));
    App.render();
  }

  function changeRecipient(d) {
    const nameIn = el('input', { type: 'text', placeholder: t('rc_name'), value: d.recipient.name || '' });
    const contactIn = el('input', { type: 'text', placeholder: t('email') + ' / ' + t('rc_phone'), dir: 'ltr', value: d.recipient.email || d.recipient.phone || '' });
    let close;
    const body = el('div', {}, [
      el('h3', { text: t('act_change'), style: { marginBottom: '12px' } }),
      el('label', { class: 'field' }, [el('span', { text: t('rc_name') }), nameIn]),
      el('label', { class: 'field' }, [el('span', { text: t('email') + ' / ' + t('rc_phone') }), contactIn]),
      el('button', {
        class: 'btn primary', text: t('save'),
        onclick: () => {
          const val = contactIn.value.trim();
          Store.update(st => {
            const x = st.sentDocs.find(s => s.id === d.id);
            if (x) {
              x.recipient.name = nameIn.value.trim();
              if (val.includes('@')) { x.recipient.email = val; x.recipient.channel = 'email'; }
              else { x.recipient.phone = val; x.recipient.channel = 'sms'; }
            }
          });
          close(); toast(t('recipient_changed')); App.render();
        }
      })
    ]);
    close = sheet(body);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
})();
