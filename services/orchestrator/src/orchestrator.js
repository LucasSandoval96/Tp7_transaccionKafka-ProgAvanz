const { Kafka } = require('kafkajs');

const kafka = new Kafka({ brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'orchestrator-group' });
const producer = kafka.producer();

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function start() {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'txn.commands', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const key = message.key.toString();
      const event = JSON.parse(message.value.toString());
      console.log('Orchestrator received', event.type, key);

      try {
        await sleep(500);
        const reserved = {
          type: 'FundsReserved',
          transactionId: key,
          timestamp: Date.now(),
          payload: { ok: true, amount: event.payload.amount },
        };
        await producer.send({ topic: 'txn.events', messages: [{ key, value: JSON.stringify(reserved) }] });

        await sleep(500);
        const risk = Math.random() < 0.9 ? 'LOW' : 'HIGH';
        const fraud = {
          type: 'FraudChecked',
          transactionId: key,
          timestamp: Date.now(),
          payload: { risk },
        };
        await producer.send({ topic: 'txn.events', messages: [{ key, value: JSON.stringify(fraud) }] });

        if (risk === 'HIGH') {
          const reversed = { type: 'Reversed', transactionId: key, timestamp: Date.now(), payload: { reason: 'FRAUD' } };
          await producer.send({ topic: 'txn.events', messages: [{ key, value: JSON.stringify(reversed) }] });
        } else {
          const committed = { type: 'Committed', transactionId: key, timestamp: Date.now(), payload: { ledgerId: 'L-' + Math.floor(Math.random() * 1000) } };
          await producer.send({ topic: 'txn.events', messages: [{ key, value: JSON.stringify(committed) }] });
        }
      } catch (err) {
        console.error('Error in Orchestrator', err);
        await producer.send({ topic: 'txn.dlq', messages: [{ key, value: message.value.toString() }] });
      }
    },
  });
}

start();