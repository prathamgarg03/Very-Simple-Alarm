const mqtt = require('mqtt');

const url = process.env.MQTT_URL || 'mqtt://localhost:1883';
const topic = process.env.MQTT_TOPIC || 'alarm/stop/+';

const client = mqtt.connect(url);
client.on('connect', () => {
  console.log('MQTT subscriber connected to', url);
  client.subscribe(topic, { qos: 1 }, (err) => {
    if (err) console.error('Subscribe error', err);
    else console.log('Subscribed to', topic);
  });
});

client.on('message', (topic, message) => {
  console.log('Received on', topic, ':', message.toString());
});
