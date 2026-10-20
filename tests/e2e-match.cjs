const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runE2ETests() {
  console.log('--- Starting Backbenchers E2E Match Verification ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  
  const consoleErrors = [];
  const consoleWarnings = [];

  // ==========================================
  // Test 1: Desktop Viewport (1280 x 720)
  // ==========================================
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push('PAGE_ERROR: ' + err.toString()));

  await page.goto('http://127.0.0.1:5173?debug=1');
  await page.waitForTimeout(600);

  // 1. Verify Main Menu
  console.log('1. Checking Main Menu layout and branding...');
  await page.screenshot({ path: path.join(screenshotsDir, '01-main-menu.png') });

  const wordmark = await page.locator('.wordmark').innerText();
  console.log('Wordmark:', wordmark.replace(/\n/g, ' '));

  const hasQuestionMarks = await page.evaluate(() => {
    const text = document.body.innerText;
    // Check for corrupt isolated question marks or invalid symbols
    return text.includes('?') && !text.includes('?');
  });
  console.log('Text contains unexpected question marks:', hasQuestionMarks);

  // 2. Open Choose Pen Modal
  console.log('2. Testing Pen Selection...');
  await page.locator('.menu-row button', { hasText: 'CHOOSE PEN' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, '02-pen-selection.png') });

  // Select Blue Note
  await page.locator('.pencard', { hasText: 'Blue Note' }).click();
  await page.waitForTimeout(200);
  await page.locator('.modal .primary', { hasText: 'SAVE SELECTION' }).click();
  await page.waitForTimeout(400);

  // 3. Open Settings Modal
  console.log('3. Testing Settings Modal...');
  await page.locator('.menu-row button', { hasText: 'SETTINGS' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, '03-settings.png') });
  await page.locator('.modal .primary', { hasText: 'APPLY & CLOSE' }).click();
  await page.waitForTimeout(400);

  // 4. Click Play Match
  console.log('4. Starting match (triggering tutorial)...');
  await page.locator('.primary', { hasText: 'PLAY MATCH' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(screenshotsDir, '04-tutorial.png') });

  // Dismiss tutorial
  await page.locator('.modal .primary', { hasText: 'GOT IT' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '05-gameplay-ready.png') });

  // 5. Inspect Table Layout and Centering
  console.log('5. Inspecting table layout and centering...');
  const layoutMetrics = await page.evaluate(() => {
    const canvas = document.querySelector('.arena canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      canvasRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    };
  });
  console.log('Layout metrics:', layoutMetrics);

  // 6. Test Aiming & Slingshot Flick
  console.log('6. Testing pointer aim and slingshot flick on player pen...');
  // Player pen is at world coordinates (-5, 0).
  // Let's compute screen coordinates using window/app or known layout
  const dragCoords = await page.evaluate(() => {
    // Canvas is full screen (1280x720)
    const w = 1280;
    const h = 720;
    const viewW = 22 + 5.0;
    const viewH = 13 + 5.5;
    const scale = Math.min(w / viewW, h / viewH);
    const rootX = w / 2;
    const rootY = h / 2 + 12;

    const penScreenX = rootX + (-4.5) * scale;
    const penScreenY = rootY + (0) * scale;

    return {
      scale,
      penScreenX,
      penScreenY,
    };
  });
  console.log('Calculated player pen screen position:', dragCoords);

  // Hover player pen, press down, drag backward to left (-100px)
  await page.mouse.move(dragCoords.penScreenX, dragCoords.penScreenY);
  await page.mouse.down();
  await page.mouse.move(dragCoords.penScreenX - 90, dragCoords.penScreenY + 10);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotsDir, '06-aiming-trajectory.png') });

  // Release flick
  console.log('Releasing flick...');
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotsDir, '07-shot-in-motion.png') });

  // Wait for shot to travel, collide, and settle
  console.log('Waiting for shot motion and settling...');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(screenshotsDir, '08-after-settle.png') });

  // Check diagnostics to verify movement occurred
  const diagData = await page.evaluate(() => {
    const diag = document.querySelector('.diagnostics-panel');
    return diag ? diag.innerText : 'NO DIAGNOSTICS';
  });
  console.log('Diagnostics panel contents:\n' + diagData);

  // Wait for AI to respond if it is rival's turn
  console.log('Waiting for AI response...');
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(screenshotsDir, '09-after-ai-turn.png') });

  // 7. Test Pause & Resume
  console.log('7. Testing Pause & Resume...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, '10-paused.png') });
  await page.locator('.pause-modal .primary', { hasText: 'RESUME' }).click();
  await page.waitForTimeout(400);

  // 8. Test In-Game Restart
  console.log('8. Testing Restart Match...');
  await page.locator('.game-actions button', { hasText: 'RESTART' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotsDir, '11-restarted.png') });

  await page.close();

  // ==========================================
  // Test 2: Mobile Touch Viewport (390 x 844)
  // ==========================================
  console.log('\n--- Testing Mobile Viewport (iPhone 390x844) ---');
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  await mobilePage.goto('http://127.0.0.1:5173');
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, '12-mobile-menu.png') });

  await mobilePage.locator('.primary', { hasText: 'PLAY MATCH' }).click();
  await mobilePage.waitForTimeout(400);

  // If tutorial is shown, dismiss it
  const mobileTut = mobilePage.locator('.tutorial .primary');
  if (await mobileTut.isVisible()) {
    await mobileTut.click();
    await mobilePage.waitForTimeout(400);
  }

  await mobilePage.screenshot({ path: path.join(screenshotsDir, '13-mobile-gameplay.png') });

  // Mobile drag flick test
  const mobileCoords = await mobilePage.evaluate(() => {
    const w = 390;
    const h = 844;
    const viewW = 22 + 5.0;
    const viewH = 13 + 5.5;
    const scale = Math.min(w / viewW, h / viewH);
    const rootX = w / 2;
    const rootY = h / 2 + 12;
    return {
      penX: rootX + (-4.5) * scale,
      penY: rootY + (0) * scale,
    };
  });

  console.log('Mobile calculated pen coords:', mobileCoords);
  await mobilePage.touchscreen.tap(mobileCoords.penX, mobileCoords.penY);
  await mobilePage.mouse.move(mobileCoords.penX, mobileCoords.penY);
  await mobilePage.mouse.down();
  await mobilePage.mouse.move(mobileCoords.penX - 60, mobileCoords.penY);
  await mobilePage.waitForTimeout(200);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, '14-mobile-aiming.png') });
  await mobilePage.mouse.up();
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, '15-mobile-after-shot.png') });

  await mobilePage.close();

  await browser.close();

  console.log('\n--- E2E Test Run Complete ---');
  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }
}

runE2ETests().catch(err => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
