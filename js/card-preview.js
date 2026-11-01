/*
  Preview video ala GIF di thumbnail kartu Portfolio.
  - Video diputar otomatis langsung dari HTML (autoplay, tanpa suara, berulang),
    script TIDAK memutar/menjeda video (aman untuk browser yang ketat soal autoplay).
  - Video & gambar penutup selalu diposisikan PERSIS di atas gambar thumbnail kartunya sendiri.
  - Saat kartu di-scroll masuk ke area tengah layar, gambar penutup memudar -> video terlihat.
  - Saat kartu keluar dari area tengah, gambar penutup muncul lagi.
  - Template mengganti isi kartu setelah gambar dimuat (animasi reveal), jadi elemen
    selalu dicari ulang setiap pengecekan.

  Cara pakai di HTML (taruh setelah <img> thumbnail di dalam kartu):
    <video class="card-preview" src="images/folder/preview_xxx.mp4" autoplay muted loop playsinline aria-hidden="true"></video>
*/
(function () {
  // ---------- PENGATURAN ----------
  var ZONE = 0.75;  // kartu dianggap "di tengah" bila titik tengahnya ada di 75% area tengah layar
  var FADE = 0.8;   // lama transisi gambar -> video (detik)

  // Selector dibuat kuat (+ !important) karena CSS template punya aturan
  // ".portfolio-item img { position: relative }" yang bisa membuat penutup turun ke bawah (dobel).
  var H = '.portfolio-item .card-preview-host ';
  var css =
    '.card-preview-host{position:relative;}' +
    H + 'video.card-preview,' + H + 'img.card-preview-cover,' +
    '.portfolio-item video.card-preview,.portfolio-item img.card-preview-cover{' +
      'position:absolute !important;top:0;left:0;width:0;height:0;object-fit:cover;' +
      'pointer-events:none;margin:0 !important;padding:0;border:0;max-width:none;display:block;}' +
    '.portfolio-item video.card-preview{z-index:1;}' +
    '.portfolio-item img.card-preview-cover{z-index:2;opacity:1;transition:opacity ' + FADE + 's ease !important;}' +
    '.portfolio-item img.card-preview-cover.is-off{opacity:0 !important;}' +
    '.portfolio-item .overlay{z-index:3;}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // pasang/rapikan penutup & posisi untuk satu video
  function prep(v) {
    var img = v.previousElementSibling;
    while (img && img.tagName !== 'IMG') img = img.previousElementSibling;
    if (!img) return null;
    var host = img.parentNode;
    if (!host.classList.contains('card-preview-host')) host.classList.add('card-preview-host');
    var cover = v.nextElementSibling;
    if (!cover || !cover.classList || !cover.classList.contains('card-preview-cover')) {
      cover = document.createElement('img');
      cover.className = 'card-preview-cover';
      cover.alt = '';
      cover.setAttribute('aria-hidden', 'true');
      cover.src = img.getAttribute('src');
      host.insertBefore(cover, v.nextSibling);
    }
    // samakan posisi & ukuran persis dengan gambar thumbnail
    var t = img.offsetTop + 'px', l = img.offsetLeft + 'px',
        w = img.offsetWidth + 'px', h = img.offsetHeight + 'px';
    [v, cover].forEach(function (el) {
      if (el.style.top !== t) el.style.top = t;
      if (el.style.left !== l) el.style.left = l;
      if (el.style.width !== w) el.style.width = w;
      if (el.style.height !== h) el.style.height = h;
    });
    // ikut efek zoom animasi reveal dari template (transform pada gambar)
    var tf = img.style.transform || '';
    if (cover.style.transform !== tf) { cover.style.transform = tf; v.style.transform = tf; }
    return { img: img, cover: cover };
  }

  var ticking = false;
  function check() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var top = vh * (1 - ZONE) / 2, bottom = vh - top;
    var vids = document.querySelectorAll('video.card-preview');
    for (var i = 0; i < vids.length; i++) {
      var p = prep(vids[i]);
      if (!p) continue;
      var r = p.img.getBoundingClientRect();
      if (!r.height) continue;
      var mid = r.top + r.height / 2;
      var on = mid > top && mid < bottom;
      if (p.cover.classList.contains('is-off') !== on) p.cover.classList.toggle('is-off', on);
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(check); }
  }

  document.addEventListener('scroll', onScroll, { passive: true, capture: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', check);
  // tata letak & animasi kartu berubah-ubah di awal -> cek rutin (ringan)
  setInterval(check, 300);
  check();
})();
