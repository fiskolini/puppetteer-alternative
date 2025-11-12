import { existsSync, statSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DotenvParseOutput, configDotenv } from 'dotenv';
import { RunnerType } from './types';
import { instantiateRunner } from './runners/runner.factory';
import { StepLogger } from './step.logger';

export async function main(runner: RunnerType, single: boolean = false) {
    loadDotEnv();

    const pageUrl = process.env.PAGE_URL;
    const urlSecret = process.env.URL_SECRET;
    const elementSelector = process.env.ELEMENT_SELECTOR;
    const idsFile = 'ids.csv';

    if (!pageUrl || !elementSelector || !urlSecret) {
        throw new Error('PAGE_URL, ELEMENT_SELECTOR, and URL_SECRET environment variables must be all set.');
    }

    const absPath = path.resolve(idsFile);
    const stats = statSync(absPath);
    if (stats.size === 0) throw new Error(`IDs file is empty: ${idsFile}`);

    const timer = new StepLogger(runner);
    const ids = loadIdsSync(idsFile);

    await Promise.all(
        (single ? [ids[0]] : ids).map(async (id) => {
            const url = appendSecret(pageUrl, id, urlSecret);
            await runForInstance(runner, url, id, elementSelector, timer);
        })
    );

    timer.printResults();
    return 'Done';
}

function loadDotEnv(): DotenvParseOutput | undefined {
    const { error, parsed } = configDotenv({ quiet: true });
    if (error) throw error;
    return parsed;
}

function loadIdsSync(filePath: string): string[] {
    const abs = path.resolve(filePath);
    const content = readFileSync(abs, 'utf-8');
    return content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}

function appendSecret(rawUrl: string, id: string, token: string): string {
    const url = new URL(`${rawUrl}/${id}`);
    url.searchParams.set('secret', token);
    return url.toString();
}

async function runForInstance(
    runner: RunnerType,
    pageUrl: string,
    id: string,
    elementSelector: string,
    timer: StepLogger
) {
    const instance = instantiateRunner(runner);

    try {
        timer.startStep(id, `Starting ${runner}`);

        await timer.timeStep(id, 'initialize', () => instance.initialize());

        const browserPid = instance.getBrowserPid?.();

        await timer.timeStep(id, 'loadPage', () => instance.loadPage(pageUrl, true), browserPid);

        const imageBuffer = await timer.timeStep(
            id,
            'screenshotElement',
            () => instance.screenshotElement(elementSelector),
            browserPid
        );

        const folderPath = path.resolve(`screenshots/${id}`);
        if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });

        const fileName = `${Date.now()}-${runner}.png`;
        writeFileSync(path.join(folderPath, fileName), imageBuffer);
    } catch (e) {
        timer.logError(id, e instanceof Error ? e : new Error(String(e)));
    }

    await instance.destroy?.();
}
