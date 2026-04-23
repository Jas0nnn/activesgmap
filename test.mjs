import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.setUserAgent(
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
);

console.log('Navigating to ActiveSG...');
await page.goto('https://activesg.gov.sg/gym-pool-crowd', {
  waitUntil: 'networkidle2',
  timeout: 30000
});

console.log('Waiting for gym cards...');
await page.waitForSelector('.chakra-badge', { timeout: 15000 });

const gyms = await page.evaluate(() => {
  const cards = document.querySelectorAll('.chakra-card');

  return Array.from(cards).map(card => ({
    name:     card.querySelector('.chakra-text')?.innerText?.trim(),
    capacity: card.querySelector('.chakra-badge')?.innerText
                  ?.replace('% full', '')?.trim()
  })).filter(g => g.name && g.capacity);
});

console.log(JSON.stringify(gyms, null, 2));
await browser.close();