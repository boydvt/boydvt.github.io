/*
  Lanyard 3D interaktif untuk hero boydvt.github.io
  - Tali: simulasi fisika (verlet) digambar di canvas, tulisan "bydvt." berulang
  - Kartu: elemen HTML dengan efek 3D CSS (bisa berputar, depan/belakang) + kilau hologram
  - Bisa ditarik & dilempar (mouse / sentuh). Tanpa library, tanpa build step.
*/
(function () {
  var hero = document.getElementById('home-section');
  if (!hero) return;

  var FRONT = 'images/lanyard_front.jpg';
  var BACK = 'images/lanyard_back.jpg';
  var STRAP_TEXT = 'bydvt.';

  // ---------- Elemen ----------
  var layer = document.createElement('div');
  layer.className = 'lanyard-layer';
  var canvas = document.createElement('canvas');
  canvas.className = 'lanyard-canvas';
  var card = document.createElement('div');
  card.className = 'lanyard-card';
  card.setAttribute('aria-label', 'Kartu lanyard Boy Devit (bisa ditarik)');
  card.innerHTML =
    '<div class="lc-clip"></div>' +
    '<div class="lc-inner">' +
      '<div class="lc-face lc-front"><img src="' + FRONT + '" alt="Boy Devit" draggable="false"><span class="lc-holo"></span><span class="lc-shine"></span></div>' +
      '<div class="lc-face lc-back"><img src="' + BACK + '" alt="" draggable="false"><span class="lc-holo"></span><span class="lc-shine"></span></div>' +
    '</div>';
  layer.appendChild(canvas);
  layer.appendChild(card);
  hero.appendChild(layer);

  var inner = card.querySelector('.lc-inner');
  var ctx = canvas.getContext('2d');

  // ---------- Ukuran ----------
  var W, H, dpr, cardW, cardH, segLen, anchor;
  var baseLen, curLen; // panjang tali normal & panjang saat ini (bisa memanjang saat ditarik)
  var MAX_STRETCH = 2.5;
  var SEGMENTS = 14;

  function measure() {
    W = hero.clientWidth;
    H = hero.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var mobile = W < 768;
    cardW = mobile ? 170 : 280;
    cardH = Math.round(cardW * 1.3);
    var ropeLen = mobile ? Math.min(H * 0.3, 240) : Math.min(H * 0.3, 280);
    baseLen = ropeLen;
    if (!curLen || curLen < baseLen) curLen = baseLen;
    segLen = curLen / SEGMENTS;
    // HP: tepat di tengah (boleh menutupi wajah di foto latar); laptop: sisi kanan
    anchor = { x: mobile ? W * 0.5 : Math.min(W * 0.78, W - cardW / 2 - 14), y: -6 };
    card.style.width = cardW + 'px';
    card.style.height = cardH + 'px';
  }

  // ---------- Fisika (verlet) ----------
  // titik 0 = jangkar (tetap), 1..SEGMENTS = tali, lalu 2 titik kartu (atas & bawah)
  var pts = [];
  function makePoint(x, y) { return { x: x, y: y, px: x, py: y }; }

  function build() {
    pts = [];
    // mulai mendatar ke kiri jangkar supaya kartu "jatuh" lalu berayun masuk
    for (var i = 0; i <= SEGMENTS; i++) {
      var t = i / SEGMENTS;
      pts.push(makePoint(anchor.x - t * segLen * SEGMENTS * 0.95, anchor.y + 8 + t * 10));
    }
    var end = pts[SEGMENTS];
    pts.push(makePoint(end.x - cardH * 0.7, end.y + cardH * 0.7)); // titik bawah kartu
  }

  var GRAVITY = 0.6, DAMP = 0.985, ITER = 18;
  var drag = null; // {offX, offY, x, y}

  // 0 = tidak bisa digeser (jangkar / titik yang sedang ditarik)
  function invMass(i) {
    if (i === 0) return 0;
    if (drag && i === SEGMENTS) return 0;
    return 1;
  }

  function step() {
    var i, p;
    // tali: saat ditarik ikut memanjang, saat dilepas menggulung kembali pelan-pelan
    if (!drag && curLen > baseLen) {
      curLen += (baseLen - curLen) * 0.05;
      if (curLen - baseLen < 0.5) curLen = baseLen;
    }
    segLen = curLen / SEGMENTS;
    for (i = 1; i < pts.length; i++) {
      p = pts[i];
      if (drag && i === SEGMENTS) continue;
      var vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + GRAVITY * (i === pts.length - 1 ? 1.4 : 1);
    }
    if (drag) {
      var g = pts[SEGMENTS];
      // tali ikut memanjang mengikuti tarikan (maksimal MAX_STRETCH x panjang normal)
      var tx = drag.x, ty = drag.y;
      var ddx = tx - anchor.x, ddy = ty - anchor.y;
      var dd = Math.sqrt(ddx * ddx + ddy * ddy), maxL = baseLen * MAX_STRETCH;
      if (dd > maxL) { tx = anchor.x + ddx / dd * maxL; ty = anchor.y + ddy / dd * maxL; dd = maxL; }
      if (dd > curLen) { curLen = dd; segLen = curLen / SEGMENTS; }
      g.px = g.x; g.py = g.y;
      // ikuti jari/mouse dengan sedikit pelunakan supaya lemparan tidak terlalu keras
      g.x += (tx - g.x) * 0.6; g.y += (ty - g.y) * 0.6;
    }
    pts[0].x = anchor.x; pts[0].y = anchor.y;

    for (var k = 0; k < ITER; k++) {
      for (i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var len = i === SEGMENTS ? cardH : segLen;
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        // tali tidak bisa memanjang, tapi boleh kendur
        if (i < SEGMENTS && d < len) continue;
        var diff = (d - len) / d;
        var wa = invMass(i), wb = invMass(i + 1), tot = wa + wb;
        if (!tot) continue;
        a.x += dx * diff * wa / tot; a.y += dy * diff * wa / tot;
        b.x -= dx * diff * wb / tot; b.y -= dy * diff * wb / tot;
      }
      // batas area hero
      for (i = 1; i < pts.length; i++) {
        p = pts[i];
        if (p.x < 10) p.x = 10;
        if (p.x > W - 10) p.x = W - 10;
        if (p.y > H - 10) p.y = H - 10;
      }
    }
  }

  // ---------- Putaran 3D (rotateY) + kilau ----------
  var spin = 0, spinVel = 0, tilt = 0;

  function updateSpin() {
    var top = pts[SEGMENTS], bot = pts[pts.length - 1];
    var vx = (top.x - top.px + bot.x - bot.px) / 2;
    var vy = (top.y - top.py + bot.y - bot.py) / 2;
    // dorongan putar dari gerakan kartu (dibuat pelan supaya natural)
    spinVel += vx * (drag ? 0.07 : 0.18); // saat ditarik putarannya lebih kecil
    // pegas (seperti tali terpuntir): saat diam kartu kembali menghadap depan
    var target = Math.round(spin / 360) * 360;
    spinVel += (target - spin) * 0.015;
    spinVel *= 0.9;
    // batas kecepatan putar maksimal
    spinVel = Math.max(-9, Math.min(9, spinVel));
    spin += spinVel;
    tilt += ((-vy * 0.8) - tilt) * 0.12;
    tilt = Math.max(-18, Math.min(18, tilt));
  }

  // ---------- Gambar ----------
  function drawStrap() {
    ctx.clearRect(0, 0, W, H);
    var n = SEGMENTS + 1;
    var sw = W < 768 ? 17 : 24; // lebar tali

    // pita tali
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < n - 1; i++) {
      var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = sw + 3;
    ctx.stroke();
    ctx.strokeStyle = '#0d0d0f';
    ctx.lineWidth = sw;
    ctx.stroke();

    // tulisan "bydvt." berulang mengikuti tali
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 ' + (W < 768 ? 10 : 13) + 'px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    var label = STRAP_TEXT + '  ';
    var chars = label.split('');
    var widths = chars.map(function (c) { return ctx.measureText(c).width; });
    var ci = 0;
    var dist = 6; // mulai sedikit di bawah jangkar
    var walked = 0;
    for (var s = 0; s < n - 1; s++) {
      var a = pts[s], b = pts[s + 1];
      var dx = b.x - a.x, dy = b.y - a.y;
      var L = Math.sqrt(dx * dx + dy * dy);
      var ang = Math.atan2(dy, dx);
      while (dist <= walked + L) {
        var t = (dist - walked) / (L || 1);
        var x = a.x + dx * t, y = a.y + dy * t;
        var cw = widths[ci % chars.length];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillText(chars[ci % chars.length], 0, 0);
        ctx.restore();
        dist += cw + 0.5;
        ci++;
      }
      walked += L;
    }
  }

  function drawCard() {
    var top = pts[SEGMENTS], bot = pts[pts.length - 1];
    var ang = Math.atan2(bot.y - top.y, bot.x - top.x) * 180 / Math.PI - 90;
    card.style.transform = 'translate(' + (top.x - cardW / 2) + 'px,' + top.y + 'px) rotate(' + ang + 'deg)';
    inner.style.transform = 'perspective(900px) rotateX(' + tilt + 'deg) rotateY(' + spin + 'deg)';

    // kilau: bergeser mengikuti putaran & kemiringan
    var r = ((spin % 360) + 360) % 360;
    var shinePos = (Math.sin(spin * Math.PI / 180) * 60 + 50 + ang * 0.8);
    var holo = Math.min(1, Math.abs(Math.sin(spin * Math.PI / 180)) * 1.4 + Math.abs(tilt) / 40 + Math.abs(spinVel) / 30);
    card.style.setProperty('--shine-x', shinePos + '%');
    card.style.setProperty('--holo-o', (0.15 + holo * 0.75).toFixed(2));
    card.style.setProperty('--holo-r', (r + ang * 2).toFixed(1) + 'deg');
  }

  // ---------- Interaksi ----------
  function localPos(e) {
    var rect = hero.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  card.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var p = localPos(e), top = pts[SEGMENTS];
    drag = { offX: p.x - top.x, offY: p.y - top.y, x: top.x, y: top.y };
    card.setPointerCapture(e.pointerId);
    card.classList.add('is-dragging');
    wake();
  });
  card.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = localPos(e);
    drag.x = p.x - drag.offX;
    drag.y = p.y - drag.offY;
  });
  function release() {
    if (!drag) return;
    drag = null;
    card.classList.remove('is-dragging');
  }
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);

  // ---------- Loop (berhenti saat hero tidak terlihat) ----------
  var running = false, visible = true;
  function loop() {
    if (!visible) { running = false; return; }
    step();
    updateSpin();
    drawStrap();
    drawCard();
    requestAnimationFrame(loop);
  }
  function wake() { if (!running && visible) { running = true; requestAnimationFrame(loop); } }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) wake();
    }).observe(hero);
  }

  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      var oldW = W, oldH = H;
      measure();
      // geser titik mengikuti posisi jangkar baru
      var dx = anchor.x - pts[0].x;
      pts.forEach(function (p) { p.x += dx; p.px += dx; });
      if (Math.abs(W - oldW) > 200 || Math.abs(H - oldH) > 200) build();
      wake();
    }, 120);
  });

  measure();
  build();
  wake();
})();
