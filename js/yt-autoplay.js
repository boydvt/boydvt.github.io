/*
  Autoplay video YouTube saat terlihat di layar (tanpa suara, berulang),
  berhenti saat di-scroll lewat. Klik -> buka besar di popup (pakai link/elemen di dalamnya).

  Cara pakai di HTML:
    <div class="yt-auto" data-yt="ID_VIDEO_YOUTUBE"> ... </div>
  Bekerja juga untuk konten yang dimuat belakangan (mis. halaman portfolio yang dibuka dari index).
*/
(function () {
  if (!('IntersectionObserver' in window)) return;

  function send(box, cmd) {
    var f = box.querySelector('iframe');
    if (f && f.contentWindow) {
      f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: cmd, args: [] }), '*');
    }
  }

  function start(box) {
    var id = box.getAttribute('data-yt');
    if (!box.querySelector('iframe')) {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube.com/embed/' + id +
        '?autoplay=1&mute=1&loop=1&playlist=' + id +
        '&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1';
      f.title = box.getAttribute('data-title') || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture';
      f.setAttribute('tabindex', '-1');
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
