/*
  Latar "glow" biru yang mengikuti mouse (PC), bergerak pelan sendiri (HP).
  - Di seluruh halaman: cahaya digambar langsung di latar hitam (di belakang teks & kartu).
  - Di hero (foto): ada lapisan cahaya tipis yang menyatu dengan foto seperti sorotan lampu.
  Tanpa library. Ubah warna/ukuran di bagian PENGATURAN.
*/
(function () {
  // ---------- PENGATURAN ----------
  var COLOR_CORE = 'rgba(56, 120, 255, 0.30)';  // warna pusat cahaya
  var COLOR_MID  = 'rgba(30, 70, 190, 0.13)';   // warna pinggir cahaya
  var SIZE_PC = 650, SIZE_HP = 420;              // diameter cahaya (px)
  var EASE = 0.07;                               // kelembutan mengikuti mouse (kecil = lebih pelan)

  var mq = window.matchMedia;
  var IS_MOUSE = mq && mq('(hover: hover) and (pointer: fine)').matches;
  var REDUCED = mq && mq('(prefers-reduced-motion: reduce)').matches;
  var inner = document.querySelector('.unslate_co--site-inner');
  var hero = document.getElementById('home-section');
  if (!inner) return;

  function grad(size, vx, vy) {
    return 'radial-gradient(' + size + 'px circle at var(' + vx + ',70%) var(' + vy + ',30%),' +
      COLOR_CORE + ',' + COLOR_MID + ' 40%,rgba(0,0,0,0) 70%)';
  }
  var css =
    '.unslate_co--site-inner{background:' + grad(SIZE_PC, '--bg-x', '--bg-y') + ',#000!important;}' +
    '.hero-glow{position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;' +
      'mix-blend-mode:screen;background:' + grad(SIZE_PC, '--hx', '--hy') + ';}' +
    '@media (max-width: 991.98px){' +
      '.unslate_co--site-inner{background:' + grad(SIZE_HP, '--bg-x', '--bg-y') + ',#000!important;}' +
      '.hero-glow{background:' + grad(SIZE_HP, '--hx', '--hy') + ';}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var heroGlow = null;
  if (hero) {
    heroGlow = document.createElement('div');
    heroGlow.className = 'hero-glow';
    heroGlow.setAttribute('aria-hidden', 'true');
    hero.insertBefore(heroGlow, hero.firstChild);
  }

  // posisi cahaya dalam koordinat layar (viewport)
  var x = window.innerWidth * 0.7, y = window.innerHeight * 0.3;
  var tx = x, ty = y;

  function paint() {
    var ir = inner.getBoundingClientRect();
    inner.style.setProperty('--bg-x', (x - ir.left).toFixed(1) + 'px');
    inner.style.setProperty('--bg-y', (y - ir.top).toFixed(1) + 'px');
    if (heroGlow) {
      var hr = hero.getBoundingClientRect();
      if (hr.bottom > 0) {
        heroGlow.style.setProperty('--hx', (x - hr.left).toFixed(1) + 'px');
        heroGlow.style.setProperty('--hy', (y - hr.top).toFixed(1) + 'px');
      }
    }
  }
  paint();
  // saat di-scroll, cahaya tetap di posisi yang sama di layar
  window.addEventListener('scroll', function () { requestAnimationFrame(paint); }, { passive: true });
  window.addEventListener('resize', paint);
  if (REDUCED) return;

  // ---------- PC: ikuti mouse dengan halus ----------
  if (IS_MOUSE) {
    var running = false;
    var loop = function () {
      x += (tx - x) * EASE;
      y += (ty - y) * EASE;
      paint();
      if (Math.abs(tx - x) < 0.5 && Math.abs(ty - y) < 0.5) { running = false; return; }
      requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
    return;
  }

  // ---------- HP: cahaya bergerak pelan sendiri ----------
  var t0 = performance.now(), visible = true;
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible) requestAnimationFrame(drift);
  });
  function drift(now) {
    if (!visible) return;
    var t = (now - t0) / 1000;
    var w = window.innerWidth, h = window.innerHeight;
    x = w * (0.5 + 0.35 * Math.sin(t * 0.23));
    y = h * (0.45 + 0.3 * Math.sin(t * 0.17 + 1.3));
    paint();
    requestAnimationFrame(drift);
  }
  requestAnimationFrame(drift);
})();
