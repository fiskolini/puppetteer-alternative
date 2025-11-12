import puppeteer, { Browser, Page } from 'puppeteer';
import { RunnerInterface } from './runner.interface';

export class PuppeteerRunner implements RunnerInterface {
    private static browser: Browser | undefined;
    private initialized: boolean | undefined;
    private page: Page | undefined;

    public constructor() {}

    public async initialize() {
        if (this.initialized) {
            throw new Error(`Cannot initialize puppeteer runner. Already initialized.`);
        }

        if (!PuppeteerRunner.browser) {
            PuppeteerRunner.browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        }
        this.initialized = true;
    }

    public async loadPage(url: string, javaScriptEnabled: boolean) {
        this.ensureInitialization();
        if (!PuppeteerRunner.browser) {
            throw new Error(`Browser must be initialized.`);
        }

        const viewport = { width: 800, height: 600, deviceScaleFactor: 4 };

        const context = await PuppeteerRunner.browser.createBrowserContext();
        this.page = await context.newPage();
        await this.page.setViewport(viewport);

        // Puppeteer enables JavaScript by default; to disable:
        if (!javaScriptEnabled) {
            await this.page.setJavaScriptEnabled(false);
        }

        await this.page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    }

    public async screenshotElement(selector: string) {
        if (!this.page) {
            throw new Error(`Page must be initialized.`);
        }

        await this.page.waitForSelector(selector, { visible: true, timeout: 5000 });

        const element = await this.page.$(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }

        const screenshot = await element.screenshot({ type: 'png', omitBackground: true });
        return Buffer.from(screenshot);
    }

    public async destroy(): Promise<void> {
        if (this.page) await this.page.close();
    }

    private ensureInitialization(): void {
        if (!this.initialized) {
            throw new Error(`Puppeteer runner must be initialized first.`);
        }
    }
}
