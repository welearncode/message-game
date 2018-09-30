import ip = require('ip');
import socketIO = require('socket.io');
const PORT = 8000;
const server = socketIO(PORT);

server.on('connection', s => {
  global.console.log(s);
  s.emit('message', { payload: 'Hello' });
});

const myIp = ip.address();
console.log('Running socket on', myIp, PORT);
