import { chromium, type Browser, type Page } from "playwright";
import { BasePlaywrightComputer } from "./base";

/**
 * Launches a local Chromium instance using Playwright.
 */
export class LocalPlaywrightComputer extends BasePlaywrightComputer {
	private headless: boolean;

	constructor(headless: boolean = false) {
		super();
		this.headless = headless;
	}

	async _getBrowserAndPage(): Promise<[Browser, Page]> {
		const [width, height] = this.getDimensions();
		const launchArgs = [
			`--window-size=${width},${height}`,
			"--disable-extensions",
			"--disable-file-system",
		];

		const browser = await chromium.launch({
			headless: this.headless,
			args: launchArgs,
			env: { DISPLAY: ":0" },
		});

		const context = await browser.newContext();

		// Add event listeners for page creation and closure
		context.on("page", this._handleNewPage.bind(this));

		const page = await context.newPage();
		await page.setViewportSize({ width, height });
		page.on("close", this._handlePageClose.bind(this));

		await page.goto("https://bing.com");

		return [browser, page];
	}

	private _handleNewPage(page: Page): void {
		/** Handle the creation of a new page. */
		console.log("New page created");
		this._page = page;
		page.on("close", this._handlePageClose.bind(this));
	}

	private _handlePageClose(page: Page): void {
		/** Handle the closure of a page. */
		console.log("Page closed");
		try {
			this._assertPage();
		} catch {
			return;
		}
		if (this._page !== page) return;

		const browser = this._browser;
		if (!browser || typeof browser.contexts !== "function") {
			console.log("Warning: Browser or context not available.");
			this._page = undefined as any;
			return;
		}

		const contexts = browser.contexts();
		if (!contexts.length) {
			console.log("Warning: No browser contexts available.");
			this._page = undefined as any;
			return;
		}

		const context = contexts[0];
		if (!context || typeof context.pages !== "function") {
			console.log("Warning: Context pages not available.");
			this._page = undefined as any;
			return;
		}

		const pages = context.pages();
		if (pages.length) {
			this._page = pages[pages.length - 1]!;
		} else {
			console.log("Warning: All pages have been closed.");
			this._page = undefined as any;
		}
	}
}
