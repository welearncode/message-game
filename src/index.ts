import assert = require('assert');
import { EventEmitter } from 'events';
import ip = require('ip');
import promptly = require('promptly');
import socketIO = require('socket.io');
import client = require('socket.io-client');
const PORT = process.env.PORT || 8000;
const myIp = ip.address();
const server = socketIO(PORT);

enum TurnState {
  WAITING_FOR_REQUEST,
    REQUESTING,
    WAITING_FOR_CHOICE,
    CHOOSING,
    WAITING_FOR_CHALLENGE,
    CHALLENGING,
    WAITING_FOR_ANSWER,
    ANSWERING
}
interface IState {
  client: SocketIO.Socket;
  server: SocketIOClient.Socket;
  inGame: boolean;
  myTurn: TurnState;
}
const state: IState = {
  client: null,
  inGame: false,
  myTurn: 0,
  server: null
};

function emit(msgType: string, data: any) {
  if (state.server) {
    state.server.emit(msgType, data);
  } else if (state.client) {
    state.client.emit(msgType, data);
  }
}
async function answerCommand() {
  const answer = await promptly.prompt('Answer: ');
  emit('answer', { payload: answer });
  state.myTurn = TurnState.REQUESTING;
}

function wireupEvents (s) {
  s.on('choose', data => {
    global.console.log(data);
    state.myTurn = TurnState.CHALLENGING;
  });

  s.on('answer', data => {
    global.console.log(data);
    state.myTurn = TurnState.WAITING_FOR_REQUEST
  })

  s.on('request', data => {
    global.console.log(data);
    state.myTurn = TurnState.CHOOSING;
  });

  s.on('challenge', data => {
    global.console.log(data);
    state.myTurn = TurnState.ANSWERING;
  });
}
async function connectCommand() {
  const connectTo = await promptly.prompt('Server: ');
  state.server = client.connect(connectTo);
  wireupEvents(state.server);
}

async function truthOrDareCommand() {
  emit('request', { payload: 'truth? or dare?' });
  state.myTurn = TurnState.WAITING_FOR_CHOICE;
}

async function truthCommand() {
  assert(state.myTurn === TurnState.CHOOSING);
  emit('choose', { payload: 'truth' });
  state.myTurn = TurnState.WAITING_FOR_CHALLENGE;
}

async function dareCommand() {
  assert(state.myTurn === TurnState.CHOOSING);
  emit('choose', { payload: 'dare' });
  state.myTurn = TurnState.WAITING_FOR_CHALLENGE;
}

async function chickenCommand() {
  assert(state.myTurn === TurnState.CHOOSING);
  emit('answer', { payload: 'chicken' });
  state.myTurn = TurnState.WAITING_FOR_CHALLENGE;
}

async function challengeCommand() {
  assert(state.myTurn === TurnState.CHALLENGING);
  const challenge = await promptly.prompt('Challenge: ');
  emit('challenge', { payload: challenge });
  state.myTurn = TurnState.WAITING_FOR_ANSWER;
}

const commandMapping = {
  answer: answerCommand,
  challenge: challengeCommand,
  chicken: chickenCommand,
  connect: connectCommand,
  dare: dareCommand,
  truth: truthCommand,
  truthordare: truthOrDareCommand
};

const main = async () => {
  server.on('connection', s => {
    global.console.log(s.id, 'joined');
    state.client = s;
    s.emit('request', { payload: 'Truth or Dare' });
    state.myTurn = TurnState.WAITING_FOR_CHOICE;
    wireupEvents(s);
  });

  global.console.log('Running socket on', myIp, PORT);

  let command;
  const commands = [
    'connect',
    'truthordare',
    'truth',
    'dare',
    'answer',
    'chicken',
    'challenge',
    'quit'
  ];

  do {
    command = await promptly.choose('Enter a command: ', commands);
    if (command !== 'quit') {
      const commandToRun = commandMapping[command];
      await commandToRun();
    }
  } while (command !== 'quit');
  process.exit();
};
main();
