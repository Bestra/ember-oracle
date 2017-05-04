#! /usr/bin/env node
import Server from '../lib/server'

function start() {
    let args = process.argv.slice(2);
    let dir = args[0];
    let engines = args.slice(1) || [];

    new Server().start(dir, engines);
        
};

start();