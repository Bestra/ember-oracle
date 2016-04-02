import * as net from 'net';
import findComponents from './findComponents';
import * as path from 'path';

export function start() {
    let args = process.argv.slice(2);
    let dir = args[0];
    
    const PORT = 5296;
    const HOST = 'localhost';

    let server = net.createServer();
    server.listen(PORT, HOST);
    console.log("Processing component definitions..");
    let componentPaths = findComponents(dir);
    console.log(`Found ${componentPaths.length} components`);
    
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