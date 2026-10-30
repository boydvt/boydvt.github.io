/*
  Efek kartu interaktif untuk kartu Portfolio & kartu video (termasuk yang dimuat lewat AJAX).

  PC (mouse):
    - kartu miring 3D mengikuti posisi mouse + sedikit terangkat + kilau cahaya
    - judul kartu bergeser pelan (efek kedalaman)
  HP (sentuh):
    - sentuh & TAHAN sebentar (~0,25 detik) -> kartu "terangkat"
    - lalu geser jari -> kartu ikut bergerak & miring mengikuti jari
    - lepas -> kartu memantul & bergoyang kembali ke tempatnya (seperti lanyard)
    - geser langsung tanpa ditahan = scroll biasa; tap biasa = buka kartu seperti biasa
  Tanpa library.
*/
(function () {
  var mq = window.matchMedia;
  if (!mq || mq('(prefers-reduced-motion: reduce)').matches) return;

  var IS_MOUSE = mq('(hover: hover) and (pointer: fine)').matches;
  var SELECTOR = '#posts .portfolio-item, .tlk-video';

  // ---------- CSS ----------
  var css =
    '.ct-card{will-change:transform;-webkit-touch-callout:none;' +
      'transition:transform .6s cubic-bezier(.2,.8,.2,1),box-shadow .6s ease;}' +
    '.ct-card.ct-active{transition:transform .12s ease-out,box-shadow .3s ease;' +
      'box-shadow:0 28px 50px -18px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.08);z-index:20;}' +
    '.ct-card.ct-drag{transition:box-shadow .3s ease!important;z-index:30;' +
      'box-shadow:0 30px 60px -15px rgba(0,0,0,.9),0 0 0 1px rgba(255,255,255,.12);}' +
    '.ct-card img{-webkit-user-drag:none;-webkit-touch-callout:none;user-select:none;}' +
    '.ct-glare{position:absolute;top:0;left:0;right:0;bottom:0;z-index:9;pointer-events:none;opacity:0;' +
      'transition:opacity .4s ease;border-radius:inherit;' +
      'background:radial-gradient(circle at var(--ct-gx,50%) var(--ct-gy,50%),rgba(255,255,255,.30),rgba(255,255,255,.06) 35%,rgba(255,255,255,0) 60%);}' +
    '.ct-card.ct-active .ct-glare,.ct-card.ct-drag .ct-glare{opacity:1;}' +
    '.ct-card .portfolio-item-content,.ct-card .tlk-cap{transition:transform .6s cubic-bezier(.2,.8,.2,1);}' +
    '.ct-card.ct-active .portfolio-item-content,.ct-card.ct-active .tlk-cap{transition:transform .12s ease-out;' +
      'transform:translate(var(--ct-tx,0),var(--ct-ty,0));}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function prepare(card) {
    if (card.classList.contains('ct-card')) return;
    card.classList.add('ct-card');
    var g = document.createElement('span');
    g.className = 'ct-glare';
    g.setAttribute('aria-hidden', 'true');
    card.appendChild(g);
  }

  // ================= PC (mouse): tilt 3D =================
  if (IS_MOUSE) {
    var MAX_TILT = 9;
    var current = null, raf = 0, last = null;

    var apply = function () {
      raf = 0;
      if (!current || !last) return;
      var r = current.getBoundingClientRect();
      var px = Math.min(Math.max((last.x - r.left) / r.width, 0), 1);
      var py = Math.min(Math.max((last.y - r.top) / r.height, 0), 1);
      var rx = (0.5 - py) * MAX_TILT * 2;
      var ry = (px - 0.5) * MAX_TILT * 2;
      current.style.transform =
        'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale(1.03)';
      current.style.setProperty('--ct-gx', (px * 100).toFixed(1) + '%');
      current.style.setProperty('--ct-gy', (py * 100).toFixed(1) + '%');
      current.style.setProperty('--ct-tx', ((px - 0.5) * 10).toFixed(1) + 'px');
      current.style.setProperty('--ct-ty', ((py - 0.5) * 10).toFixed(1) + 'px');
    };
    var reset = function (card) {
      card.classList.remove('ct-active');
      card.style.transform = '';
    };

    document.addEventListener('mousemove', function (e) {
      var card = e.target.closest ? e.target.closest(SELECTOR) : null;
      if (card !== current) {
        if (current) reset(current);
        current = card;
        if (card) { prepare(card); card.classList.add('ct-active'); }
      }
      if (!card) return;
      last = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });

    document.addEventListener('mouseleave', function () { if (current) { reset(current); current = null; } });
    window.addEventListener('blur', function () { if (current) { reset(current); current = null; } });
    return;
  }

  // ================= HP (sentuh): tahan lalu geser =================
  var HOLD_MS = 250;      // lama menahan sebelum kartu bisa digeser
  var MOVE_CANCEL = 10;   // geser lebih dari ini sebelum aktif = dianggap scroll
  var FOLLOW = 0.55;      // seberapa jauh kartu ikut jari (0-1)
  var MAX_OFFSET = 90;    // batas pergeseran kartu (px)

  var card = null, holdTimer = 0, active = false, moved = false;
  var start = null, rect = null;
  // posisi & kecepatan kartu (untuk efek pegas saat dilepas)
  var x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, gx = 50, gy = 50;
  var anim = 0;

  function render() {
    var rotY = x * 0.22, rotX = -y * 0.22, rotZ = x * 0.05;
    var s = active ? 1.05 : 1 + Math.min(Math.abs(x) + Math.abs(y), 40) * 0.001;
    card.style.transform = 'perspective(800px) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) ' +
      'rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg) rotateZ(' + rotZ.toFixed(2) + 'deg) scale(' + s.toFixed(3) + ')';
    card.style.setProperty('--ct-gx', gx.toFixed(1) + '%');
    card.style.setProperty('--ct-gy', gy.toFixed(1) + '%');
  }

  function step() {
    anim = 0;
    if (!card) return;
    if (active) {
      // ikuti jari dengan sedikit "berat"
      vx = (tx - x) * 0.35; vy = (ty - y) * 0.35;
      x += vx; y += vy;
    } else {
      // pegas + redaman -> memantul & bergoyang kembali ke tempat
      vx += -x * 0.12; vy += -y * 0.12;
      vx *= 0.8; vy *= 0.8;
      x += vx; y += vy;
      if (Math.abs(x) < 0.15 && Math.abs(y) < 0.15 && Math.abs(vx) < 0.15 && Math.abs(vy) < 0.15) {
        card.style.transform = '';
        card.classList.remove('ct-drag');
        card = null;
        return;
      }
    }
    render();
    anim = requestAnimationFrame(step);
  }
  function kick() { if (!anim) anim = requestAnimationFrame(step); }

  function clamp(v) { return Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, v)); }

  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    var c = e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!c) return;
    // kartu lain masih memantul -> selesaikan dulu
    if (card && card !== c) { card.style.transform = ''; card.classList.remove('ct-drag'); }
    prepare(c);
    card = c; active = false; moved = false;
    x = y = vx = vy = tx = ty = 0;
    start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    rect = c.getBoundingClientRect();
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () {
      active = true;
      card.classList.add('ct-drag');
      gx = (start.x - rect.left) / rect.width * 100;
      gy = (start.y - rect.top) / rect.height * 100;
      if (navigator.vibrate) navigator.vibrate(8); // getar kecil (Android)
      kick();
    }, HOLD_MS);
  }, { passive: true });

  // non-passive: supaya halaman tidak ikut scroll saat kartu sedang digeser
  document.addEventListener('touchmove', function (e) {
    if (!card || !start) return;
    var dx = e.touches[0].clientX - start.x, dy = e.touches[0].clientY - start.y;
    if (!active) {
      if (Math.abs(dx) > MOVE_CANCEL || Math.abs(dy) > MOVE_CANCEL) { clearTimeout(holdTimer); start = null; }
      return; // biarkan scroll biasa
    }
    e.preventDefault();
    moved = moved || Math.abs(dx) > 4 || Math.abs(dy) > 4;
    tx = clamp(dx * FOLLOW); ty = clamp(dy * FOLLOW);
    gx = Math.max(0, Math.min(100, (e.touches[0].clientX - rect.left) / rect.width * 100));
    gy = Math.max(0, Math.min(100, (e.touches[0].clientY - rect.top) / rect.height * 100));
    kick();
  }, { passive: false });

  function release() {
    clearTimeout(holdTimer);
    if (!card) return;
    if (active) {
      active = false;
      // setelah kartu digeser, jangan sampai kartunya ikut "terklik"
      if (moved) {
        var stopClick = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
        document.addEventListener('click', stopClick, true);
        setTimeout(function () { document.removeEventListener('click', stopClick, true); }, 400);
      }
      kick();
    } else {
      card = null;
    }
    start = null;
  }
  document.addEventListener('touchend', release, { passive: true });
  document.addEventListener('touchcancel', release, { passive: true });

  // cegah menu "simpan gambar" saat kartu ditahan
  document.addEventListener('contextmenu', function (e) {
    if (e.target.closest && e.target.closest(SELECTOR)) e.preventDefault();
  });
})();
