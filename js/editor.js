/* ============================================================
   泠川 · 内容编辑台（本地使用，纯前端）
   通过 File System Access API 直接读写项目里的
   assets/albums/<相册>/ 与 data/albums.js
   ============================================================ */
(function () {
  "use strict";

  var hasFS = typeof window.showDirectoryPicker === "function";
  var rootHandle = null;
  var storedHandle = null;

  var state = {
    albums: [],
    current: 0
  };

  /* ---------------- 载入现有数据 ---------------- */
  function loadExisting() {
    var src = (window.LC && window.LC.albums) ? window.LC.albums : [];
    state.albums = src.map(function (a) {
      return {
        slug: a.slug || "",
        title: a.title || "",
        series: a.series || "",
        year: String(a.year || ""),
        hue: a.hue || "#2b4c7e",
        desc: a.desc || "",
        photos: (a.photos || []).map(function (p) {
          return {
            base: p.base, w: p.w, h: p.h,
            title: p.title || "", caption: p.caption || "",
            file: null,
            url: p.base + "-480.webp"
          };
        })
      };
    });
  }

  /* ---------------- 通用工具 ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function status(msg, cls) {
    var el = $("status");
    el.textContent = msg || "";
    el.className = "status " + (cls || "");
  }

  /* ---------------- 渲染：侧栏相册列表 ---------------- */
  function renderList() {
    var box = $("album-list");
    if (!state.albums.length) {
      box.innerHTML = '<p class="hint">还没有相册，点下面「新增相册」。</p>';
      return;
    }
    box.innerHTML = state.albums.map(function (a, i) {
      return '<button data-i="' + i + '" class="' + (i === state.current ? "active" : "") + '">' +
        esc(a.title || "(未命名)") + '<span class="slug">' + esc(a.slug || "—") + " · " + a.photos.length + " 张</span></button>";
    }).join("");
    box.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () { state.current = parseInt(b.dataset.i, 10); renderList(); renderEditor(); });
    });
  }

  /* ---------------- 渲染：主体编辑器 ---------------- */
  function renderEditor() {
    var main = $("editor");
    var a = state.albums[state.current];
    if (!a) { main.innerHTML = '<div class="empty">左侧选择或新增一个相册</div>'; return; }

    main.innerHTML =
      '<div class="row">' +
        '<div class="field"><label>标题</label><input id="f-title" value="' + esc(a.title) + '" placeholder="例如：剑来"></div>' +
        '<div class="field"><label>系列</label><input id="f-series" value="' + esc(a.series) + '" placeholder="系列 · 一"></div>' +
        '<div class="field"><label>年份</label><input id="f-year" value="' + esc(a.year) + '" placeholder="2026"></div>' +
      '</div>' +
      '<div class="field"><label>英文目录名 slug（只用小写字母/数字/连字符，用于生成文件名）</label>' +
        '<input id="f-slug" value="' + esc(a.slug) + '" placeholder="jianlai"></div>' +
      '<div class="field"><label>说明（可留空）</label><textarea id="f-desc" placeholder="山雨欲来，江湖未远。此处只存一角。">' + esc(a.desc) + '</textarea></div>' +
      '<hr style="border:0;border-top:1px solid var(--ed-line);margin:1rem 0">' +

      '<div class="drop" id="drop">把照片拖到这里，或 <button class="btn sm" id="pick">选择文件</button>' +
        '<div class="hint">支持 jpg / png / webp 等；会自动生成多尺寸与 WebP。' +
        (a.slug ? '' : '<br><strong>先填写上面的 slug 再添加照片。</strong>') + '</div>' +
        '<input type="file" id="file" accept="image/*" multiple hidden></div>' +

      '<div class="photos" id="photos"></div>' +

      '<hr style="border:0;border-top:1px solid var(--ed-line);margin:1.2rem 0">' +
      '<div style="display:flex;gap:.6rem;flex-wrap:wrap">' +
        '<button class="btn danger sm" id="del-album">删除此相册</button>' +
      '</div>';

    // 文本字段绑定（直接改 state，不重渲染）
    bind("f-title", function (v) { a.title = v; renderList(); });
    bind("f-series", function (v) { a.series = v; });
    bind("f-year", function (v) { a.year = v; });
    bind("f-slug", function (v) {
      a.slug = v.trim();
      a.photos.forEach(function (p) { if (p.file) { /* 新图未生成，slug 变更在保存时生效 */ } });
      renderList();
    });
    bind("f-desc", function (v) { a.desc = v; });

    // 文件选择 / 拖放
    var drop = $("drop"), file = $("file");
    $("pick").addEventListener("click", function () { file.click(); });
    file.addEventListener("change", function () { addFiles(a, file.files); file.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); });
    });
    drop.addEventListener("drop", function (e) { addFiles(a, e.dataTransfer.files); });

    $("del-album").addEventListener("click", function () {
      if (!confirm("确定删除相册「" + (a.title || a.slug) + "」？（只从网站数据移除，不会删磁盘上的图片文件）")) return;
      releaseUrls(a);
      state.albums.splice(state.current, 1);
      state.current = Math.max(0, state.current - 1);
      renderList(); renderEditor();
    });

    renderPhotos(a);
  }

  function bind(id, fn) {
    var el = $(id);
    if (el) el.addEventListener("input", function () { fn(el.value); });
  }

  function renderPhotos(a) {
    var box = $("photos");
    if (!a.photos.length) { box.innerHTML = ""; return; }
    box.innerHTML = a.photos.map(function (p, i) {
      return '<div class="pcard" data-i="' + i + '">' +
        '<div class="thumb"><img src="' + esc(p.url) + '" alt=""></div>' +
        '<div class="body">' +
          '<input data-k="title" placeholder="标题（可留空）" value="' + esc(p.title) + '">' +
          '<input data-k="caption" placeholder="说明（可留空）" value="' + esc(p.caption) + '">' +
          '<div class="bar">' +
            '<span class="tag ' + (p.file ? "new" : "") + '">' + (p.file ? "新图 · 待生成" : "已生成") + '</span>' +
            '<span>' +
              '<button class="btn sm" data-act="up">↑</button> ' +
              '<button class="btn sm" data-act="down">↓</button> ' +
              '<button class="btn sm danger" data-act="del">删</button>' +
            '</span>' +
          '</div>' +
        '</div></div>';
    }).join("");

    box.querySelectorAll(".pcard").forEach(function (card) {
      var i = parseInt(card.dataset.i, 10);
      card.querySelectorAll("input[data-k]").forEach(function (inp) {
        inp.addEventListener("input", function () { a.photos[i][inp.dataset.k] = inp.value; });
      });
      card.querySelectorAll("button[data-act]").forEach(function (b) {
        b.addEventListener("click", function () {
          var act = b.dataset.act;
          if (act === "del") {
            if (a.photos[i].url && a.photos[i].url.startsWith("blob:")) URL.revokeObjectURL(a.photos[i].url);
            a.photos.splice(i, 1);
          } else if (act === "up" && i > 0) {
            swap(a.photos, i, i - 1);
          } else if (act === "down" && i < a.photos.length - 1) {
            swap(a.photos, i, i + 1);
          } else { return; }
          renderList(); renderPhotos(a);
        });
      });
    });
  }

  function swap(arr, i, j) { var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  function releaseUrls(a) {
    a.photos.forEach(function (p) { if (p.url && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url); });
  }

  function addFiles(a, files) {
    if (!files || !files.length) return;
    if (!a.slug) { alert("请先填写英文 slug（如 jianlai）再添加照片。"); return; }
    Array.prototype.forEach.call(files, function (f) {
      if (!/^image\//.test(f.type)) return;
      a.photos.push({ base: null, w: null, h: null, title: "", caption: "", file: f, url: URL.createObjectURL(f) });
    });
    renderList(); renderPhotos(a);
    status("已加入 " + files.length + " 张（点右上「保存到项目」生成并写入）", "busy");
  }

  /* ---------------- 图片处理与写盘 ---------------- */
  var WIDTHS = [480, 1024, 1920];

  function canvasToBlob(canvas, type, q) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) { b ? res(b) : rej(new Error("toBlob 失败")); }, type, q);
    });
  }

  async function writeFile(dir, name, blob) {
    var fh = await dir.getFileHandle(name, { create: true });
    var w = await fh.createWritable();
    await w.write(blob);
    await w.close();
  }

  async function ensureDir(root, parts) {
    var dir = root;
    for (var i = 0; i < parts.length; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create: true });
    }
    return dir;
  }

  async function processPhoto(file, dir, baseName, basePath) {
    var bmp = await createImageBitmap(file);
    var w = bmp.width, h = bmp.height;
    for (var k = 0; k < WIDTHS.length; k++) {
      var tw = Math.min(WIDTHS[k], w);
      var th = Math.max(1, Math.round(h * tw / w));
      var c = document.createElement("canvas");
      c.width = tw; c.height = th;
      c.getContext("2d").drawImage(bmp, 0, 0, tw, th);
      var webp = await canvasToBlob(c, "image/webp", 0.8);
      await writeFile(dir, baseName + "-" + WIDTHS[k] + ".webp", webp);
    }
    // jpg 兜底
    var jw = Math.min(1024, w), jh = Math.max(1, Math.round(h * jw / w));
    var jc = document.createElement("canvas");
    jc.width = jw; jc.height = jh;
    jc.getContext("2d").drawImage(bmp, 0, 0, jw, jh);
    var jpg = await canvasToBlob(jc, "image/jpeg", 0.82);
    await writeFile(dir, baseName + "-1024.jpg", jpg);
    if (bmp.close) bmp.close();
    return { w: w, h: h };
  }

  function buildAlbumsJs() {
    var out = state.albums.map(function (a) {
      return {
        slug: a.slug,
        title: a.title,
        series: a.series,
        year: a.year,
        hue: a.hue || "#2b4c7e",
        desc: a.desc,
        cover: a.photos[0] ? a.photos[0].base + "-1024.webp" : "",
        photos: a.photos.map(function (p) {
          return { base: p.base, w: p.w, h: p.h, title: p.title, caption: p.caption };
        })
      };
    });
    return "/* 由内容编辑台自动生成，请勿手改（如需手改请直接编辑本文件） */\n" +
      "window.LC = window.LC || {};\n\nLC.albums = " + JSON.stringify(out, null, 2) + ";\n";
  }

  /* ---------------- IndexedDB 记忆目录句柄 ---------------- */
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open("lc-editor", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  async function idbSet(k, v) { var db = await idb(); return new Promise(function (res, rej) { var t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; }); }
  async function idbGet(k) { var db = await idb(); return new Promise(function (res, rej) { var q = db.transaction("kv", "readonly").objectStore("kv").get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }); }

  async function getRoot() {
    if (rootHandle) return rootHandle;
    // 优先尝试已授权/可恢复的历史目录（首次 await 在用户手势内，保证弹出选择器不被拦截）
    if (storedHandle) {
      try {
        var p = await storedHandle.queryPermission({ mode: "readwrite" });
        if (p === "granted") { rootHandle = storedHandle; return storedHandle; }
        var r = await storedHandle.requestPermission({ mode: "readwrite" });
        if (r === "granted") { rootHandle = storedHandle; return storedHandle; }
      } catch (e) { /* 忽略，改为重新选择 */ }
    }
    var h = await window.showDirectoryPicker({ mode: "readwrite" });
    try { await h.getFileHandle("index.html"); }
    catch (e) { throw new Error("请选择项目根目录（包含 index.html 的那个文件夹）"); }
    rootHandle = h;
    storedHandle = h;
    await idbSet("root", h);
    return h;
  }

  /* ---------------- 保存 ---------------- */
  async function save() {
    if (!hasFS) { exportJs(); return; }
    if (!state.albums.length) { status("还没有相册", "err"); return; }

    // 校验
    for (var i = 0; i < state.albums.length; i++) {
      var a = state.albums[i];
      if (!/^[a-z0-9][a-z0-9-]*$/.test(a.slug)) {
        state.current = i; renderList(); renderEditor();
        status("第 " + (i + 1) + " 个相册的 slug 不合法（只能小写字母/数字/连字符）", "err");
        return;
      }
    }

    var root;
    try { root = await getRoot(); }
    catch (e) { status(e.message, "err"); return; }

    var albumsRoot = await ensureDir(root, ["assets", "albums"]);
    var total = 0;
    try {
      for (var ai = 0; ai < state.albums.length; ai++) {
        var alb = state.albums[ai];
        var dir = await ensureDir(albumsRoot, [alb.slug]);
        var stamp = Date.now().toString(36);
        for (var pi = 0; pi < alb.photos.length; pi++) {
          var p = alb.photos[pi];
          if (!p.file) continue;
          status("正在生成：" + alb.slug + " 第 " + (pi + 1) + " 张…", "busy");
          var baseName = alb.slug + "-" + stamp + "-" + (pi + 1);
          var basePath = "assets/albums/" + alb.slug + "/" + baseName;
          var dim = await processPhoto(p.file, dir, baseName, basePath);
          p.base = basePath; p.w = dim.w; p.h = dim.h;
          if (p.url && p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
          p.url = basePath + "-480.webp";
          p.file = null;
          total++;
        }
      }
      // 写 data/albums.js
      status("写入 data/albums.js…", "busy");
      var dataDir = await ensureDir(root, ["data"]);
      await writeFile(dataDir, "albums.js", new Blob([buildAlbumsJs()], { type: "text/javascript" }));

      renderList(); renderEditor();
      status("完成：生成 " + total + " 张新图，并已更新 data/albums.js", "ok");
    } catch (e) {
      status("出错：" + (e && e.message ? e.message : e), "err");
    }
  }

  /* ---------------- 兜底导出（不支持 FS API 时） ---------------- */
  function exportJs() {
    var blob = new Blob([buildAlbumsJs()], { type: "text/javascript" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "albums.js";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    status("已导出 albums.js，请手动放到 data/ 目录；新图片需自行放入 assets/albums/。", "ok");
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    loadExisting();
    renderList();
    renderEditor();

    $("add-album").addEventListener("click", function () {
      state.albums.push({
        slug: "", title: "新相册", series: "系列 · ", year: String(new Date().getFullYear()),
        hue: "#2b4c7e", desc: "", photos: []
      });
      state.current = state.albums.length - 1;
      renderList(); renderEditor();
    });

    $("save").addEventListener("click", save);
    $("export").addEventListener("click", exportJs);

    if (!hasFS) {
      $("save").textContent = "导出 albums.js";
      status("当前浏览器不支持直接写盘，将使用「导出」方式。建议用 Edge/Chrome 打开本页。", "err");
    } else {
      idbGet("root").then(function (h) { if (h) storedHandle = h; }).catch(function () {});
      status("就绪。首次保存时选择一个项目文件夹（选择包含 index.html 的目录）。");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
