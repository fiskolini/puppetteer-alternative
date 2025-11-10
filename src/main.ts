import { writeFileSync } from 'node:fs';
import { RunnerType } from './types';
import { instantiateRunner } from './runners/runner.factory';
import { StepLogger } from './step.logger';
import { DotenvParseOutput, configDotenv } from 'dotenv';

export async function main() {
    loadDotEnv();

    const pageUrl = process.env.PAGE_URL;
    const elementSelector = process.env.ELEMENT_SELECTOR;

    if (!pageUrl || !elementSelector) {
        throw new Error('PAGE_URL and ELEMENT_SELECTOR environment variables must be set.');
    }

    const timer = new StepLogger();
    const instances: RunnerType[] = Object.values(RunnerType);

    await Promise.all(instances.map((instance) => runForInstance(instance, pageUrl, elementSelector, timer)));

    timer.printResults();

    return Promise.resolve('Done');
}

export function loadDotEnv(): DotenvParseOutput | undefined {
    const { error, parsed } = configDotenv({ quiet: true });

    if (error) {
        throw error;
    }

    return parsed;
}

async function runForInstance(instanceName: RunnerType, pageUrl: string, elementSelector: string, timer: StepLogger) {
    try {
        timer.startStep(instanceName, `Starting ${instanceName} runner`);

        const instance = instantiateRunner(instanceName);

        await timer.timeStep(instanceName, 'initialize', () => instance.initialize());
        await timer.timeStep(instanceName, 'loadPage', () => instance.loadPage(pageUrl, true));
        const imageBuffer = await timer.timeStep(instanceName, 'screenshotElement', () =>
            instance.screenshotElement(elementSelector)
        );
        await instance.destroy?.();
        const fileName = `${new Date().getTime()}-${instanceName}-screenshot.png`;

        writeFileSync(`screenshots/${fileName}`, imageBuffer);
    } catch (e) {
        console.error(`Error while processing ${instanceName}:`, e);
    }
}
