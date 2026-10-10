/* ============================================================
   泠川 · gallery.js
   相册索引 / 相册详情 / 自研原生灯箱
   ============================================================ */
(function () {
  "use strict";

  var IMG_SIZES = [480, 1024, 1920];

  function srcset(base) {
    return IMG_SIZES.map(function (w) { return base + "-" + w + ".webp " + w + "w"; }).join(", ");
  }

  function picture(p, sizes) {
    var alt = p.title || p.caption || "泠川 · 作品";
    return '<picture>' +
      '<source type="image/webp" srcset="' + srcset(p.base) + '" sizes="' + sizes + '">' +
      '<img class="ph" src="' + p.base + '-1024.jpg" alt="' + esc(alt) + '"' +
      ' width="' + (p.w || "") + '" height="' + (p.h || "") + '"' +
      ' loading="lazy" decoding="async">' +
      '</picture>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function getParam(name) {
    var m = new RegExp("[?&]" + name + "=([^&]+)").exec(location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /* ---------- 相册索引 ---------- */
  function initIndex() {
    var grid = document.querySelector("#album-grid");
    if (!grid || !window.LC || !LC.albums) return;
    grid.innerHTML = LC.albums.map(function (a) {
      var cover = { base: a.cover.replace(/-1024\.webp$/, ""), title: a.title, caption: "", w: 1024, h: 768 };
      return '<a class="album-card reveal" href="album.html?系列=' + encodeURIComponent(a.slug) + '">' +
        '<div class="album-card__media">' + picture(cover, "(max-width:760px) 100vw, 33vw") + '</div>' +
        '<div class="album-card__body">' +
        '<h3 class="h3">' + esc(a.title) + '</h3>' +
        '<div class="album-card__meta">' + esc(a.series || "") + " · " + esc(a.year || "") + '</div>' +
        (a.desc ? '<p class="album-card__desc">' + esc(a.desc) + '</p>' : '') +
        '</div></a>';
    }).join("");
    if (window.LC_reveal) window.LC_reveal(grid);
  }

  /* ---------- 相册详情 ---------- */
  function initAlbum() {
    var grid = document.querySelector("#photo-grid");
    if (!grid || !window.LC || !LC.albums) return;
    var slug = getParam("album") || getParam("s");
    var album = LC.albums.filter(function (a) { return a.slug === slug; })[0];
    if (!album) { location.replace("photos.html"); return; }

    document.title = album.title + " · 摄影 · 泠川";
    var h = document.querySelector("[data-album-title]");
    var m = document.querySelector("[data-album-meta]");
    var d = document.querySelector("[data-album-desc]");
    if (h) h.textContent = album.title;
    if (m) m.textContent = (album.series || "") + " · " + (album.year || "") + " · " + album.photos.length + " 帧";
    if (d) d.textContent = album.desc || "";

    grid.innerHTML = album.photos.map(function (p, i) {
      var cap = p.caption ? esc(p.caption) : '<span class="blank">·</span>';
      return '<figure class="reveal"><button class="lb-open" data-i="' + i + '" aria-label="查看第 ' + (i + 1) + ' 张">' +
        picture(p, "(max-width:640px) 50vw, (max-width:1024px) 40vw, 33vw") +
        '</button><figcaption class="photo-cap">' + cap + '</figcaption></figure>';
    }).join("");
    if (window.LC_reveal) window.LC_reveal(grid);

    Lightbox.init(album.photos);
  }

  /* ---------- 自研灯箱 ---------- */
  var Lightbox = (function () {
    var el, stage, imgEl, capEl, countEl, photos, idx = 0, zoom = 0, built = false;
    var swipeX = 0, swiping = false;

    function build() {
      if (built) return;
      el = document.createElement("div");
      el.className = "lightbox";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-label", "图片查看");
      el.innerHTML =
        '<div class="lightbox__bar">' +
          '<span class="lightbox__counter" data-count></span>' +
          '<div class="lightbox__tools">' +
            '<button class="lb-btn" data-zoom aria-label="缩放"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/></svg></button>' +
            '<button class="lb-btn" data-close aria-label="关闭"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
          '</div>' +
        '</div>' +
        '<div class="lightbox__stage">' +
          '<button class="lb-btn lightbox__nav prev" data-prev aria-label="上一张"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 5l-7 7 7 7"/></svg></button>' +
          '<img class="lightbox__img" data-img alt="">' +
          '<button class="lb-btn lightbox__nav next" data-next aria-label="下一张"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 5l7 7-7 7"/></svg></button>' +
        '</div>' +
        '<div class="lightbox__cap" data-cap></div>';
      document.body.appendChild(el);

      stage = el.querySelector(".lightbox__stage");
      imgEl = el.querySelector("[data-img]");
      capEl = el.querySelector("[data-cap]");
      countEl = el.querySelector("[data-count]");

      el.querySelector("[data-close]").addEventListener("click", close);
      el.querySelector("[data-prev]").addEventListener("click", function () { go(-1); });
      el.querySelector("[data-next]").addEventListener("click", function () { go(1); });
      el.querySelector("[data-zoom]").addEventListener("click", toggleZoom);
      el.addEventListener("click", function (e) { if (e.target === el) close(); });

      addEventListener("keydown", onKey);
      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointerup", onUp);
      stage.addEventListener("pointercancel", function () { swiping = false; });

      built = true;
    }

    function bigSrc(p) { return p.base + "-1920.webp"; }
    function bigFallback(p) { return p.base + "-1024.jpg"; }

    function render() {
      var p = photos[idx];
      imgEl.style.opacity = 0;
      var next = new Image();
      next.onload = function () {
        imgEl.src = next.src;
        imgEl.alt = p.title || p.caption || "泠川 · 作品";
        imgEl.style.opacity = 1;
      };
      next.src = bigSrc(p);
      imgEl.onerror = function () { imgEl.src = bigFallback(p); imgEl.style.opacity = 1; };
      capEl.innerHTML = (p.title ? '<span class="lb-title">' + esc(p.title) + '</span>' : '') +
        (p.caption ? (p.title ? '<br>' : '') + esc(p.caption) : (p.title ? '' : '<span class="blank" style="opacity:.3">·</span>'));
      countEl.textContent = (idx + 1) + " / " + photos.length;
      resetZoom();
    }

    function open(i) {
      build();
      idx = Math.max(0, Math.min(i, photos.length - 1));
      render();
      el.classList.add("is-open");
      document.body.style.overflow = "hidden";
      el.querySelector("[data-close]").focus();
    }
    function close() {
      if (!built) return;
      el.classList.remove("is-open");
      document.body.style.overflow = "";
      var trigger = document.querySelector('.lb-open[data-i="' + idx + '"]');
      if (trigger) trigger.focus();
    }
    function go(d) { idx = (idx + d + photos.length) % photos.length; render(); }

    function onKey(e) {
      if (!el.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }

    function resetZoom() { zoom = 0; imgEl.style.transform = "scale(1)"; imgEl.style.cursor = "zoom-in"; stage.style.overflow = "hidden"; }
    function toggleZoom() {
      zoom = zoom ? 0 : 1;
      imgEl.style.transform = "scale(" + (zoom ? 1.8 : 1) + ")";
      imgEl.style.cursor = zoom ? "zoom-out" : "zoom-in";
      stage.style.overflow = zoom ? "auto" : "hidden";
    }
    function onDown(e) { swipeX = e.clientX; swiping = true; }
    function onUp(e) {
      if (!swiping) return; swiping = false;
      var dx = e.clientX - swipeX;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    }

    return {
      init: function (list) {
        photos = list || [];
        // 绑定图片点击
        document.querySelectorAll(".lb-open").forEach(function (b) {
          b.addEventListener("click", function () { open(parseInt(b.dataset.i, 10)); });
        });
      },
      open: open
    };
  })();

  /* ---------- 启动 ---------- */
  function boot() {
    initIndex();
    initAlbum();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.LC_gallery = { Lightbox: Lightbox };
})();
