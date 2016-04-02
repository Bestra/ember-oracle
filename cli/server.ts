import * as net from 'net';
import { findComponentFiles, ComponentDefinition, findProps } from './findComponents';
import * as path from 'path';
import * as ProgressBar from 'progress'
console.log(ProgressBar);


export function start() {
    let args = process.argv.slice(2);
    let dir = args[0];
    
    const PORT = 5296;
    const HOST = 'localhost';

    let server = net.createServer();
    server.listen(PORT, HOST);
    console.log("Processing component definitions..");
    let componentPaths = findComponentFiles(dir);
    console.log(`Found ${componentPaths.length} components`);
    let bar = new ProgressBar(':bar', {total: componentPaths.length})
    let defs = componentPaths.map((p, i) => {
        let props = findProps(p)
        bar.tick();
        return props;
    })
    
    
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
            socket.write(componentPaths[0].toString());
        })

    })
};