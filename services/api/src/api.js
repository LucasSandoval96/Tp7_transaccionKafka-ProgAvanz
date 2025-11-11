const express = require('express');
const bodyParser = require('body-parser');
const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const kafka = new Kafka({ brokers: ['localhost:9092'] });
const producer = kafka.producer();


async function start() {
  await producer.connect();
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());
  app.post('/transactions', async (req, res) => {
    try {
      const transactionId = uuidv4();
      const payload = {
        type: 'TransactionInitiated',
        transactionId,
        timestamp: Date.now(),
        payload: req.body,
      };

      await producer.send({
        topic: 'txn.commands',
        messages: [{ key: transactionId, value: JSON.stringify(payload) }],
      });

      res.json({ ok: true, transactionId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  const port = 3001;
  app.listen(port, () => console.log(`API running on port ${port}`));
}

start();
