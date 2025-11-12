import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { RunnerInterface } from './runner.interface';

export class PlaywrightRunner implements RunnerInterface {
    private static sharedBrowser: Browser | null = null;
    private initialized = false;

    private context: BrowserContext | null = null;
    private page: Page | null = null;

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        if (!PlaywrightRunner.sharedBrowser) {
            PlaywrightRunner.sharedBrowser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox'],
            });
        }

        this.initialized = true;
    }

    public async loadPage(url: string, jsEnabled: boolean): Promise<void> {
        this.ensureInitialized();

        const browser = PlaywrightRunner.sharedBrowser;
        if (!browser) throw new Error('Shared browser not initialized');

        // Close any previous context to free memory
        if (this.context) {
            await this.context.close().catch(() => {});
        }

        this.context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            javaScriptEnabled: jsEnabled,
            deviceScaleFactor: 4,
        });

        this.page = await this.context.newPage();

        await this.page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 20000,
        });
    }

    public async screenshotElement(selector: string): Promise<Buffer> {
        if (!this.page) throw new Error('Page not loaded yet');

        const locator = this.page.locator(selector);

        // Wait longer and for any visible or attached state
        await locator.waitFor({ state: 'visible', timeout: 15000 });

        const buffer = await locator.screenshot({
            type: 'png',
            omitBackground: true,
        });

        // Clean up context to avoid leaks
        await this.context?.close().catch(() => {});
        this.context = null;
        this.page = null;

        return buffer;
    }

    public getBrowserPid(): number | undefined {
        const browser = PlaywrightRunner.sharedBrowser;
        const proc = (browser as any)?.process?.();
        return proc?.pid;
    }

    public async destroy(): Promise<void> {
        this.context = null;
        this.page = null;
        this.initialized = false;
    }

    private ensureInitialized() {
        if (!this.initialized) throw new Error('PlaywrightRunner must be initialized first.');
    }
}
