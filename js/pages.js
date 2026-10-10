/* ============================================================
   泠川 · pages.js
   随笔（断章）/ 时间线 / 兴趣（浮沫·星屑）
   ============================================================ */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]+)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 随笔列表 ---------- */
  function initNotes() {
    var list = document.querySelector("#note-list");
    if (!list || !window.LC || !LC.notes) return;
    list.innerHTML = LC.notes.map(function (n) {
      return '<a class="note-item reveal" href="note.html?id=' + encodeURIComponent(n.id) + '">' +
        '<time datetime="' + esc(n.date) + '">' + esc(n.date) + '</time>' +
        '<div><h3 class="h3">' + esc(n.title) + '</h3>' +
        (n.excerpt ? '<p>' + esc(n.excerpt) + '</p>' : '') + '</div>' +
        '<span class="arrow" aria-hidden="true">→</span></a>';
    }).join("");
    if (window.LC_reveal) window.LC_reveal(list);
  }

  /* ---------- 随笔详情 ---------- */
  function initNote() {
    var art = document.querySelector("#note-article");
    if (!art || !window.LC || !LC.notes) return;
    var id = getParam("id");
    var n = LC.notes.filter(function (x) { return x.id === id; })[0];
    if (!n) { location.replace("notes.html"); return; }
    document.title = n.title + " · 随笔 · 泠川";
    art.innerHTML =
      '<header class="article-head">' +
        '<div class="eyebrow">断章</div>' +
        '<h1 class="h1" style="margin-top:.6rem">' + esc(n.title) + '</h1>' +
        '<time datetime="' + esc(n.date) + '">' + esc(n.date) + '</time>' +
      '</header>' +
      '<div class="article-body verse">' +
        n.body.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
      '</div>' +
      '<hr class="divider">' +
      '<a class="back-link" href="notes.html">← 回到断章</a>';
  }

  /* ---------- 时间线 ---------- */
  function initTimeline() {
    var tl = document.querySelector("#timeline");
    if (!tl || !window.LC || !LC.timeline) return;
    tl.innerHTML = LC.timeline.map(function (t) {
      return '<div class="tl-item reveal' + (t.faint ? " tl-item--faint" : "") + '">' +
        '<div class="tl-date">' + esc(t.date) + '</div>' +
        '<h3 class="h3">' + esc(t.title) + '</h3>' +
        (t.text ? '<p>' + esc(t.text) + '</p>' : '') +
        '</div>';
    }).join("");
    if (window.LC_reveal) window.LC_reveal(tl);
  }

  /* ---------- 兴趣 · 浮沫星屑 ---------- */
  function initFragments() {
    var field = document.querySelector("#fragment-field");
    if (!field || !window.LC || !LC.fragments) return;

    // 打散顺序，避免读起来像清单
    var arr = LC.fragments.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }

    field.innerHTML = arr.map(function (f) {
      var cls = "fragment" + (f.tone === "faint" ? " fragment--faint" : "") + (f.tone === "bright" ? " fragment--bright" : "");
      var delay = (Math.random() * 1.6).toFixed(2);
      return '<span class="' + cls + '" style="animation-delay:' + delay + 's">' + esc(f.text) + '</span>';
    }).join("");

    if (reduced) return;

    // 「浮现又消散」：随机让个别碎片淡出再淡入，永远看不全
    var nodes = Array.prototype.slice.call(field.children);
    setInterval(function () {
      var n = nodes[Math.floor(Math.random() * nodes.length)];
      if (!n) return;
      var prev = n.style.opacity;
      n.style.opacity = "0.06";
      n.style.transition = "opacity 1.6s var(--ease-water)";
      setTimeout(function () { n.style.opacity = prev || ""; }, 1600);
    }, 1400);
  }

  function boot() { initNotes(); initNote(); initTimeline(); initFragments(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
