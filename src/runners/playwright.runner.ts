import { chromium, Browser, Page } from 'playwright';
import { RunnerInterface } from './runner.interface';

export class PlaywrightRunner implements RunnerInterface {
    private browser: Browser | undefined;
    private initialized: boolean | undefined;
    private page: Page | undefined;

    public constructor() {}

    public async initialize() {
        if (this.initialized) {
            throw new Error(`Cannot initialize playwright runner. Already initialized.`);
        }

        this.browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
        this.initialized = true;
    }

    public async loadPage(url: string, javaScriptEnabled: boolean) {
        this.ensureInitialization();
        if (!this.browser) {
            throw new Error(`Browser must be initialized.`);
        }

        const viewport = { width: 800, height: 600 };

        const context = await this.browser.newContext({ viewport, javaScriptEnabled, deviceScaleFactor: 4 });
        this.page = await context.newPage();

        await this.page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    }

    public async screenshotElement(selector: string) {
        if (!this.page) {
            throw new Error(`Page must be initialized.`);
        }

        const locator = this.page.locator(selector);
        await locator.waitFor({ state: 'visible', timeout: 5000 });

        return locator.screenshot({ type: 'png', omitBackground: true });
    }

    private ensureInitialization(): void {
        if (!this.initialized) {
            throw new Error(`Playwright runner must be initialized first.`);
        }
    }
}
