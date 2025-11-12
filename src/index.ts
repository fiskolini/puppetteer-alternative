import * as process from 'node:process';
import { main } from './main';
import minimist from 'minimist';
import { RunnerType } from './types';

const runnerValues: string[] = Object.values(RunnerType);
const args = minimist(process.argv.slice(3)) as {
    runner?: RunnerType;
    single?: boolean;
};

const { runner, single } = args;

if (!runner || !runnerValues.includes(runner)) {
    console.error(`Invalid runner arg. '${runner}' given. Possible ones [${runnerValues.join(',')}]`);
    process.exit(1);
}

main(runner, single)
    .then((success) => {
        console.log(success);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Failed to start process', error);
        process.exit(1);
    });
