/* ============================================================
   泠川 · 相册数据
   说明：照片以「碎片」方式书写——标题/说明多为留白或短句，
        不追求完整罗列。base 为不带尺寸后缀的路径前缀，
        gallery.js 会据此拼出 -480/-1024/-1920 的 webp 与 jpg 兜底。
   ============================================================ */
window.LC = window.LC || {};

LC.albums = [
  {
    slug: "jianlai",
    title: "剑来",
    series: "系列 · 一",
    year: "2026",
    hue: "#2b4c7e",
    desc: "山雨欲来，江湖未远。此处只存一角。",
    cover: "assets/albums/jianlai/jianlai-1-1024.webp",
    photos: [
      { base: "assets/albums/jianlai/jianlai-1", w: 1987, h: 720, title: "", caption: "山雨欲来" },
      { base: "assets/albums/jianlai/jianlai-2", w: 1987, h: 720, title: "", caption: "" },
      { base: "assets/albums/jianlai/jianlai-3", w: 1987, h: 720, title: "", caption: "远处有人在等" },
      { base: "assets/albums/jianlai/jianlai-4", w: 1988, h: 720, title: "", caption: "" }
    ]
  },
  {
    slug: "furina",
    title: "芙宁娜",
    series: "系列 · 二",
    year: "2026",
    hue: "#5b8fb9",
    desc: "海面之下，另有其人。",
    cover: "assets/albums/furina/furina-1-1024.webp",
    photos: [
      { base: "assets/albums/furina/furina-1", w: 1280, h: 726, title: "", caption: "泡沫" }
    ]
  }
];
