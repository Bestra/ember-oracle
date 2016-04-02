import startServer from '../lib/server'

function start() {
    let args = process.argv.slice(2);
    let dir = args[0];

    startServer(dir);
        
};

start();