export class StepTimer {
    private lastTime: number;
    private lastStep: string;

    public constructor(private readonly prefix: string) {
        this.lastTime = Date.now();
        this.lastStep = 'start';
    }

    public startStep(stepName: string) {
        this.lastTime = Date.now();
        this.lastStep = stepName;
    }

    public logStep(stepName: string) {
        const now = Date.now();
        const elapsed = now - this.lastTime;
        this.log(stepName, elapsed);
        this.lastTime = now;
        this.lastStep = stepName;
    }

    public async timeStep<T>(stepName: string, fn: () => Promise<T>): Promise<T> {
        this.logStep(stepName);
        const start = Date.now();
        try {
            const result = await fn();
            const elapsed = Date.now() - start;
            this.log(stepName, elapsed);
            return result;
        } finally {
            this.startStep(stepName);
        }
    }

    private log(stepName: string, elapsed: number) {
        console.log(`[StepTimer] ${this.prefix}: ${this.lastStep} -> ${stepName}: ${elapsed} ms`);
    }
}
