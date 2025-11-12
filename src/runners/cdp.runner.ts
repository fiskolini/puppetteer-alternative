import CDP from 'chrome-remote-interface';
import { RunnerInterface } from './runner.interface';
import { spawn } from 'child_process';
import { join } from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';

export class CDPRunner implements RunnerInterface {
    private client: any;
    private chromeProcess: any;

    async initialize() {
        const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        const userDataDir = join('/tmp', `cdp-${randomUUID()}`);
        fs.mkdirSync(userDataDir, { recursive: true });

        this.chromeProcess = spawn(chromePath, [
            '--headless',
            '--disable-gpu',
            '--no-sandbox',
            '--remote-debugging-port=9222',
            `--user-data-dir=${userDataDir}`,
        ]);

        await new Promise((resolve) => setTimeout(resolve, 1500));
        this.client = await CDP({ target: (targets) => targets[0] });
    }

    async loadPage(url: string, waitForLoad: boolean = true) {
        const { Target } = this.client;

        // Open a fresh target (tab) each run
        const { targetId } = await Target.createTarget({ url: 'about:blank' });
        const newClient = await CDP({ target: targetId });
        const { Page } = newClient;
        await Page.enable();
        await Page.navigate({ url });
        if (waitForLoad) {
            await Page.loadEventFired();
        }

        // Replace the old client so screenshotElement uses this page
        this.client = newClient;
    }

    async screenshotElement(selector: string): Promise<Buffer> {
        const { DOM, Page } = this.client;
        await DOM.enable();

        const { root } = await DOM.getDocument();
        const { nodeId } = await DOM.querySelector({ selector, nodeId: root.nodeId });
        if (!nodeId) throw new Error(`Selector not found: ${selector}`);

        const { model } = await DOM.getBoxModel({ nodeId });
        const clip = {
            x: model.content[0],
            y: model.content[1],
            width: model.width,
            height: model.height,
            scale: 6,
        };

        const { data } = await Page.captureScreenshot({ format: 'png', clip, omitBackground: true });
        return Buffer.from(data, 'base64');
    }

    public getBrowserPid(): number | undefined {
        return this.chromeProcess.pid;
    }

    public async destroy(): Promise<void> {
        // if (this.client) await this.client.close();
    }
}
