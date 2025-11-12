import Table from 'cli-table3';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import { setInterval, clearInterval } from 'timers';

interface StepEntry {
    id: string;
    from: string;
    to: string;
    elapsed: number;
    rssSamples: number[];
    heapUsed: number;
    cpuUser: number;
    cpuSystem: number;
}

export class StepLogger {
    private logs: StepEntry[] = [];
    private lastStep = new Map<string, string>();
    private readonly runner: string;

    constructor(runner: string) {
        this.runner = runner;
    }

    public startStep(id: string, stepName: string) {
        this.lastStep.set(`${this.runner}-${id}`, stepName);
    }

    /** Sample RSS periodically while fn() runs */
    public async timeStep<T>(id: string, stepName: string, fn: () => Promise<T>, browserPid?: number): Promise<T> {
        const key = `${this.runner}-${id}`;
        const from = this.lastStep.get(key) ?? 'start';
        const start = performance.now();
        const cpuStart = process.cpuUsage();
        const rssSamples: number[] = [];

        let sampler: NodeJS.Timeout | undefined;
        sampler = setInterval(() => {
            const rss = StepLogger.getRSS(browserPid ?? process.pid);
            if (rss > 0) rssSamples.push(rss);
        }, 200);

        let result: T;
        try {
            result = await fn();
        } catch (e) {
            this.logError(id, e instanceof Error ? e : new Error(String(e)));
            throw e;
        } finally {
            if (sampler) clearInterval(sampler);
        }

        const elapsed = performance.now() - start;
        const cpuDiff = process.cpuUsage(cpuStart);
        const mem = process.memoryUsage();

        this.logs.push({
            id,
            from,
            to: stepName,
            elapsed,
            rssSamples,
            heapUsed: mem.heapUsed / 1024 / 1024,
            cpuUser: cpuDiff.user / 1000,
            cpuSystem: cpuDiff.system / 1000,
        });

        console.log(`[StepLogger] ${this.runner} [${id}]: ${from} -> ${stepName}: ${elapsed.toFixed(1)} ms`);

        this.lastStep.set(key, stepName);
        return result;
    }

    private static getRSS(pid?: number): number {
        const read = (p: number) => {
            try {
                const out = execSync(`/bin/ps -o rss= -p ${p}`).toString().trim();
                const kb = parseInt(out, 10);
                return isNaN(kb) ? 0 : kb;
            } catch {
                return 0;
            }
        };

        const nodeKb = read(process.pid);
        const browserKb = pid ? read(pid) : 0;
        return (nodeKb + browserKb) / 1024;
    }

    public logError(id: string, error: Error) {
        console.error(`[StepLogger] ${this.runner} [${id}]: Error - ${error.message}`, error);
    }

    public printResults() {
        const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
        const std = (arr: number[]) => {
            if (arr.length < 2) return 0;
            const mean = avg(arr);
            return Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
        };

        // group by step
        const perStep: Record<string, StepEntry[]> = {};
        for (const log of this.logs) {
            if (!perStep[log.to]) perStep[log.to] = [];
            perStep[log.to].push(log);
        }

        // per-step table
        const stepTable = new Table({
            head: [
                'Step',
                'Count',
                'Avg (ms)',
                'Std (ms)',
                'Min (ms)',
                'Max (ms)',
                'Avg RSS (MB)',
                'Peak RSS (MB)',
                'Avg Heap (MB)',
                'Avg CPU (ms)',
            ],
        });

        for (const [step, entries] of Object.entries(perStep)) {
            const times = entries.map((e) => e.elapsed);
            const rssAvg = entries.map((e) => avg(e.rssSamples));
            const rssMax = entries.map((e) => (e.rssSamples.length ? Math.max(...e.rssSamples) : 0));
            const heap = entries.map((e) => e.heapUsed);
            const cpu = entries.map((e) => e.cpuUser + e.cpuSystem);

            stepTable.push([
                step,
                entries.length,
                avg(times).toFixed(1),
                std(times).toFixed(1),
                Math.min(...times).toFixed(1),
                Math.max(...times).toFixed(1),
                avg(rssAvg).toFixed(1),
                avg(rssMax).toFixed(1),
                avg(heap).toFixed(1),
                avg(cpu).toFixed(1),
            ]);
        }

        console.log(stepTable.toString());
    }
}
