import { main } from './main';
import * as process from 'node:process';

main()
    .then((success) => {
        console.log(success);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Failed to start process', error);
        process.exit(1);
    });
