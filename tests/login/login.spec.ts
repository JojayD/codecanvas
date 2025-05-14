import { test, expect, chromium } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

test.describe('Google Authentication', () => {
  test('should log in with Google account', async () => {
				// Launch the browser
		const { chromium } = require('playwright-extra')
		const stealth = require('puppeteer-extra-plugin-stealth')()

		// for some reasont hese evasions break shit??/
		stealth.enabledEvasions.delete('iframe.contentWindow')
		stealth.enabledEvasions.delete('media.codecs')

		chromium.use(stealth)

		// browser args needed to stop chrome from tweakin
		chromium.launch({
			headless: false,
			args: ['--disable-blink-features=AutomationControlled']
		}).then(async (browser: { newPage: () => any; close: () => any }) => {
    const page = await browser.newPage();
		page.setDefaultTimeout(60000); // 60 seconds


    // Navigate to your application's login page
    await page.goto('http://localhost:3000/login');

    // Click the "Sign in with Google" button (targeting the button component)
    await page.click('button:has-text("Sign in with Google")'); // Adjust the selector based on your button

    await page.waitForURL('https://accounts.google.com/*');
		console.log("in google")
		console.log(process.env.GOOGLE_EMAIL)
		await page.waitForSelector('input[type="email"]', { state: 'visible' });
		await page.fill('input[type="email"]', process.env.GOOGLE_EMAIL || '');
		await page.click('button[type="submit"]');

    await page.waitForSelector('input[type="password"]');	

    // Fill in the password field
    await page.fill('input[type="password"]', process.env.GOOGLE_PASSWORD || '');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard'); 

		//Hope this works
    await expect(page.locator('h2')).toHaveText('Welcome Back'); 

    // Close the browser
    await browser.close();
		});
  });
});