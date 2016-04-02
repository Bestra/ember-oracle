import * as net from 'net';
import findComponents from './findComponents';
import * as path from 'path';

interface Worker  {
    send: (data: {options: WorkerOptions, files: string[]}) => void;
    on: (event: "message" | "disconnect", fn: any) => void;
}

interface WorkerOptions {
    dry: boolean;
    print: boolean;
    
}

export function start() {
    let args = process.argv.slice(2);
    let dir = args[0];
    
    const PORT = 5296;
    const HOST = 'localhost';

    let server = net.createServer();
    server.listen(PORT, HOST);
    console.log("Processing component definitions..");
    let components = findComponents(dir);
    let componentPaths = components.map(c => c.path);
    console.log(`Found ${components.length} components`);
    let transformPath = path.resolve('./codeShift/component-props');
    let worker: Worker = require('jscodeshift/dist/Worker')([transformPath, 'babel'])
    worker.on("message", (data) => console.log(data));
    worker.send({options: {dry: true, print: false},
                 files: componentPaths.slice(0,1)});
    server.on('listening', (s) => {
        console.log("server listening on ", server.address());
    })
    server.on('connection', (socket: net.Socket) => {
        console.log('connection from ', socket.remoteAddress, ':', socket.remotePort);        
        socket.on('data', (data: Buffer) => {
            let command;            
            try {
              let command = JSON.parse(data.toString());
            } catch (e) {
              console.log("invalid json");  
            }
            socket.write("dude\n");
            socket.write(components[0].toString());
        })

    })
};