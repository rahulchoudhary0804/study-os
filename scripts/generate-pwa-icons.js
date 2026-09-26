// One-off script: renders the app's indigo/GraduationCap brand mark to real
// PNG icons for the PWA manifest, using the puppeteer dependency already in
// the project (same technique as src/server/pdf/puppeteer.ts).
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const GRADUATION_CAP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white"
     stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="62%" height="62%">
  <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
  <path d="M22 10v6"/>
  <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
</svg>`;

function html(size) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;}
    .icon{width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.22)}px;
      background:linear-gradient(135deg, #4338ca, #312e81);
      display:flex;align-items:center;justify-content:center;}
  </style></head><body>
    <div class="icon">${GRADUATION_CAP_SVG}</div>
  </body></html>`;
}

async function renderIcon(browser, size, outPath) {
  const page = await browser.newPage();
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(html(size), { waitUntil: "load" });
  await page.screenshot({ path: outPath, omitBackground: false });
  await page.close();
}

(async () => {
  const outDir = path.join(__dirname, "..", "public", "icons");
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  try {
    await renderIcon(browser, 512, path.join(outDir, "icon-512.png"));
    await renderIcon(browser, 192, path.join(outDir, "icon-192.png"));
    console.log("Generated public/icons/icon-512.png and icon-192.png");
  } finally {
    await browser.close();
  }
})();
