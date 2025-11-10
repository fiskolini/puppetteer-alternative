import CDP from 'chrome-remote-interface';
import { RunnerInterface } from './runner.interface';
import { spawn } from 'child_process';
import { join } from 'path';

export class CDPRunner implements RunnerInterface {
    private client: any;
    private chromeProcess: any;

    async initialize() {
        // Launch Chrome with remote debugging
        const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        const userDataDir = join(__dirname, '../../tmp');
        this.chromeProcess = spawn(chromePath, [
            '--headless',
            '--disable-gpu',
            '--remote-debugging-port=9222',
            `--user-data-dir=${userDataDir}`,
        ]);
        // Wait for Chrome to start
        await new Promise((resolve) => setTimeout(resolve, 2000));
        this.client = await CDP();
    }

    async loadPage(url: string, waitForLoad: boolean = true) {
        const { Page } = this.client;
        await Page.enable();
        await Page.navigate({ url });
        if (waitForLoad) {
            await Page.loadEventFired();
        }
    }

    async screenshotElement(selector: string): Promise<Buffer> {
        const { DOM, Page, Runtime } = this.client;
        await DOM.enable();
        // Get document node
        const { root } = await DOM.getDocument();
        // Query selector
        const { nodeId } = await DOM.querySelector({ selector, nodeId: root.nodeId });
        if (!nodeId) throw new Error(`Selector not found: ${selector}`);
        // Get box model
        const { model } = await DOM.getBoxModel({ nodeId });
        const clip = {
            x: model.content[0],
            y: model.content[1],
            width: model.width,
            height: model.height,
            scale: 6,
        };
        // Screenshot
        const { data } = await Page.captureScreenshot({ format: 'png', clip });
        return Buffer.from(data, 'base64');
    }

    public async destroy(): Promise<void> {
        if (this.client) await this.client.close();
        if (this.chromeProcess) this.chromeProcess.kill();
    }
}
