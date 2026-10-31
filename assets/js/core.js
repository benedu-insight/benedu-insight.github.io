/* Benedu Insight — core: language, spectral data, emission-line rail */
(function () {
  'use strict';

  var BI = (window.BI = window.BI || {});
  var root = document.documentElement;
  root.classList.add('js');

  /* ── Language ─────────────────────────────────────────── */
  var listeners = [];
  BI.lang = function () { return root.getAttribute('data-lang') || 'ko'; };
  BI.t = function (ko, en) { return BI.lang() === 'en' ? en : ko; };
  BI.onLang = function (fn) { listeners.push(fn); };
  BI.setLang = function (lang) {
    lang = lang === 'en' ? 'en' : 'ko';
    root.setAttribute('data-lang', lang);
    root.lang = lang;
    try { localStorage.setItem('bi-lang', lang); } catch (e) {}
    document.querySelectorAll('[data-ph-ko]').forEach(function (el) {
      el.placeholder = lang === 'en' ? el.dataset.phEn : el.dataset.phKo;
    });
    document.querySelectorAll('[data-al-ko]').forEach(function (el) {
      el.setAttribute('aria-label', lang === 'en' ? el.dataset.alEn : el.dataset.alKo);
    });
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.setLang === lang));
    });
    listeners.forEach(function (fn) { fn(lang); });
  };
  var q = new URLSearchParams(location.search).get('lang');
  var saved = null;
  try { saved = localStorage.getItem('bi-lang'); } catch (e) {}
  BI.setLang(q || saved || 'ko');
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-set-lang]');
    if (b) BI.setLang(b.dataset.setLang);
  });

  /* ── Spectral data ────────────────────────────────────── */
  // Wavelength (nm) → sRGB, after Bruton's approximation, lifted for dark grounds.
  BI.nmRGB = function (nm) {
    var r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else { r = 1; }
    var f = nm < 420 ? 0.35 + 0.65 * (nm - 380) / 40 : nm > 700 ? 0.42 + 0.58 * (780 - nm) / 80 : 1;
    return [r, g, b].map(function (c) { return Math.round(255 * Math.pow(Math.max(0, c * f), 0.8) * 0.82 + 40); });
  };
  BI.nmCss = function (nm, a) {
    var c = BI.nmRGB(nm);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')';
  };
  BI.nmX = function (nm) { return (nm - 380) / 400; };
  document.querySelectorAll('[data-nm]').forEach(function (el) {
    el.style.setProperty('--c', BI.nmCss(parseFloat(el.dataset.nm)));
  });

  // Each section's ground is a faint spectrogram plate: procedural bands in its own hue,
  // brightest at the x where its line sits on the rail.
  function band(nm) {
    var W = 480, cv = document.createElement('canvas'), x = cv.getContext('2d');
    cv.width = W; cv.height = 1;
    var rgb = BI.nmRGB(nm), seed = Math.round(nm * 10), img = x.createImageData(W, 1), peak = BI.nmX(nm) * W;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var i = 0; i < W;) {
      var w = 2 + Math.floor(rnd() * 12), n = rnd(), a0 = 0.012 + (rnd() < 0.16 ? 0.05 : 0.018) * n;
      for (var k = 0; k < w && i < W; k++, i++) {
        var d = i - peak, a = a0 + 0.1 * Math.exp(-d * d / 90), o = i * 4;
        img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2];
        img.data[o + 3] = Math.round(Math.min(1, a) * 255);
      }
    }
    x.putImageData(img, 0, 0);
    return 'url(' + cv.toDataURL() + ')';
  }
  document.querySelectorAll('section[data-nm]').forEach(function (s) {
    try { s.style.setProperty('--band', band(parseFloat(s.dataset.nm))); } catch (e) {}
  });

  // Process gases shown in the hero. Visible emission lines with rough relative intensity.
  BI.GASES = {
    Ar: {
      glow: [176, 128, 255], core: [236, 222, 255],
      lines: [[404.4, .15], [415.9, .2], [420.1, .25], [427.2, .16], [434.8, .5], [442.6, .35], [454.5, .3], [460.9, .36],
        [465.8, .3], [472.7, .35], [476.5, .42], [480.6, .46], [488.0, .4], [696.5, .7], [706.7, .6], [714.7, .3],
        [727.3, .45], [738.4, .66], [750.4, 1], [763.5, .95], [772.4, .6]]
    },
    O2: {
      glow: [168, 190, 255], core: [236, 242, 255],
      lines: [[436.8, .2], [525.8, .3], [533.0, .25], [544.6, .2], [557.7, .15], [559.7, .28], [597.3, .3], [602.6, .28],
        [615.8, .4], [645.6, .32], [700.2, .2], [725.4, .16], [777.2, 1]]
    },
    CF4: {
      glow: [120, 150, 255], core: [222, 232, 255],
      lines: [[451.0, .25], [483.5, .35], [519.8, .3], [561.0, .16], [623.9, .2], [634.8, .3], [685.6, .8], [690.2, .6],
        [703.7, 1], [712.8, .6], [720.2, .4], [731.1, .35], [739.9, .5], [775.5, .3]]
    },
    N2: {
      glow: [240, 150, 205], core: [255, 228, 240],
      lines: [[380.5, .6], [391.4, .9], [394.3, .3], [399.8, .5], [405.9, .35], [427.8, .6], [580.4, .3], [590.6, .35],
        [632.3, .4], [654.5, .45], [662.4, .4], [670.5, .5], [675.5, .45], [741.4, .3], [762.6, .28]]
    }
  };

  /* ── Emission-line rail ───────────────────────────────── */
  BI.rail = (function () {
    var rail = document.getElementById('rail');
    if (!rail) return null;
    var axis = rail.querySelector('.rail-axis');
    var gasLayer = rail.querySelector('.rail-gas');
    var cursor = rail.querySelector('.rail-cursor');
    var now = rail.querySelector('.rail-now');
    var links = Array.prototype.slice.call(rail.querySelectorAll('.rl'));
    var bins = [];

    links.forEach(function (a) {
      var nm = parseFloat(a.dataset.nm);
      a.style.setProperty('--x', (BI.nmX(nm) * 100).toFixed(2) + '%');
      a.style.setProperty('--c', BI.nmCss(nm));
      if (BI.nmX(nm) > 0.9) a.classList.add('rl-end');
    });

    function build(gas, levels) {
      gasLayer.textContent = '';
      bins = gas.lines.map(function (l) {
        var s = document.createElement('i');
        s.style.left = (BI.nmX(l[0]) * 100).toFixed(2) + '%';
        s.style.background = BI.nmCss(l[0]);
        gasLayer.appendChild(s);
        return { nm: l[0], i: l[1], level: levels ? l[1] * 0.8 : 0, el: s, shown: -1 };
      });
      render();
    }
    function render() {
      for (var k = 0; k < bins.length; k++) {
        var b = bins[k], v = Math.round(b.level * 100) / 100;
        if (v !== b.shown) { b.el.style.transform = 'scaleY(' + v + ')'; b.shown = v; }
      }
    }
    function hit(nm, w) {
      for (var k = 0; k < bins.length; k++) {
        if (bins[k].nm === nm) { bins[k].level = Math.min(1, bins[k].level + 0.16 * (w || 1)); break; }
      }
    }
    function tick(dt, density) {
      var floor = 0.12 * density;
      for (var k = 0; k < bins.length; k++) {
        var b = bins[k];
        b.level += (b.i * floor - b.level) * Math.min(1, dt * 0.9);
      }
      render();
    }
    function setActive(id) {
      var hit = null;
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', on);
        if (on) { a.setAttribute('aria-current', 'location'); hit = a; } else a.removeAttribute('aria-current');
      });
      rail.classList.toggle('has-active', !!hit);
      if (hit) {
        cursor.style.left = hit.style.getPropertyValue('--x');
        cursor.style.setProperty('--c', hit.style.getPropertyValue('--c'));
        if (now) now.innerHTML = hit.querySelector('.rl-name').innerHTML + '<em>' + hit.querySelector('.rl-id').textContent + '</em>';
      } else if (now) {
        now.innerHTML = '<span class="ko">스펙트럼으로 둘러보기</span><span class="en">Browse by spectrum</span>';
      }
    }
    function setHero(on) { rail.classList.toggle('is-hero', on); }
    function axisRect() { return axis.getBoundingClientRect(); }

    return { build: build, hit: hit, tick: tick, setActive: setActive, setHero: setHero, axisRect: axisRect };
  })();
})();
