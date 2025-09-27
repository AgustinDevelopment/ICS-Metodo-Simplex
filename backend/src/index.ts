import { exit } from 'node:process';
import { Server } from './server';

const server = new Server();

(() => {
    try {
        server.run();
    } catch (error) {
        console.log(error);
        exit(1);
    }
})();