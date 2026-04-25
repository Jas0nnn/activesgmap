import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
app.use(cors());

let cache = null;
let lastFetched = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function scrapeGyms() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  );

  await page.goto('https://activesg.gov.sg/gym-pool-crowd', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await new Promise(r => setTimeout(r, 8000));

  const gyms = await page.evaluate(() => {
    const cards = document.querySelectorAll('.chakra-card');
    return Array.from(cards).map(card => {
      const name = card.querySelector('.chakra-text')?.innerText?.trim();
      const badgeText = card.querySelector('.chakra-badge')?.innerText?.trim();
      const isClosed = badgeText === 'Closed';
      const capacity = isClosed ? 0 : parseInt(badgeText?.replace('% full', ''));

      return { name, capacity, isClosed };
    }).filter(g => g.name);
  });

  await browser.close();
  return gyms;
}
app.get('/api/gyms', async (req, res) => {
  try {
    const now = Date.now();

    // Return cached data if it's fresh
    if (cache && lastFetched && (now - lastFetched) < CACHE_DURATION) {
      console.log('Serving from cache');
      return res.json(cache);
    }

    // Otherwise scrape fresh data
    console.log('Scraping fresh data...');
    cache = await scrapeGyms();
    lastFetched = now;
    res.json(cache);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Scrape failed' });
  }
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));