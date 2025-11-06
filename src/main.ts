import {writeFileSync} from 'node:fs';
import {RunnerType} from "./types";
import {instantiateRunner} from "./runners/runner.factory";
import {StepTimer} from "./step.timer";
import {DotenvParseOutput, configDotenv} from "dotenv";

export async function main() {
    loadDotEnv();

    const pageUrl = process.env.PAGE_URL;
    const elementSelector = process.env.ELEMENT_SELECTOR;

    if (!pageUrl || !elementSelector) {
        throw new Error('PAGE_URL and ELEMENT_SELECTOR environment variables must be set.');
    }

    const instances: RunnerType[] = [RunnerType.Playwright, RunnerType.Puppeteer];
    await Promise.all(instances.map((instance) => runForInstance(instance, pageUrl, elementSelector)));

    return Promise.resolve('Done');
}

export function loadDotEnv(): DotenvParseOutput | undefined {
    const {error, parsed} = configDotenv();

    if (error) {
        throw error;
    }

    return parsed;
}

async function runForInstance(instanceName: RunnerType, pageUrl: string, elementSelector: string) {
    const timer = new StepTimer(instanceName);
    const instance = instantiateRunner(instanceName);

    timer.startStep(`Starting ${instanceName} runner`);

    await timer.timeStep('initialize', () => instance.initialize());
    await timer.timeStep('loadPage', () => instance.loadPage(pageUrl, true));
    const imageBuffer = await timer.timeStep('screenshotElement', () => instance.screenshotElement(elementSelector));
    const fileName = `${new Date().getTime()}-screenshot.png`;

    writeFileSync(`screenshots/${fileName}`, imageBuffer);
}
