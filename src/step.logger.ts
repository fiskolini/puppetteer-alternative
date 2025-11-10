import Table from 'cli-table3';

export class StepLogger {
    private lastTime: Map<string, number> = new Map();
    private lastStep: Map<string, string> = new Map();
    private logs: Map<string, any[]> = new Map();

    public startStep(prefix: string, stepName: string) {
        this.lastTime.set(prefix, Date.now());
        this.lastStep.set(prefix, stepName);
    }

    public logStep(prefix: string, stepName: string) {
        const now = Date.now();
        const lastTime = this.lastTime.get(prefix) ?? now;
        const lastStep = this.lastStep.get(prefix) ?? 'start';
        const elapsed = now - lastTime;
        this.log(prefix, lastStep, stepName, elapsed);
        this.lastTime.set(prefix, now);
        this.lastStep.set(prefix, stepName);
    }

    public async timeStep<T>(prefix: string, stepName: string, fn: () => Promise<T>): Promise<T> {
        this.logStep(prefix, stepName);
        const start = Date.now();
        try {
            const result = await fn();
            const elapsed = Date.now() - start;
            this.log(prefix, stepName, stepName, elapsed);
            return result;
        } finally {
            this.startStep(prefix, stepName);
        }
    }

    private log(prefix: string, from: string, to: string, elapsed: number) {
        const memory = process.memoryUsage();
        const cpu = process.cpuUsage();
        const toMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);

        if (!this.logs.has(prefix)) {
            this.logs.set(prefix, []);
        }

        this.logs.get(prefix)!.push([
            prefix, // Runner nam
            from, // Previous step name
            to, // Current step name
            elapsed, // Elapsed time in milliseconds
            toMB(memory.rss), // Resident Set Size (memory usage) in MB
            toMB(memory.heapUsed), // Heap used (memory usage) in MB
            cpu.user, // CPU user time in microseconds
            cpu.system, // CPU system time in microseconds
        ]);

        console.log(`[StepTimer] ${prefix}: ${from} -> ${to}: ${elapsed} ms`);
    }

    public printResults() {
        const runnerTotals: { [prefix: string]: number } = {};
        const summaryRows: any[] = [];

        for (const [prefix, rows] of this.logs.entries()) {
            const stepTimes: { [step: string]: number } = {};
            let totalRss = 0,
                totalHeapUsed = 0,
                totalCpuUser = 0,
                totalCpuSystem = 0,
                totalElapsed = 0;

            for (const row of rows) {
                const step = row[2];
                stepTimes[step] = (stepTimes[step] ?? 0) + Number(row[3]);
                totalRss += Number(row[4]);
                totalHeapUsed += Number(row[5]);
                totalCpuUser += Number(row[6]);
                totalCpuSystem += Number(row[7]);
                totalElapsed += Number(row[3]);
            }

            runnerTotals[prefix] = totalElapsed;

            summaryRows.push([
                `${prefix}`,
                stepTimes['initialize']?.toFixed(0) ?? '',
                stepTimes['loadPage']?.toFixed(0) ?? '',
                stepTimes['screenshotElement']?.toFixed(0) ?? '',
                `${totalElapsed.toFixed(0)}`,
                totalRss.toFixed(2),
                totalHeapUsed.toFixed(2),
                totalCpuUser,
                totalCpuSystem,
            ]);
        }

        const sorted = summaryRows
            .map((row, idx) => ({ row, total: runnerTotals[row[0].replace(/\*\*/g, '')], idx }))
            .sort((a, b) => a.total - b.total);

        const table = new Table({
            head: [
                'Runner',
                'initialize (ms)',
                'loadPage (ms)',
                'screenshotElement (ms)',
                'TOTAL (ms)',
                'RSS (MB)',
                'HeapUsed (MB)',
                'CPU User (µs)',
                'CPU System (µs)',
            ],
            style: { head: ['bold'] },
        });

        sorted.forEach((item) => table.push(item.row));
        console.log(table.toString());
    }
}
