/* ============================================================
   泠川 · main.js
   静水氛围（漂浮微粒）、光标涟漪、滚动浮现、导航
   全原生，含 prefers-reduced-motion 降级
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- 装饰层：雾气遮罩 ---------- */
  function mountGrain() {
    var g = document.createElement("div");
    g.className = "grain";
    g.setAttribute("aria-hidden", "true");
    document.body.appendChild(g);
  }

  /* ---------- 静水微粒：泡沫 · 雪花 · 星 ---------- */
  function mountAmbient() {
    if (prefersReduced) return;
    var c = document.createElement("canvas");
    c.id = "ambient";
    c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    var ctx = c.getContext("2d");
    var w = 0, h = 0, parts = [], count = 0;

    function resize() {
      w = c.width = Math.floor(innerWidth * dpr);
      h = c.height = Math.floor(innerHeight * dpr);
      c.style.width = innerWidth + "px";
      c.style.height = innerHeight + "px";
      count = Math.round((innerWidth * innerHeight) / 42000);
      count = Math.max(24, Math.min(count, 90));
      parts = [];
      for (var i = 0; i < count; i++) parts.push(make(true));
    }

    function make(seed) {
      return {
        x: Math.random() * w,
        y: seed ? Math.random() * h : h + Math.random() * 60,
        r: (Math.random() * 1.6 + 0.4) * dpr,
        vy: -(Math.random() * 0.22 + 0.05) * dpr,
        x0: 0,
        amp: Math.random() * 18 + 4,
        phase: Math.random() * Math.PI * 2,
        spd: Math.random() * 0.6 + 0.2,
        a: Math.random() * 0.35 + 0.08,
        tw: Math.random() * 0.6 + 0.2
      };
    }

    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y += p.vy;
        if (p.y < -20) { parts[i] = make(false); continue; }
        var x = p.x + Math.sin(t * 0.0004 * p.spd + p.phase) * p.amp;
        var alpha = p.a * (0.6 + 0.4 * Math.sin(t * 0.001 * p.tw + p.phase));
        ctx.beginPath();
        ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201, 228, 236, " + alpha.toFixed(3) + ")";
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    var rTimer;
    addEventListener("resize", function () { clearTimeout(rTimer); rTimer = setTimeout(resize, 180); });
    resize();
    requestAnimationFrame(frame);
  }

  /* ---------- 光标涟漪 ---------- */
  function mountRipple() {
    if (prefersReduced || !finePointer) return;
    var c = document.createElement("canvas");
    c.id = "ripple";
    c.setAttribute("aria-hidden", "true");
    document.body.appendChild(c);
    var ctx = c.getContext("2d");
    var w = c.width = innerWidth * dpr;
    var h = c.height = innerHeight * dpr;
    c.style.width = innerWidth + "px";
    c.style.height = innerHeight + "px";

    var rings = [];
    var last = 0;

    addEventListener("resize", function () {
      w = c.width = Math.floor(innerWidth * dpr);
      h = c.height = Math.floor(innerHeight * dpr);
      c.style.width = innerWidth + "px";
      c.style.height = innerHeight + "px";
    });

    addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var now = performance.now();
      if (now - last < 90) return;
      last = now;
      rings.push({ x: e.clientX * dpr, y: e.clientY * dpr, r: 0, max: (26 + Math.random() * 18) * dpr, a: 0.5 });
    }, { passive: true });

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (var i = rings.length - 1; i >= 0; i--) {
        var g = rings[i];
        g.r += 1.1 * dpr;
        g.a *= 0.955;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(159, 198, 216, " + g.a.toFixed(3) + ")";
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
        if (g.r > g.max || g.a < 0.02) rings.splice(i, 1);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 滚动浮现 ---------- */
  var revealIO = null;
  function observeReveal(root) {
    var els = (root || document).querySelectorAll(".reveal:not(.is-in)");
    if (!("IntersectionObserver" in window) || prefersReduced) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-in"); revealIO.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    }
    els.forEach(function (el) { revealIO.observe(el); });
  }
  function mountReveal() { observeReveal(document); }
  // 供动态渲染的脚本（gallery.js / pages.js）在插入节点后调用
  window.LC_reveal = observeReveal;

  /* ---------- 导航 ---------- */
  function mountNav() {
    var btn = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!btn || !links) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      links.classList.toggle("is-open", !open);
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { btn.setAttribute("aria-expanded", "false"); links.classList.remove("is-open"); }
    });
  }

  /* ---------- 页脚年份 ---------- */
  function mountYear() {
    var y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  }

  function init() {
    mountGrain();
    mountAmbient();
    mountRipple();
    mountReveal();
    mountNav();
    mountYear();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
