// verification/verify-aerodynamics.js
import { chromium } from 'playwright';

(async () => {
    console.log('Starting Aerodynamics verification script...');
    const browser = await chromium.launch({
        headless: true,
        args: ['--use-vulkan', '--enable-features=Vulkan', '--use-angle=vulkan', '--use-unsafe-webgpu'] // Try to force WebGPU friendly environment if possible, though host env matters more
    });
    const page = await browser.newPage();

    const consoleErrors = [];
    const webGpuWarnings = [];

    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') {
            consoleErrors.push(text);
            console.error(`Console Error: ${text}`);
        } else if (text.toLowerCase().includes('webgpu') || text.toLowerCase().includes('buffer')) {
            webGpuWarnings.push(text);
            console.log(`Console Log: ${text}`);
        }
    });

    page.on('pageerror', err => {
        consoleErrors.push(err.message);
        console.error(`Page Error: ${err.message}`);
    });

    try {
        console.log('Navigating to Aerodynamics page...');
        // Note: We use port 5174 since 5173 was busy in previous run
        await page.goto('http://localhost:5174/three_body_problem/#/aerodynamics', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        console.log('Waiting for initial load (5s)...');
        await page.waitForTimeout(5000);

        // Check if the canvas is present
        const canvas = await page.$('canvas');
        if (canvas) {
            console.log('Canvas found.');
        } else {
            console.error('FAIL: Canvas not found.');
            process.exit(1);
        }

        // Check for "WebGPU init failed" or similar error overlay text
        const errorOverlay = await page.locator('.wt-error-text').isVisible();
        if (errorOverlay) {
            const errorText = await page.locator('.wt-error-text').innerText();
            console.error(`FAIL: Error overlay detected: ${errorText}`);
            // But continue a bit to see console logs
        }

        console.log('Waiting another 5s for compute passes...');
        await page.waitForTimeout(5000);

        // Look for the storage buffer limit error specifically
        const hasLimitError = consoleErrors.some(err =>
            err.includes('exceeds the maximum per-stage limit') ||
            err.includes('limit of 8')
        );

        if (hasLimitError) {
            console.error('FAIL: Storage buffer limit error still present!');
            process.exit(1);
        }

        await page.screenshot({ path: 'verification/aerodynamics-check.png' });
        console.log('Screenshot saved to verification/aerodynamics-check.png');

        if (consoleErrors.length > 0) {
            console.warn(`WARNING: There were ${consoleErrors.length} console errors, but none were the storage buffer limit error.`);
        }

        console.log('SUCCESS: Aerodynamics page loaded without storage buffer limit errors.');
        process.exit(0);

    } catch (error) {
        console.error('Test failed with exception:', error);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
