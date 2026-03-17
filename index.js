import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = 3000;

const cache = new Map();

async function getToken(url) {
  if (cache.has(url)) return cache.get(url);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"]
  });

  const page = await browser.newPage();

  let sign = null;

  page.on("request", (req) => {
    if (req.url().includes("streaming")) {
      const u = new URL(req.url());
      sign = u.searchParams.get("sign");
    }
  });

  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForTimeout(3000);

  const jsToken = await page.evaluate(() => window.jsToken || null);

  await browser.close();

  const data = {
    jsToken,
    sign,
    timestamp: Math.floor(Date.now() / 1000)
  };

  cache.set(url, data);
  setTimeout(() => cache.delete(url), 5 * 60 * 1000);

  return data;
}

app.get("/token", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.json({ error: "Missing url" });

    const data = await getToken(url);

    res.json({ success: true, data });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔥 Token server running on http://localhost:${PORT}`);
});