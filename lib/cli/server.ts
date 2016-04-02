import startServer from '../server'

export function start() {
    let args = process.argv.slice(2);
    let dir = args[0];

    startServer(dir);
        
};