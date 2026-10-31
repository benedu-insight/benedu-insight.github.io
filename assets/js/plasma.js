/* Benedu Insight — hero: RF strikes a plasma inside the ring; its light lands on the rail as an emission spectrum */
(function () {
  'use strict';

  var BI = window.BI;
  var hero = document.getElementById('top');
  var back = document.getElementById('plasma-back');
  var ring = document.getElementById('hero-ring');
  var powerIn = document.getElementById('rf-power');
  var powerOut = document.getElementById('rf-power-out');
  var statusOut = document.getElementById('rf-status');
  var gasIns = document.querySelectorAll('input[name="gas"]');
  if (!hero || !back || !ring || !BI) return;

  var bctx = back.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STRIKE = 60, SUSTAIN = 30, PMAX = 600, RF_HZ = 1.6;
  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, rOut = 0, rIn = 0, small = false;
  var gas = BI.GASES.Ar, cdf = [];
  var power = 0, target = 0, lit = false, density = 0, flash = 0, clock = 0, excite = 0;
  var electrons = [], ions = [], flashes = [], photons = [];
  var running = false, inView = true, last = 0, raf = 0, shownGlow = -1, status = '';
  var sprites = {};

  /* ── helpers ── */
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function sprite(key, rgb) {
    if (sprites[key]) return sprites[key];
    var s = document.createElement('canvas'), n = 32;
    s.width = s.height = n;
    var x = s.getContext('2d'), g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, rgba(rgb, 1));
    g.addColorStop(0.35, rgba(rgb, 0.45));
    g.addColorStop(1, rgba(rgb, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, n, n);
    return (sprites[key] = s);
  }
  function pickLine() {
    var r = Math.random() * cdf[cdf.length - 1];
    for (var k = 0; k < cdf.length; k++) if (r <= cdf[k]) return gas.lines[k];
    return gas.lines[0];
  }
  function setGas(key) {
    gas = BI.GASES[key] || BI.GASES.Ar;
    var sum = 0;
    cdf = gas.lines.map(function (l) { sum += l[1]; return sum; });
    hero.style.setProperty('--glow-rgb', gas.glow.join(','));
    if (BI.rail) BI.rail.build(gas, reduce);
    if (reduce) drawStill();
  }

  function layout() {
    var hr = hero.getBoundingClientRect(), rr = ring.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hr.width; H = hr.height;
    back.width = Math.round(W * dpr); back.height = Math.round(H * dpr);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = rr.left - hr.left + rr.width / 2;
    cy = rr.top - hr.top + rr.height / 2;
    rOut = rr.width / 2;
    rIn = rOut * (parseFloat(ring.dataset.inner) || 24 / 46); // hero ring: inner/outer radius ratio
    small = W < 760;
  }

  /* ── particles (unit-disc coordinates, 1 = ring's inner edge) ── */
  function spawnE() {
    var a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 0.78, s = 0.18 + Math.random() * 0.55;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: Math.cos(a + 1.9) * s, vy: Math.sin(a + 1.9) * s, ph: Math.random() * 6.283 };
  }
  function spawnI() {
    var a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 0.5;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, vx: Math.cos(a) * 0.05, vy: Math.sin(a) * 0.05 };
  }
  function sheath(t) { return 0.2 - 0.09 * density + 0.045 * Math.sin(6.283 * RF_HZ * t); }

  function step(dt) {
    clock += dt;
    power += (target - power) * Math.min(1, dt * 5);
    if (Math.abs(target - power) < 0.5) power = target;

    if (!lit && power >= STRIKE) { lit = true; flash = 1; }
    else if (lit && power < SUSTAIN) { lit = false; }
    var dTarget = lit ? Math.max(0.14, Math.min(1, (power - SUSTAIN) / (PMAX * 0.55))) : 0;
    density += (dTarget - density) * Math.min(1, dt * (lit ? 2.6 : 5));
    flash = Math.max(0, flash - dt * 1.35);

    var nE = Math.round(22 + density * (small ? 220 : 460));
    var nI = Math.round(density * (small ? 40 : 90));
    while (electrons.length < nE) electrons.push(spawnE());
    if (electrons.length > nE) electrons.length = nE;
    while (ions.length < nI) ions.push(spawnI());
    if (ions.length > nI) ions.length = nI;

    var edge = 1 - sheath(clock);
    for (var k = 0; k < electrons.length; k++) {
      var e = electrons[k];
      e.vx += (Math.random() - 0.5) * dt * 2.4;
      e.vy += (Math.random() - 0.5) * dt * 2.4;
      var sp = Math.hypot(e.vx, e.vy), cap = 0.25 + density * 0.6;
      if (sp > cap) { e.vx *= cap / sp; e.vy *= cap / sp; }
      e.x += e.vx * dt; e.y += e.vy * dt;
      var d = Math.hypot(e.x, e.y);
      if (d > edge) { // the sheath turns electrons back
        var nx = e.x / d, ny = e.y / d, dot = e.vx * nx + e.vy * ny;
        e.vx -= 2 * dot * nx; e.vy -= 2 * dot * ny;
        e.x = nx * edge; e.y = ny * edge;
      }
    }
    for (k = ions.length - 1; k >= 0; k--) {
      var i = ions[k];
      i.x += i.vx * dt; i.y += i.vy * dt;
      if (Math.hypot(i.x, i.y) > edge) ions[k] = spawnI(); // lost to the wall through the sheath
    }

    excite += electrons.length * density * dt * 1.1;
    var photonP = small ? 0 : 0.05;
    var hr = hero.getBoundingClientRect(), ar = BI.rail ? BI.rail.axisRect() : null;
    while (excite >= 1) {
      excite -= 1;
      var src = electrons[(Math.random() * electrons.length) | 0];
      if (!src) break;
      var line = pickLine();
      flashes.push({ x: src.x, y: src.y, nm: line[0], age: 0, life: 0.25 + Math.random() * 0.3 });
      if (small && BI.rail) BI.rail.hit(line[0], 0.35); // narrow screens: the light goes straight to the rail, no flight over the copy
      else if (ar && Math.random() < photonP && ar.top - hr.top < H + 40) {
        var sx = cx + src.x * rIn, sy = cy + src.y * rIn;
        var tx = ar.left - hr.left + BI.nmX(line[0]) * ar.width, ty = ar.top - hr.top;
        photons.push(route(sx, sy, tx, ty, line[0]));
      }
    }
    for (k = flashes.length - 1; k >= 0; k--) { flashes[k].age += dt; if (flashes[k].age > flashes[k].life) flashes.splice(k, 1); }
    for (k = photons.length - 1; k >= 0; k--) {
      var p = photons[k];
      p.t += dt / p.dur;
      if (p.t >= 1) { if (BI.rail) BI.rail.hit(p.nm, 1); photons.splice(k, 1); }
    }
    if (BI.rail) BI.rail.tick(dt, density);

    var g = Math.round(density * 100) / 100;
    if (g !== shownGlow) { hero.style.setProperty('--glow', g); shownGlow = g; }
    report();
  }

  /* ── drawing ── */
  function drawBack() {
    var c = bctx;
    c.clearRect(0, 0, W, H);
    var lum = density * 0.9 + flash * 0.5;

    // the whole field takes the discharge colour
    var R = Math.max(W, H) * 0.95, fl = c.createRadialGradient(cx, cy, rIn * 0.6, cx, cy, R);
    fl.addColorStop(0, rgba(gas.glow, 0.46 * lum));
    fl.addColorStop(0.35, rgba(gas.glow, 0.17 * lum));
    fl.addColorStop(1, rgba(gas.glow, 0));
    c.fillStyle = fl;
    c.fillRect(0, 0, W, H);

    // RF feed from the generator side
    if (power > 0.5) {
      var amp = 2 + 9 * power / PMAX, x1 = Math.max(0, cx - rOut);
      c.beginPath();
      for (var x = 0; x <= x1; x += 3) {
        var y = cy + Math.sin(x * 0.075 - clock * 6.283 * RF_HZ * 2) * amp * Math.min(1, x / 80);
        if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = 'rgba(237,230,218,' + (0.16 + 0.24 * Math.min(1, power / 200)) + ')';
      c.lineWidth = 1.2;
      c.stroke();
    }

    // the hole of the ring: plasma body, dark sheath at its edge
    c.save();
    c.beginPath();
    c.arc(cx, cy, rIn + 1, 0, 6.283);
    c.clip();
    var edge = (1 - sheath(clock)) * rIn;
    if (lum > 0.01) {
      var body = c.createRadialGradient(cx, cy, 0, cx, cy, edge);
      body.addColorStop(0, rgba(gas.core, Math.min(1, 1.05 * lum)));
      body.addColorStop(0.45, rgba(gas.glow, 0.78 * lum));
      body.addColorStop(0.85, rgba(gas.glow, 0.3 * lum));
      body.addColorStop(1, rgba(gas.glow, 0));
      c.fillStyle = body;
      c.fillRect(cx - rIn, cy - rIn, rIn * 2, rIn * 2);
    }
    c.globalCompositeOperation = 'lighter';
    var es = sprite('e', [246, 238, 255]), is = sprite('i' + gas.glow.join(), gas.glow);
    var quiver = 0.03 * (0.35 + density), wob = Math.sin(6.283 * RF_HZ * clock);
    var sz = Math.max(3, rIn / 34);
    c.globalAlpha = 0.35 + 0.5 * Math.max(density, 0.25);
    for (var k = 0; k < electrons.length; k++) {
      var e = electrons[k];
      c.drawImage(es, cx + e.x * rIn - sz / 2, cy + (e.y + quiver * wob) * rIn - sz / 2, sz, sz);
    }
    c.globalAlpha = 0.8;
    var isz = sz * 1.9;
    for (k = 0; k < ions.length; k++) {
      var i = ions[k];
      c.drawImage(is, cx + i.x * rIn - isz / 2, cy + i.y * rIn - isz / 2, isz, isz);
    }
    for (k = 0; k < flashes.length; k++) {
      var f = flashes[k], a = 1 - f.age / f.life, fsz = sz * (2 + 3 * (1 - a));
      c.globalAlpha = a * 0.42;
      c.drawImage(sprite('l' + f.nm, BI.nmRGB(f.nm)), cx + f.x * rIn - fsz / 2, cy + f.y * rIn - fsz / 2, fsz, fsz);
    }
    c.restore();
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';

    // strike: a pulse leaves the ring
    if (flash > 0) {
      c.beginPath();
      c.arc(cx, cy, rOut * (1 + (1 - flash) * 0.9), 0, 6.283);
      c.strokeStyle = rgba(gas.core, flash * 0.5);
      c.lineWidth = 1.5;
      c.stroke();
    }
  }

  // Light pipe: out of the hole behind the ring's left side, down the margin,
  // along a lane just above the band (below the copy and the controls), then onto its line.
  function route(sx, sy, tx, ty, nm) {
    var fx = Math.max(10, cx - rOut - 20), lane = ty - 9 - Math.random() * 15;
    var pts = [[sx, sy], [fx, cy + rOut * 0.3], [fx, lane], [tx, lane], [tx, ty]], len = [0];
    for (var k = 1; k < pts.length; k++) len.push(len[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    var total = len[len.length - 1];
    return { pts: pts, len: len, total: total, t: 0, dur: Math.min(5.5, 2.2 + total / 420), nm: nm, col: BI.nmCss(nm, 0.95) };
  }
  function at(p, d) {
    d = Math.max(0, Math.min(p.total, d));
    for (var k = 1; k < p.pts.length; k++) {
      if (d <= p.len[k]) {
        var f = (d - p.len[k - 1]) / Math.max(1e-6, p.len[k] - p.len[k - 1]), a = p.pts[k - 1], b = p.pts[k];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
    }
    return p.pts[p.pts.length - 1];
  }
  function drawPhotons() { // drawn under the ring and the copy: light leaves through the hole
    var c = bctx;
    c.lineCap = 'round';
    for (var k = 0; k < photons.length; k++) {
      var p = photons[k], d = Math.min(1, p.t) * p.total, u = Math.min(1, p.t);
      c.beginPath();
      for (var j = 0; j <= 4; j++) { var q = at(p, d - 28 + j * 7); if (j) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }
      c.strokeStyle = p.col;
      c.globalAlpha = 0.12 + 0.38 * Math.sin(Math.PI * Math.min(1, u * 1.1));
      c.lineWidth = 1.1;
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function report() {
    var s = !lit && power < 0.5 ? 'idle' : !lit ? 'ramp' : flash > 0.45 ? 'strike' : power < STRIKE ? 'hyst' : 'glow';
    if (powerOut) powerOut.textContent = Math.round(power) + ' W';
    if (s === status) return;
    status = s;
    paintStatus();
  }
  var STATUS = {
    idle: ['RF Off · 비어 있는 링', 'RF off · the ring is empty'],
    ramp: ['전력 상승 · 점화 전', 'Ramping · below strike'],
    strike: ['점화 · Strike', 'Strike'],
    hyst: ['방전 유지 · Hysteresis 구간', 'Still lit · hysteresis'],
    glow: ['Glow Discharge', 'Glow Discharge']
  };
  function paintStatus() {
    if (!statusOut || !status) return;
    statusOut.textContent = BI.t(STATUS[status][0], STATUS[status][1]);
    hero.setAttribute('data-plasma', status);
  }
  BI.onLang(paintStatus);

  function frame(now) {
    raf = 0;
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    step(dt);
    drawBack();
    drawPhotons();
    raf = requestAnimationFrame(frame);
  }
  function play() {
    if (reduce || running || !inView || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function pause() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  function drawStill() { // reduced motion: one lit frame, no travel
    lit = true; power = target; density = 0.82; flash = 0;
    for (var k = 0; k < 40; k++) step(0.03);
    flashes.length = 0; photons.length = 0;
    drawBack();
    if (BI.rail) BI.rail.build(gas, true);
  }

  /* ── controls ── */
  if (powerIn) {
    powerIn.addEventListener('input', function () {
      intro = false;
      target = +powerIn.value;
      if (reduce) { power = target; lit = power >= SUSTAIN; density = lit ? 0.82 : 0; drawBack(); report(); }
    });
  }
  gasIns.forEach(function (r) {
    r.addEventListener('change', function () { if (r.checked) setGas(r.value); });
  });

  /* ── lifecycle ── */
  var intro = true;
  layout();
  setGas('Ar');
  if (reduce) {
    target = powerIn ? +powerIn.value : 300;
    drawStill();
    report();
  } else {
    var goal = powerIn ? +powerIn.value : 300;
    if (powerIn) powerIn.value = 0;
    report();
    setTimeout(function () { // the opening strike: RF ramps up and the empty ring lights
      var t0 = performance.now(), dur = 1700;
      (function ramp(now) {
        if (!intro) return;
        var u = Math.min(1, (now - t0) / dur), v = Math.round(goal * (1 - Math.pow(1 - u, 3)) / 10) * 10;
        target = v;
        if (powerIn) powerIn.value = v;
        if (u < 1) requestAnimationFrame(ramp);
      })(t0);
    }, 650);
  }

  new IntersectionObserver(function (es) {
    inView = es[0].isIntersecting;
    if (BI.rail) BI.rail.setHero(es[0].intersectionRatio > 0.35);
    if (inView) play(); else pause();
  }, { threshold: [0, 0.35] }).observe(hero);
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });
  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { layout(); if (reduce) drawStill(); }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); if (reduce) drawStill(); });
  play();
})();
