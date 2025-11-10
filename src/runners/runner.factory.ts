import { RunnerInterface } from './runner.interface';
import { PlaywrightRunner } from './playwright.runner';
import { PuppeteerRunner } from './puppeteer.runner';
import { RunnerType } from '../types';
import { CDPRunner } from './cdp.runner';

export function instantiateRunner(name: RunnerType): RunnerInterface {
    const mappedRunnerInstances: Record<RunnerType, RunnerInterface> = {
        [RunnerType.Playwright]: new PlaywrightRunner(),
        [RunnerType.Puppeteer]: new PuppeteerRunner(),
        [RunnerType.ChromeDevTools]: new CDPRunner(),
    };

    const runner = mappedRunnerInstances[name];

    if (!runner) {
        throw new Error(`Runner type ${name} is not supported.`);
    }

    return runner;
}
