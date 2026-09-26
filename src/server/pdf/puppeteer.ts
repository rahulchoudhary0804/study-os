import puppeteer from "puppeteer";

/**
 * Renders HTML to a PDF buffer via headless Chromium. Works out of the box
 * for local dev and traditional Node hosting. On serverless platforms
 * (Vercel, etc.) swap this for `puppeteer-core` + `@sparticuz/chromium` —
 * see README "PDF generation setup".
 */
export async function renderPdfBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "12mm", left: "0mm", right: "0mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate:
        '<div style="font-size:8px;width:100%;padding:0 14mm;color:#888;text-align:right;font-family:Arial,sans-serif;"><span class="pageNumber"></span>/<span class="totalPages"></span></div>',
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
