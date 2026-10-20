const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log('--- Testing Round Victory Detection via Multi-Shot Match ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.goto('http://127.0.0.1:5173?debug=1');
  await page.waitForTimeout(500);

  await page.locator('.primary', { hasText: 'PLAY MATCH' }).click();
  await page.waitForTimeout(300);

  const tut = page.locator('.tutorial .primary');
  if (await tut.isVisible()) {
    await tut.click();
    await page.waitForTimeout(400);
  }

  const w = 1280;
  const h = 720;
  const viewW = 22 + 5.0;
  const viewH = 13 + 5.5;
  const scale = Math.min(w / viewW, h / viewH);
  const rootX = w / 2;
  const rootY = h / 2 + 12;

  // Let's do a loop of turns until someone falls off!
  console.log('Playing match until a pen falls off...');
  let roundOver = false;

  for (let turnCount = 0; turnCount < 8; turnCount++) {
    // Wait until it's player's turn and state is READY
    let isReady = false;
    for (let w = 0; w < 30; w++) {
      const stateText = await page.evaluate(() => {
        const diag = document.querySelector('.diagnostics-panel');
        if (!diag) return null;
        return diag.innerText;
      });
      if (stateText && stateText.includes('State: READY') && stateText.includes('Turn: player')) {
        isReady = true;
        break;
      }
      const modal = page.locator('.modal.result');
      if (await modal.isVisible()) {
        roundOver = true;
        break;
      }
      await page.waitForTimeout(300);
    }

    if (roundOver) break;
    if (!isReady) {
      console.log('Not ready for player turn, waiting...');
      continue;
    }

    // Get player pen current position from diagnostics
    const pos = await page.evaluate(() => {
      const diag = document.querySelector('.diagnostics-panel');
      if (!diag) return null;
      const match = diag.innerText.match(/Player Pos:\s*([-0-9.]+),\s*([-0-9.]+)/);
      if (match) return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
      return null;
    });

    if (!pos) break;
    const penScreenX = rootX + pos.x * scale;
    const penScreenY = rootY + pos.y * scale;

    console.log(`Turn ${turnCount}: Flicking player pen at (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})...`);

    // Aim towards rival (pull backward to the left and slightly up/down)
    await page.mouse.move(penScreenX, penScreenY);
    await page.mouse.down();
    await page.mouse.move(penScreenX - 180, penScreenY + (turnCount % 2 === 0 ? 15 : -15));
    await page.waitForTimeout(200);
    await page.mouse.up();

    // Check if result modal appeared after shot
    for (let s = 0; s < 15; s++) {
      await page.waitForTimeout(300);
      if (await page.locator('.modal.result').isVisible()) {
        roundOver = true;
        break;
      }
    }
    if (roundOver) break;
  }

  await page.screenshot({ path: path.join(__dirname, 'screenshots', '16-round-result.png') });

  const modal = page.locator('.modal.result');
  if (await modal.isVisible()) {
    const title = await page.locator('.modal.result h2').innerText();
    const scores = await page.locator('.modal.result .scoreline').innerText();
    console.log('SUCCESS! Round completed with result modal:');
    console.log('Title:', title);
    console.log('Scoreline:', scores.replace(/\n/g, ' '));
  } else {
    console.log('Match still in progress. Final diagnostics:');
    const diag = await page.locator('.diagnostics-panel').innerText();
    console.log(diag);
  }

  await browser.close();
})();
