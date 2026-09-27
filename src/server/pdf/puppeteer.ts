import type { Browser } from "puppeteer-core";

/**
 * Launches headless Chromium. On Vercel/AWS Lambda the regular Puppeteer
 * Chromium download doesn't exist (and is too big to ship), so we use the
 * serverless build from @sparticuz/chromium; locally we use the Chromium that
 * `puppeteer` downloaded on install.
 */
async function launchBrowser(): Promise<Browser> {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    const [{ default: chromium }, puppeteerCore] = await Promise.all([
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: { width: 1240, height: 1754 },
    });
  }
  const puppeteer = await import("puppeteer");
  return (await puppeteer.launch({ headless: true })) as unknown as Browser;
}

export async function renderPdfBuffer(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // "load" not "networkidle": everything is inline, and some hosts never go idle.
    await page.setContent(html, { waitUntil: "load", timeout: 20_000 });
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
