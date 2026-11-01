/*
  Lanyard 3D interaktif untuk hero boydvt.github.io
  - Tali: simulasi fisika (verlet) digambar di canvas, tulisan "bydvt." berulang
  - Kartu: elemen HTML dengan efek 3D CSS (bisa berputar, depan/belakang) + kilau hologram
  - Bisa ditarik & dilempar (mouse / sentuh). Tanpa library, tanpa build step.
*/
(function () {
  var hero = document.getElementById('home-section');
  if (!hero) return;

  var FRONT = 'images/lanyard_front_v4.jpg'; // desain lama: images/lanyard_front.jpg
  // posisi lubang kartu (lingkaran di desain depan), dalam persen ukuran kartu
  var HOLE_X = 0.527, HOLE_Y = 0.0885, HOLE_R = 0.044; // HOLE_R relatif terhadap lebar kartu
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
    '<div class="lc-clasp"></div>' +
    // cincin dibagi 2: separuh di depan kartu, separuh di belakang kartu (terlihat lewat lubang)
    '<svg class="lc-ring lc-ring-a" aria-hidden="true"><defs><linearGradient id="lcRingG" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#6f757e"/><stop offset=".35" stop-color="#f4f6f9"/><stop offset=".6" stop-color="#b9bfc8"/>' +
      '<stop offset="1" stop-color="#5a6068"/></linearGradient></defs>' +
      '<path class="lc-ring-shadow"/><path class="lc-ring-metal"/></svg>' +
    '<svg class="lc-ring lc-ring-b" aria-hidden="true"><path class="lc-ring-shadow"/><path class="lc-ring-metal"/></svg>' +
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
  var holeX = 0, holeY = 0, holeR = 0, HANG = 0, STRAP_W = 32;
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
    cardW = mobile ? 160 : 250;
    cardH = Math.round(cardW * 1.5); // rasio kartu 2:3
    var ropeLen = mobile ? Math.min(H * 0.3, 240) : Math.min(H * 0.3, 280);
    baseLen = ropeLen;
    if (!curLen || curLen < baseLen) curLen = baseLen;
    segLen = curLen / SEGMENTS;
    // HP: tepat di tengah (boleh menutupi wajah di foto latar); laptop: sisi kanan
    anchor = { x: mobile ? W * 0.5 : Math.min(W * 0.78, W - cardW / 2 - 14), y: -6 };
    card.style.width = cardW + 'px';
    card.style.height = cardH + 'px';

    // lubang + penjepit + cincin (ukuran mengikuti kartu)
    holeX = cardW * HOLE_X; holeY = cardH * HOLE_Y; holeR = cardW * HOLE_R;
    STRAP_W = mobile ? 22 : 32; // lebar tali
    var claspW = STRAP_W + 8, claspH = Math.round(cardW * 0.09); // penjepit sedikit lebih lebar dari tali
    HANG = claspH + Math.round(cardW * 0.035); // jarak ujung tali ke tepi atas kartu
    card.style.setProperty('--hole-r', holeR.toFixed(1) + 'px');
    card.style.setProperty('--hole-x', (HOLE_X * 100) + '%');
    card.style.setProperty('--hole-xb', ((1 - HOLE_X) * 100) + '%');
    card.style.setProperty('--hole-y', (HOLE_Y * 100) + '%');
    var clasp = card.querySelector('.lc-clasp');
    clasp.style.width = claspW + 'px'; clasp.style.height = claspH + 'px';
    clasp.style.left = (holeX - claspW / 2) + 'px'; clasp.style.top = (-HANG) + 'px';
    // cincin bulat: dari bawah penjepit, menembus lubang kartu
    var ringTop = -HANG + claspH - 5, ringBot = holeY + holeR * 0.55;
    var rh = ringBot - ringTop, rw = Math.round(rh * 0.62);
    var sw2 = Math.max(2.4, cardW * 0.012);
    var W2 = rw + 8, H2 = rh + 8, cx = W2 / 2, top0 = 4, bot0 = 4 + rh, rx = rw / 2, ry = rh / 2;
    // sisi A (kiri) & sisi B (kanan) masing-masing setengah elips
    var dA = 'M' + cx + ',' + top0 + ' A' + rx + ',' + ry + ' 0 0 0 ' + cx + ',' + bot0;
    var dB = 'M' + cx + ',' + top0 + ' A' + rx + ',' + ry + ' 0 0 1 ' + cx + ',' + bot0;
    [['.lc-ring-a', dA], ['.lc-ring-b', dB]].forEach(function (r) {
      var svgEl = card.querySelector(r[0]);
      svgEl.setAttribute('width', W2); svgEl.setAttribute('height', H2);
      svgEl.style.left = (holeX - W2 / 2) + 'px'; svgEl.style.top = (ringTop - 4) + 'px';
      var sh = svgEl.querySelector('.lc-ring-shadow'), mt = svgEl.querySelector('.lc-ring-metal');
      sh.setAttribute('d', r[1]); sh.setAttribute('transform', 'translate(1.2,1.6)');
      sh.setAttribute('fill', 'none'); sh.setAttribute('stroke', 'rgba(0,0,0,.45)'); sh.setAttribute('stroke-width', sw2);
      mt.setAttribute('d', r[1]); mt.setAttribute('fill', 'none'); mt.setAttribute('stroke', 'url(#lcRingG)');
      mt.setAttribute('stroke-width', sw2); mt.setAttribute('stroke-linecap', 'round');
    });

    // kartu tergantung dari ujung tali (di atas lubang)
    card.style.transformOrigin = holeX + 'px ' + (-HANG) + 'px';
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

  var GRAVITY = 0.85, DAMP = 0.994, ITER = 18; // DAMP = hambatan udara (mendekati 1 = lebih bebas berayun)
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
      curLen += (baseLen - curLen) * 0.06;
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
        var len = i === SEGMENTS ? cardH + HANG : segLen;
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

  // sisi kartu yang sedang dihadapkan: 0 = depan, 180 = belakang (diubah dengan klik)
  var faceOffset = 0, flipping = false;
  function flip() {
    faceOffset = faceOffset ? 0 : 180;
    flipping = true;
    wake();
  }

  function updateSpin() {
    var top = pts[SEGMENTS], bot = pts[pts.length - 1];
    // kecepatan per frame (gabungan beberapa langkah fisika)
    var vx = (top.x - top.px + bot.x - bot.px) / 2 * substeps;
    var vy = (top.y - top.py + bot.y - bot.py) / 2 * substeps;
    // pegas (seperti tali terpuntir): kartu kembali ke sisi yang dipilih (depan/belakang)
    var target = Math.round((spin - faceOffset) / 360) * 360 + faceOffset;
    if (flipping) {
      // klik: kartu berbalik cepat & mantap
      spinVel += (target - spin) * 0.09;
      spinVel *= 0.78;
      if (Math.abs(target - spin) < 2 && Math.abs(spinVel) < 0.8) flipping = false;
    } else {
      // dorongan putar dari gerakan kartu (dibuat pelan supaya natural)
      spinVel += vx * (drag ? 0.07 : 0.18); // saat ditarik putarannya lebih kecil
      spinVel += (target - spin) * 0.02;
      spinVel *= 0.88;
      // batas kecepatan putar maksimal
      spinVel = Math.max(-11, Math.min(11, spinVel));
    }
    spin += spinVel;
    tilt += ((-vy * 0.8) - tilt) * 0.12;
    tilt = Math.max(-18, Math.min(18, tilt));
  }

  // ---------- Gambar ----------
  function drawStrap() {
    ctx.clearRect(0, 0, W, H);
    var n = SEGMENTS + 1;
    var sw = STRAP_W; // lebar tali

    // puntiran tali: dari jangkar (0) sampai ujung kartu (sama dengan putaran kartu)
    // kartu dibalik ke belakang -> tali ikut terpuntir setengah putaran
    var twistDeg = spin - Math.round((spin - faceOffset) / 360) * 360;
    var twistRad = twistDeg * Math.PI / 180;

    // titik-titik halus di sepanjang tali
    var sm = [{ x: pts[0].x, y: pts[0].y }];
    for (var i = 1; i < n - 1; i++) {
      var p0 = i === 1 ? pts[0] : { x: (pts[i - 1].x + pts[i].x) / 2, y: (pts[i - 1].y + pts[i].y) / 2 };
      var c1 = pts[i];
      var p1 = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      for (var q = 1; q <= 4; q++) {
        var t = q / 4, u = 1 - t;
        sm.push({ x: u * u * p0.x + 2 * u * t * c1.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c1.y + t * t * p1.y });
      }
    }
    sm.push({ x: pts[n - 1].x, y: pts[n - 1].y });
    var cum = [0];
    for (i = 1; i < sm.length; i++) cum.push(cum[i - 1] + Math.sqrt(Math.pow(sm[i].x - sm[i - 1].x, 2) + Math.pow(sm[i].y - sm[i - 1].y, 2)));
    var totalLen = cum[cum.length - 1] || 1;

    // tepi kiri & kanan pita (lebar menyempit saat terpuntir)
    var L = [], R = [], C = [];
    for (i = 0; i < sm.length; i++) {
      var pa = sm[Math.max(0, i - 1)], pb = sm[Math.min(sm.length - 1, i + 1)];
      var tx = pb.x - pa.x, ty = pb.y - pa.y, tl = Math.sqrt(tx * tx + ty * ty) || 1;
      var nx = -ty / tl, ny = tx / tl;
      var cv = Math.cos(twistRad * cum[i] / totalLen);
      var hw = sw / 2 * Math.max(Math.abs(cv), 0.05);
      L.push({ x: sm[i].x + nx * hw, y: sm[i].y + ny * hw });
      R.push({ x: sm[i].x - nx * hw, y: sm[i].y - ny * hw });
      C.push(cv);
    }
    // isi pita per potongan: sisi depan hitam, sisi belakang sedikit lebih terang, bagian miring lebih terang
    for (i = 0; i < sm.length - 1; i++) {
      var cAvg = (C[i] + C[i + 1]) / 2;
      var edge = 1 - Math.abs(cAvg);
      var base = cAvg >= 0 ? 13 : 30;
      var v = Math.round(base + edge * 55);
      ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 2) + ')';
      ctx.beginPath();
      ctx.moveTo(L[i].x, L[i].y); ctx.lineTo(L[i + 1].x, L[i + 1].y);
      ctx.lineTo(R[i + 1].x, R[i + 1].y); ctx.lineTo(R[i].x, R[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.8; ctx.stroke(); // tutup celah antar potongan
    }
    // garis tepi tipis
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.2;
    [L, R].forEach(function (edgePts) {
      ctx.beginPath();
      ctx.moveTo(edgePts[0].x, edgePts[0].y);
      for (var e = 1; e < edgePts.length; e++) ctx.lineTo(edgePts[e].x, edgePts[e].y);
      ctx.stroke();
    });

    // tulisan "bydvt." hanya 2-3 kali, tersebar rata di sepanjang tali
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 ' + (W < 768 ? 13 : 17) + 'px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    // tali ditarik -> tulisan ikut meregang (seperti tekstur karet)
    var stretch = Math.max(1, curLen / baseLen);
    var chars = STRAP_TEXT.split('');
    var widths = chars.map(function (c) { return ctx.measureText(c).width + 0.5; });
    var labelW = widths.reduce(function (p, c) { return p + c; }, 0) * stretch;

    // panjang tiap ruas tali
    var segs = [], total = 0;
    for (var s = 0; s < n - 1; s++) {
      var sa = pts[s], sb = pts[s + 1];
      var sl = Math.sqrt(Math.pow(sb.x - sa.x, 2) + Math.pow(sb.y - sa.y, 2));
      segs.push(sl); total += sl;
    }
    // titik & arah pada jarak tertentu di sepanjang tali
    function at(d) {
      for (var k = 0; k < segs.length; k++) {
        if (d <= segs[k] || k === segs.length - 1) {
          var p0 = pts[k], p1 = pts[k + 1], t = segs[k] ? Math.min(d / segs[k], 1) : 0;
          return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t, a: Math.atan2(p1.y - p0.y, p1.x - p0.x) };
        }
        d -= segs[k];
      }
    }
    var count = baseLen < 200 ? 2 : 3;
    for (var j = 0; j < count; j++) {
      var d = total * (j + 0.5) / count - labelW / 2; // tengah tiap bagian tali
      for (var ci = 0; ci < chars.length; ci++) {
        var cw = widths[ci] * stretch;
        var q = at(d + cw / 2);
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.a);
        // tulisan ikut terpuntir; sisi belakang terlihat terbalik
        var cz = Math.cos(twistRad * Math.min(d + cw / 2, total) / (total || 1));
        if (Math.abs(cz) < 0.15) { ctx.restore(); d += cw; continue; }
        ctx.scale(cz < 0 ? -stretch : stretch, cz);
        ctx.fillText(chars[ci], -widths[ci] / 2, 0);
        ctx.restore();
        d += cw;
      }
    }
  }

  function drawCard() {
    var top = pts[SEGMENTS], bot = pts[pts.length - 1];
    var ang = Math.atan2(bot.y - top.y, bot.x - top.x) * 180 / Math.PI - 90;
    card.style.transform = 'translate(' + (top.x - holeX) + 'px,' + (top.y + HANG) + 'px) rotate(' + ang + 'deg)';
    // kartu menghadap belakang -> sisi cincin yang di depan/belakang bertukar
    card.classList.toggle('lc-flipped', Math.cos(spin * Math.PI / 180) < 0);
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
  var down = null; // untuk mendeteksi klik (bukan tarik)
  card.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
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
  card.addEventListener('pointerup', function (e) {
    // klik singkat tanpa digeser -> kartu berbalik (depan <-> belakang)
    if (down && Math.abs(e.clientX - down.x) < 6 && Math.abs(e.clientY - down.y) < 6 &&
        performance.now() - down.t < 350) {
      flip();
    }
    down = null;
    release();
  });
  card.addEventListener('pointercancel', release);

  // ---------- Loop (berhenti saat hero tidak terlihat) ----------
  var running = false, visible = true;
  // fisika dijalankan ~120 langkah/detik (tidak tergantung refresh rate layar) supaya gerakan natural, tidak slow-motion
  var SIM_MS = 1000 / 120, lastT = 0, acc = 0, substeps = 1;
  function loop(now) {
    if (!visible) { running = false; lastT = 0; return; }
    if (!lastT) lastT = now - 16.7;
    acc += Math.min(now - lastT, 50); // batasi kalau tab sempat tertunda
    lastT = now;
    substeps = 0;
    while (acc >= SIM_MS && substeps < 6) { step(); acc -= SIM_MS; substeps++; }
    if (!substeps) { requestAnimationFrame(loop); return; }
    updateSpin();
    drawStrap();
    drawCard();
    requestAnimationFrame(loop);
  }
  function wake() { if (!running && visible) { running = true; lastT = 0; requestAnimationFrame(loop); } }

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
