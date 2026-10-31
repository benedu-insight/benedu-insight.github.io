/* Benedu Insight — page behaviour */
(function () {
  'use strict';

  var BI = window.BI;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia('(min-width: 900px)');
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (u) { return 1 - Math.pow(1 - u, 3); };

  /* ── Top bar & menu sheet ─────────────────────────────── */
  var bar = $('#topbar');
  var onScroll = function () { bar.classList.toggle('is-solid', window.scrollY > 24); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var sheet = $('#menu');
  var openers = $$('[data-menu-open]');
  function setMenu(open) {
    sheet.hidden = !open;
    document.body.classList.toggle('menu-open', open);
    openers.forEach(function (b) { b.setAttribute('aria-expanded', String(open)); });
    if (open) $('a, button', sheet).focus();
  }
  openers.forEach(function (b) { b.addEventListener('click', function () { setMenu(sheet.hidden); }); });
  $$('[data-menu-close], #menu a', sheet).forEach(function (el) { el.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) setMenu(false); });

  /* ── Sections → rail ──────────────────────────────────── */
  var ids = ['philosophy', 'strengths', 'curriculum', 'sims', 'method', 'instructor', 'contact'];
  var secs = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  function syncRail() {
    var mid = window.innerHeight * 0.45, cur = '';
    secs.forEach(function (s) { if (s.getBoundingClientRect().top <= mid) cur = s.id; });
    if (BI.rail) BI.rail.setActive(cur);
  }
  window.addEventListener('scroll', syncRail, { passive: true });
  BI.onLang(syncRail);
  syncRail();

  /* ── Philosophy: scattered trees assemble into one Chamber ── */
  var phil = $('#philosophy');
  var chamber = $('#chamber');
  if (phil && chamber) {
    var labels = $$('.lb', chamber);
    var strokes = $$('.dr', chamber);
    var leads = $$('.ld', chamber);
    var glow = $('.ch-glow', chamber);
    var seed = 7;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    labels.forEach(function (g, i) {
      g._dx = (rnd() - 0.5) * 760;
      g._dy = (rnd() - 0.5) * 520;
      g._r = (rnd() - 0.5) * 50;
      g._d = i * 0.025;
    });
    var lastP = -1;
    var paint = function (p) {
      if (Math.abs(p - lastP) < 0.002) return;
      lastP = p;
      labels.forEach(function (g) {
        var u = ease(clamp((p - g._d) / 0.55, 0, 1)), m = 1 - u;
        g.setAttribute('transform', 'translate(' + (g._dx * m).toFixed(1) + ' ' + (g._dy * m).toFixed(1) + ') rotate(' + (g._r * m).toFixed(1) + ')');
        g.style.opacity = (0.35 + 0.65 * u).toFixed(2);
      });
      var d = clamp((p - 0.05) / 0.6, 0, 1);
      strokes.forEach(function (s) { s.style.strokeDashoffset = (1 - d).toFixed(3); });
      chamber.style.setProperty('--d', d.toFixed(3));
      var l = clamp((p - 0.62) / 0.25, 0, 1);
      leads.forEach(function (s) { s.style.strokeDashoffset = (1 - l).toFixed(3); });
      if (glow) glow.style.opacity = clamp((p - 0.5) / 0.3, 0, 1).toFixed(2);
      chamber.classList.toggle('is-built', p > 0.86);
    };
    var mobileBox = '250 30 580 610', fullBox = '0 0 1000 640';
    var applyBox = function () { chamber.setAttribute('viewBox', wide.matches ? fullBox : mobileBox); };
    applyBox();
    wide.addEventListener ? wide.addEventListener('change', applyBox) : wide.addListener(applyBox);
    // Assembles on its own when the drawing is half in view, scatters again once it has left the screen.
    if (reduce) paint(1);
    else {
      paint(0);
      var built = false, run = 0;
      new IntersectionObserver(function (es) {
        var r = es[0].intersectionRatio;
        if (!es[0].isIntersecting || r === 0) {
          if (run) cancelAnimationFrame(run);
          run = 0; built = false; lastP = -1; paint(0);
        } else if (r >= 0.45 && !built) {
          built = true;
          var t0 = performance.now(), dur = 3600;
          (function step(now) {
            var u = Math.min(1, (now - t0) / dur);
            paint(u);
            run = u < 1 ? requestAnimationFrame(step) : 0;
          })(t0);
        }
      }, { threshold: [0, 0.45] }).observe(chamber);
    }
  }

  /* ── Misconceptions get struck through when seen ──────── */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-seen'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -20% 0px' });
  $$('.fix, .reveal-line').forEach(function (el) { reduce ? el.classList.add('is-seen') : io.observe(el); });

  /* ── Course finder: one decision point, only the path ahead ── */
  var PATHS = {
    device: { courses: ['class-1', 'class-2'], ko: 'Class-01 + Class-02 · 각 7–8시간', en: 'Class-01 + Class-02 · 7–8 hours each',
      why: ['플라즈마 장비를 직접 운영하므로 공정 원리와 RF 전력전송을 모두 다룹니다.', 'You run plasma tools directly, so we cover both the process and RF power delivery.'] },
    equipment: { courses: ['class-1', 'class-2'], ko: 'Class-01 + Class-02 · 각 7–8시간', en: 'Class-01 + Class-02 · 7–8 hours each',
      why: ['장비를 설계·제작하므로 교육 담당자와 협의해 두 클래스를 구성합니다.', 'You build the tools; both classes are planned together with your training lead.'] },
    parts: { courses: ['class-1'], ko: 'Class-01 · 7–8시간', en: 'Class-01 · 7–8 hours',
      why: ['RF 전력전송의 세부 원리보다 플라즈마 공정의 이해가 핵심입니다.', 'Understanding the plasma process matters more than the details of RF delivery.'] },
    newcomer: { courses: ['basic'], ko: 'Basic · 온라인 11강', en: 'Basic · 11 online lectures',
      why: ['원자와 에너지 준위부터 RF Generator까지, 수식보다 그림으로 시작합니다.', 'From atoms and energy levels to the RF Generator — pictures before equations.'] },
    school: { courses: ['special', 'basic'], ko: 'Special Class · 5–6교시 + Basic', en: 'Special Class · 5–6 periods + Basic',
      why: ['Class-01의 난이도를 낮춘 출강 교육, 온라인 Basic을 교재로 씁니다.', 'An on-site, levelled-down Class-01 that uses the online Basic course as its textbook.'] }
  };
  var finder = $('#finder');
  var courses = $$('[data-course]');
  var result = $('#finder-result');
  function paintFinder() {
    var sel = $('input[name="who"]:checked', finder);
    var path = sel ? PATHS[sel.value] : null;
    courses.forEach(function (c) {
      var on = path && path.courses.indexOf(c.dataset.course) > -1;
      c.classList.toggle('is-rec', !!on);
      c.classList.toggle('is-dim', !!path && !on);
    });
    if (!path) { result.hidden = true; return; }
    result.hidden = false;
    $('.fr-path', result).textContent = BI.t(path.ko, path.en);
    $('.fr-why', result).textContent = BI.t(path.why[0], path.why[1]);
    $('.fr-go', result).setAttribute('href', '#course-' + path.courses[0]);
  }
  if (finder) {
    finder.addEventListener('change', paintFinder);
    BI.onLang(paintFinder);
  }

  /* ── Recipe: modules picked here become the inquiry ───── */
  var picks = $$('.mod-pick input');
  var recipe = $('#recipe');
  var dock = $('#recipe-dock');
  function fmt(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return BI.t((h ? h + '시간 ' : '') + (m ? m + '분' : (h ? '' : '0분')), (h ? h + 'h ' : '') + (m ? m + 'm' : (h ? '' : '0m'))).trim();
  }
  function chosen() {
    return picks.filter(function (p) { return p.checked; }).map(function (p) {
      var row = p.closest('.mod');
      return { id: p.value, course: row.dataset.class, code: row.dataset.code, min: +row.dataset.min,
        title: BI.t(row.dataset.ko, row.dataset.en) };
    });
  }
  function paintRecipe() {
    var list = chosen(), total = list.reduce(function (s, m) { return s + m.min; }, 0);
    var ul = $('.rc-list', recipe);
    ul.textContent = '';
    list.forEach(function (m) {
      var li = document.createElement('li');
      li.style.setProperty('--m', m.min);
      li.innerHTML = '<span class="rc-code"></span><span class="rc-title"></span><span class="rc-min"></span>';
      li.children[0].textContent = m.course + ' ' + m.code;
      li.children[1].textContent = m.title;
      li.children[2].textContent = m.min + 'm';
      ul.appendChild(li);
    });
    recipe.classList.toggle('is-empty', !list.length);
    $('.rc-total', recipe).textContent = fmt(total);
    $('.rc-count', recipe).textContent = list.length;
    if (dock) {
      dock.hidden = !list.length;
      $('.dk-sum', dock).textContent = BI.t(list.length + '개 모듈 · ' + fmt(total), list.length + ' modules · ' + fmt(total));
    }
  }
  picks.forEach(function (p) { p.addEventListener('change', paintRecipe); });
  BI.onLang(paintRecipe);
  if (recipe) paintRecipe();

  function sendRecipe() {
    var list = chosen();
    if (!list.length) return;
    var total = list.reduce(function (s, m) { return s + m.min; }, 0);
    var lines = list.map(function (m) { return '· ' + m.course + ' ' + m.code + ' ' + m.title + ' (' + m.min + 'm)'; });
    var head = BI.t('[희망 모듈 구성 · 총 ' + fmt(total) + ']', '[Requested modules · ' + fmt(total) + ' total]');
    var ta = $('#reason');
    var block = head + '\n' + lines.join('\n');
    var prev = ta.value.replace(/\[(희망 모듈 구성|Requested modules)[^\]]*\][\s\S]*?(\n\n|$)/, '');
    ta.value = block + '\n\n' + prev;
    var cls = {};
    list.forEach(function (m) { cls[m.course === 'Class-01' ? 'class-1' : 'class-2'] = true; });
    $$('input[name="class"]').forEach(function (c) { if (cls[c.value]) c.checked = true; });
    $('#contact').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () { $('#company').focus({ preventScroll: true }); }, reduce ? 0 : 700);
  }
  $$('[data-send-recipe]').forEach(function (b) { b.addEventListener('click', sendRecipe); });

  /* ── Inquiry form (formsubmit.co, as on the live site) ── */
  var form = $('#inquiry');
  if (form) {
    var btn = $('button[type="submit"]', form);
    var err = $('#form-error');
    var done = $('#form-done');
    var subj = $('#form-subject');
    var setSubj = function () { subj.value = BI.t('[Benedu Insight] 신규 강의 문의', '[Benedu Insight] New Training Inquiry'); };
    BI.onLang(setSubj);
    setSubj();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      if (!form.checkValidity()) {
        form.classList.add('was-checked');
        var bad = $(':invalid:not(fieldset)', form);
        if (bad) bad.focus();
        return;
      }
      btn.disabled = true;
      form.classList.add('is-sending');
      fetch('https://formsubmit.co/ajax/benedu.insight@gmail.com', {
        method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form)
      }).then(function (res) {
        if (!res.ok) throw new Error('send');
        form.reset();
        form.hidden = true;
        done.hidden = false;
        done.focus();
      }).catch(function () {
        err.hidden = false;
      }).then(function () {
        btn.disabled = false;
        form.classList.remove('is-sending');
      });
    });
    $('[data-form-again]').addEventListener('click', function () {
      done.hidden = true;
      form.hidden = false;
      form.classList.remove('was-checked');
      $('#company').focus();
    });
  }

  var y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
})();
