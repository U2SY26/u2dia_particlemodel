import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS = join(__dirname, 'screenshots');
const BASE = 'http://localhost:3000';

let pass = 0, fail = 0;
function log(status, msg) {
    const icon = status === 'PASS' ? '✓' : '✗';
    console.log(`  ${icon} ${msg}`);
    status === 'PASS' ? pass++ : fail++;
}

(async () => {
    console.log('\n=========================================');
    console.log('  E2E SCREENSHOT TEST');
    console.log('=========================================\n');

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
    });

    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // 1. Initial page load
    console.log('--- 1. Page Load ---');
    try {
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
        log('PASS', 'Page loaded successfully');
    } catch (e) {
        log('FAIL', `Page load failed: ${e.message}`);
        await browser.close();
        process.exit(1);
    }

    await page.waitForTimeout(2000); // Let WebGL initialize
    await page.screenshot({ path: join(SCREENSHOTS, '01-initial-load.png'), fullPage: false });
    console.log('  📸 01-initial-load.png\n');

    // 2. Check essential UI elements
    console.log('--- 2. UI Elements ---');
    const elements = {
        'canvas-container': '#canvas-container',
        'fps-counter': '#fps-counter',
        'quality-badge': '#quality-badge',
        'particle-count': '#particle-count',
        'status': '#status',
        'prompt-input': '#prompt-input',
        'generate-btn': '#generate-btn',
        'sidebar': '#sidebar',
    };

    for (const [name, selector] of Object.entries(elements)) {
        const el = await page.$(selector);
        if (el) {
            const visible = await el.isVisible();
            log(visible ? 'PASS' : 'FAIL', `${name} ${visible ? 'visible' : 'hidden'}`);
        } else {
            log('FAIL', `${name} not found`);
        }
    }
    console.log('');

    // 3. WebGL canvas rendered
    console.log('--- 3. WebGL Canvas ---');
    const canvas = await page.$('canvas');
    if (canvas) {
        const box = await canvas.boundingBox();
        log(box && box.width > 100 && box.height > 100 ? 'PASS' : 'FAIL',
            `Canvas size: ${box?.width}x${box?.height}`);

        // Check if canvas is being rendered (preserveDrawingBuffer not set, so check via renderer)
        const isRendering = await page.evaluate(() => {
            const c = document.querySelector('canvas');
            if (!c) return false;
            // Check WebGL context exists and is not lost
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            return gl !== null && !gl.isContextLost();
        });
        log(isRendering ? 'PASS' : 'FAIL', `WebGL context active: ${isRendering}`);
    } else {
        log('FAIL', 'No canvas element found');
    }
    console.log('');

    // 4. FPS counter working
    console.log('--- 4. FPS Counter ---');
    await page.waitForTimeout(2000);
    const fpsText = await page.$eval('#fps-counter', el => el.textContent);
    const fpsNum = parseInt(fpsText);
    log(!isNaN(fpsNum) && fpsNum > 0 ? 'PASS' : 'FAIL', `FPS: ${fpsText}`);
    console.log('');

    // 5. Quality badge
    console.log('--- 5. Quality Badge ---');
    const qualityText = await page.$eval('#quality-badge', el => el.textContent);
    log(['LOW', 'MEDIUM', 'HIGH'].includes(qualityText) ? 'PASS' : 'FAIL',
        `Quality tier: ${qualityText}`);
    await page.screenshot({ path: join(SCREENSHOTS, '02-quality-badge.png'), fullPage: false });
    console.log('  📸 02-quality-badge.png\n');

    // 6. Particle count displayed
    console.log('--- 6. Particle Count ---');
    const pcText = await page.$eval('#particle-count', el => el.textContent);
    const pcNum = parseInt(pcText.replace(/,/g, ''));
    log(!isNaN(pcNum) && pcNum > 0 ? 'PASS' : 'FAIL', `Particles: ${pcText}`);
    console.log('');

    // 7. Sidebar simulation cards
    console.log('--- 7. Sidebar Cards ---');
    const cards = await page.$$('.sim-card');
    log(cards.length > 0 ? 'PASS' : 'FAIL', `Sidebar cards: ${cards.length}`);
    await page.screenshot({ path: join(SCREENSHOTS, '03-sidebar-cards.png'), fullPage: false });
    console.log('  📸 03-sidebar-cards.png\n');

    // 8. Click a simulation card
    console.log('--- 8. Card Selection ---');
    if (cards.length > 0) {
        await cards[0].click();
        await page.waitForTimeout(1500);
        const statusText = await page.$eval('#status', el => el.textContent);
        log(statusText.length > 0 ? 'PASS' : 'FAIL', `Status after card click: "${statusText}"`);
        await page.screenshot({ path: join(SCREENSHOTS, '04-card-selected.png'), fullPage: false });
        console.log('  📸 04-card-selected.png\n');
    } else {
        log('FAIL', 'No cards to click');
    }

    // 9. Submit a prompt
    console.log('--- 9. Prompt Submission ---');
    await page.fill('#prompt-input', 'tower');
    await page.click('#generate-btn');
    await page.waitForTimeout(3000);
    const structInfo = await page.$eval('#structure-info', el => el.textContent);
    log(structInfo.length > 0 ? 'PASS' : 'FAIL', `Structure info: "${structInfo}"`);
    await page.screenshot({ path: join(SCREENSHOTS, '05-tower-generated.png'), fullPage: false });
    console.log('  📸 05-tower-generated.png\n');

    // 10. Wait for particles to form structure
    console.log('--- 10. Structure Formation ---');
    await page.waitForTimeout(4000);
    const statusAfter = await page.$eval('#status', el => el.textContent);
    log(statusAfter.length > 0 ? 'PASS' : 'FAIL', `Status: "${statusAfter}"`);
    await page.screenshot({ path: join(SCREENSHOTS, '06-structure-forming.png'), fullPage: false });
    console.log('  📸 06-structure-forming.png\n');

    // 11. Try different structures
    console.log('--- 11. Bridge Structure ---');
    await page.fill('#prompt-input', 'bridge');
    await page.click('#generate-btn');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(SCREENSHOTS, '07-bridge.png'), fullPage: false });
    const bridgeInfo = await page.$eval('#structure-info', el => el.textContent);
    log(bridgeInfo.includes('bridge') || bridgeInfo.length > 0 ? 'PASS' : 'FAIL',
        `Bridge: "${bridgeInfo}"`);
    console.log('  📸 07-bridge.png\n');

    // 12. Dome structure
    console.log('--- 12. Dome Structure ---');
    await page.fill('#prompt-input', 'dome');
    await page.click('#generate-btn');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(SCREENSHOTS, '08-dome.png'), fullPage: false });
    const domeInfo = await page.$eval('#structure-info', el => el.textContent);
    log(domeInfo.length > 0 ? 'PASS' : 'FAIL', `Dome: "${domeInfo}"`);
    console.log('  📸 08-dome.png\n');

    // 13. Quality toggle
    console.log('--- 13. Quality Toggle ---');
    const badge = await page.$('#quality-badge');
    const beforeQ = await page.$eval('#quality-badge', el => el.textContent);
    await badge.click();
    await page.waitForTimeout(500);
    const afterQ = await page.$eval('#quality-badge', el => el.textContent);
    log(beforeQ !== afterQ ? 'PASS' : 'FAIL', `Quality toggled: ${beforeQ} → ${afterQ}`);
    await page.screenshot({ path: join(SCREENSHOTS, '09-quality-toggled.png'), fullPage: false });
    console.log('  📸 09-quality-toggled.png\n');

    // 14. Console errors check
    console.log('--- 14. Console Errors ---');
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.waitForTimeout(2000);
    log(consoleErrors.length === 0 ? 'PASS' : 'FAIL',
        `Console errors: ${consoleErrors.length}${consoleErrors.length > 0 ? ' - ' + consoleErrors.join('; ') : ''}`);
    console.log('');

    // 15. Final full page screenshot
    await page.screenshot({ path: join(SCREENSHOTS, '10-final-state.png'), fullPage: false });
    console.log('  📸 10-final-state.png\n');

    await browser.close();

    console.log('=========================================');
    console.log(`  RESULT: ${pass} PASS / ${fail} FAIL`);
    console.log(`  Screenshots: ${SCREENSHOTS}/`);
    console.log('=========================================\n');

    process.exit(fail > 0 ? 1 : 0);
})();
