const { Kafka } = require('kafkajs');
const WebSocket = require('ws');

const kafka = new Kafka({ brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'gateway-group' });

const wss = new WebSocket.Server({ port: 4001 });
console.log('Gateway WS running on port 4001');

const subs = new Map();

wss.on('connection', ws => {
  ws.on('message', msg => {
    const data = JSON.parse(msg.toString());
    if (data.action === 'subscribe') subs.set(ws, data.transactionId);
  });

  ws.on('close', () => subs.delete(ws));
});

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'txn.events', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const key = message.key.toString();
      const ev = JSON.parse(message.value.toString());
      for (const [ws, txId] of subs.entries()) {
        if (txId === key) ws.send(JSON.stringify(ev));
      }
    },
  });
}

start();
