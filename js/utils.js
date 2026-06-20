/* ===== Utils: DOM, toast, modal, files, validation ===== */
window.U = (function () {
  const t = (k) => window.I18N.t(k);

  // DOM builder
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    }
    if (children != null) (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Toast
  let toastTimer;
  function toast(msg, ms) {
    let n = $('#toast');
    if (!n) { n = el('div', { id: 'toast' }); document.body.appendChild(n); }
    n.textContent = msg; n.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => n.classList.remove('show'), ms || 2200);
  }

  // Bottom-sheet / centered modal. content is a DOM node. Returns close fn.
  function sheet(contentNode, opts) {
    opts = opts || {};
    const scrim = el('div', { class: 'scrim' + (opts.center ? ' center' : '') });
    const box = el('div', { class: 'sheet' });
    if (!opts.center) box.appendChild(el('div', { class: 'grip' }));
    box.appendChild(contentNode);
    scrim.appendChild(box);
    function close() { scrim.remove(); }
    scrim.addEventListener('click', (e) => { if (e.target === scrim && !opts.locked) close(); });
    document.body.appendChild(scrim);
    return close;
  }

  function confirmDialog(message, onYes, opts) {
    opts = opts || {};
    let close;
    const body = el('div', {}, [
      el('p', { text: message, style: { fontSize: '15px', margin: '4px 0 18px' } }),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn subtle', onclick: () => close(), text: t('cancel') }),
        el('button', {
          class: 'btn ' + (opts.danger ? 'danger' : 'primary'),
          text: opts.yesText || t('confirm'),
          onclick: () => { close(); onYes && onYes(); }
        })
      ])
    ]);
    close = sheet(body, { center: true });
  }

  // File -> base64 (no data: prefix)
  function fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  function fileToArrayBuffer(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsArrayBuffer(file);
    });
  }

  // Detect real file type from magic bytes + extension. Returns 'pdf'|'docx'|'xlsx'|null
  async function detectType(file) {
    const buf = new Uint8Array(await fileToArrayBuffer(file.slice(0, 8)));
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    // PDF: %PDF
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'pdf';
    // ZIP container (PK\x03\x04) => docx/xlsx — decide by extension
    if (buf[0] === 0x50 && buf[1] === 0x4B) {
      if (ext === 'docx') return 'docx';
      if (ext === 'xlsx') return 'xlsx';
      return null;
    }
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx') return 'docx';
    if (ext === 'xlsx') return 'xlsx';
    return null;
  }

  function downloadBase64(b64, filename, mime) {
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    downloadBlob(new Blob([arr], { type: mime || 'application/octet-stream' }), filename);
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function downloadText(text, filename) {
    downloadBlob(new Blob([text], { type: 'application/json' }), filename);
  }

  const MIME = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  // Validation
  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validEmail(s) { return reEmail.test((s || '').trim()); }

  // PIN policy: 6 digits, no single-repeated digit, no fully ascending/descending consecutive run
  function pinError(pin) {
    if (!/^\d{6}$/.test(pin)) return t('pin_rule_len');
    if (/^(\d)\1{5}$/.test(pin)) return t('pin_rule_repeat');
    let asc = true, desc = true;
    for (let i = 1; i < pin.length; i++) {
      const d = +pin[i] - +pin[i - 1];
      if (d !== 1) asc = false;
      if (d !== -1) desc = false;
    }
    if (asc || desc) return t('pin_rule_seq');
    return null;
  }

  function genOtp() { return String(Math.floor(100000 + Math.random() * 900000)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function fmtDate(ts) {
    const d = new Date(ts);
    const loc = window.I18N.get() === 'ru' ? 'ru-RU' : (window.I18N.get() === 'en' ? 'en-GB' : 'he-IL');
    return d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' · ' +
      d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  }
  function initials(s) {
    if (!s) return '?';
    const p = s.trim().split(/\s+|@/).filter(Boolean);
    return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || s[0].toUpperCase();
  }

  function base64ToFile(b64, filename, mime) {
    const bytes = atob(b64); const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], filename, { type: mime || 'application/octet-stream' });
  }
  // Open the OS share sheet with the file attached (lets the user pick Mail/Gmail/etc).
  // Returns 'shared' | 'unsupported' | 'cancelled'. Falls back to download on unsupported.
  async function shareFile(b64, filename, mime, opts) {
    opts = opts || {};
    try {
      const file = base64ToFile(b64, filename, mime);
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: opts.title || filename, text: opts.text || '' });
        return 'shared';
      }
      // no file-share support -> download so they can attach manually
      downloadBase64(b64, filename, mime);
      return 'unsupported';
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return 'cancelled';
      try { downloadBase64(b64, filename, mime); } catch (_) {}
      return 'unsupported';
    }
  }

  return {
    el, $, $$, toast, sheet, confirmDialog, fileToBase64, fileToArrayBuffer, fileToBlobUrl: null,
    detectType, downloadBase64, downloadBlob, downloadText, base64ToFile, shareFile, MIME, validEmail, pinError,
    genOtp, uid, fmtDate, initials, t
  };
})();
