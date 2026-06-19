/* ===== Icon system: crisp inline line-SVGs (no emoji) ===== */
(function () {
  const P = {
    home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    check: '<path d="M5 12.5 10 17 19 7"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8.2 12.3 11 15l4.8-5.6"/>',
    x: '<path d="M6 6 18 18M18 6 6 18"/>',
    'x-circle': '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    'arrow-right': '<path d="M5 12h13M12.5 6l6 6-6 6"/>',
    'arrow-left': '<path d="M19 12H6M11.5 6l-6 6 6 6"/>',
    'chevron-right': '<path d="M9 5l7 7-7 7"/>',
    download: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11"/><path d="M5 19.5h14"/>',
    upload: '<path d="M12 20V9M7.5 13 12 8.5 16.5 13"/><path d="M5 4.5h14"/>',
    alert: '<path d="M12 4.5 3 20h18L12 4.5Z"/><path d="M12 10.5v4"/><circle cx="12" cy="17.4" r=".7" fill="currentColor" stroke="none"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11.2v5"/><circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.6v3.2M12 18.2v3.2M21.4 12h-3.2M5.8 12H2.6M18.6 5.4l-2.2 2.2M7.6 16.4l-2.2 2.2M18.6 18.6l-2.2-2.2M7.6 7.6 5.4 5.4"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c.4-3.8 3.2-6 7-6s6.6 2.2 7 6"/>',
    users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.2 19c.4-3.2 2.7-5 5.8-5s5.4 1.8 5.8 5"/><path d="M16 6.2a3 3 0 0 1 0 5.8M17.5 14.2c2.2.5 3.6 2.2 3.8 4.8"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3.2 12h17.6"/><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/>',
    key: '<circle cx="8" cy="14" r="3.6"/><path d="m10.6 11.4 8-8M16 4l3 3M14.2 5.8l2.4 2.4"/>',
    lock: '<rect x="5" y="11" width="14" height="9.5" rx="2.2"/><path d="M8 11V8.2a4 4 0 0 1 8 0V11"/><circle cx="12" cy="15" r="1.2"/><path d="M12 16.2v1.8"/>',
    shield: '<path d="M12 3.2 5.2 6v5.2c0 4.2 2.9 7.2 6.8 8.4 3.9-1.2 6.8-4.2 6.8-8.4V6L12 3.2Z"/>',
    'shield-check': '<path d="M12 3.2 5.2 6v5.2c0 4.2 2.9 7.2 6.8 8.4 3.9-1.2 6.8-4.2 6.8-8.4V6L12 3.2Z"/><path d="M9 11.8 11 14l4-4.4"/>',
    fingerprint: '<path d="M12 4.3a6.7 6.7 0 0 0-6.6 6.7v2.2M18.6 10.6A6.6 6.6 0 0 0 15 4.9"/><path d="M9 11a3 3 0 0 1 6 0v2.2a9 9 0 0 0 1 4"/><path d="M12 11.2v2.4a12 12 0 0 0 1.1 5"/><path d="M8.4 17.6A9 9 0 0 1 8 13.6V11"/>',
    signature: '<path d="M3.5 19.5c3-.4 4.6-1.4 6-3.2 1-1.3 1.4-3 .6-4-1-1.2-2.6-.3-2.7 1.4-.1 2 1.6 3.3 3.6 3.3 1.8 0 2.7-1.1 3.5-2.4"/><path d="M14.5 14.6c1-1 2.2-2.4 3.4-2.2.8.1.9 1 .3 1.7-.5.6-1 .9-1 1.6 0 .6.5.9 1.2.9 1 0 1.7-.6 2.1-1.2"/>',
    file: '<path d="M7 3.5h7l4.5 4.5v12.5H7V3.5Z"/><path d="M13.8 3.6V8.4h4.6"/>',
    calendar: '<rect x="4" y="5.2" width="16" height="15" rx="2.2"/><path d="M4 9.4h16M8.2 3.4v3.6M15.8 3.4v3.6"/>',
    type: '<path d="M5 6.2h14"/><path d="M12 6.4v13.2"/><path d="M9 19.4h6"/><path d="M5 6.2v2M19 6.2v2"/>',
    'check-square': '<rect x="4" y="4" width="16" height="16" rx="3.2"/><path d="M8 12.2 10.6 15 16 9"/>',
    mail: '<rect x="3" y="5.3" width="18" height="13.4" rx="2.4"/><path d="M3.6 6.7 12 12.6l8.4-5.9"/>',
    send: '<path d="M20.5 3.5 3 10.6l6.4 2.2L11.4 21l9.1-17.5Z"/><path d="m9.4 12.8 3.5-3.6"/>',
    message: '<path d="M5 4.8h14a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H9.5L5 20V6.8a2 2 0 0 1 2-2Z"/>',
    smartphone: '<rect x="7" y="2.8" width="10" height="18.4" rx="2.4"/><path d="M10.8 18.2h2.4"/>',
    plus: '<path d="M12 5.2v13.6M5.2 12h13.6"/>',
    refresh: '<path d="M20 11.5a8 8 0 0 0-13.7-4.6L4 9"/><path d="M4 4.5V9h4.5"/><path d="M4 12.5a8 8 0 0 0 13.7 4.6L20 15"/><path d="M20 19.5V15h-4.5"/>',
    eye: '<path d="M2.6 12S6.2 5.5 12 5.5 21.4 12 21.4 12 17.8 18.5 12 18.5 2.6 12 2.6 12Z"/><circle cx="12" cy="12" r="3"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 13.2h9.2L17.5 7"/><path d="M10.5 11v6M13.5 11v6"/>',
    save: '<path d="M5.5 4.5H16l3.5 3.5v11.5h-14V4.5Z"/><path d="M8 4.5v5h7v-5M8 19.5v-5.5h8v5.5"/>',
    contacts: '<rect x="5" y="3.2" width="14.5" height="17.6" rx="2.4"/><circle cx="12.2" cy="10.2" r="2.4"/><path d="M8.6 16.8c.6-2 1.9-2.9 3.6-2.9s3 .9 3.6 2.9"/><path d="M2.8 7.3h2.4M2.8 12h2.4M2.8 16.7h2.4"/>',
    'id-card': '<rect x="3" y="5.3" width="18" height="13.4" rx="2.4"/><circle cx="8.6" cy="11" r="2.1"/><path d="M5.8 16c.4-1.6 1.5-2.3 2.8-2.3s2.4.7 2.8 2.3"/><path d="M14 9.4h4.2M14 12.2h4.2M14 15h2.8"/>',
    'scan-face': '<path d="M4 8.4V6.4a2.4 2.4 0 0 1 2.4-2.4h2M15.6 4h2A2.4 2.4 0 0 1 20 6.4v2M20 15.6v2a2.4 2.4 0 0 1-2.4 2.4h-2M8.4 20h-2A2.4 2.4 0 0 1 4 17.6v-2"/><circle cx="9.6" cy="11" r=".7" fill="currentColor" stroke="none"/><circle cx="14.4" cy="11" r=".7" fill="currentColor" stroke="none"/><path d="M9.6 14.4c.7.8 1.5 1.2 2.4 1.2s1.7-.4 2.4-1.2"/>',
    keypad: '<rect x="4" y="4" width="16" height="16" rx="2.4"/><circle cx="8.5" cy="8.5" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="8.5" r=".9" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r=".9" fill="currentColor" stroke="none"/><circle cx="8.5" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="15.5" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="15.5" r=".9" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r=".9" fill="currentColor" stroke="none"/>',
    backspace: '<path d="M9.2 5H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9.2l-6-7 6-7Z"/><path d="m13 9.5 4 5M17 9.5l-4 5"/>',
    logout: '<path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M9.5 12h10M16 8.2l3.8 3.8L16 15.8"/>',
    upload2: '<path d="M5 16v3.5h14V16"/><path d="M12 4v11M7.5 8 12 3.5 16.5 8"/>',
    file2: '<path d="M7 3.5h7l4.5 4.5v12.5H7V3.5Z"/><path d="M13.8 3.6V8.4h4.6"/>',
    'pen-field': '<path d="M4 18.5 14 8.5l3 3-10 10H4v-3Z"/><path d="m15.5 7 1.6-1.6a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1L18.5 10"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    'arrow-up-right': '<path d="M7 17 17 7M9 7h8v8"/>'
  };

  function icon(name, size) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size || 22);
    svg.setAttribute('height', size || 22);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('class', 'icon');
    svg.innerHTML = P[name] || P.file;
    return svg;
  }
  function iconHTML(name, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 22) + '" height="' + (size || 22) +
      '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="icon">' +
      (P[name] || P.file) + '</svg>';
  }

  // File-type glyph: document outline + colored extension tab
  const FT = { pdf: ['PDF', '#ED1C24'], docx: ['DOC', '#2B7CD3'], xlsx: ['XLS', '#1E9E5A'], doc: ['DOC', '#2B7CD3'] };
  function fileIconHTML(type, size) {
    const s = size || 38;
    const ft = FT[type] || ['FILE', '#4252A4'];
    return '<svg viewBox="0 0 40 40" width="' + s + '" height="' + s + '" fill="none" class="ficon">' +
      '<path d="M9 4.5h15L31 11.5V35.5H9Z" fill="#fff" stroke="#cfd5ea" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M23.5 4.8V12h7" fill="none" stroke="#cfd5ea" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<rect x="6" y="20" width="24" height="11" rx="2.4" fill="' + ft[1] + '"/>' +
      '<text x="18" y="28.3" text-anchor="middle" font-family="Heebo,Arial,sans-serif" font-size="7.4" font-weight="800" fill="#fff" letter-spacing=".5">' + ft[0] + '</text>' +
      '</svg>';
  }
  function fileIcon(type, size) {
    const span = document.createElement('span');
    span.className = 'ic-file';
    span.innerHTML = fileIconHTML(type, size);
    return span.firstChild;
  }

  window.Icons = { icon, iconHTML, fileIconHTML, fileIcon, paths: P };
  // convenience aliases on U
  if (window.U) { U.icon = icon; U.iconHTML = iconHTML; U.fileIcon = fileIcon; U.fileIconHTML = fileIconHTML; }
})();
