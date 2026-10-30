/*
  Autoplay video YouTube saat terlihat di layar (tanpa suara, berulang),
  berhenti saat di-scroll lewat. Klik -> buka besar di popup (pakai link/elemen di dalamnya).

  Kalau YouTube menolak video diputar di web lain (mis. klaim hak cipta lagu, video privat,
  atau embed dimatikan), kotak video otomatis kembali menampilkan thumbnail,
  dan kliknya membuka video langsung di YouTube.

  Cara pakai di HTML:
    <div class="yt-auto" data-yt="ID_VIDEO_YOUTUBE"> <img ...thumbnail> ... <a class="tlk-yt-open" ...></a> </div>
  Bekerja juga untuk konten yang dimuat belakangan (mis. halaman portfolio yang dibuka dari index).
*/
(function () {
  if (!('IntersectionObserver' in window)) return;

  var hasOrigin = location.origin && location.origin !== 'null';

  function post(f, obj) {
    if (f && f.contentWindow) f.contentWindow.postMessage(JSON.stringify(obj), '*');
  }

  function send(box, cmd) {
    post(box.querySelector('iframe'), { event: 'command', func: cmd, args: [] });
  }

  // Video tidak bisa diputar di web lain -> tampilkan thumbnail, klik buka di YouTube
  function fail(box) {
    if (box.classList.contains('yt-failed')) return;
    box.classList.add('yt-failed');
    box.classList.remove('is-playing');
    io.unobserve(box);
    var f = box.querySelector('iframe');
    if (f) f.parentNode.removeChild(f);
    var a = box.querySelector('.tlk-yt-open');
    if (a) {
      a.removeAttribute('data-fancybox');
      a.removeAttribute('data-type');
      a.removeAttribute('data-options');
      a.setAttribute('href', 'https://www.youtube.com/watch?v=' + box.getAttribute('data-yt'));
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    }
  }

  function start(box) {
    if (box.classList.contains('yt-failed')) return;
    var id = box.getAttribute('data-yt');
    if (!box.querySelector('iframe')) {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube.com/embed/' + id +
        '?autoplay=1&mute=1&loop=1&playlist=' + id +
        '&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1' +
        (hasOrigin ? '&origin=' + encodeURIComponent(location.origin) : '');
      f.title = box.getAttribute('data-title') || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture';
      f.setAttribute('tabindex', '-1');
      // minta pemutar YouTube mengirim status (termasuk error) ke halaman ini
      f.addEventListener('load', function () {
        post(f, { event: 'listening', id: id, channel: 'widget' });
      });
      box.insertBefore(f, box.firstChild);
    } else {
      send(box, 'playVideo');
    }
    box.classList.add('is-playing');
  }

  function stop(box) {
    send(box, 'pauseVideo');
    box.classList.remove('is-playing');
  }

  // dengarkan pesan error dari pemutar YouTube
  window.addEventListener('message', function (e) {
    if (typeof e.origin !== 'string' || e.origin.indexOf('youtube') === -1) return;
    var data;
    try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { return; }
    if (!data || data.event !== 'onError') return;
    var frames = document.querySelectorAll('.yt-auto iframe');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === e.source) {
        fail(frames[i].parentNode);
        break;
      }
    }
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) start(e.target); else stop(e.target);
    });
  }, { threshold: 0.5 });

  function scan() {
    var boxes = document.querySelectorAll('.yt-auto[data-yt]:not([data-yt-ready])');
    for (var i = 0; i < boxes.length; i++) {
      boxes[i].setAttribute('data-yt-ready', '1');
      io.observe(boxes[i]);
    }
  }

  // cek ulang saat ada konten baru dimuat (mis. halaman portfolio via AJAX)
  var t;
  new MutationObserver(function () {
    clearTimeout(t);
    t = setTimeout(scan, 150);
  }).observe(document.body, { childList: true, subtree: true });

  scan();
})();
